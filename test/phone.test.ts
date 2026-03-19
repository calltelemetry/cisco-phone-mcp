import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { withMockFetch, responseText, responseBytes, parseFormBody } from "./helpers.js";

import {
  getDeviceInformation,
  getNetworkConfiguration,
  getStreamingStatistics,
  getStreamingStatisticsStream,
  getRtpStats,
  executePhoneCommand,
  getScreenshotAuto,
} from "../src/phone.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

// --- Fixture-based tests ---

test("phone: getDeviceInformation parses fixture XML", async () => {
  const xml = fixture("deviceInformation.xml");
  const h = withMockFetch(async () => {
    const di = await getDeviceInformation("192.168.125.178");
    assert.equal(di.hostName, "SEP001122334455");
    assert.equal(di.phoneDn, "1001");
    assert.equal(di.macAddress, "00:11:22:33:44:55");
    assert.equal(di.serialNumber, "FCH1234ABCD");
    assert.equal(di.modelNumber, "CP-8841");
  });

  await h.run(async () => responseText(xml, { status: 200 }));
});

test("phone: getNetworkConfiguration parses fixture XML", async () => {
  const xml = fixture("networkConfiguration.xml");
  const h = withMockFetch(async () => {
    const nc = await getNetworkConfiguration("192.168.125.178");
    assert.equal(nc.ipAddress, "192.168.125.178");
    assert.equal(nc.subNetMask, "255.255.255.0");
    assert.equal(nc.callManager1, "192.168.125.10");
  });

  await h.run(async () => responseText(xml, { status: 200 }));
});

test("phone: getStreamingStatistics parses fixture XML", async () => {
  const xml = fixture("streamingStatistics.xml");
  const h = withMockFetch(async () => {
    const ss = await getStreamingStatistics("192.168.125.178");
    assert.equal(ss.streamStatus, "Active");
    assert.equal(ss.senderPackets, 111);
    assert.equal(ss.rcvrLostPackets, 5);
    assert.equal(ss.mosLqk, 4.32);
    assert.equal(ss.rcvrDiscarded, 0);
    assert.equal(ss.senderJoins, 1);
    assert.equal(ss.byes, 0);
  });

  await h.run(async () => responseText(xml, { status: 200 }));
});

test("phone: getStreamingStatisticsStream parses fixture HTML", async () => {
  const html = fixture("streamingServiceability.html");
  const h = withMockFetch(async () => {
    const ss = await getStreamingStatisticsStream("192.168.125.178", 0);
    assert.equal(ss.streamIndex, 0);
    assert.equal(ss.name, "SEP001122334455");
    assert.equal(ss.remoteAddrRaw, "192.168.125.10/20000");
    assert.equal(ss.streamStatus, "Active");
    assert.equal(ss.senderPackets, 111);
    assert.equal(ss.rcvrPackets, 333);
    assert.equal(ss.rcvrDiscarded, 0);
    assert.equal(ss.mosLqk, 4.0);
  });

  await h.run(async (url) => {
    if (url.includes("device.statistics.streaming.0")) {
      return responseText(html, { status: 200 });
    }
    return responseText("not found", { status: 404 });
  });
});

// --- escapeXmlAttr via executePhoneCommand ---

test("phone: escapeXmlAttr escapes ampersand", async () => {
  const h = withMockFetch(async () => {
    await executePhoneCommand("192.168.125.178", ["Key:A&B"]);
  });

  await h.run(async (_url, init) => {
    const form = parseFormBody(init.body);
    assert.ok(form.XML.includes("Key:A&amp;B"));
    assert.ok(!form.XML.includes("Key:A&B\""));
    return responseText("ok", { status: 200 });
  });
});

test("phone: escapeXmlAttr escapes double quotes", async () => {
  const h = withMockFetch(async () => {
    await executePhoneCommand("192.168.125.178", ['Dial:"1234"']);
  });

  await h.run(async (_url, init) => {
    const form = parseFormBody(init.body);
    assert.ok(form.XML.includes("Dial:&quot;1234&quot;"));
    return responseText("ok", { status: 200 });
  });
});

test("phone: escapeXmlAttr escapes angle brackets", async () => {
  const h = withMockFetch(async () => {
    await executePhoneCommand("192.168.125.178", ["Key:<Test>"]);
  });

  await h.run(async (_url, init) => {
    const form = parseFormBody(init.body);
    assert.ok(form.XML.includes("Key:&lt;Test&gt;"));
    return responseText("ok", { status: 200 });
  });
});

test("phone: escapeXmlAttr handles string with all special chars", async () => {
  const h = withMockFetch(async () => {
    await executePhoneCommand("192.168.125.178", ['&"<>']);
  });

  await h.run(async (_url, init) => {
    const form = parseFormBody(init.body);
    assert.ok(form.XML.includes("&amp;&quot;&lt;&gt;"));
    return responseText("ok", { status: 200 });
  });
});

// --- guessScreenshotCandidates via getScreenshotAuto ---

test("phone: getScreenshotAuto uses default fallback paths for unknown model", async () => {
  const imgBytes = new Uint8Array([1, 2, 3]);
  const attempted: string[] = [];

  const h = withMockFetch(async () => {
    const res = await getScreenshotAuto("192.168.125.178", undefined, "Cisco 7975G");
    assert.equal(res.status, 200);
    // Unknown model should try /CGI/Screenshot first
    assert.ok(res.attempted[0].includes("/CGI/Screenshot"));
  });

  await h.run(async (url) => {
    attempted.push(url);
    if (url.endsWith("/CGI/Screenshot")) {
      return responseBytes(imgBytes, { status: 200, headers: { "content-type": "image/bmp" } });
    }
    return responseBytes(new Uint8Array(), { status: 404 });
  });
});

test("phone: getScreenshotAuto tries 4 candidates for unknown model before giving up", async () => {
  const h = withMockFetch(async () => {
    const res = await getScreenshotAuto("192.168.125.178", { username: "a", password: "b" }, "CP-8841");
    // All candidates returned empty, so should exhaust all 4
    assert.equal(res.attempted.length, 4);
    assert.equal(res.bytes.length, 0);
  });

  await h.run(async () => {
    return responseBytes(new Uint8Array(), { status: 200 });
  });
});

// --- getRtpStats summary ---

test("phone: getRtpStats builds correct summary from streaming stats", async () => {
  const xml = fixture("streamingStatistics.xml");
  const h = withMockFetch(async () => {
    const stats = await getRtpStats("192.168.125.178");
    assert.equal(stats.streamStatus, "Active");
    assert.deepEqual(stats.remote, { host: "192.168.125.10", port: 20000 });
    assert.deepEqual(stats.local, { host: "192.168.125.178", port: 34567 });
    assert.equal(stats.rxPackets, 333);
    assert.equal(stats.txPackets, 111);
    assert.equal(stats.lostPackets, 5);
    assert.deepEqual(stats.jitter, { avg: 1, max: 9 });
    assert.deepEqual(stats.codec, { rx: "G711u", tx: "G711u" });
    assert.equal(stats.mosLqk, 4.32);
  });

  await h.run(async () => responseText(xml, { status: 200 }));
});
