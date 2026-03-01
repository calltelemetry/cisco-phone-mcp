import test from "node:test";
import assert from "node:assert/strict";

import { withMockFetch, responseText, responseBytes, parseFormBody } from "./helpers.js";

import { httpPostForm, httpGetBytes, getDefaultAuth, normalizeTarget } from "../src/http.js";

// --- httpPostForm ---

test("http: httpPostForm sends form-urlencoded POST with auth", async () => {
  const h = withMockFetch(async ({ calls }) => {
    const resp = await httpPostForm(
      "192.168.125.178",
      "/CGI/Execute",
      { XML: "<test>hello</test>", foo: "bar" },
      { auth: { username: "admin", password: "pass" } }
    );
    assert.equal(resp.status, 200);
    assert.equal(resp.body, "OK");
    assert.equal(calls.length, 1);

    const init = calls[0].init;
    assert.equal(init.method, "POST");
    assert.ok(init.headers?.["content-type"]?.includes("application/x-www-form-urlencoded"));
    assert.ok(init.headers?.authorization?.startsWith("Basic "));

    const form = parseFormBody(init.body);
    assert.equal(form.XML, "<test>hello</test>");
    assert.equal(form.foo, "bar");
  });

  await h.run(async () => {
    return responseText("OK", { status: 200, headers: { "content-type": "text/plain" } });
  });
});

test("http: httpPostForm with no auth omits authorization header", async () => {
  const prevUser = process.env.PHONE_USERNAME;
  const prevPass = process.env.PHONE_PASSWORD;
  const prevUser2 = process.env.PHONE_USER;
  const prevPass2 = process.env.PHONE_PASS;
  delete process.env.PHONE_USERNAME;
  delete process.env.PHONE_PASSWORD;
  delete process.env.PHONE_USER;
  delete process.env.PHONE_PASS;

  try {
    const h = withMockFetch(async ({ calls }) => {
      await httpPostForm("192.168.125.178", "/test", { key: "val" });
      const init = calls[0].init;
      assert.equal(init.headers?.authorization, undefined);
    });

    await h.run(async () => {
      return responseText("OK", { status: 200 });
    });
  } finally {
    if (prevUser !== undefined) process.env.PHONE_USERNAME = prevUser;
    if (prevPass !== undefined) process.env.PHONE_PASSWORD = prevPass;
    if (prevUser2 !== undefined) process.env.PHONE_USER = prevUser2;
    if (prevPass2 !== undefined) process.env.PHONE_PASS = prevPass2;
  }
});

test("http: httpPostForm captures response headers lowercase", async () => {
  const h = withMockFetch(async () => {
    const resp = await httpPostForm("192.168.125.178", "/test", { a: "b" });
    assert.equal(resp.headers["x-custom"], "hello");
  });

  await h.run(async () => {
    return responseText("ok", { status: 200, headers: { "X-Custom": "hello" } });
  });
});

// --- httpGetBytes ---

test("http: httpGetBytes returns binary data with correct headers", async () => {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

  const h = withMockFetch(async () => {
    const resp = await httpGetBytes("192.168.125.178", "/CGI/Screenshot");
    assert.equal(resp.status, 200);
    assert.equal(resp.headers["content-type"], "image/jpeg");
    assert.deepEqual(Array.from(resp.body), [0xff, 0xd8, 0xff, 0xe0]);
  });

  await h.run(async () => {
    return responseBytes(bytes, { status: 200, headers: { "content-type": "image/jpeg" } });
  });
});

test("http: httpGetBytes handles error status codes", async () => {
  const h = withMockFetch(async () => {
    const resp = await httpGetBytes("192.168.125.178", "/CGI/Screenshot");
    assert.equal(resp.status, 403);
    assert.equal(resp.body.length, 0);
  });

  await h.run(async () => {
    return responseBytes(new Uint8Array(), { status: 403, headers: { "content-type": "text/plain" } });
  });
});

test("http: httpGetBytes with auth", async () => {
  const bytes = new Uint8Array([1, 2, 3]);

  const h = withMockFetch(async ({ calls }) => {
    await httpGetBytes("192.168.125.178", "/test", {
      auth: { username: "user", password: "secret" },
    });
    const authHeader = calls[0].init.headers?.authorization;
    assert.ok(authHeader?.startsWith("Basic "));
  });

  await h.run(async () => {
    return responseBytes(bytes, { status: 200 });
  });
});

// --- getDefaultAuth ---

test("http: getDefaultAuth returns undefined when no env vars set", () => {
  const prevUser = process.env.PHONE_USERNAME;
  const prevPass = process.env.PHONE_PASSWORD;
  const prevUser2 = process.env.PHONE_USER;
  const prevPass2 = process.env.PHONE_PASS;
  delete process.env.PHONE_USERNAME;
  delete process.env.PHONE_PASSWORD;
  delete process.env.PHONE_USER;
  delete process.env.PHONE_PASS;

  try {
    assert.equal(getDefaultAuth(), undefined);
  } finally {
    if (prevUser !== undefined) process.env.PHONE_USERNAME = prevUser;
    if (prevPass !== undefined) process.env.PHONE_PASSWORD = prevPass;
    if (prevUser2 !== undefined) process.env.PHONE_USER = prevUser2;
    if (prevPass2 !== undefined) process.env.PHONE_PASS = prevPass2;
  }
});

test("http: getDefaultAuth uses PHONE_USER/PHONE_PASS aliases", () => {
  const prevUser = process.env.PHONE_USERNAME;
  const prevPass = process.env.PHONE_PASSWORD;
  const prevUser2 = process.env.PHONE_USER;
  const prevPass2 = process.env.PHONE_PASS;
  delete process.env.PHONE_USERNAME;
  delete process.env.PHONE_PASSWORD;
  process.env.PHONE_USER = "altuser";
  process.env.PHONE_PASS = "altpass";

  try {
    const auth = getDefaultAuth();
    assert.equal(auth?.username, "altuser");
    assert.equal(auth?.password, "altpass");
  } finally {
    if (prevUser !== undefined) process.env.PHONE_USERNAME = prevUser;
    else delete process.env.PHONE_USERNAME;
    if (prevPass !== undefined) process.env.PHONE_PASSWORD = prevPass;
    else delete process.env.PHONE_PASSWORD;
    if (prevUser2 !== undefined) process.env.PHONE_USER = prevUser2;
    else delete process.env.PHONE_USER;
    if (prevPass2 !== undefined) process.env.PHONE_PASS = prevPass2;
    else delete process.env.PHONE_PASS;
  }
});

// --- normalizeTarget edge cases ---

test("http: normalizeTarget handles PhoneTarget object passthrough", () => {
  const target = { host: "phone.local", protocol: "https" as const, port: 8443 };
  const result = normalizeTarget(target);
  assert.deepEqual(result, target);
});

test("http: normalizeTarget handles invalid URL string", () => {
  const result = normalizeTarget("not a valid url :::");
  assert.equal(result.host, "not a valid url :::");
  assert.equal(result.protocol, "http");
});
