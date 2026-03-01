import test from "node:test";
import assert from "node:assert/strict";

import { parseCiscoXml, asString, asInt, parseIpPort } from "../src/ciscoXml.js";

test("ciscoXml: parseCiscoXml parses simple XML", () => {
  const xml = "<Root><A>hello</A><B>123</B></Root>";
  const parsed = parseCiscoXml(xml) as { Root: { A: string; B: string } };
  assert.equal(parsed.Root.A, "hello");
  assert.equal(parsed.Root.B, "123");
});

test("ciscoXml: asString/asInt handle basic conversions", () => {
  assert.equal(asString("x"), "x");
  assert.equal(asString(5), "5");
  assert.equal(asString(true), "true");
  assert.equal(asString(null), null);

  assert.equal(asInt("12"), 12);
  assert.equal(asInt(12), 12);
  assert.equal(asInt("abc"), null);
  assert.equal(asInt(null), null);
});

test("ciscoXml: parseIpPort handles host/port", () => {
  assert.deepEqual(parseIpPort("192.168.1.10/16384"), { host: "192.168.1.10", port: 16384 });
  assert.deepEqual(parseIpPort("0.0.0.0/0"), { host: "0.0.0.0", port: 0 });
  assert.deepEqual(parseIpPort("10.0.0.1"), { host: "10.0.0.1", port: null });
  assert.equal(parseIpPort(null), null);
});
