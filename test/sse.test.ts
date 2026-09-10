import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { startSseServer } from "../src/sse.js";

test("SSE Server: responds 200 OK to /healthz and /health", async () => {
  const server: Server = await startSseServer({
    port: 0, // OS-assigned free port
    host: "127.0.0.1",
  });

  try {
    const address = server.address();
    assert.ok(typeof address === "object" && address !== null);
    const baseUrl = `http://127.0.0.1:${address.port}`;

    // Test /healthz
    const resHealthz = await fetch(`${baseUrl}/healthz`);
    assert.equal(resHealthz.status, 200);
    const dataHealthz = (await resHealthz.json()) as { status: string; service: string; version: string };
    assert.equal(dataHealthz.status, "ok");
    assert.equal(dataHealthz.service, "cisco-phone");
    assert.equal(dataHealthz.version, "0.4.0");

    // Test /health
    const resHealth = await fetch(`${baseUrl}/health`);
    assert.equal(resHealth.status, 200);
    const dataHealth = (await resHealth.json()) as { status: string };
    assert.equal(dataHealth.status, "ok");

    // Test 404
    const res404 = await fetch(`${baseUrl}/unknown-path`);
    assert.equal(res404.status, 404);

    // Test /messages without session
    const resMessages = await fetch(`${baseUrl}/messages?sessionId=nonexistent`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(resMessages.status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
