import test from "node:test";
import assert from "node:assert/strict";

import { withMockFetch, responseText } from "./helpers.js";

import { getStreamingStatisticsAllStreams } from "../src/phone.js";

test("phone: getStreamingStatisticsAllStreams always returns 5 entries", async () => {
  const html0 = `<HTML><BODY><B>Stream Status</B><B>Active</B><B>Local Address</B><B>1.2.3.4/1111</B></BODY></HTML>`;
  const html4 = `<HTML><BODY><B>Stream Status</B><B>Active</B><B>Local Address</B><B>1.2.3.4/4444</B></BODY></HTML>`;

  const h = withMockFetch(async () => {
    const streams = await getStreamingStatisticsAllStreams("192.168.125.178");
    assert.equal(streams.length, 5);
    assert.equal(streams[0].streamIndex, 0);
    assert.equal(streams[0].streamStatus, "Active");
    assert.equal(streams[4].streamIndex, 4);
    assert.equal(streams[4].streamStatus, "Active");
    assert.equal(streams[1].streamIndex, 1);
    assert.equal(streams[1].streamStatus, "ERROR");
  });

  await h.run(async (url) => {
    if (url.includes("device.statistics.streaming.0")) return responseText(html0, { status: 200 });
    if (url.includes("device.statistics.streaming.4")) return responseText(html4, { status: 200 });
    return responseText("nope", { status: 404 });
  });
});
