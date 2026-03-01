import assert from "node:assert/strict";

interface FetchCall {
  url: string;
  init: RequestInit & { headers?: Record<string, string> };
}

type FetchHandler = (url: string, init: RequestInit) => Promise<Response>;

export function withMockFetch(fn: (ctx: { calls: FetchCall[] }) => Promise<void>) {
  const original = globalThis.fetch;
  const calls: FetchCall[] = [];

  async function run(handler: FetchHandler) {
    globalThis.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = typeof input === "string" ? input : (input as { url?: string })?.url ?? String(input);
      calls.push({ url, init: init as FetchCall["init"] });
      return handler(url, init);
    };
    try {
      return await fn({ calls });
    } finally {
      globalThis.fetch = original;
    }
  }

  return { run, calls, assert };
}

export function responseText(text: string, { status = 200, headers = {} }: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(text, { status, headers });
}

export function responseBytes(bytes: Uint8Array | number[], { status = 200, headers = {} }: { status?: number; headers?: Record<string, string> } = {}) {
  const body = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return new Response(body, { status, headers });
}

export function parseFormBody(body: unknown): Record<string, string> {
  if (typeof body !== "string") return {};
  const params = new URLSearchParams(body);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

export function mustInclude(haystack: string, needle: string) {
  assert.ok(
    haystack.includes(needle),
    `Expected string to include ${JSON.stringify(needle)}; got: ${haystack}`
  );
}
