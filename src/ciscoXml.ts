import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: true,
});

export function parseCiscoXml(xml: string): unknown {
  // Most Cisco phone endpoints respond with a single top-level element.
  return xmlParser.parse(xml);
}

export function asString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

export function asInt(v: unknown): number | null {
  const s = asString(v);
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export function parseIpPort(v: string | null): { host: string; port: number | null } | null {
  if (!v) return null;
  // Cisco likes "1.2.3.4/12345" or "0.0.0.0/0".
  const parts = v.split("/");
  const host = parts[0]?.trim();
  if (!host) return null;
  const port = parts[1] ? Number.parseInt(parts[1], 10) : null;
  return { host, port: Number.isFinite(port as number) ? port : null };
}
