import test from "node:test";
import assert from "node:assert/strict";

import { withMockFetch, responseText } from "./helpers.js";

import { getStreamingStatistics, getStreamingStatisticsStream, getRtpStats } from "../dist/phone.js";

test("phone: getStreamingStatistics parses StreamingStatisticsX", async () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<StreamingStatistics>
  <RemoteAddr>192.168.125.10/20000</RemoteAddr>
  <LocalAddr>192.168.125.178/34567</LocalAddr>
  <StreamStatus>Active</StreamStatus>
  <SenderPackets>111</SenderPackets>
  <SenderOctets>222</SenderOctets>
  <SenderCodec>G711u</SenderCodec>
  <RcvrPackets>333</RcvrPackets>
  <RcvrOctets>444</RcvrOctets>
  <RcvrCodec>G711u</RcvrCodec>
  <RcvrLostPackets>5</RcvrLostPackets>
  <AvgJitter>1</AvgJitter>
  <MaxJitter>9</MaxJitter>
  <Latency>10</Latency>
  <MOSLQK>4.32</MOSLQK>
</StreamingStatistics>`;

  const h = withMockFetch(async () => {
    const ss = await getStreamingStatistics("192.168.125.178");
    assert.equal(ss.remoteAddrRaw, "192.168.125.10/20000");
    assert.equal(ss.localAddrRaw, "192.168.125.178/34567");
    assert.equal(ss.streamStatus, "Active");
    assert.equal(ss.senderPackets, 111);
    assert.equal(ss.rcvrPackets, 333);
    assert.equal(ss.rcvrLostPackets, 5);
    assert.equal(ss.mosLqk, 4.32);

    const summary = await getRtpStats("192.168.125.178");
    assert.equal(summary.remote.host, "192.168.125.10");
    assert.equal(summary.remote.port, 20000);
    assert.equal(summary.local.host, "192.168.125.178");
    assert.equal(summary.local.port, 34567);
    assert.equal(summary.rxPackets, 333);
  });

  await h.run(async (url) => {
    if (url.endsWith("/StreamingStatisticsX")) {
      return responseText(xml, { status: 200, headers: { "content-type": "text/xml" } });
    }
    return responseText("not found", { status: 404 });
  });
});

test("phone: getStreamingStatisticsStream parses Serviceability HTML stream", async () => {
  const html = `
<HTML><BODY>
<TABLE>
<TR><TD><B> Remote Address </B></TD><TD><B>192.168.125.10/20000</B></TD></TR>
<TR><TD><B> Local Address </B></TD><TD><B>192.168.125.178/34567</B></TD></TR>
<TR><TD><B> Stream Status </B></TD><TD><B>Active</B></TD></TR>
<TR><TD><B> Sender Packets </B></TD><TD><B>111</B></TD></TR>
<TR><TD><B> Sender Octets </B></TD><TD><B>222</B></TD></TR>
<TR><TD><B> Sender Codec </B></TD><TD><B>G711u</B></TD></TR>
<TR><TD><B> Rcvr Packets </B></TD><TD><B>333</B></TD></TR>
<TR><TD><B> Rcvr Octets </B></TD><TD><B>444</B></TD></TR>
<TR><TD><B> Rcvr Codec </B></TD><TD><B>G711u</B></TD></TR>
<TR><TD><B> Rcvr Lost Packets </B></TD><TD><B>5</B></TD></TR>
<TR><TD><B> Avg Jitter </B></TD><TD><B>1</B></TD></TR>
<TR><TD><B> Max Jitter </B></TD><TD><B>9</B></TD></TR>
<TR><TD><B> Latency </B></TD><TD><B>10</B></TD></TR>
<TR><TD><B> MOS LQK </B></TD><TD><B>4.00</B></TD></TR>
</TABLE>
</BODY></HTML>`;

  const h = withMockFetch(async () => {
    const ss = await getStreamingStatisticsStream("192.168.125.178", 0);
    assert.equal(ss.streamIndex, 0);
    assert.equal(ss.remoteAddrRaw, "192.168.125.10/20000");
    assert.equal(ss.localAddrRaw, "192.168.125.178/34567");
    assert.equal(ss.streamStatus, "Active");
    assert.equal(ss.senderPackets, 111);
    assert.equal(ss.rcvrPackets, 333);
    assert.equal(ss.rcvrLostPackets, 5);
    assert.equal(ss.mosLqk, 4.0);
  });

  await h.run(async (url) => {
    if (url.includes("/CGI/Java/Serviceability") && url.includes("device.statistics.streaming.0")) {
      return responseText(html, { status: 200, headers: { "content-type": "text/html" } });
    }
    return responseText("not found", { status: 404 });
  });
});

test("phone: getStreamingStatisticsStream tolerates Receiver packets label variant", async () => {
  const html = `
<HTML><BODY>
<TABLE>
<TR><TD><B> Remote Address </B></TD><TD><B>192.168.125.10/20000</B></TD></TR>
<TR><TD><B> Local Address </B></TD><TD><B>192.168.125.178/34567</B></TD></TR>
<TR><TD><B> Stream Status </B></TD><TD><B>Active</B></TD></TR>
<TR><TD><B> Sender Packets </B></TD><TD><B>111</B></TD></TR>
<TR><TD><B> Sender Octets </B></TD><TD><B>222</B></TD></TR>
<TR><TD><B> Sender Codec </B></TD><TD><B>G711u</B></TD></TR>
<TR><TD><B> Receiver packets </B></TD><TD><B>333</B></TD></TR>
<TR><TD><B> Receiver octets </B></TD><TD><B>444</B></TD></TR>
<TR><TD><B> Receiver codec </B></TD><TD><B>G711u</B></TD></TR>
<TR><TD><B> Receiver lost packets </B></TD><TD><B>5</B></TD></TR>
</TABLE>
</BODY></HTML>`;

  const h = withMockFetch(async () => {
    const ss = await getStreamingStatisticsStream("192.168.125.178", 0);
    assert.equal(ss.rcvrPackets, 333);
    assert.equal(ss.rcvrOctets, 444);
    assert.equal(ss.rcvrCodec, "G711u");
    assert.equal(ss.rcvrLostPackets, 5);
  });

  await h.run(async (url) => {
    if (url.includes("/CGI/Java/Serviceability") && url.includes("device.statistics.streaming.0")) {
      return responseText(html, { status: 200, headers: { "content-type": "text/html" } });
    }
    return responseText("not found", { status: 404 });
  });
});
