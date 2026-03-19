import { readFileSync } from "fs";
import https from "node:https";
import { log } from "./logger.js";
import {
  PhoneUnreachableError,
  PhoneTimeoutError,
} from "./errors.js";

export interface PhoneAuth {
  username?: string;
  password?: string;
  /** Skip TLS certificate verification (self-signed certs). Overrides PHONE_TLS_INSECURE env. */
  tlsInsecure?: boolean;
}

export interface PhoneTarget {
  host: string;
  protocol?: "http" | "https";
  port?: number;
}

export interface RequestOptions {
  auth?: PhoneAuth;
  headers?: Record<string, string>;
  timeoutMs?: number;
  reqId?: string;
}

// ---------------------------------------------------------------------------
// TLS helpers
// ---------------------------------------------------------------------------

let _cachedAgent: https.Agent | undefined;

function getTlsAgent(auth?: PhoneAuth): https.Agent | undefined {
  const insecure =
    auth?.tlsInsecure ??
    (process.env.PHONE_TLS_INSECURE === "true" || process.env.PHONE_TLS_INSECURE === "1");
  const caPath = process.env.PHONE_CA_CERT;

  if (!insecure && !caPath) return undefined;

  // Return cached agent when only env-level settings are active (no per-request override).
  if (auth?.tlsInsecure == null && _cachedAgent) return _cachedAgent;

  const opts: https.AgentOptions = { keepAlive: true };
  if (insecure) opts.rejectUnauthorized = false;
  if (caPath) {
    try {
      opts.ca = readFileSync(caPath);
    } catch (e) {
      log.warn("tls_ca_read_failed", { path: caPath, error: String(e) });
    }
  }

  const agent = new https.Agent(opts);
  // Only cache when no per-request tlsInsecure override was provided.
  if (auth?.tlsInsecure == null) _cachedAgent = agent;
  return agent;
}

/**
 * Apply TLS environment settings for Node's native fetch (undici).
 * Node >= 18 native fetch does not support https.Agent, so we fall back
 * to NODE_TLS_REJECT_UNAUTHORIZED for insecure mode.
 */
function applyTlsEnv(auth?: PhoneAuth): void {
  const insecure =
    auth?.tlsInsecure ??
    (process.env.PHONE_TLS_INSECURE === "true" || process.env.PHONE_TLS_INSECURE === "1");
  if (insecure) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
  // Eagerly build the agent so the CA cert is loaded once.
  getTlsAgent(auth);
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export function getDefaultAuth(): PhoneAuth | undefined {
  const username = process.env.PHONE_USERNAME || process.env.PHONE_USER;
  const password = process.env.PHONE_PASSWORD || process.env.PHONE_PASS;
  if (username && password) return { username, password };
  return undefined;
}

export function normalizeTarget(target: string | PhoneTarget): PhoneTarget {
  if (typeof target !== "string") return target;

  // Accept:
  // - "192.168.1.10"
  // - "http://192.168.1.10"
  // - "https://phone.local:8443"
  try {
    const u = new URL(target.includes("://") ? target : `http://${target}`);
    return {
      host: u.hostname,
      protocol: u.protocol.replace(":", "") === "https" ? "https" : "http",
      port: u.port ? Number.parseInt(u.port, 10) : undefined,
    };
  } catch {
    return { host: target, protocol: "http" };
  }
}

export function buildBaseUrl(t: PhoneTarget): string {
  const protocol = t.protocol || "http";
  const port = t.port ? `:${t.port}` : "";
  return `${protocol}://${t.host}${port}`;
}

function buildAuthHeader(auth: PhoneAuth | undefined): string | undefined {
  const u = auth?.username;
  const p = auth?.password;
  if (!u || !p) return undefined;
  const token = Buffer.from(`${u}:${p}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

function extractHost(target: string | PhoneTarget): string {
  if (typeof target === "string") {
    return normalizeTarget(target).host;
  }
  return target.host;
}

// ---------------------------------------------------------------------------
// Retry logic — exponential backoff for transient errors
// ---------------------------------------------------------------------------

const MAX_RETRIES = 2;
const INITIAL_DELAY_MS = 500;

function isTransientNetworkError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("econnreset") ||
      msg.includes("econnrefused") ||
      msg.includes("epipe") ||
      msg.includes("socket hang up") ||
      msg.includes("network") ||
      msg.includes("fetch failed")
    ) {
      return true;
    }
  }
  return false;
}

function isTimeoutError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || err.name === "AbortError") return true;
    const msg = err.message.toLowerCase();
    if (msg.includes("timeout") || msg.includes("aborterror")) return true;
  }
  return false;
}

function isTransientStatus(status: number): boolean {
  return status >= 500;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Wraps a fetch call with retry logic.
 * - Retries on 5xx, ECONNRESET, and timeout (max 2 retries, exponential backoff).
 * - Does NOT retry on 4xx (client errors).
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  hostForErrors: string,
  timeoutMs: number,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, init);

      // Never retry client errors (4xx).
      if (resp.status >= 400 && resp.status < 500) return resp;

      // Retry server errors (5xx) with backoff.
      if (isTransientStatus(resp.status) && attempt < MAX_RETRIES) {
        log.warn("http_retry_5xx", { url, status: resp.status, attempt: attempt + 1 });
        await sleep(INITIAL_DELAY_MS * 2 ** attempt);
        continue;
      }

      return resp;
    } catch (err) {
      lastError = err;

      if (isTimeoutError(err)) {
        if (attempt < MAX_RETRIES) {
          log.warn("http_retry_timeout", { url, attempt: attempt + 1 });
          await sleep(INITIAL_DELAY_MS * 2 ** attempt);
          continue;
        }
        throw new PhoneTimeoutError(hostForErrors, timeoutMs);
      }

      if (isTransientNetworkError(err) && attempt < MAX_RETRIES) {
        log.warn("http_retry_network", { url, error: String(err), attempt: attempt + 1 });
        await sleep(INITIAL_DELAY_MS * 2 ** attempt);
        continue;
      }

      // Non-transient / non-retryable network error.
      throw new PhoneUnreachableError(hostForErrors, `${err}`);
    }
  }

  // Exhausted retries.
  if (isTimeoutError(lastError)) {
    throw new PhoneTimeoutError(hostForErrors, timeoutMs);
  }
  throw new PhoneUnreachableError(
    hostForErrors,
    `Failed after ${MAX_RETRIES + 1} attempts: ${lastError}`,
  );
}

// ---------------------------------------------------------------------------
// Exported HTTP methods
// ---------------------------------------------------------------------------

export async function httpGetText(
  target: string | PhoneTarget,
  path: string,
  opts: RequestOptions = {}
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const t = normalizeTarget(target);
  const base = buildBaseUrl(t);
  const url = new URL(path, base).toString();
  const timeoutMs = opts.timeoutMs ?? 10000;
  const auth = opts.auth || getDefaultAuth();
  const reqMeta: Record<string, unknown> = { method: "GET", url, host: t.host };
  if (opts.reqId) reqMeta.reqId = opts.reqId;

  log.info("http_request", reqMeta);
  const start = Date.now();

  const headers: Record<string, string> = { ...(opts.headers || {}) };
  const authHeader = buildAuthHeader(auth);
  if (authHeader) headers["authorization"] = authHeader;

  applyTlsEnv(auth);

  try {
    const resp = await fetchWithRetry(
      url,
      { method: "GET", headers, signal: AbortSignal.timeout(timeoutMs) },
      extractHost(target),
      timeoutMs,
    );

    const outHeaders: Record<string, string> = {};
    resp.headers.forEach((v, k) => {
      outHeaders[k.toLowerCase()] = v;
    });

    const body = await resp.text();
    log.info("http_response", { status: resp.status, host: t.host, durationMs: Date.now() - start, ...(opts.reqId ? { reqId: opts.reqId } : {}) });
    return { status: resp.status, headers: outHeaders, body };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error("http_error", { host: t.host, error: errMsg, durationMs: Date.now() - start, ...(opts.reqId ? { reqId: opts.reqId } : {}) });
    throw err;
  }
}

export async function httpPostForm(
  target: string | PhoneTarget,
  path: string,
  form: Record<string, string>,
  opts: RequestOptions = {}
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const t = normalizeTarget(target);
  const base = buildBaseUrl(t);
  const url = new URL(path, base).toString();
  const timeoutMs = opts.timeoutMs ?? 10000;
  const auth = opts.auth || getDefaultAuth();
  const reqMeta: Record<string, unknown> = { method: "POST", url, host: t.host };
  if (opts.reqId) reqMeta.reqId = opts.reqId;

  log.info("http_request", reqMeta);
  const start = Date.now();

  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    ...(opts.headers || {}),
  };
  const authHeader = buildAuthHeader(auth);
  if (authHeader) headers["authorization"] = authHeader;

  const body = new URLSearchParams(form).toString();

  applyTlsEnv(auth);

  try {
    const resp = await fetchWithRetry(
      url,
      { method: "POST", headers, body, signal: AbortSignal.timeout(timeoutMs) },
      extractHost(target),
      timeoutMs,
    );

    const outHeaders: Record<string, string> = {};
    resp.headers.forEach((v, k) => {
      outHeaders[k.toLowerCase()] = v;
    });

    const text = await resp.text();
    log.info("http_response", { status: resp.status, host: t.host, durationMs: Date.now() - start, ...(opts.reqId ? { reqId: opts.reqId } : {}) });
    return { status: resp.status, headers: outHeaders, body: text };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error("http_error", { host: t.host, error: errMsg, durationMs: Date.now() - start, ...(opts.reqId ? { reqId: opts.reqId } : {}) });
    throw err;
  }
}

export async function httpGetBytes(
  target: string | PhoneTarget,
  path: string,
  opts: RequestOptions = {}
): Promise<{ status: number; headers: Record<string, string>; body: Uint8Array }> {
  const t = normalizeTarget(target);
  const base = buildBaseUrl(t);
  const url = new URL(path, base).toString();
  const timeoutMs = opts.timeoutMs ?? 10000;
  const auth = opts.auth || getDefaultAuth();
  const reqMeta: Record<string, unknown> = { method: "GET", url, host: t.host };
  if (opts.reqId) reqMeta.reqId = opts.reqId;

  log.info("http_request", reqMeta);
  const start = Date.now();

  const headers: Record<string, string> = { ...(opts.headers || {}) };
  const authHeader = buildAuthHeader(auth);
  if (authHeader) headers["authorization"] = authHeader;

  applyTlsEnv(auth);

  try {
    const resp = await fetchWithRetry(
      url,
      { method: "GET", headers, signal: AbortSignal.timeout(timeoutMs) },
      extractHost(target),
      timeoutMs,
    );

    const outHeaders: Record<string, string> = {};
    resp.headers.forEach((v, k) => {
      outHeaders[k.toLowerCase()] = v;
    });

    const buf = new Uint8Array(await resp.arrayBuffer());
    log.info("http_response", { status: resp.status, host: t.host, durationMs: Date.now() - start, bytes: buf.length, ...(opts.reqId ? { reqId: opts.reqId } : {}) });
    return { status: resp.status, headers: outHeaders, body: buf };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error("http_error", { host: t.host, error: errMsg, durationMs: Date.now() - start, ...(opts.reqId ? { reqId: opts.reqId } : {}) });
    throw err;
  }
}
