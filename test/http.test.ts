import test from "node:test";
import assert from "node:assert/strict";

import { withMockFetch, responseText } from "./helpers.js";

import { normalizeTarget, buildBaseUrl, httpGetText } from "../src/http.js";

// --- normalizeTarget ---

test("http: normalizeTarget/buildBaseUrl handle scheme and port", () => {
  assert.deepEqual(normalizeTarget("192.168.1.10"), { host: "192.168.1.10", protocol: "http", port: undefined });
  assert.deepEqual(normalizeTarget("http://phone.local"), { host: "phone.local", protocol: "http", port: undefined });
  assert.deepEqual(normalizeTarget("https://phone.local:8443"), { host: "phone.local", protocol: "https", port: 8443 });

  assert.equal(buildBaseUrl({ host: "x", protocol: "http" }), "http://x");
  assert.equal(buildBaseUrl({ host: "x", protocol: "https", port: 8443 }), "https://x:8443");
});

test("http: normalizeTarget handles bare IP with port (host:port)", () => {
  const result = normalizeTarget("192.168.1.10:8080");
  assert.equal(result.host, "192.168.1.10");
  assert.equal(result.port, 8080);
  assert.equal(result.protocol, "http");
});

test("http: normalizeTarget handles hostname without scheme", () => {
  const result = normalizeTarget("phone.local");
  assert.equal(result.host, "phone.local");
  assert.equal(result.protocol, "http");
  assert.equal(result.port, undefined);
});

test("http: normalizeTarget handles https URL without port", () => {
  const result = normalizeTarget("https://10.0.0.1");
  assert.equal(result.host, "10.0.0.1");
  assert.equal(result.protocol, "https");
  assert.equal(result.port, undefined);
});

// --- buildBaseUrl ---

test("http: buildBaseUrl defaults to http when protocol is undefined", () => {
  assert.equal(buildBaseUrl({ host: "phone.local" }), "http://phone.local");
});

test("http: buildBaseUrl omits port when undefined", () => {
  assert.equal(buildBaseUrl({ host: "phone.local", protocol: "https" }), "https://phone.local");
});

// --- httpGetText ---

test("http: httpGetText uses default auth env vars when present", async () => {
  const prevUser = process.env.PHONE_USERNAME;
  const prevPass = process.env.PHONE_PASSWORD;
  process.env.PHONE_USERNAME = "user";
  process.env.PHONE_PASSWORD = "pass";

  try {
    const h = withMockFetch(async () => {
      const r = await httpGetText("192.168.125.178", "/");
      assert.equal(r.status, 200);
    });

    await h.run(async (_url, init) => {
      const headers = (init.headers || {}) as Record<string, string>;
      const auth = headers.authorization || headers.Authorization || headers["authorization"];
      assert.ok(auth, "Expected authorization header");
      assert.ok(String(auth).startsWith("Basic "));
      return responseText("ok", { status: 200 });
    });
  } finally {
    process.env.PHONE_USERNAME = prevUser;
    process.env.PHONE_PASSWORD = prevPass;
  }
});

test("http: httpGetText returns body, status, and lowercase headers", async () => {
  const h = withMockFetch(async () => {
    const r = await httpGetText("192.168.125.178", "/DeviceInformationX");
    assert.equal(r.status, 200);
    assert.equal(r.body, "<xml>data</xml>");
    assert.equal(r.headers["content-type"], "text/xml");
  });

  await h.run(async () => {
    return responseText("<xml>data</xml>", { status: 200, headers: { "Content-Type": "text/xml" } });
  });
});

test("http: httpGetText constructs correct URL from host and path", async () => {
  const h = withMockFetch(async () => {
    await httpGetText("https://phone.local:8443", "/DeviceInformationX");
  });

  await h.run(async (url) => {
    assert.equal(url, "https://phone.local:8443/DeviceInformationX");
    return responseText("ok", { status: 200 });
  });
});
