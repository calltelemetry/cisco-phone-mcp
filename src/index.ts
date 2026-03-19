#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { writeFileSync } from "fs";
import crypto from "node:crypto";

import {
  getDeviceInformation,
  getNetworkConfiguration,
  getPortInformation,
  getStreamingStatistics,
  getStreamingStatisticsStream,
  getStreamingStatisticsAllStreams,
  getRtpStats,
  executePhoneCommand,
  getScreenshot,
  getScreenshotAuto,
  validateDialString,
  holdResume,
  transfer,
  conference,
  muteToggle,
  volumeUp,
  volumeDown,
  speakerToggle,
  headsetToggle,
  navUp,
  navDown,
  navLeft,
  navRight,
  navSelect,
} from "./phone.js";
import { httpGetText, type PhoneAuth } from "./http.js";
import { discoverPhone } from "./discovery.js";
import { log } from "./logger.js";

// ── Request ID helper ────────────────────────────────────────────────

function newReqId(): string {
  return crypto.randomUUID().slice(0, 8);
}

// ── Credential warnings ──────────────────────────────────────────────
if (process.env.PHONE_USERNAME || process.env.PHONE_PASSWORD) {
  log.warn("env_credentials_detected", {
    message:
      "PHONE_USERNAME/PHONE_PASSWORD are set via environment. " +
      "Consider using per-request auth params instead for better security isolation.",
  });
}

const server = new McpServer({
  name: "cisco-phone",
  version: "0.3.0",
});

const authSchema = z
  .object({
    username: z.string().optional(),
    password: z.string().optional(),
    tlsInsecure: z
      .boolean()
      .optional()
      .describe("Skip TLS certificate verification (self-signed certs). Overrides PHONE_TLS_INSECURE env."),
  })
  .optional();

const targetSchema = z.object({
  host: z.string().describe("Phone host or URL (e.g. 192.168.125.178 or http://...)"),
  auth: authSchema.describe(
    "Optional basic auth (overrides PHONE_USERNAME/PHONE_PASSWORD env defaults). " +
    "Set tlsInsecure: true for self-signed certs."
  ),
});

server.tool(
  "health",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
    timeoutMs: z.number().int().positive().optional(),
  },
  async ({ host, auth, timeoutMs }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "health", host, reqId });
    const resp = await httpGetText(host, "/", { auth, timeoutMs, reqId });
    log.info("tool_complete", { tool: "health", host, durationMs: Date.now() - start, reqId });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: resp.status,
              contentType: resp.headers["content-type"] || null,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "discover",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  async ({ host, auth }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "discover", host, reqId });
    const caps = await discoverPhone(host, auth);
    log.info("tool_complete", { tool: "discover", host, durationMs: Date.now() - start, reqId });
    return { content: [{ type: "text", text: JSON.stringify(caps, null, 2) }] };
  }
);

server.tool(
  "get_device_information",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  async ({ host, auth }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "get_device_information", host, reqId });
    const di = await getDeviceInformation(host, auth, reqId);
    log.info("tool_complete", { tool: "get_device_information", host, durationMs: Date.now() - start, reqId });
    return { content: [{ type: "text", text: JSON.stringify(di, null, 2) }] };
  }
);

server.tool(
  "get_network_configuration",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  async ({ host, auth }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "get_network_configuration", host, reqId });
    const nc = await getNetworkConfiguration(host, auth, reqId);
    log.info("tool_complete", { tool: "get_network_configuration", host, durationMs: Date.now() - start, reqId });
    return { content: [{ type: "text", text: JSON.stringify(nc, null, 2) }] };
  }
);

server.tool(
  "get_port_information",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  async ({ host, auth }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "get_port_information", host, reqId });
    const pi = await getPortInformation(host, auth, reqId);
    log.info("tool_complete", { tool: "get_port_information", host, durationMs: Date.now() - start, reqId });
    return { content: [{ type: "text", text: JSON.stringify(pi, null, 2) }] };
  }
);

server.tool(
  "get_streaming_statistics",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  async ({ host, auth }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "get_streaming_statistics", host, reqId });
    const ss = await getStreamingStatistics(host, auth, reqId);
    log.info("tool_complete", { tool: "get_streaming_statistics", host, durationMs: Date.now() - start, reqId });
    return { content: [{ type: "text", text: JSON.stringify(ss, null, 2) }] };
  }
);

server.tool(
  "get_streaming_statistics_stream",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
    streamIndex: z.number().int().min(0).max(4).describe("0-4 (maps to Stream 1-5 on 79xx serviceability UI)"),
  },
  async ({ host, auth, streamIndex }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "get_streaming_statistics_stream", host, streamIndex, reqId });
    const ss = await getStreamingStatisticsStream(host, streamIndex, auth, reqId);
    log.info("tool_complete", { tool: "get_streaming_statistics_stream", host, durationMs: Date.now() - start, reqId });
    return { content: [{ type: "text", text: JSON.stringify(ss, null, 2) }] };
  }
);

server.tool(
  "get_streaming_statistics_all_streams",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  async ({ host, auth }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "get_streaming_statistics_all_streams", host, reqId });
    const ss = await getStreamingStatisticsAllStreams(host, auth, reqId);
    log.info("tool_complete", { tool: "get_streaming_statistics_all_streams", host, durationMs: Date.now() - start, reqId });
    return { content: [{ type: "text", text: JSON.stringify(ss, null, 2) }] };
  }
);

server.tool(
  "get_rtp_stats",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  async ({ host, auth }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "get_rtp_stats", host, reqId });
    const stats = await getRtpStats(host, auth, reqId);
    log.info("tool_complete", { tool: "get_rtp_stats", host, durationMs: Date.now() - start, reqId });
    return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
  }
);

server.tool(
  "execute",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
    urls: z.array(z.string()).min(1).describe('ExecuteItem URLs, e.g. "Key:Services"'),
    path: z.string().optional().describe("Execute endpoint path (default: /CGI/Execute)"),
  },
  async ({ host, auth, urls, path }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "execute", host, urls, reqId });
    const resp = await executePhoneCommand(host, urls, auth, path || "/CGI/Execute", reqId);
    log.info("tool_complete", { tool: "execute", host, durationMs: Date.now() - start, reqId });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: resp.status,
              responseXml: resp.responseXml,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "dial",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
    digits: z.string().min(1).describe("Digits or URI to dial (e.g. 9000)"),
    speaker: z
      .boolean()
      .optional()
      .describe("Send Key:Speaker before dialing (default: true)"),
    path: z.string().optional().describe("Execute endpoint path (default: /CGI/Execute)"),
  },
  async ({ host, auth, digits, speaker, path }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "dial", host, digits, reqId });
    const validated = validateDialString(digits);
    const urls: string[] = [];
    if (speaker ?? true) {
      urls.push("Key:Speaker");
    }
    urls.push(`Dial:${validated}`);

    const resp = await executePhoneCommand(host, urls, auth, path || "/CGI/Execute", reqId);
    log.info("tool_complete", { tool: "dial", host, durationMs: Date.now() - start, reqId });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: resp.status,
              executed: urls,
              responseXml: resp.responseXml,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "end_call",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
    repeat: z.number().int().min(1).max(5).optional().describe("How many EndCall presses (default: 2)"),
    path: z.string().optional().describe("Execute endpoint path (default: /CGI/Execute)"),
  },
  async ({ host, auth, repeat, path }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "end_call", host, reqId });
    const r = repeat ?? 2;
    const urls = Array.from({ length: r }, () => "Key:EndCall");
    const resp = await executePhoneCommand(host, urls, auth, path || "/CGI/Execute", reqId);
    log.info("tool_complete", { tool: "end_call", host, durationMs: Date.now() - start, reqId });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: resp.status,
              executed: urls,
              responseXml: resp.responseXml,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ── Call control tools ───────────────────────────────────────────────

function simpleKeyResult(resp: { status: number; responseXml: string }) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ status: resp.status, responseXml: resp.responseXml }, null, 2),
      },
    ],
  };
}

function wrapSimpleTool(toolName: string, fn: (host: string, auth?: PhoneAuth) => Promise<{ status: number; responseXml: string }>) {
  return async ({ host, auth }: { host: string; auth?: PhoneAuth }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: toolName, host, reqId });
    const result = simpleKeyResult(await fn(host, auth));
    log.info("tool_complete", { tool: toolName, host, durationMs: Date.now() - start, reqId });
    return result;
  };
}

server.tool(
  "hold_resume",
  "Toggle hold on the active call",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  wrapSimpleTool("hold_resume", holdResume)
);

server.tool(
  "transfer",
  "Initiate attended transfer on active call",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  wrapSimpleTool("transfer", transfer)
);

server.tool(
  "conference",
  "Add a party to conference call",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  wrapSimpleTool("conference", conference)
);

server.tool(
  "mute",
  "Toggle microphone mute",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  wrapSimpleTool("mute", muteToggle)
);

server.tool(
  "volume_up",
  "Increase speaker volume",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  wrapSimpleTool("volume_up", volumeUp)
);

server.tool(
  "volume_down",
  "Decrease speaker volume",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  wrapSimpleTool("volume_down", volumeDown)
);

server.tool(
  "speaker",
  "Toggle speakerphone",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  wrapSimpleTool("speaker", speakerToggle)
);

server.tool(
  "headset",
  "Toggle headset mode",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  wrapSimpleTool("headset", headsetToggle)
);

server.tool(
  "navigate",
  "Navigate phone menu (up/down/left/right/select)",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
    direction: z.enum(["up", "down", "left", "right", "select"]).describe("Navigation direction"),
  },
  async ({ host, auth, direction }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "navigate", host, direction, reqId });
    const navFns = {
      up: navUp,
      down: navDown,
      left: navLeft,
      right: navRight,
      select: navSelect,
    } as const;
    const result = simpleKeyResult(await navFns[direction](host, auth));
    log.info("tool_complete", { tool: "navigate", host, direction, durationMs: Date.now() - start, reqId });
    return result;
  }
);

server.tool(
  "screenshot",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
    path: z.string().optional().describe("Screenshot endpoint path (default: /CGI/Screenshot)"),
    outFile: z
      .string()
      .optional()
      .describe("Optional output file path. If omitted, writes /tmp/phone-screenshot.<ext>"),
  },
  async ({ host, auth, path, outFile }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "screenshot", host, reqId });
    const resp = await getScreenshot(host, auth, path || "/CGI/Screenshot", reqId);
    const ct = resp.contentType || "application/octet-stream";
    const ext = ct.includes("png") ? "png" : ct.includes("jpeg") ? "jpg" : ct.includes("bmp") ? "bmp" : "bin";
    const file = outFile || `/tmp/phone-screenshot.${ext}`;
    writeFileSync(file, resp.bytes);
    log.info("tool_complete", { tool: "screenshot", host, durationMs: Date.now() - start, bytes: resp.bytes.length, reqId });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: resp.status,
              contentType: ct,
              bytes: resp.bytes.length,
              file,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "screenshot_auto",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
    modelHint: z.string().optional().describe("Optional model hint (e.g. 'Cisco 98xx', 'Cisco 39xx', 'CP-7975G')"),
    outFile: z
      .string()
      .optional()
      .describe("Optional output file path. If omitted, writes /tmp/phone-screenshot.<ext>"),
  },
  async ({ host, auth, modelHint, outFile }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "screenshot_auto", host, modelHint: modelHint || null, reqId });
    const resp = await getScreenshotAuto(host, auth, modelHint, reqId);
    const ct = resp.contentType || "application/octet-stream";
    const ext = ct.includes("png") ? "png" : ct.includes("jpeg") ? "jpg" : ct.includes("bmp") ? "bmp" : "bin";
    const file = outFile || `/tmp/phone-screenshot.${ext}`;
    if (resp.bytes.length > 0) {
      writeFileSync(file, resp.bytes);
    }
    log.info("tool_complete", { tool: "screenshot_auto", host, durationMs: Date.now() - start, bytes: resp.bytes.length, reqId });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: resp.status,
              contentType: ct,
              bytes: resp.bytes.length,
              file,
              usedUrl: resp.usedUrl,
              attempted: resp.attempted,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "raw_get",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
    path: z.string().describe("Path to GET (e.g. /StreamingStatisticsX)"),
    timeoutMs: z.number().int().positive().optional(),
  },
  async ({ host, auth, path, timeoutMs }) => {
    const reqId = newReqId();
    const start = Date.now();
    log.info("tool_start", { tool: "raw_get", host, path, reqId });
    const resp = await httpGetText(host, path, { auth, timeoutMs, reqId });
    log.info("tool_complete", { tool: "raw_get", host, durationMs: Date.now() - start, reqId });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: resp.status,
              contentType: resp.headers["content-type"] || null,
              body: resp.body,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
