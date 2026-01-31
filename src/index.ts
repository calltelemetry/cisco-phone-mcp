#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { writeFileSync } from "fs";

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
} from "./phone.js";
import { httpGetText } from "./http.js";

const server = new McpServer({
  name: "phone",
  version: "0.1.0",
});

const authSchema = z
  .object({
    username: z.string().optional(),
    password: z.string().optional(),
  })
  .optional();

const targetSchema = z.object({
  host: z.string().describe("Phone host or URL (e.g. 192.168.125.178 or http://...)"),
  auth: authSchema.describe("Optional basic auth; defaults to PHONE_USERNAME/PHONE_PASSWORD"),
});

server.tool(
  "health",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
    timeoutMs: z.number().int().positive().optional(),
  },
  async ({ host, auth, timeoutMs }) => {
    const resp = await httpGetText(host, "/", { auth, timeoutMs });
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
  "get_device_information",
  {
    host: targetSchema.shape.host,
    auth: targetSchema.shape.auth,
  },
  async ({ host, auth }) => {
    const di = await getDeviceInformation(host, auth);
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
    const nc = await getNetworkConfiguration(host, auth);
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
    const pi = await getPortInformation(host, auth);
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
    const ss = await getStreamingStatistics(host, auth);
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
    const ss = await getStreamingStatisticsStream(host, streamIndex, auth);
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
    const ss = await getStreamingStatisticsAllStreams(host, auth);
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
    const stats = await getRtpStats(host, auth);
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
    const resp = await executePhoneCommand(host, urls, auth, path || "/CGI/Execute");
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
    const resp = await getScreenshot(host, auth, path || "/CGI/Screenshot");
    const ct = resp.contentType || "application/octet-stream";
    const ext = ct.includes("png") ? "png" : ct.includes("jpeg") ? "jpg" : ct.includes("bmp") ? "bmp" : "bin";
    const file = outFile || `/tmp/phone-screenshot.${ext}`;
    writeFileSync(file, resp.bytes);
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
    const resp = await getScreenshotAuto(host, auth, modelHint);
    const ct = resp.contentType || "application/octet-stream";
    const ext = ct.includes("png") ? "png" : ct.includes("jpeg") ? "jpg" : ct.includes("bmp") ? "bmp" : "bin";
    const file = outFile || `/tmp/phone-screenshot.${ext}`;
    if (resp.bytes.length > 0) {
      writeFileSync(file, resp.bytes);
    }
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
    const resp = await httpGetText(host, path, { auth, timeoutMs });
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
