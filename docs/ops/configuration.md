# Configuration

Environment variables and setup for the Phone MCP server.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PHONE_USERNAME` | - | Default phone web UI username |
| `PHONE_PASSWORD` | - | Default phone web UI password |
| `PHONE_USER` | - | Alias for PHONE_USERNAME |
| `PHONE_PASS` | - | Alias for PHONE_PASSWORD |

## Claude Code Integration

### .mcp.json Configuration

Add to your `.mcp.json` file:

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

### Multiple Phone Environments

For different phone environments, create separate MCP server entries:

```json
{
  "mcpServers": {
    "phone-lab": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/cisco-phone-mcp/dist/index.js"],
      "env": {
        "PHONE_USERNAME": "lab-admin",
        "PHONE_PASSWORD": "labpass"
      }
    },
    "phone-prod": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/cisco-phone-mcp/dist/index.js"],
      "env": {
        "PHONE_USERNAME": "prod-admin",
        "PHONE_PASSWORD": "prodpass"
      }
    }
  }
}
```

## Authentication

### Per-Request Authentication

Override default credentials in tool calls:

```typescript
await mcp__phone__get_device_information({
  host: "192.168.1.100",
  auth: {
    username: "special-user",
    password: "special-pass"
  }
});
```

### Priority Order

1. `auth` parameter in tool call
2. `PHONE_USERNAME` / `PHONE_PASSWORD` env vars
3. `PHONE_USER` / `PHONE_PASS` env vars
4. No authentication (for phones that don't require it)

## Phone Access Requirements

### CUCM Configuration

For phone web access to work:

1. **Enable Web Access** in CUCM:
   - Device → Phone → [phone] → Device Information
   - Set "Web Access" to "Enabled"

2. **Set Web Access Credentials** (if required):
   - Can be per-phone or inherited from profile
   - Some phones use CUCM admin credentials

### Network Requirements

- Phone must be reachable from the host running cisco-phone-mcp
- HTTP (port 80) or HTTPS (port 443) access
- No firewall blocking phone web ports

## Build Configuration

### package.json

```json
{
  "name": "cisco-phone-mcp",
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "start": "tsx src/index.ts",
    "build": "tsc",
    "cli": "tsx src/cli.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1",
    "fast-xml-parser": "^4.5.3",
    "zod": "^3.24.2"
  }
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```

## CLI Usage

The CLI provides quick testing without MCP:

```bash
# Device information
yarn cli device --host 192.168.125.178

# Network configuration
yarn cli network --host 192.168.125.178

# Port/CDP information
yarn cli port --host 192.168.125.178

# RTP statistics
yarn cli rtp --host 192.168.125.178
```

## Debugging

### Enable Debug Logging

```bash
DEBUG=* yarn start
```

### Test Phone Connectivity

```bash
# Basic connectivity
curl -v http://192.168.125.178/

# Device info (no auth)
curl http://192.168.125.178/DeviceInformationX

# Device info (with auth)
curl -u admin:password http://192.168.125.178/DeviceInformationX
```

### Manual MCP Testing

```bash
# List tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | yarn start

# Call a tool
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"health","arguments":{"host":"192.168.125.178"}}}' | yarn start
```

## Timeouts

Default timeout is 10 seconds. Override per-request:

```typescript
await mcp__phone__health({
  host: "192.168.1.100",
  timeoutMs: 5000  // 5 seconds
});
```

Screenshot operations have a longer default (20 seconds).

## Related Documentation

- [Troubleshooting](./troubleshooting.md) - Common issues
- [Architecture Overview](../architecture/overview.md) - System design
- [Tool Reference](../tools.md) - Complete tool docs

