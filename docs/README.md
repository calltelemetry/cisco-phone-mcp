# Phone MCP Documentation

MCP server for direct Cisco IP phone interactions via built-in HTTP endpoints.

## Overview

Phone MCP enables AI agents to directly control and monitor Cisco IP phones without going through JTAPI or CUCM. It uses the phone's built-in HTTP endpoints:

- **Device Information** - Model, serial, firmware
- **Network Configuration** - IP, DNS, CUCM servers
- **Port Information** - CDP/LLDP neighbor discovery
- **RTP Statistics** - Real-time call quality metrics
- **Phone Commands** - Dial, end call, key presses
- **Screenshots** - Capture phone display

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Phone MCP Server                               │
│                                                                          │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐  │
│   │   Claude    │     │  cisco-phone-mcp  │     │     Cisco IP Phone      │  │
│   │   Code      │ ──► │             │ ──► │   Built-in HTTP Server  │  │
│   │             │     │ MCP Server  │     │                         │  │
│   └─────────────┘     └─────────────┘     └─────────────────────────┘  │
│         │                    │                       │                  │
│         │                    │                       │                  │
│   Tool Calls            Direct HTTP             Phone Endpoints:        │
│   (mcp__phone__*)       to Phone IP            /DeviceInformationX     │
│                                                 /StreamingStatisticsX   │
│                                                 /CGI/Execute            │
│                                                 /CGI/Screenshot         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Documentation Index

### Architecture

| Document | Description |
|----------|-------------|
| [Overview](./architecture/overview.md) | System architecture and design |
| [Phone Endpoints](./architecture/endpoints.md) | Cisco phone HTTP endpoint reference |

### Tools

| Document | Description |
|----------|-------------|
| [Tool Reference](./tools.md) | Complete tool documentation |
| [RTP Statistics](./tools/rtp-stats.md) | RTP/streaming statistics tools |
| [Phone Commands](./tools/commands.md) | Dial, end call, key press tools |

### Operations

| Document | Description |
|----------|-------------|
| [Configuration](./ops/configuration.md) | Environment variables and setup |
| [Troubleshooting](./ops/troubleshooting.md) | Common issues and solutions |

## Quick Start

### Installation

```bash
cd cisco-phone-mcp
yarn install
yarn build
```

### Run

```bash
# Set credentials if phone requires auth
export PHONE_USERNAME=admin
export PHONE_PASSWORD=cisco123

# Start MCP server
yarn start
```

### CLI Testing

```bash
yarn cli device --host 192.168.125.178
yarn cli network --host 192.168.125.178
yarn cli rtp --host 192.168.125.178
```

### Claude Code Integration

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "phone": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/cisco-phone-mcp/dist/index.js"],
      "env": {
        "PHONE_USERNAME": "admin",
        "PHONE_PASSWORD": "cisco123"
      }
    }
  }
}
```

## Tool Categories

### Information Tools

| Tool | Description |
|------|-------------|
| `health` | Check phone HTTP connectivity |
| `get_device_information` | Model, serial, MAC, firmware |
| `get_network_configuration` | IP, DNS, CUCM servers |
| `get_port_information` | CDP/LLDP neighbor data |

### RTP Statistics Tools

| Tool | Description |
|------|-------------|
| `get_streaming_statistics` | Primary stream stats (XML) |
| `get_streaming_statistics_stream` | Per-stream stats (0-4) |
| `get_streaming_statistics_all_streams` | All 5 streams |
| `get_rtp_stats` | Simplified RTP summary |

### Command Tools

| Tool | Description |
|------|-------------|
| `execute` | Send raw CiscoIPPhoneExecute |
| `dial` | Dial with speaker activation |
| `end_call` | End active call |

### Screenshot Tools

| Tool | Description |
|------|-------------|
| `screenshot` | Capture phone display |
| `screenshot_auto` | Auto-detect screenshot path |

### Utility Tools

| Tool | Description |
|------|-------------|
| `raw_get` | Raw HTTP GET to any path |

## Use Cases

### Audio Verification

Verify BIB greeting was received by checking RTP packet counts:

```typescript
// Before call
const baseline = await mcp__phone__get_rtp_stats({ host: "192.168.1.100" });

// After audio injection
const after = await mcp__phone__get_rtp_stats({ host: "192.168.1.100" });

// Check packet increase
const delta = after.rxPackets - baseline.rxPackets;
if (delta > 100) {
  console.log("Audio received!");
}
```

### Remote Dialing

Initiate a call from a physical phone:

```typescript
await mcp__phone__dial({
  host: "192.168.1.100",
  digits: "9005551234"
});
```

### Phone Discovery

Get phone details for troubleshooting:

```typescript
const info = await mcp__phone__get_device_information({
  host: "192.168.1.100"
});
console.log(`Model: ${info.modelNumber}, MAC: ${info.macAddress}`);
```

## Related Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CallTelemetry Phone Control                         │
│                                                                          │
│   ┌─────────────┐      ┌─────────────────┐      ┌─────────────────┐    │
│   │  cisco-phone-mcp  │      │   jtapi-mcp     │      │  jtapi-sidecar  │    │
│   │ (Direct IP) │      │ (Via Operator)  │      │ (Java/JTAPI)    │    │
│   └─────────────┘      └─────────────────┘      └─────────────────┘    │
│         │                      │                        │               │
│         │                      │                        │               │
│         ▼                      ▼                        ▼               │
│   Phone HTTP               REST Proxy               CUCM CTI           │
│   Endpoints                to Sidecars              Manager            │
│                                                                          │
│   Direct phone         JTAPI call control        Full call control     │
│   RTP stats            Audio injection           BIB greetings         │
│   Screenshots          Device monitoring         Policy engine         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Related Documentation:**
- [JTAPI MCP](../../jtapi-mcp/docs/README.md) - MCP server for JTAPI operations
- [JTAPI Operator](../../jtapi-operator/docs/README.md) - Kubernetes operator
- [JTAPI Sidecar](../../jtapi-sidecar/docs/README.md) - Java JTAPI integration

