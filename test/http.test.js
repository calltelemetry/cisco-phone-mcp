import test from "node:test";
import assert from "node:assert/strict";

import { withMockFetch, responseText } from "./helpers.js";

import { normalizeTarget, buildBaseUrl, httpGetText } from "../dist/http.js";

test("http: normalizeTarget/buildBaseUrl handle scheme and port", () => {
  assert.deepEqual(normalizeTarget("192.168.1.10"), { host: "192.168.1.10", protocol: "http", port: undefined });
  assert.deepEqual(normalizeTarget("http://phone.local"), { host: "phone.local", protocol: "http", port: undefined });
  assert.deepEqual(normalizeTarget("https://phone.local:8443"), { host: "phone.local", protocol: "https", port: 8443 });

  assert.equal(buildBaseUrl({ host: "x", protocol: "http" }), "http://x");
  assert.equal(buildBaseUrl({ host: "x", protocol: "https", port: 8443 }), "https://x:8443");
});

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
      const headers = init.headers || {};
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
