import test from "node:test";
import assert from "node:assert/strict";

import { withMockFetch, responseBytes } from "./helpers.js";

import { getScreenshotAuto } from "../dist/phone.js";

test("phone: getScreenshotAuto stops after 401 when auth missing", async () => {
  const h = withMockFetch(async ({ calls }) => {
    const res = await getScreenshotAuto("192.168.125.178");
    assert.equal(res.status, 401);
    assert.equal(calls.length, 1);
  });

  await h.run(async (url) => {
    if (url.endsWith("/CGI/Screenshot")) {
      return responseBytes(new Uint8Array(), { status: 401, headers: { "content-type": "text/plain" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});
