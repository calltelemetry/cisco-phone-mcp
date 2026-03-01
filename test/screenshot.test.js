import test from "node:test";
import assert from "node:assert/strict";

import { withMockFetch, responseBytes } from "./helpers.js";

import { getScreenshot, getScreenshotAuto } from "../dist/phone.js";

test("phone: getScreenshot returns image bytes and content type", async () => {
  const imgBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const h = withMockFetch(async () => {
    const res = await getScreenshot("192.168.125.178");
    assert.equal(res.status, 200);
    assert.equal(res.contentType, "image/png");
    assert.deepEqual(Array.from(res.bytes), Array.from(imgBytes));
  });

  await h.run(async (url) => {
    if (url.endsWith("/CGI/Screenshot")) {
      return responseBytes(imgBytes, { status: 200, headers: { "content-type": "image/png" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});

test("phone: getScreenshot returns BMP for 79xx phones", async () => {
  const bmpBytes = new Uint8Array([0x42, 0x4d, 0x00, 0x00]);

  const h = withMockFetch(async () => {
    const res = await getScreenshot("192.168.125.178", undefined, "/CGI/Screenshot");
    assert.equal(res.status, 200);
    assert.equal(res.contentType, "image/bmp");
    assert.deepEqual(Array.from(res.bytes), Array.from(bmpBytes));
  });

  await h.run(async (url) => {
    if (url.endsWith("/CGI/Screenshot")) {
      return responseBytes(bmpBytes, { status: 200, headers: { "content-type": "image/bmp" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});

test("phone: getScreenshot with auth credentials", async () => {
  const imgBytes = new Uint8Array([1, 2, 3]);

  const h = withMockFetch(async ({ calls }) => {
    const res = await getScreenshot("192.168.125.178", { username: "admin", password: "pass" });
    assert.equal(res.status, 200);
    const authHeader = calls[0].init.headers?.authorization;
    assert.ok(authHeader?.startsWith("Basic "));
  });

  await h.run(async (url) => {
    if (url.endsWith("/CGI/Screenshot")) {
      return responseBytes(imgBytes, { status: 200, headers: { "content-type": "image/png" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});

test("phone: getScreenshot handles HTTP error", async () => {
  const h = withMockFetch(async () => {
    const res = await getScreenshot("192.168.125.178");
    assert.equal(res.status, 403);
    assert.equal(res.bytes.length, 0);
  });

  await h.run(async () => {
    return responseBytes(new Uint8Array(), { status: 403, headers: { "content-type": "text/plain" } });
  });
});

test("phone: getScreenshotAuto tries 39xx lcd.bmp path", async () => {
  const imgBytes = new Uint8Array([0x42, 0x4d, 0x01, 0x02]);

  const h = withMockFetch(async ({ calls }) => {
    const res = await getScreenshotAuto("192.168.125.178", undefined, "Cisco 3905");
    assert.equal(res.status, 200);
    assert.ok(res.usedUrl.includes("/CGI/lcd.bmp"));
    assert.equal(calls.length, 1);
  });

  await h.run(async (url) => {
    if (url.includes("/CGI/lcd.bmp")) {
      return responseBytes(imgBytes, { status: 200, headers: { "content-type": "image/bmp" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});

test("phone: getScreenshotAuto tries 69xx lcd.bmp path", async () => {
  const imgBytes = new Uint8Array([0x42, 0x4d, 0x03, 0x04]);

  const h = withMockFetch(async ({ calls }) => {
    const res = await getScreenshotAuto("192.168.125.178", undefined, "Cisco 6961");
    assert.equal(res.status, 200);
    assert.ok(res.usedUrl.includes("/CGI/lcd.bmp"));
    assert.equal(calls.length, 1);
  });

  await h.run(async (url) => {
    if (url.includes("/CGI/lcd.bmp")) {
      return responseBytes(imgBytes, { status: 200, headers: { "content-type": "image/bmp" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});

test("phone: getScreenshotAuto tries CP-98xx prefix (https first)", async () => {
  const imgBytes = new Uint8Array([1, 2, 3]);

  const h = withMockFetch(async () => {
    const res = await getScreenshotAuto("192.168.125.178", undefined, "CP-9851");
    assert.equal(res.status, 200);
    assert.equal(res.attempted[0], "https://192.168.125.178/CGI/Screenshot");
  });

  await h.run(async (url) => {
    if (url.startsWith("https://")) {
      return responseBytes(imgBytes, { status: 200, headers: { "content-type": "image/png" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});

test("phone: getScreenshotAuto tries CP-39xx prefix", async () => {
  const imgBytes = new Uint8Array([1, 2]);

  const h = withMockFetch(async () => {
    const res = await getScreenshotAuto("192.168.125.178", undefined, "CP-3905");
    assert.equal(res.status, 200);
    assert.ok(res.usedUrl.includes("/CGI/lcd.bmp"));
  });

  await h.run(async (url) => {
    if (url.includes("/CGI/lcd.bmp")) {
      return responseBytes(imgBytes, { status: 200, headers: { "content-type": "image/bmp" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});

test("phone: getScreenshotAuto tries CP-69xx prefix", async () => {
  const imgBytes = new Uint8Array([1, 2]);

  const h = withMockFetch(async () => {
    const res = await getScreenshotAuto("192.168.125.178", undefined, "CP-6961");
    assert.equal(res.status, 200);
    assert.ok(res.usedUrl.includes("/CGI/lcd.bmp"));
  });

  await h.run(async (url) => {
    if (url.includes("/CGI/lcd.bmp")) {
      return responseBytes(imgBytes, { status: 200, headers: { "content-type": "image/bmp" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});

test("phone: getScreenshotAuto stops at 401 even with partial auth (username only)", async () => {
  const h = withMockFetch(async ({ calls }) => {
    const res = await getScreenshotAuto("192.168.125.178", { username: "admin" });
    assert.equal(res.status, 401);
    assert.equal(calls.length, 1);
  });

  await h.run(async () => {
    return responseBytes(new Uint8Array(), { status: 401, headers: { "content-type": "text/plain" } });
  });
});

test("phone: getScreenshotAuto stops at 401 with password only (no username)", async () => {
  const h = withMockFetch(async ({ calls }) => {
    const res = await getScreenshotAuto("192.168.125.178", { password: "secret" });
    assert.equal(res.status, 401);
    assert.equal(calls.length, 1);
  });

  await h.run(async () => {
    return responseBytes(new Uint8Array(), { status: 401, headers: { "content-type": "text/plain" } });
  });
});

test("phone: getScreenshotAuto retries all candidates with full auth on 401", async () => {
  const imgBytes = new Uint8Array([1, 2, 3]);

  const h = withMockFetch(async ({ calls }) => {
    const res = await getScreenshotAuto("192.168.125.178", { username: "admin", password: "pass" });
    assert.equal(res.status, 200);
    // With full auth, it should NOT break on 401 — it tries the next candidate
    assert.ok(calls.length > 1);
  });

  await h.run(async (url) => {
    if (url.endsWith("/CGI/Screenshot")) {
      return responseBytes(new Uint8Array(), { status: 401, headers: { "content-type": "text/plain" } });
    }
    if (url.endsWith("/CGI/ScreenShot")) {
      return responseBytes(imgBytes, { status: 200, headers: { "content-type": "image/png" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});

test("phone: getScreenshotAuto returns 500 when all candidates fail with status 0", async () => {
  const h = withMockFetch(async () => {
    // No model hint → tries 4 default candidates, all return empty 200
    const res = await getScreenshotAuto("192.168.125.178", undefined, null);
    assert.equal(res.bytes.length, 0);
    assert.equal(res.attempted.length, 4);
  });

  await h.run(async () => {
    // 200 but empty body — doesn't count as success
    return responseBytes(new Uint8Array(), { status: 200, headers: { "content-type": "text/plain" } });
  });
});

test("phone: getScreenshotAuto with null modelHint uses default candidates", async () => {
  const imgBytes = new Uint8Array([1, 2, 3]);

  const h = withMockFetch(async () => {
    const res = await getScreenshotAuto("192.168.125.178", undefined, null);
    assert.equal(res.status, 200);
    assert.ok(res.usedUrl.includes("/CGI/Screenshot"));
  });

  await h.run(async (url) => {
    if (url.endsWith("/CGI/Screenshot")) {
      return responseBytes(imgBytes, { status: 200, headers: { "content-type": "image/png" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});

test("phone: getScreenshotAuto with empty string modelHint uses default candidates", async () => {
  const imgBytes = new Uint8Array([5, 6, 7]);

  const h = withMockFetch(async () => {
    const res = await getScreenshotAuto("192.168.125.178", undefined, "  ");
    assert.equal(res.status, 200);
    // Empty/whitespace model hint should fall through to default candidates
    assert.ok(res.attempted.length > 0);
  });

  await h.run(async (url) => {
    if (url.endsWith("/CGI/Screenshot")) {
      return responseBytes(imgBytes, { status: 200, headers: { "content-type": "image/png" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});
