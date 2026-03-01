# cisco-phone-mcp

MCP server for direct Cisco IP phone control and monitoring via built-in HTTP endpoints.

Gives AI agents (Claude Code, etc.) the ability to dial numbers, capture screenshots, read RTP call-quality stats, and query device/network information from any CUCM-managed Cisco IP phone — no JTAPI or CUCM admin access required.

## Features

| Category | Tools | Description |
|----------|-------|-------------|
| **Device Info** | `health`, `get_device_information`, `get_network_configuration`, `get_port_information` | Model, serial, MAC, firmware, IP config, CDP/LLDP neighbors |
| **RTP / Call Quality** | `get_streaming_statistics`, `get_streaming_statistics_stream`, `get_streaming_statistics_all_streams`, `get_rtp_stats` | Real-time RTP packet counts, jitter, codec, remote/local addresses |
| **Call Control** | `dial`, `end_call`, `execute` | Dial digits, end calls, send arbitrary CiscoIPPhoneExecute commands |
| **Screenshots** | `screenshot`, `screenshot_auto` | Capture phone display (auto-detects endpoint path per model) |
| **Raw Access** | `raw_get` | GET any phone HTTP endpoint and return the response |

## Quick Start

```bash
# Install
yarn install

# Build
yarn build

# Run as MCP server (stdio transport)
yarn start
```

## Configuration

Authentication is optional — many phones allow unauthenticated access to info endpoints. Set these environment variables if your phones require HTTP Basic auth:

| Variable | Description |
|----------|-------------|
| `PHONE_USERNAME` | Phone web UI username |
| `PHONE_PASSWORD` | Phone web UI password |

Aliases `PHONE_USER` and `PHONE_PASS` are also accepted.

Every tool accepts an optional `auth` parameter to override the default credentials per-call.

## Claude Code Integration

Add to your project or user `.mcp.json`:

```json
{
  "mcpServers": {
    "phone": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/cisco-phone-mcp/dist/index.js"],
      "env": {
        "PHONE_USERNAME": "your-username",
        "PHONE_PASSWORD": "your-password"
      }
    }
  }
}
```

Then use tools like:

```
mcp__phone__get_device_information({ host: "192.168.1.100" })
mcp__phone__dial({ host: "192.168.1.100", digits: "9005551234" })
mcp__phone__get_rtp_stats({ host: "192.168.1.100" })
mcp__phone__screenshot_auto({ host: "192.168.1.100" })
```

## Tool Reference

### health

Check if a phone is reachable.

```json
{ "host": "192.168.1.100" }
```

Returns HTTP status code and content type.

### get_device_information

Query `/DeviceInformationX` — returns model name, serial number, MAC address, firmware version, hardware revision.

### get_network_configuration

Query `/NetworkConfigurationX` — returns IP address, subnet, default gateway, DNS servers, DHCP status, TFTP/CUCM server addresses.

### get_port_information

Query `/PortInformationX` — returns CDP and LLDP neighbor information (switch name, port, VLAN).

### get_streaming_statistics / get_rtp_stats

Query `/StreamingStatisticsX` for real-time RTP media statistics:

- **Codec** — G.711, G.722, etc.
- **Packet counts** — TX/RX packets and bytes
- **Jitter** — Current receive jitter in milliseconds
- **Remote/Local addresses** — IP:port pairs for the active media stream

`get_rtp_stats` returns a simplified summary; `get_streaming_statistics_all_streams` returns all 5 streams.

### dial

Initiate a call from the phone:

```json
{ "host": "192.168.1.100", "digits": "9005551234" }
```

Sends `Key:Speaker` (activates speakerphone) then `Dial:<digits>` via `/CGI/Execute`. Set `speaker: false` to skip the speaker activation.

### end_call

End the active call by sending `Key:EndCall` (default: 2 presses).

### execute

Send arbitrary `CiscoIPPhoneExecute` commands:

```json
{ "host": "192.168.1.100", "urls": ["Key:Services", "Key:Soft1"] }
```

### screenshot / screenshot_auto

Capture the phone display as an image file. `screenshot_auto` tries multiple endpoint paths to handle model differences (79xx, 88xx, 98xx).

### raw_get

Fetch any phone HTTP endpoint:

```json
{ "host": "192.168.1.100", "path": "/StreamingStatisticsX?2" }
```

## Supported Phone Models

Works with Cisco Unified IP phones that expose HTTP endpoints:

| Series | Info Endpoints | Execute/Dial | Screenshots | Notes |
|--------|:-:|:-:|:-:|-------|
| **79xx** (7941, 7945, 7965, 7975) | Yes | Yes | Yes (BMP) | Most reliable |
| **88xx** (8841, 8845, 8851, 8861) | Yes | Yes | Yes (PNG) | — |
| **78xx** (7821, 7841, 7861) | Yes | Yes | Varies | — |
| **39xx** (3905) | Limited | Yes | No | Fewer info endpoints |
| **98xx** (9841, 9851, 9861) | Yes | Yes | Yes | Requires HTTPS |

## CLI Testing

A built-in CLI is included for quick manual checks:

```bash
yarn cli device --host 192.168.1.100
yarn cli network --host 192.168.1.100
yarn cli port --host 192.168.1.100
yarn cli rtp --host 192.168.1.100
```

## Architecture

```
Claude Code  ──►  cisco-phone-mcp (stdio)  ──►  Phone HTTP Server
                  MCP SDK + Zod validation       /DeviceInformationX
                  fast-xml-parser                 /NetworkConfigurationX
                                                  /StreamingStatisticsX
                                                  /CGI/Execute
                                                  /CGI/Screenshot
```

The server communicates directly with phones over HTTP (or HTTPS for 98xx). No CUCM, JTAPI, or middleware is needed — just network access to the phone's IP.

## Development

```bash
yarn install          # Install dependencies
yarn build            # Compile TypeScript → dist/
yarn typecheck        # Type-check without emitting
yarn test             # Build + run Node.js test runner
yarn start            # Run MCP server (tsx, for dev)
```

## Related Projects

- [jtapi-mcp](https://github.com/calltelemetry/jtapi-mcp) — Full JTAPI call control via MCP (hold, transfer, conference, audio injection)
- [cucm-mcp](https://github.com/calltelemetry/cucm-mcp) — CUCM AXL admin operations via MCP
- [cisco-axl-mcp](https://github.com/calltelemetry/cisco-axl-mcp) — AXL SOAP operations via MCP

## License

Private — CallTelemetry
