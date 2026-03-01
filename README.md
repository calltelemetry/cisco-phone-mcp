# cisco-phone-mcp

[![CI](https://github.com/calltelemetry/cisco-phone-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/calltelemetry/cisco-phone-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/calltelemetry/cisco-phone-mcp/graph/badge.svg)](https://codecov.io/gh/calltelemetry/cisco-phone-mcp)
[![npm](https://img.shields.io/npm/v/@calltelemetry/cisco-phone-mcp)](https://www.npmjs.com/package/@calltelemetry/cisco-phone-mcp)

An [MCP](https://modelcontextprotocol.io/) server that gives AI assistants direct control of Cisco IP phones via their built-in HTTP endpoints.

Dial numbers, capture screenshots, read real-time RTP call-quality stats, and query device/network information from any CUCM-managed Cisco IP phone — no JTAPI, no CUCM admin access, no middleware required. Just network access to the phone's IP.

## What It Does

Exposes 14 tools for phone control, monitoring, and diagnostics:

| Category | Tools | Description |
|----------|-------|-------------|
| **Device Info** | `health`, `get_device_information`, `get_network_configuration`, `get_port_information` | Model, serial, MAC, firmware, IP config, CDP/LLDP neighbors |
| **RTP / Call Quality** | `get_streaming_statistics`, `get_streaming_statistics_stream`, `get_streaming_statistics_all_streams`, `get_rtp_stats` | Real-time RTP packet counts, jitter, codec, MOS scores |
| **Call Control** | `dial`, `end_call`, `execute` | Dial digits, end calls, send arbitrary CiscoIPPhoneExecute commands |
| **Screenshots** | `screenshot`, `screenshot_auto` | Capture phone display (auto-detects endpoint path per model) |
| **Raw Access** | `raw_get` | GET any phone HTTP endpoint |

## Installation

```bash
npm install -g @calltelemetry/cisco-phone-mcp
```

Or with npx (no install):

```bash
npx @calltelemetry/cisco-phone-mcp
```

## Quick Start

### Claude Code

```bash
claude mcp add phone -e PHONE_USERNAME=admin -e PHONE_PASSWORD=cisco -- npx @calltelemetry/cisco-phone-mcp
```

Or add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "phone": {
      "command": "npx",
      "args": ["@calltelemetry/cisco-phone-mcp"],
      "env": {
        "PHONE_USERNAME": "admin",
        "PHONE_PASSWORD": "cisco"
      },
      "type": "stdio"
    }
  }
}
```

### Other MCP Clients

Any MCP-compatible client can launch the server via stdio:

```bash
PHONE_USERNAME=admin PHONE_PASSWORD=cisco npx @calltelemetry/cisco-phone-mcp
```

## Configuration

| Environment Variable | Description |
|---|---|
| `PHONE_USERNAME` | Phone web UI username |
| `PHONE_PASSWORD` | Phone web UI password |

Aliases `PHONE_USER` and `PHONE_PASS` are also accepted.

Authentication is optional — many phones allow unauthenticated access to info endpoints. Every tool accepts an optional `auth` parameter to override credentials per-call.

## Tools

### `health`

Check if a phone is reachable.

```json
{ "host": "192.168.1.100" }
```

Returns HTTP status code and content type.

### `get_device_information`

Query `/DeviceInformationX` — model name, serial number, MAC address, firmware version, hardware revision.

```json
{ "host": "192.168.1.100" }
```

### `get_network_configuration`

Query `/NetworkConfigurationX` — IP address, subnet, default gateway, DNS servers, DHCP status, TFTP/CUCM server addresses.

### `get_port_information`

Query `/PortInformationX` — CDP and LLDP neighbor information (switch name, port, VLAN).

### `get_streaming_statistics` / `get_rtp_stats`

Query `/StreamingStatisticsX` for real-time RTP media statistics:

- **Codec** — G.711, G.722, etc.
- **Packet counts** — TX/RX packets and bytes
- **Jitter** — Current jitter in milliseconds
- **MOS** — Mean Opinion Score (call quality)
- **Remote/Local addresses** — IP:port pairs for the active media stream

`get_rtp_stats` returns a simplified summary; `get_streaming_statistics` returns the full XML response.

### `get_streaming_statistics_stream`

Query a specific stream (0-4) via the Serviceability HTML endpoint:

```json
{ "host": "192.168.1.100", "streamIndex": 0 }
```

### `get_streaming_statistics_all_streams`

Returns all 5 streams — useful for conference calls or shared lines.

### `dial`

Initiate a call from the phone:

```json
{ "host": "192.168.1.100", "digits": "9005551234" }
```

Sends `Key:Speaker` (activates speakerphone) then `Dial:<digits>` via `/CGI/Execute`. Set `speaker: false` to skip the speaker activation.

### `end_call`

End the active call by sending `Key:EndCall` (default: 2 presses).

### `execute`

Send arbitrary `CiscoIPPhoneExecute` commands:

```json
{ "host": "192.168.1.100", "urls": ["Key:Services", "Key:Soft1"] }
```

### `screenshot` / `screenshot_auto`

Capture the phone display as an image file. `screenshot_auto` tries multiple endpoint paths to handle model differences (79xx BMP, 88xx PNG, 98xx HTTPS).

### `raw_get`

Fetch any phone HTTP endpoint:

```json
{ "host": "192.168.1.100", "path": "/StreamingStatisticsX?2" }
```

## Supported Phone Models

| Series | Info Endpoints | Execute/Dial | Screenshots | Notes |
|--------|:-:|:-:|:-:|-------|
| **79xx** (7941, 7945, 7965, 7975) | Yes | Yes | Yes (BMP) | Most reliable |
| **88xx** (8841, 8845, 8851, 8861) | Yes | Yes | Yes (PNG) | — |
| **78xx** (7821, 7841, 7861) | Yes | Yes | Varies | — |
| **39xx** (3905) | Limited | Yes | LCD only | Uses `/CGI/lcd.bmp` |
| **69xx** (6901, 6921, 6941, 6961) | Limited | Yes | LCD only | Uses `/CGI/lcd.bmp` |
| **98xx** (9841, 9851, 9861) | Yes | Yes | Yes | Requires HTTPS |

## Examples

### Verify a phone received audio (RTP packet delta)

```
# Before call
stats_before = mcp__phone__get_rtp_stats({ host: "192.168.1.100" })

# After audio injection
stats_after = mcp__phone__get_rtp_stats({ host: "192.168.1.100" })

# Compare rxPackets — if delta > 0, audio was received
```

### Remote dial and screenshot

```
mcp__phone__dial({ host: "192.168.1.100", digits: "9005551234" })
# Wait for call to connect...
mcp__phone__screenshot_auto({ host: "192.168.1.100" })
```

### Check call quality during a call

```
mcp__phone__get_rtp_stats({ host: "192.168.1.100" })
# Returns: jitter, MOS score, packet loss, codec info
```

## Architecture

```
AI Agent  ──►  cisco-phone-mcp (stdio)  ──►  Phone HTTP Server
               MCP SDK + Zod validation       /DeviceInformationX
               fast-xml-parser                 /NetworkConfigurationX
                                               /StreamingStatisticsX
                                               /CGI/Execute
                                               /CGI/Screenshot
```

The server communicates directly with phones over HTTP (or HTTPS for 98xx). No CUCM, JTAPI, or middleware is needed — just network access to the phone's IP.

## CLI Testing

A built-in CLI is included for quick manual checks:

```bash
npx @calltelemetry/cisco-phone-mcp    # Not used for CLI — see below

# From source:
yarn cli device --host 192.168.1.100
yarn cli network --host 192.168.1.100
yarn cli port --host 192.168.1.100
yarn cli rtp --host 192.168.1.100
```

## Development

```bash
git clone https://github.com/calltelemetry/cisco-phone-mcp.git
cd cisco-phone-mcp
npm install
npm run build
npm test
```

## Related Projects

- **[cisco-axl-mcp](https://github.com/calltelemetry/cisco-axl-mcp)** — CUCM AXL admin operations via MCP (phones, users, route patterns)

## License

MIT — see [LICENSE](LICENSE) for details.
