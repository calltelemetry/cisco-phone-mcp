# Architecture Overview

The Phone MCP server provides direct HTTP access to Cisco IP phone endpoints.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Phone MCP Architecture                            │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │                          MCP Server                                │ │
│   │                                                                    │ │
│   │   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐│ │
│   │   │  Tool       │   │   HTTP      │   │    XML Parser           ││ │
│   │   │  Registry   │──►│   Client    │──►│    (fast-xml-parser)    ││ │
│   │   │             │   │             │   │                         ││ │
│   │   └─────────────┘   └─────────────┘   └─────────────────────────┘│ │
│   │         │                 │                       │               │ │
│   │         │                 │                       │               │ │
│   │   Zod Schemas         fetch()              parseCiscoXml()       │ │
│   │   Validation          + timeout            asString(), asInt()   │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                  │                                       │
│                                  ▼                                       │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │                     Cisco IP Phone                                 │ │
│   │                                                                    │ │
│   │   /DeviceInformationX     XML device info                         │ │
│   │   /NetworkConfigurationX  XML network config                      │ │
│   │   /PortInformationX       XML CDP/LLDP info                       │ │
│   │   /StreamingStatisticsX   XML RTP stats                           │ │
│   │   /CGI/Java/Serviceability HTML stats (multiple streams)         │ │
│   │   /CGI/Execute            CiscoIPPhoneExecute commands            │ │
│   │   /CGI/Screenshot         BMP/PNG display capture                 │ │
│   └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. MCP Server (`index.ts`)

The main entry point uses `@modelcontextprotocol/sdk`:

```typescript
const server = new McpServer({
  name: "phone",
  version: "0.1.0",
});

// Register tools with Zod schemas
server.tool("get_device_information", { host, auth }, handler);
```

### 2. Phone API (`phone.ts`)

Typed functions for each phone endpoint:

```typescript
export interface DeviceInformation {
  hostName?: string | null;
  phoneDn?: string | null;
  macAddress?: string | null;
  modelNumber?: string | null;
  // ...
}

export async function getDeviceInformation(
  host: string,
  auth?: PhoneAuth
): Promise<DeviceInformation>
```

### 3. HTTP Client (`http.ts`)

Handles authentication and request building:

```typescript
export function getDefaultAuth(): PhoneAuth | undefined {
  const username = process.env.PHONE_USERNAME;
  const password = process.env.PHONE_PASSWORD;
  if (username && password) return { username, password };
  return undefined;
}

export async function httpGetText(
  target: string | PhoneTarget,
  path: string,
  opts?: RequestOptions
): Promise<{ status: number; headers: Record<string, string>; body: string }>
```

### 4. XML Parser (`ciscoXml.ts`)

Parses Cisco phone XML responses:

```typescript
import { XMLParser } from "fast-xml-parser";

export function parseCiscoXml(xml: string): unknown {
  return xmlParser.parse(xml);
}

export function asString(v: unknown): string | null
export function asInt(v: unknown): number | null
export function parseIpPort(v: string | null): { host: string; port: number | null } | null
```

## Data Flow

### Tool Call Flow

```
1. Claude Code calls tool (e.g., get_device_information)
2. MCP SDK validates input against Zod schema
3. Tool handler calls phone API function
4. HTTP client builds request with auth
5. Phone returns XML response
6. XML parser extracts typed data
7. Tool returns JSON to agent
```

### Authentication Flow

```
1. Check tool auth parameter
2. Fall back to PHONE_USERNAME/PHONE_PASSWORD env vars
3. Build Basic auth header if credentials exist
4. Include in HTTP request
```

## Transport

Uses stdio transport for MCP communication:

```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
```

Communication:
- **Input**: JSON-RPC messages on stdin
- **Output**: JSON-RPC responses on stdout
- **Logs**: Debug info on stderr

## Error Handling

HTTP errors are returned as structured responses:

```typescript
if (resp.status >= 400) {
  throw new Error(`DeviceInformationX HTTP ${resp.status}`);
}
```

Timeout handling:
```typescript
const resp = await fetch(url, {
  signal: AbortSignal.timeout(timeoutMs),
});
```

## Phone Model Variations

Different phone models have different endpoints and behaviors:

| Feature | 79xx | 88xx | 98xx |
|---------|------|------|------|
| Screenshot | `/CGI/Screenshot` | `/CGI/Screenshot` | HTTPS required |
| LCD BMP | N/A | `/CGI/lcd.bmp` | N/A |
| Serviceability | Yes | Yes | Yes |
| XML endpoints | All | All | All |

## Comparison with JTAPI MCP

| Feature | Phone MCP | JTAPI MCP |
|---------|-----------|-----------|
| Connection | Direct to phone | Via operator proxy |
| Call control | Limited (dial, end) | Full (hold, transfer, conference) |
| Audio injection | No | Yes (BIB greetings) |
| RTP stats | Yes (direct) | Yes (via sidecar) |
| Screenshots | Yes | No |
| Device info | Yes | Limited |
| Authentication | Phone HTTP auth | CUCM CTI credentials |

## Related Documentation

- [Phone Endpoints](./endpoints.md) - Detailed endpoint reference
- [Tool Reference](../tools.md) - Complete tool documentation
- [Configuration](../ops/configuration.md) - Environment setup

