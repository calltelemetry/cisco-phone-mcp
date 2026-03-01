# Phone MCP Tool Reference

Complete reference for all MCP tools exposed by cisco-phone-mcp.

## Common Parameters

All tools accept these common parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `host` | string | Yes | Phone IP or URL (e.g., `192.168.1.100` or `http://192.168.1.100`) |
| `auth` | object | No | Basic auth `{username, password}`. Defaults to env vars |

## Information Tools

### health

Check phone HTTP connectivity.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `host` | string | Yes | Phone host |
| `timeoutMs` | number | No | Request timeout |

**Returns:**
```json
{
  "status": 200,
  "contentType": "text/html"
}
```

### get_device_information

Get phone model, serial, firmware info.

**Endpoint:** `/DeviceInformationX`

**Returns:**
```json
{
  "hostName": "SEP001122334455",
  "phoneDn": "1003",
  "macAddress": "00:11:22:33:44:55",
  "serialNumber": "FCH12345678",
  "modelNumber": "CP-7975G",
  "versionId": "9.4(2)SR3",
  "appLoadId": "jar75sccp.9-4-2SR3-1S"
}
```

### get_network_configuration

Get phone network settings.

**Endpoint:** `/NetworkConfigurationX`

**Returns:**
```json
{
  "hostName": "SEP001122334455",
  "ipAddress": "192.168.125.178",
  "subNetMask": "255.255.255.0",
  "defaultRouter1": "192.168.125.1",
  "domainName": "example.com",
  "dnsServer1": "192.168.125.10",
  "dnsServer2": "8.8.8.8",
  "tftpServer1": "192.168.125.10",
  "callManager1": "192.168.125.10"
}
```

### get_port_information

Get CDP/LLDP neighbor discovery data.

**Endpoint:** `/PortInformationX`

**Returns:**
```json
{
  "portSpeed": "1000 Full",
  "cdpNeighborDeviceId": "switch01.example.com",
  "cdpNeighborIp": "192.168.125.1",
  "cdpNeighborPort": "GigabitEthernet1/0/1",
  "lldpNeighborDeviceId": "switch01",
  "lldpNeighborIp": "192.168.125.1",
  "lldpNeighborPort": "Gi1/0/1"
}
```

## RTP Statistics Tools

### get_streaming_statistics

Get primary stream RTP statistics.

**Endpoint:** `/StreamingStatisticsX`

**Returns:**
```json
{
  "remoteAddrRaw": "192.168.125.100/16384",
  "localAddrRaw": "192.168.125.178/24576",
  "streamStatus": "Active",
  "name": "SEP001122334455",
  "senderPackets": 1500,
  "senderOctets": 240000,
  "senderCodec": "G.711 ulaw",
  "rcvrPackets": 1500,
  "rcvrOctets": 240000,
  "rcvrCodec": "G.711 ulaw",
  "rcvrLostPackets": 0,
  "avgJitter": 2,
  "maxJitter": 5,
  "latency": 15,
  "mosLqk": 4.1
}
```

### get_streaming_statistics_stream

Get RTP statistics for a specific stream index.

**Endpoint:** `/CGI/Java/Serviceability?adapter=device.statistics.streaming.{index}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `streamIndex` | number | Yes | Stream index 0-4 |

**Returns:** Same as `get_streaming_statistics` plus:
```json
{
  "streamIndex": 0
}
```

**Note:** Stream 0 is typically the active call. Use this for multi-call scenarios.

### get_streaming_statistics_all_streams

Get RTP statistics for all 5 streams.

**Returns:**
```json
[
  { "streamIndex": 0, "streamStatus": "Active", ... },
  { "streamIndex": 1, "streamStatus": "Inactive", ... },
  { "streamIndex": 2, "streamStatus": "Inactive", ... },
  { "streamIndex": 3, "streamStatus": "Inactive", ... },
  { "streamIndex": 4, "streamStatus": "Inactive", ... }
]
```

### get_rtp_stats

Simplified RTP summary with parsed addresses.

**Returns:**
```json
{
  "streamStatus": "Active",
  "local": { "host": "192.168.125.178", "port": 24576 },
  "remote": { "host": "192.168.125.100", "port": 16384 },
  "rxPackets": 1500,
  "txPackets": 1500,
  "lostPackets": 0,
  "jitter": { "avg": 2, "max": 5 },
  "codec": { "rx": "G.711 ulaw", "tx": "G.711 ulaw" },
  "mosLqk": 4.1
}
```

## Command Tools

### execute

Send raw CiscoIPPhoneExecute commands.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `urls` | string[] | Yes | ExecuteItem URLs |
| `path` | string | No | Endpoint path (default: `/CGI/Execute`) |

**Example:**
```json
{
  "host": "192.168.125.178",
  "urls": ["Key:Speaker", "Dial:9000"]
}
```

**Common ExecuteItem URLs:**

| URL | Description |
|-----|-------------|
| `Key:Speaker` | Toggle speakerphone |
| `Key:EndCall` | End current call |
| `Key:Services` | Open services menu |
| `Key:Settings` | Open settings menu |
| `Key:Headset` | Toggle headset |
| `Key:Mute` | Toggle mute |
| `Key:Hold` | Hold/resume call |
| `Key:Transfer` | Transfer call |
| `Key:Conference` | Conference call |
| `Key:Line1` - `Key:Line6` | Select line |
| `Key:Soft1` - `Key:Soft4` | Softkeys |
| `Key:VolUp` / `Key:VolDn` | Volume control |
| `Key:NavUp/Down/Left/Right` | Navigation |
| `Key:NavSelect` | Select |
| `Dial:1234` | Dial digits |
| `Init:Services` | Reset to services |

**Returns:**
```json
{
  "status": 200,
  "responseXml": "<?xml version=\"1.0\"?>..."
}
```

### dial

Convenience wrapper for dialing.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `digits` | string | Yes | Number to dial |
| `speaker` | boolean | No | Press speaker first (default: true) |

**Example:**
```json
{
  "host": "192.168.125.178",
  "digits": "9005551234"
}
```

**Returns:**
```json
{
  "status": 200,
  "executed": ["Key:Speaker", "Dial:9005551234"],
  "responseXml": "..."
}
```

### end_call

End the active call.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repeat` | number | No | Number of EndCall presses (default: 2) |

**Note:** Multiple presses ensure the call is terminated even if the first press was delayed.

**Returns:**
```json
{
  "status": 200,
  "executed": ["Key:EndCall", "Key:EndCall"],
  "responseXml": "..."
}
```

## Screenshot Tools

### screenshot

Capture phone display.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | No | Screenshot endpoint (default: `/CGI/Screenshot`) |
| `outFile` | string | No | Output file path |

**Returns:**
```json
{
  "status": 200,
  "contentType": "image/png",
  "bytes": 45678,
  "file": "/tmp/phone-screenshot.png"
}
```

### screenshot_auto

Auto-detect screenshot path based on phone model.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `modelHint` | string | No | Model hint (e.g., "Cisco 98xx") |
| `outFile` | string | No | Output file path |

**Model-specific paths:**

| Model | Path | Protocol |
|-------|------|----------|
| Cisco 98xx | `/CGI/Screenshot` | HTTPS |
| Cisco 39xx | `/CGI/lcd.bmp` | HTTP |
| Cisco 69xx | `/CGI/lcd.bmp` | HTTP |
| Other | `/CGI/Screenshot` | HTTP |

**Returns:**
```json
{
  "status": 200,
  "contentType": "image/bmp",
  "bytes": 45678,
  "file": "/tmp/phone-screenshot.bmp",
  "usedUrl": "http://192.168.125.178/CGI/lcd.bmp",
  "attempted": ["http://192.168.125.178/CGI/lcd.bmp"]
}
```

## Utility Tools

### raw_get

Raw HTTP GET to any phone endpoint.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | URL path to GET |
| `timeoutMs` | number | No | Request timeout |

**Returns:**
```json
{
  "status": 200,
  "contentType": "text/xml",
  "body": "<?xml version=\"1.0\"?>..."
}
```

**Use cases:**
- Access undocumented endpoints
- Debug raw responses
- Explore phone capabilities

## Error Handling

All tools return HTTP status codes:

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 401 | Authentication required |
| 403 | Access denied |
| 404 | Endpoint not found |
| 408 | Request timeout |
| 500+ | Phone error |

## Related Documentation

- [RTP Statistics](./tools/rtp-stats.md) - Detailed RTP stats guide
- [Phone Commands](./tools/commands.md) - Command reference
- [Configuration](./ops/configuration.md) - Environment setup

