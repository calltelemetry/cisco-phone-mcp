import test from "node:test";
import assert from "node:assert/strict";

import { withMockFetch, responseText } from "./helpers.js";

import {
  getStreamingStatistics,
  getStreamingStatisticsStream,
  getRtpStats,
} from "../src/phone.js";

// --- HTTP error paths ---

test("phone: getStreamingStatistics throws on HTTP 400+", async () => {
  const h = withMockFetch(async () => {
    await assert.rejects(
      () => getStreamingStatistics("192.168.125.178"),
      (err: Error) => {
        assert.ok(err.message.includes("StreamingStatisticsX HTTP 403"));
        return true;
      }
    );
  });

  await h.run(async () => {
    return responseText("Forbidden", { status: 403 });
  });
});

test("phone: getStreamingStatisticsStream throws on HTTP 500", async () => {
  const h = withMockFetch(async () => {
    await assert.rejects(
      () => getStreamingStatisticsStream("192.168.125.178", 2),
      (err: Error) => {
        assert.ok(err.message.includes("streaming.2 HTTP 500"));
        return true;
      }
    );
  });

  await h.run(async () => {
    return responseText("Internal Server Error", { status: 500 });
  });
});

// --- Stream index boundary validation ---

test("phone: getStreamingStatisticsStream rejects negative stream index", async () => {
  await assert.rejects(
    () => getStreamingStatisticsStream("192.168.125.178", -1),
    (err: Error) => {
      assert.ok(err.message.includes("streamIndex out of range"));
      assert.ok(err.message.includes("-1"));
      return true;
    }
  );
});

test("phone: getStreamingStatisticsStream rejects stream index > 4", async () => {
  await assert.rejects(
    () => getStreamingStatisticsStream("192.168.125.178", 5),
    (err: Error) => {
      assert.ok(err.message.includes("streamIndex out of range"));
      assert.ok(err.message.includes("5"));
      return true;
    }
  );
});

test("phone: getStreamingStatisticsStream accepts boundary index 0", async () => {
  const html = `<HTML><BODY><B>Stream Status</B><B>Active</B></BODY></HTML>`;
  const h = withMockFetch(async () => {
    const ss = await getStreamingStatisticsStream("192.168.125.178", 0);
    assert.equal(ss.streamIndex, 0);
  });

  await h.run(async (url) => {
    if (url.includes("device.statistics.streaming.0")) {
      return responseText(html, { status: 200 });
    }
    return responseText("not found", { status: 404 });
  });
});

test("phone: getStreamingStatisticsStream accepts boundary index 4", async () => {
  const html = `<HTML><BODY><B>Stream Status</B><B>Idle</B></BODY></HTML>`;
  const h = withMockFetch(async () => {
    const ss = await getStreamingStatisticsStream("192.168.125.178", 4);
    assert.equal(ss.streamIndex, 4);
  });

  await h.run(async (url) => {
    if (url.includes("device.statistics.streaming.4")) {
      return responseText(html, { status: 200 });
    }
    return responseText("not found", { status: 404 });
  });
});

// --- Null/empty RTP address handling ---

test("phone: getRtpStats handles null addresses when no active stream", async () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<StreamingStatistics>
  <StreamStatus>Idle</StreamStatus>
</StreamingStatistics>`;

  const h = withMockFetch(async () => {
    const summary = await getRtpStats("192.168.125.178");
    assert.equal(summary.streamStatus, "Idle");
    assert.equal(summary.local, null);
    assert.equal(summary.remote, null);
    assert.equal(summary.rxPackets, null);
    assert.equal(summary.txPackets, null);
    assert.equal(summary.lostPackets, null);
    assert.equal(summary.jitter!.avg, null);
    assert.equal(summary.jitter!.max, null);
    assert.equal(summary.codec!.rx, null);
    assert.equal(summary.codec!.tx, null);
    assert.equal(summary.mosLqk, null);
  });

  await h.run(async () => {
    return responseText(xml, { status: 200, headers: { "content-type": "text/xml" } });
  });
});

test("phone: getRtpStats handles empty string addresses via || null coercion", async () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<StreamingStatistics>
  <RemoteAddr></RemoteAddr>
  <LocalAddr></LocalAddr>
  <StreamStatus>Idle</StreamStatus>
</StreamingStatistics>`;

  const h = withMockFetch(async () => {
    const summary = await getRtpStats("192.168.125.178");
    assert.equal(summary.local, null);
    assert.equal(summary.remote, null);
  });

  await h.run(async () => {
    return responseText(xml, { status: 200, headers: { "content-type": "text/xml" } });
  });
});

// --- MOSLQK edge cases ---

test("phone: getStreamingStatistics handles non-numeric MOSLQK", async () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<StreamingStatistics>
  <MOSLQK>N/A</MOSLQK>
</StreamingStatistics>`;

  const h = withMockFetch(async () => {
    const ss = await getStreamingStatistics("192.168.125.178");
    assert.equal(ss.mosLqk, null);
  });

  await h.run(async () => {
    return responseText(xml, { status: 200, headers: { "content-type": "text/xml" } });
  });
});

test("phone: getStreamingStatisticsStream handles non-numeric MOS LQK in HTML", async () => {
  const html = `<HTML><BODY>
<TR><TD><B> MOS LQK </B></TD><TD><B>NotANumber</B></TD></TR>
</BODY></HTML>`;

  const h = withMockFetch(async () => {
    const ss = await getStreamingStatisticsStream("192.168.125.178", 0);
    assert.equal(ss.mosLqk, null);
  });

  await h.run(async (url) => {
    if (url.includes("device.statistics.streaming.0")) {
      return responseText(html, { status: 200 });
    }
    return responseText("not found", { status: 404 });
  });
});

// --- Receiver label variants (Receiver Packets with capital P) ---

test("phone: getStreamingStatisticsStream handles Receiver Packets (title case) label", async () => {
  const html = `<HTML><BODY>
<TR><TD><B> Receiver Packets </B></TD><TD><B>500</B></TD></TR>
<TR><TD><B> Receiver Octets </B></TD><TD><B>80000</B></TD></TR>
<TR><TD><B> Receiver Codec </B></TD><TD><B>G722</B></TD></TR>
<TR><TD><B> Receiver Lost Packets </B></TD><TD><B>3</B></TD></TR>
</BODY></HTML>`;

  const h = withMockFetch(async () => {
    const ss = await getStreamingStatisticsStream("192.168.125.178", 0);
    assert.equal(ss.rcvrPackets, 500);
    assert.equal(ss.rcvrOctets, 80000);
    assert.equal(ss.rcvrCodec, "G722");
    assert.equal(ss.rcvrLostPackets, 3);
  });

  await h.run(async (url) => {
    if (url.includes("device.statistics.streaming.0")) {
      return responseText(html, { status: 200 });
    }
    return responseText("not found", { status: 404 });
  });
});

// --- extractBoldValue edge cases ---

test("phone: getStreamingStatisticsStream handles missing labels gracefully", async () => {
  const html = `<HTML><BODY><TABLE>
<TR><TD><B>Unknown Field</B></TD><TD><B>42</B></TD></TR>
</TABLE></BODY></HTML>`;

  const h = withMockFetch(async () => {
    const ss = await getStreamingStatisticsStream("192.168.125.178", 1);
    assert.equal(ss.streamIndex, 1);
    assert.equal(ss.remoteAddrRaw, null);
    assert.equal(ss.localAddrRaw, null);
    assert.equal(ss.streamStatus, null);
    assert.equal(ss.senderPackets, null);
    assert.equal(ss.rcvrPackets, null);
  });

  await h.run(async (url) => {
    if (url.includes("device.statistics.streaming.1")) {
      return responseText(html, { status: 200 });
    }
    return responseText("not found", { status: 404 });
  });
});

test("phone: getStreamingStatisticsStream handles empty bold values", async () => {
  const html = `<HTML><BODY>
<TR><TD><B> Remote Address </B></TD><TD><B></B></TD></TR>
<TR><TD><B> Stream Status </B></TD><TD><B>  </B></TD></TR>
</BODY></HTML>`;

  const h = withMockFetch(async () => {
    const ss = await getStreamingStatisticsStream("192.168.125.178", 0);
    assert.equal(ss.remoteAddrRaw, null);
    assert.equal(ss.streamStatus, null);
  });

  await h.run(async (url) => {
    if (url.includes("device.statistics.streaming.0")) {
      return responseText(html, { status: 200 });
    }
    return responseText("not found", { status: 404 });
  });
});
