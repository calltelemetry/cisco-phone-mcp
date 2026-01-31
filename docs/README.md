# phone-mcp Docs

`phone-mcp` is an MCP server that talks to Cisco IP phones via their built-in HTTP endpoints.

Primary uses:

- execute phone key presses / dial strings via CiscoIPPhoneExecute (`/CGI/Execute`)
- capture phone RTP / streaming stats for audio verification
- gather device/network/port info for troubleshooting

## Configuration

If your phone requires HTTP basic auth, set:

```bash
export PHONE_USERNAME=ccmadmin
export PHONE_PASSWORD=your-password
```

## Key Tools

- `execute`: send raw `ExecuteItem` URLs (keys, dial, etc.)
- `dial`: convenience wrapper for `Key:Speaker` + `Dial:<digits>`
- `end_call`: convenience wrapper for repeated `Key:EndCall`
- `get_streaming_statistics_stream`: per-stream RTP stats (Serviceability HTML)
- `get_streaming_statistics`: StreamingStatisticsX XML (single endpoint)

More detail:

- `phone-mcp/docs/tools.md`
