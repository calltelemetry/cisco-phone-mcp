# phone-mcp

MCP server for Cisco IP phone interactions (stats, screenshots, commands).

This targets the built-in Cisco phone HTTP endpoints commonly available on CUCM-managed phones, such as:

- `/DeviceInformationX`
- `/NetworkConfigurationX`
- `/PortInformationX` (CDP/LLDP neighbor)
- `/StreamingStatisticsX` (RTP stats)
- `/CGI/Execute` (send key/URL commands)
- `/CGI/Screenshot` (screenshot; often requires auth)

## Running (MCP)

```bash
yarn install
yarn start
```

Environment variables:

- `PHONE_USERNAME`
- `PHONE_PASSWORD`

Docs:

- `phone-mcp/docs/README.md`

## CLI quick checks

```bash
yarn cli device --host 192.168.125.178
yarn cli network --host 192.168.125.178
yarn cli port --host 192.168.125.178
yarn cli rtp --host 192.168.125.178
```
