import { parseCiscoXml, asString, asInt, parseIpPort } from "./ciscoXml.js";
import { httpGetText, httpPostForm, httpGetBytes, type PhoneAuth } from "./http.js";
import { getCachedCapabilities } from "./discovery.js";
import { log } from "./logger.js";
import {
  PhoneAuthError,
  PhoneNotSupportedError,
  PhoneCommandError,
} from "./errors.js";

export interface DeviceInformation {
  hostName?: string | null;
  phoneDn?: string | null;
  macAddress?: string | null;
  serialNumber?: string | null;
  modelNumber?: string | null;
  versionId?: string | null;
  appLoadId?: string | null;
}

export interface NetworkConfiguration {
  hostName?: string | null;
  ipAddress?: string | null;
  subNetMask?: string | null;
  defaultRouter1?: string | null;
  domainName?: string | null;
  dnsServer1?: string | null;
  dnsServer2?: string | null;
  tftpServer1?: string | null;
  callManager1?: string | null;
}

export interface PortInformation {
  portSpeed?: string | null;
  cdpNeighborDeviceId?: string | null;
  cdpNeighborIp?: string | null;
  cdpNeighborPort?: string | null;
  lldpNeighborDeviceId?: string | null;
  lldpNeighborIp?: string | null;
  lldpNeighborPort?: string | null;
}

export interface StreamingStatistics {
  remoteAddrRaw?: string | null;
  localAddrRaw?: string | null;
  streamStatus?: string | null;
  name?: string | null;
  senderPackets?: number | null;
  senderOctets?: number | null;
  senderCodec?: string | null;
  rcvrPackets?: number | null;
  rcvrOctets?: number | null;
  rcvrCodec?: string | null;
  rcvrLostPackets?: number | null;
  avgJitter?: number | null;
  maxJitter?: number | null;
  latency?: number | null;
  mosLqk?: number | null;
  rcvrDiscarded?: number | null;
  senderJoins?: number | null;
  byes?: number | null;
}

export interface StreamingStatisticsStream extends StreamingStatistics {
  streamIndex: number;
  /** Present when the stream fetch failed — carries the typed error code and message. */
  error?: { code: string; message: string };
}

export interface RtpStatsSummary {
  streamStatus?: string | null;
  local?: { host: string; port: number | null } | null;
  remote?: { host: string; port: number | null } | null;
  rxPackets?: number | null;
  txPackets?: number | null;
  lostPackets?: number | null;
  jitter?: { avg: number | null; max: number | null };
  codec?: { rx: string | null; tx: string | null };
  mosLqk?: number | null;
}

function top(obj: unknown): Record<string, unknown> {
  if (obj && typeof obj === "object") return obj as Record<string, unknown>;
  return {};
}

/**
 * Throw a typed PhoneError based on the HTTP status code returned by a phone endpoint.
 */
function throwForStatus(host: string, endpoint: string, status: number): never {
  if (status === 401 || status === 403) {
    throw new PhoneAuthError(host, status);
  }
  if (status === 404 || status === 405) {
    throw new PhoneNotSupportedError(host, endpoint, status);
  }
  // 5xx and anything else >= 400
  throw new PhoneCommandError(host, status, `${endpoint} HTTP ${status}`);
}

export async function getDeviceInformation(host: string, auth?: PhoneAuth, reqId?: string): Promise<DeviceInformation> {
  const start = Date.now();
  log.info("phone_op_start", { op: "getDeviceInformation", host, ...(reqId ? { reqId } : {}) });
  try {
    const resp = await httpGetText(host, "/DeviceInformationX", { auth, reqId });
    if (resp.status >= 400) {
      throwForStatus(host, "/DeviceInformationX", resp.status);
    }
    const parsed = top(parseCiscoXml(resp.body));
    const di = top(parsed["DeviceInformation"]);
    const result = {
      hostName: asString(di["HostName"]),
      phoneDn: asString(di["phoneDN"]),
      macAddress: asString(di["MACAddress"]),
      serialNumber: asString(di["serialNumber"]),
      modelNumber: asString(di["modelNumber"]),
      versionId: asString(di["versionID"]),
      appLoadId: asString(di["appLoadID"]),
    };
    log.info("phone_op_complete", { op: "getDeviceInformation", host, durationMs: Date.now() - start, success: true, ...(reqId ? { reqId } : {}) });
    return result;
  } catch (err) {
    log.error("phone_op_complete", { op: "getDeviceInformation", host, durationMs: Date.now() - start, success: false, error: err instanceof Error ? err.message : String(err), ...(reqId ? { reqId } : {}) });
    throw err;
  }
}

export async function getNetworkConfiguration(host: string, auth?: PhoneAuth, reqId?: string): Promise<NetworkConfiguration> {
  const start = Date.now();
  log.info("phone_op_start", { op: "getNetworkConfiguration", host, ...(reqId ? { reqId } : {}) });
  try {
    const resp = await httpGetText(host, "/NetworkConfigurationX", { auth, reqId });
    if (resp.status >= 400) {
      throwForStatus(host, "/NetworkConfigurationX", resp.status);
    }
    const parsed = top(parseCiscoXml(resp.body));
    const nc = top(parsed["NetworkConfiguration"]);
    const result = {
      hostName: asString(nc["HostName"]),
      ipAddress: asString(nc["IPAddress"]),
      subNetMask: asString(nc["SubNetMask"]),
      defaultRouter1: asString(nc["DefaultRouter1"]),
      domainName: asString(nc["DomainName"]),
      dnsServer1: asString(nc["DNSServer1"]),
      dnsServer2: asString(nc["DNSServer2"]),
      tftpServer1: asString(nc["TFTPServer1"]),
      callManager1: asString(nc["CallManager1"]),
    };
    log.info("phone_op_complete", { op: "getNetworkConfiguration", host, durationMs: Date.now() - start, success: true, ...(reqId ? { reqId } : {}) });
    return result;
  } catch (err) {
    log.error("phone_op_complete", { op: "getNetworkConfiguration", host, durationMs: Date.now() - start, success: false, error: err instanceof Error ? err.message : String(err), ...(reqId ? { reqId } : {}) });
    throw err;
  }
}

export async function getPortInformation(host: string, auth?: PhoneAuth, reqId?: string): Promise<PortInformation> {
  const start = Date.now();
  log.info("phone_op_start", { op: "getPortInformation", host, ...(reqId ? { reqId } : {}) });
  try {
    const resp = await httpGetText(host, "/PortInformationX", { auth, reqId });
    if (resp.status >= 400) {
      throwForStatus(host, "/PortInformationX", resp.status);
    }
    const parsed = top(parseCiscoXml(resp.body));
    const pi = top(parsed["PortInformation"]);
    const result = {
      portSpeed: asString(pi["PortSpeed"]),
      cdpNeighborDeviceId: asString(pi["CDPNeighborDeviceId"]),
      cdpNeighborIp: asString(pi["CDPNeighborIP"]),
      cdpNeighborPort: asString(pi["CDPNeighborPort"]),
      lldpNeighborDeviceId: asString(pi["LLDPNeighborDeviceId"]),
      lldpNeighborIp: asString(pi["LLDPNeighborIP"]),
      lldpNeighborPort: asString(pi["LLDPNeighborPort"]),
    };
    log.info("phone_op_complete", { op: "getPortInformation", host, durationMs: Date.now() - start, success: true, ...(reqId ? { reqId } : {}) });
    return result;
  } catch (err) {
    log.error("phone_op_complete", { op: "getPortInformation", host, durationMs: Date.now() - start, success: false, error: err instanceof Error ? err.message : String(err), ...(reqId ? { reqId } : {}) });
    throw err;
  }
}

export async function getStreamingStatistics(host: string, auth?: PhoneAuth, reqId?: string): Promise<StreamingStatistics> {
  const start = Date.now();
  log.info("phone_op_start", { op: "getStreamingStatistics", host, ...(reqId ? { reqId } : {}) });
  try {
    const resp = await httpGetText(host, "/StreamingStatisticsX", { auth, reqId });
    if (resp.status >= 400) {
      throwForStatus(host, "/StreamingStatisticsX", resp.status);
    }
    const parsed = top(parseCiscoXml(resp.body));
    const ss = top(parsed["StreamingStatistics"]);
    const result = {
      remoteAddrRaw: asString(ss["RemoteAddr"]),
      localAddrRaw: asString(ss["LocalAddr"]),
      streamStatus: asString(ss["StreamStatus"]),
      name: asString(ss["Name"]),
      senderPackets: asInt(ss["SenderPackets"]),
      senderOctets: asInt(ss["SenderOctets"]),
      senderCodec: asString(ss["SenderCodec"]),
      rcvrPackets: asInt(ss["RcvrPackets"]),
      rcvrOctets: asInt(ss["RcvrOctets"]),
      rcvrCodec: asString(ss["RcvrCodec"]),
      rcvrLostPackets: asInt(ss["RcvrLostPackets"]),
      avgJitter: asInt(ss["AvgJitter"]),
      maxJitter: asInt(ss["MaxJitter"]),
      latency: asInt(ss["Latency"]),
      mosLqk: (() => {
        const v = asString(ss["MOSLQK"]);
        if (!v) return null;
        const n = Number.parseFloat(v);
        return Number.isFinite(n) ? n : null;
      })(),
      rcvrDiscarded: asInt(ss["RcvrDiscarded"]),
      senderJoins: asInt(ss["SenderJoins"]),
      byes: asInt(ss["Byes"]),
    };
    log.info("phone_op_complete", { op: "getStreamingStatistics", host, durationMs: Date.now() - start, success: true, ...(reqId ? { reqId } : {}) });
    return result;
  } catch (err) {
    log.error("phone_op_complete", { op: "getStreamingStatistics", host, durationMs: Date.now() - start, success: false, error: err instanceof Error ? err.message : String(err), ...(reqId ? { reqId } : {}) });
    throw err;
  }
}

function pickBetween(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) {
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return null;
}

function extractBoldValue(html: string, label: string): string | null {
  // Cisco 79xx HTML uses rows like:
  // <TR><TD><B> Remote Address </B></TD>...<TD><B>0.0.0.0/0</B></TD></TR>
  // Keep parsing intentionally simple and resilient.
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<B>\\s*${esc}\\s*<\\/B>[\\s\\S]*?<B>([^<]*)<\\/B>`, "i");
  const m = html.match(re);
  if (!m) return null;
  const v = m[1]?.trim();
  return v ? v : null;
}

export async function getStreamingStatisticsStream(
  host: string,
  streamIndex: number,
  auth?: PhoneAuth
): Promise<StreamingStatisticsStream> {
  if (streamIndex < 0 || streamIndex > 4) {
    throw new Error(`streamIndex out of range (0-4): ${streamIndex}`);
  }

  // Prefer the Serviceability HTML endpoint because it explicitly supports multiple streams.
  const path = `/CGI/Java/Serviceability?adapter=device.statistics.streaming.${streamIndex}`;
  const resp = await httpGetText(host, path, { auth });
  if (resp.status >= 400) {
    throwForStatus(host, `/CGI/Java/Serviceability?streaming.${streamIndex}`, resp.status);
  }

  const remoteAddrRaw = extractBoldValue(resp.body, "Remote Address");
  const localAddrRaw = extractBoldValue(resp.body, "Local Address");
  const streamStatus = extractBoldValue(resp.body, "Stream Status");
  const name = extractBoldValue(resp.body, "Host Name");

  const senderPackets = asInt(extractBoldValue(resp.body, "Sender Packets"));
  const senderOctets = asInt(extractBoldValue(resp.body, "Sender Octets"));
  const senderCodec = extractBoldValue(resp.body, "Sender Codec");

  const rcvrLostPackets = asInt(
    pickBetween(
      extractBoldValue(resp.body, "Rcvr Lost Packets"),
      extractBoldValue(resp.body, "Receiver lost packets"),
      extractBoldValue(resp.body, "Receiver Lost Packets")
    )
  );
  const avgJitter = asInt(extractBoldValue(resp.body, "Avg Jitter"));
  const maxJitter = asInt(extractBoldValue(resp.body, "Max Jitter"));
  const latency = asInt(extractBoldValue(resp.body, "Latency"));
  const rcvrCodec = pickBetween(
    extractBoldValue(resp.body, "Rcvr Codec"),
    extractBoldValue(resp.body, "Receiver codec"),
    extractBoldValue(resp.body, "Receiver Codec")
  );
  const rcvrPackets = asInt(
    pickBetween(
      extractBoldValue(resp.body, "Rcvr Packets"),
      extractBoldValue(resp.body, "Receiver packets"),
      extractBoldValue(resp.body, "Receiver Packets")
    )
  );
  const rcvrOctets = asInt(
    pickBetween(
      extractBoldValue(resp.body, "Rcvr Octets"),
      extractBoldValue(resp.body, "Receiver octets"),
      extractBoldValue(resp.body, "Receiver Octets")
    )
  );
  const rcvrDiscarded = asInt(extractBoldValue(resp.body, "Rcvr Discarded"));

  const mosLqk = (() => {
    const v = extractBoldValue(resp.body, "MOS LQK");
    if (!v) return null;
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  })();

  return {
    streamIndex,
    remoteAddrRaw,
    localAddrRaw,
    streamStatus,
    name,
    senderPackets,
    senderOctets,
    senderCodec,
    rcvrLostPackets,
    avgJitter,
    maxJitter,
    latency,
    rcvrCodec,
    rcvrPackets,
    rcvrOctets,
    mosLqk,
    rcvrDiscarded,
  };
}

export async function getStreamingStatisticsAllStreams(host: string, auth?: PhoneAuth): Promise<StreamingStatisticsStream[]> {
  const indices = [0, 1, 2, 3, 4];
  const results = await Promise.allSettled(
    indices.map((i) => getStreamingStatisticsStream(host, i, auth))
  );
  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    const reason = result.reason;
    const errCode = reason && typeof reason === "object" && "code" in reason ? String(reason.code) : "UNKNOWN";
    const errMsg = reason instanceof Error ? reason.message : String(reason);
    return {
      streamIndex: i,
      streamStatus: "ERROR",
      localAddrRaw: null,
      remoteAddrRaw: null,
      error: { code: errCode, message: errMsg },
    } as StreamingStatisticsStream;
  });
}

export async function getRtpStats(host: string, auth?: PhoneAuth): Promise<RtpStatsSummary> {
  const ss = await getStreamingStatistics(host, auth);
  return {
    streamStatus: ss.streamStatus,
    local: parseIpPort(ss.localAddrRaw || null),
    remote: parseIpPort(ss.remoteAddrRaw || null),
    rxPackets: ss.rcvrPackets ?? null,
    txPackets: ss.senderPackets ?? null,
    lostPackets: ss.rcvrLostPackets ?? null,
    jitter: { avg: ss.avgJitter ?? null, max: ss.maxJitter ?? null },
    codec: { rx: ss.rcvrCodec ?? null, tx: ss.senderCodec ?? null },
    mosLqk: ss.mosLqk ?? null,
  };
}

export async function executePhoneCommand(
  host: string,
  urls: string[],
  auth?: PhoneAuth,
  path = "/CGI/Execute"
): Promise<{ status: number; responseXml: string }> {
  const xml =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<CiscoIPPhoneExecute>` +
    urls.map((u) => `<ExecuteItem Priority="0" URL="${escapeXmlAttr(u)}"/>`).join("") +
    `</CiscoIPPhoneExecute>`;

  const resp = await httpPostForm(host, path, { XML: xml }, { auth });
  return { status: resp.status, responseXml: resp.body };
}

function escapeXmlAttr(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ── Dial validation ──────────────────────────────────────────────────

const VALID_DIAL_RE = /^[0-9*#+,a-zA-Z@.\-:]+$/;

export function validateDialString(digits: string): string {
  const trimmed = digits.trim();
  if (trimmed.length === 0) {
    throw new Error("Dial string must not be empty");
  }
  if (!VALID_DIAL_RE.test(trimmed)) {
    throw new Error(
      `Dial string contains invalid characters: ${trimmed}. Allowed: 0-9, *, #, +, comma, letters (for URI dialing)`
    );
  }
  if (trimmed.length > 30) {
    console.warn(`[cisco-phone] Warning: suspiciously long dial string (${trimmed.length} chars): ${trimmed}`);
  }
  return trimmed;
}

// ── Call control helpers ─────────────────────────────────────────────

export type ExecuteResult = { status: number; responseXml: string };

export async function holdResume(host: string, auth?: PhoneAuth): Promise<ExecuteResult> {
  return executePhoneCommand(host, ["Key:Hold"], auth);
}

export async function transfer(host: string, auth?: PhoneAuth): Promise<ExecuteResult> {
  return executePhoneCommand(host, ["Key:Trnsfer"], auth);
}

export async function conference(host: string, auth?: PhoneAuth): Promise<ExecuteResult> {
  return executePhoneCommand(host, ["Key:Confrn"], auth);
}

export async function muteToggle(host: string, auth?: PhoneAuth): Promise<ExecuteResult> {
  return executePhoneCommand(host, ["Key:Mute"], auth);
}

export async function volumeUp(host: string, auth?: PhoneAuth): Promise<ExecuteResult> {
  return executePhoneCommand(host, ["Key:VolUp"], auth);
}

export async function volumeDown(host: string, auth?: PhoneAuth): Promise<ExecuteResult> {
  return executePhoneCommand(host, ["Key:VolDwn"], auth);
}

export async function speakerToggle(host: string, auth?: PhoneAuth): Promise<ExecuteResult> {
  return executePhoneCommand(host, ["Key:Speaker"], auth);
}

export async function headsetToggle(host: string, auth?: PhoneAuth): Promise<ExecuteResult> {
  return executePhoneCommand(host, ["Key:Headset"], auth);
}

export async function navUp(host: string, auth?: PhoneAuth): Promise<ExecuteResult> {
  return executePhoneCommand(host, ["Key:NavUp"], auth);
}

export async function navDown(host: string, auth?: PhoneAuth): Promise<ExecuteResult> {
  return executePhoneCommand(host, ["Key:NavDwn"], auth);
}

export async function navLeft(host: string, auth?: PhoneAuth): Promise<ExecuteResult> {
  return executePhoneCommand(host, ["Key:NavLeft"], auth);
}

export async function navRight(host: string, auth?: PhoneAuth): Promise<ExecuteResult> {
  return executePhoneCommand(host, ["Key:NavRight"], auth);
}

export async function navSelect(host: string, auth?: PhoneAuth): Promise<ExecuteResult> {
  return executePhoneCommand(host, ["Key:NavSelect"], auth);
}

export async function getScreenshot(
  host: string,
  auth?: PhoneAuth,
  path = "/CGI/Screenshot"
): Promise<{ status: number; contentType: string | null; bytes: Uint8Array }> {
  const resp = await httpGetBytes(host, path, { auth, timeoutMs: 20000 });
  const ct = resp.headers["content-type"] || null;
  return { status: resp.status, contentType: ct, bytes: resp.body };
}

function looksLikeCiscoModelPrefix(model: string, prefix: string): boolean {
  return model.toLowerCase().startsWith(prefix.toLowerCase());
}

function guessScreenshotCandidates(modelHint: string | null): Array<{ protocol?: "http" | "https"; path: string }> {
  // Mirrors our Elixir RIS screenshot scraper logic:
  // - Cisco 98xx tends to require HTTPS for /CGI/Screenshot
  // - Cisco 39xx and 69xx often use /CGI/lcd.bmp
  // - everything else defaults to /CGI/Screenshot
  const m = (modelHint || "").trim();
  if (m) {
    if (looksLikeCiscoModelPrefix(m, "Cisco 98") || looksLikeCiscoModelPrefix(m, "CP-98")) {
      return [{ protocol: "https", path: "/CGI/Screenshot" }, { protocol: "http", path: "/CGI/Screenshot" }];
    }
    if (looksLikeCiscoModelPrefix(m, "Cisco 39") || looksLikeCiscoModelPrefix(m, "CP-39")) {
      return [{ protocol: "http", path: "/CGI/lcd.bmp" }];
    }
    if (looksLikeCiscoModelPrefix(m, "Cisco 69") || looksLikeCiscoModelPrefix(m, "CP-69")) {
      return [{ protocol: "http", path: "/CGI/lcd.bmp" }];
    }
  }
  return [
    { protocol: "http", path: "/CGI/Screenshot" },
    { protocol: "http", path: "/CGI/ScreenShot" },
    { protocol: "http", path: "/CGI/Screenshot.bmp" },
    { protocol: "http", path: "/CGI/ScreenShot.bmp" },
  ];
}

export async function getScreenshotAuto(
  host: string,
  auth?: PhoneAuth,
  modelHint?: string | null
): Promise<{ status: number; contentType: string | null; bytes: Uint8Array; usedUrl: string; attempted: string[] }> {
  // Use cached discovery data if available, falling back to modelHint then blind guessing
  const cached = getCachedCapabilities(host);
  const effectiveModelHint = modelHint || (cached ? cached.model : null);
  const candidates = cached
    ? cached.screenshotPaths.map((path) => ({ protocol: cached.protocol, path }))
    : guessScreenshotCandidates(effectiveModelHint || null);

  // If caller passed a full URL with protocol, honor it.
  const hasScheme = host.includes("://");

  const attempted: string[] = [];
  let lastStatus = 0;
  let lastCt: string | null = null;

  for (const c of candidates) {
    const base = hasScheme ? host : `${c.protocol || "http"}://${host}`;
    const url = `${base.replace(/\/$/, "")}${c.path}`;
    attempted.push(url);

    const resp = await httpGetBytes(base, c.path, { auth, timeoutMs: 20000 });
    lastStatus = resp.status;
    lastCt = resp.headers["content-type"] || null;

    if (resp.status === 200 && resp.body && resp.body.length > 0) {
      return { status: resp.status, contentType: lastCt, bytes: resp.body, usedUrl: url, attempted };
    }

    // If auth is missing and we hit 401, don't spam additional paths.
    if (resp.status === 401 && (!auth || !auth.username || !auth.password)) {
      break;
    }
  }

  return {
    status: lastStatus || 500,
    contentType: lastCt,
    bytes: new Uint8Array(),
    usedUrl: attempted[attempted.length - 1] || host,
    attempted,
  };
}
