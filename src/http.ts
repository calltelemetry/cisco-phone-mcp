import { readFileSync } from "fs";

export interface PhoneAuth {
  username?: string;
  password?: string;
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
}

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
      protocol: (u.protocol.replace(":", "") as "http" | "https") || "http",
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

export async function httpGetText(
  target: string | PhoneTarget,
  path: string,
  opts: RequestOptions = {}
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const t = normalizeTarget(target);
  const base = buildBaseUrl(t);
  const url = new URL(path, base).toString();
  const timeoutMs = opts.timeoutMs ?? 10000;

  const headers: Record<string, string> = { ...(opts.headers || {}) };
  const authHeader = buildAuthHeader(opts.auth || getDefaultAuth());
  if (authHeader) headers["authorization"] = authHeader;

  const resp = await fetch(url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const outHeaders: Record<string, string> = {};
  resp.headers.forEach((v, k) => {
    outHeaders[k.toLowerCase()] = v;
  });

  const body = await resp.text();
  return { status: resp.status, headers: outHeaders, body };
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

  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    ...(opts.headers || {}),
  };
  const authHeader = buildAuthHeader(opts.auth || getDefaultAuth());
  if (authHeader) headers["authorization"] = authHeader;

  const body = new URLSearchParams(form).toString();

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const outHeaders: Record<string, string> = {};
  resp.headers.forEach((v, k) => {
    outHeaders[k.toLowerCase()] = v;
  });

  const text = await resp.text();
  return { status: resp.status, headers: outHeaders, body: text };
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

  const headers: Record<string, string> = { ...(opts.headers || {}) };
  const authHeader = buildAuthHeader(opts.auth || getDefaultAuth());
  if (authHeader) headers["authorization"] = authHeader;

  const resp = await fetch(url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const outHeaders: Record<string, string> = {};
  resp.headers.forEach((v, k) => {
    outHeaders[k.toLowerCase()] = v;
  });

  const buf = new Uint8Array(await resp.arrayBuffer());
  return { status: resp.status, headers: outHeaders, body: buf };
}
