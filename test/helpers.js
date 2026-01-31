import assert from "node:assert/strict";

export function withMockFetch(fn) {
  const original = globalThis.fetch;
  const calls = [];

  function setFetch(handler) {
    globalThis.fetch = async (input, init = {}) => {
      const url = typeof input === "string" ? input : input?.url;
      calls.push({ url, init });
      return handler(url, init);
    };
  }

  async function run(handler) {
    setFetch(handler);
    try {
      return await fn({ calls });
    } finally {
      globalThis.fetch = original;
    }
  }

  return { run, calls, assert };
}

export function responseText(text, { status = 200, headers = {} } = {}) {
  return new Response(text, { status, headers });
}

export function responseBytes(bytes, { status = 200, headers = {} } = {}) {
  const body = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return new Response(body, { status, headers });
}

export function parseFormBody(body) {
  if (typeof body !== "string") return {};
  const params = new URLSearchParams(body);
  const out = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

export function mustInclude(haystack, needle) {
  assert.ok(
    haystack.includes(needle),
    `Expected string to include ${JSON.stringify(needle)}; got: ${haystack}`
  );
}
