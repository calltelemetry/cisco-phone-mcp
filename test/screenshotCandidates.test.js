import test from "node:test";
import assert from "node:assert/strict";

import { withMockFetch, responseBytes } from "./helpers.js";

import { getScreenshotAuto } from "../dist/phone.js";

test("phone: getScreenshotAuto tries https first for Cisco 98xx model hint", async () => {
  const host = "192.168.125.178";
  const bytes = new Uint8Array([1, 2, 3]);

  const h = withMockFetch(async () => {
    const res = await getScreenshotAuto(host, undefined, "Cisco 9861");
    assert.equal(res.status, 200);
    assert.equal(res.usedUrl, `http://${host}/CGI/Screenshot`);
    assert.equal(res.attempted[0], `https://${host}/CGI/Screenshot`);
    assert.equal(res.attempted[1], `http://${host}/CGI/Screenshot`);
    assert.deepEqual(Array.from(res.bytes), Array.from(bytes));
  });

  await h.run(async (url) => {
    if (url === `https://${host}/CGI/Screenshot`) {
      return responseBytes(new Uint8Array(), { status: 404, headers: { "content-type": "text/plain" } });
    }
    if (url === `http://${host}/CGI/Screenshot`) {
      return responseBytes(bytes, { status: 200, headers: { "content-type": "image/png" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});
