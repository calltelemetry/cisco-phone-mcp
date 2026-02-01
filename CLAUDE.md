# CLAUDE.md - Phone MCP Server

MCP server for direct Cisco IP phone interactions via built-in HTTP endpoints.

## Quick Start

```bash
# Install dependencies
yarn install

# Build
yarn build

# Run MCP server
yarn start

# CLI testing
yarn cli device --host 192.168.125.178
yarn cli rtp --host 192.168.125.178
```

## Project Structure

```
phone-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── phone.ts          # Phone API functions
│   ├── http.ts           # HTTP client with auth
│   ├── ciscoXml.ts       # XML parser for Cisco responses
│   └── cli.ts            # CLI testing tool
├── dist/                 # Compiled output
├── docs/                 # Documentation
├── test/                 # Tests
├── package.json
└── tsconfig.json
```

## How It Works

Phone MCP directly communicates with Cisco IP phones via their built-in HTTP endpoints:

| Endpoint | Data |
|----------|------|
| `/DeviceInformationX` | Model, serial, firmware |
| `/NetworkConfigurationX` | IP, DNS, CUCM servers |
| `/PortInformationX` | CDP/LLDP neighbor data |
| `/StreamingStatisticsX` | RTP call statistics |
| `/CGI/Execute` | Phone commands (dial, keys) |
| `/CGI/Screenshot` | Display capture |

## Configuration

| Variable | Description |
|----------|-------------|
| `PHONE_USERNAME` | Default phone web UI username |
| `PHONE_PASSWORD` | Default phone web UI password |

## Tool Categories

### Information Tools

| Tool | Description |
|------|-------------|
| `health` | Check phone connectivity |
| `get_device_information` | Model, serial, MAC |
| `get_network_configuration` | IP, DNS, CUCM |
| `get_port_information` | CDP/LLDP neighbors |

### RTP Statistics Tools

| Tool | Description |
|------|-------------|
| `get_streaming_statistics` | Primary stream stats |
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

## Claude Code Integration

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "phone": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/phone-mcp/dist/index.js"],
      "env": {
        "PHONE_USERNAME": "admin",
        "PHONE_PASSWORD": "cisco123"
      }
    }
  }
}
```

## Documentation

Comprehensive documentation is available in the `docs/` folder:

| Category | Documents |
|----------|-----------|
| **Architecture** | [Overview](docs/architecture/overview.md), [Phone Endpoints](docs/architecture/endpoints.md) |
| **Tools** | [Tool Reference](docs/tools.md) |
| **Operations** | [Configuration](docs/ops/configuration.md), [Troubleshooting](docs/ops/troubleshooting.md) |

**Related Documentation:**
- [JTAPI MCP](../jtapi-mcp/docs/README.md) - MCP server via JTAPI operator
- [JTAPI Operator](../jtapi-operator/docs/README.md) - Kubernetes operator
- [JTAPI Sidecar](../jtapi-sidecar/docs/README.md) - Java JTAPI integration

## Use Cases

### Audio Verification

Check if phone received RTP audio:

```typescript
// Before call
const baseline = await mcp__phone__get_rtp_stats({ host });

// After audio injection
const after = await mcp__phone__get_rtp_stats({ host });

// Compare
const delta = after.rxPackets - baseline.rxPackets;
console.log(`Received ${delta} packets`);
```

### Remote Dialing

Initiate call from physical phone:

```typescript
await mcp__phone__dial({
  host: "192.168.1.100",
  digits: "9005551234"
});
```

## Phone MCP vs JTAPI MCP

| Feature | Phone MCP | JTAPI MCP |
|---------|-----------|-----------|
| Connection | Direct to phone | Via operator proxy |
| Call control | Limited (dial, end) | Full (hold, transfer) |
| Audio injection | No | Yes (BIB greetings) |
| RTP stats | Yes (direct) | Yes (via sidecar) |
| Screenshots | Yes | No |

## Critical Rules

- **TypeScript/Node.js** - Uses tsx for development
- **Phone auth** - Set `PHONE_USERNAME`/`PHONE_PASSWORD` env vars
- **Model variations** - Different phones have different endpoints
- **HTTPS for 98xx** - Cisco 98xx series requires HTTPS

## Testing

```bash
# Build and run tests
yarn build && yarn test

# Manual testing via CLI
yarn cli device --host 192.168.125.178
yarn cli rtp --host 192.168.125.178
```

