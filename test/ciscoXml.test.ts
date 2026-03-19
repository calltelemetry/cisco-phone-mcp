import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCiscoXml, asString, asInt, parseIpPort } from "../src/ciscoXml.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

// --- parseCiscoXml ---

test("ciscoXml: parseCiscoXml parses simple XML", () => {
  const xml = "<Root><A>hello</A><B>123</B></Root>";
  const parsed = parseCiscoXml(xml) as { Root: { A: string; B: string } };
  assert.equal(parsed.Root.A, "hello");
  assert.equal(parsed.Root.B, "123");
});

test("ciscoXml: parseCiscoXml parses DeviceInformation fixture", () => {
  const parsed = parseCiscoXml(fixture("deviceInformation.xml")) as any;
  assert.equal(parsed.DeviceInformation.HostName, "SEP001122334455");
  assert.equal(parsed.DeviceInformation.modelNumber, "CP-8841");
  assert.equal(parsed.DeviceInformation.serialNumber, "FCH1234ABCD");
});

test("ciscoXml: parseCiscoXml parses NetworkConfiguration fixture", () => {
  const parsed = parseCiscoXml(fixture("networkConfiguration.xml")) as any;
  assert.equal(parsed.NetworkConfiguration.IPAddress, "192.168.125.178");
  assert.equal(parsed.NetworkConfiguration.DNSServer1, "8.8.8.8");
});

test("ciscoXml: parseCiscoXml parses StreamingStatistics fixture", () => {
  const parsed = parseCiscoXml(fixture("streamingStatistics.xml")) as any;
  assert.equal(parsed.StreamingStatistics.StreamStatus, "Active");
  assert.equal(parsed.StreamingStatistics.SenderPackets, "111");
  assert.equal(parsed.StreamingStatistics.MOSLQK, "4.32");
});

test("ciscoXml: parseCiscoXml parses PortInformation fixture", () => {
  const parsed = parseCiscoXml(fixture("portInformation.xml")) as any;
  assert.equal(parsed.PortInformation.PortSpeed, "1000-Full");
  assert.equal(parsed.PortInformation.CDPNeighborDeviceId, "switch01.example.com");
});

test("ciscoXml: parseCiscoXml handles empty XML string", () => {
  const parsed = parseCiscoXml("");
  // fast-xml-parser returns an empty object for empty input
  assert.deepEqual(parsed, {});
});

test("ciscoXml: parseCiscoXml handles malformed XML gracefully", () => {
  // fast-xml-parser is lenient; it should not throw on partial XML
  assert.doesNotThrow(() => {
    parseCiscoXml("<Root><A>unclosed");
  });
});

test("ciscoXml: parseCiscoXml handles XML with attributes", () => {
  const xml = '<Phone model="8841"><Name>Test</Name></Phone>';
  const parsed = parseCiscoXml(xml) as any;
  assert.equal(parsed.Phone.Name, "Test");
  assert.equal(parsed.Phone["@_model"], "8841");
});

// --- asString edge cases ---

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

test("ciscoXml: asString returns null for undefined", () => {
  assert.equal(asString(undefined), null);
});

test("ciscoXml: asString returns null for objects and arrays", () => {
  assert.equal(asString({}), null);
  assert.equal(asString([1, 2]), null);
  assert.equal(asString({ toString: () => "hi" }), null);
});

test("ciscoXml: asString handles empty string", () => {
  assert.equal(asString(""), "");
});

test("ciscoXml: asString handles zero and false", () => {
  assert.equal(asString(0), "0");
  assert.equal(asString(false), "false");
});

// --- asInt edge cases ---

test("ciscoXml: asInt returns null for NaN input", () => {
  assert.equal(asInt(NaN), null);
});

test("ciscoXml: asInt returns null for Infinity", () => {
  assert.equal(asInt(Infinity), null);
  assert.equal(asInt(-Infinity), null);
});

test("ciscoXml: asInt returns null for empty string", () => {
  assert.equal(asInt(""), null);
});

test("ciscoXml: asInt returns null for undefined", () => {
  assert.equal(asInt(undefined), null);
});

test("ciscoXml: asInt truncates decimal strings", () => {
  assert.equal(asInt("3.14"), 3);
  assert.equal(asInt("99.9"), 99);
});

test("ciscoXml: asInt handles negative numbers", () => {
  assert.equal(asInt("-5"), -5);
  assert.equal(asInt(-10), -10);
});

test("ciscoXml: asInt handles string with leading/trailing spaces via asString", () => {
  // asString returns the string as-is, parseInt handles leading whitespace
  assert.equal(asInt("  42  "), 42);
});

test("ciscoXml: asInt handles boolean true (via asString -> '1')", () => {
  // asString(true) -> "true", parseInt("true") -> NaN -> null
  assert.equal(asInt(true), null);
});

// --- parseIpPort ---

test("ciscoXml: parseIpPort handles host/port", () => {
  assert.deepEqual(parseIpPort("192.168.1.10/16384"), { host: "192.168.1.10", port: 16384 });
  assert.deepEqual(parseIpPort("0.0.0.0/0"), { host: "0.0.0.0", port: 0 });
  assert.deepEqual(parseIpPort("10.0.0.1"), { host: "10.0.0.1", port: null });
  assert.equal(parseIpPort(null), null);
});

test("ciscoXml: parseIpPort returns null for empty string", () => {
  assert.equal(parseIpPort(""), null);
});

test("ciscoXml: parseIpPort handles non-numeric port", () => {
  const result = parseIpPort("10.0.0.1/abc");
  assert.equal(result?.host, "10.0.0.1");
  assert.equal(result?.port, null);
});

test("ciscoXml: parseIpPort handles whitespace in host", () => {
  const result = parseIpPort("  10.0.0.1  /16384");
  assert.equal(result?.host, "10.0.0.1");
  assert.equal(result?.port, 16384);
});
