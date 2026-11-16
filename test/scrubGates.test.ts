import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error plain .mjs gate module without type declarations
import { findInternals, isDocumentationAddress, scanEntries } from "../scripts/scrub-patterns.mjs";

type Hit = { pattern: string; match: string };

// Planted values are assembled at runtime so this file never carries a
// literal internal address and cannot trip the source scan itself.
const ip = (...octets: number[]) => octets.join(".");
const rfc1918 = [ip(10, 1, 2, 3), ip(172, 16, 0, 9), ip(172, 31, 255, 1), ip(192, 168, 7, 8)];
const cgnat = ip(100, 64, 0, 1);
const linkLocal = ip(169, 254, 10, 20);
const doppler = ["doppler:", "//project/config/SECRET_NAME"].join("");
const clusterDns = ["api", "svc", "cluster", "local"].join(".");
const lanHost = ["phone-lab", "lab", "local"].join(".");
const ula = ["fd12", "3456", "789a", "1"].join(":") + "::1";

for (const addr of rfc1918) {
  test(`scrub gate: flags private address ${addr}`, () => {
    const hits = findInternals(`host=${addr} ok`) as Hit[];
    assert.ok(hits.map((h) => h.match).includes(addr));
  });
}

test("scrub gate: flags CGNAT, link-local, ULA, doppler, cluster DNS and .local hostnames", () => {
  const text = [cgnat, linkLocal, ula, doppler, clusterDns, lanHost].join("\n");
  const patterns = new Set((findInternals(text) as Hit[]).map((h) => h.pattern));
  for (const expected of [
    "cgnat-100",
    "link-local-169",
    "ipv6-ula",
    "doppler-path",
    "cluster-dns",
    "internal-hostname",
  ]) {
    assert.ok(patterns.has(expected), `expected pattern ${expected}`);
  }
});

test("scrub gate: allows RFC 5737 documentation ranges explicitly", () => {
  for (const addr of ["192.0.2.10", "198.51.100.25", "203.0.113.200"]) {
    assert.equal(isDocumentationAddress(addr), true);
    assert.deepEqual(findInternals(`phone at ${addr}:80`), []);
  }
  assert.equal(isDocumentationAddress(rfc1918[0] as string), false);
});

test("scrub gate: does not flag public addresses, versions, or example.com names", () => {
  const text = "dns 8.8.8.8, fw 15.0.1.12900, 12.5.1.100, host phone.example.com, 255.255.255.0";
  assert.deepEqual(findInternals(text), []);
});

test("scrub gate: does not match an address embedded in a longer dotted number", () => {
  assert.deepEqual(findInternals(`v${ip(1, 10, 1, 2, 3)}`), []);
});

test("scrub gate: reports the path for each hit", () => {
  const out = scanEntries([
    { path: "a.txt", text: "clean 192.0.2.1" },
    { path: "b.txt", text: `bad ${rfc1918[3]}` },
  ]);
  assert.deepEqual(out, [{ path: "b.txt", pattern: "rfc1918-192", match: rfc1918[3] }]);
});
