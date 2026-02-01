# Cisco Phone HTTP Endpoints

Reference for built-in HTTP endpoints on Cisco IP phones.

## Overview

CUCM-managed Cisco IP phones expose HTTP endpoints for diagnostics and control. These endpoints are accessed via the phone's IP address.

## XML Information Endpoints

### /DeviceInformationX

Returns device model, serial, firmware info.

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<DeviceInformation>
  <HostName>SEP001122334455</HostName>
  <phoneDN>1003</phoneDN>
  <MACAddress>00:11:22:33:44:55</MACAddress>
  <serialNumber>FCH12345678</serialNumber>
  <modelNumber>CP-7975G</modelNumber>
  <versionID>9.4(2)SR3</versionID>
  <appLoadID>jar75sccp.9-4-2SR3-1S</appLoadID>
</DeviceInformation>
```

### /NetworkConfigurationX

Returns network settings.

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<NetworkConfiguration>
  <HostName>SEP001122334455</HostName>
  <IPAddress>192.168.125.178</IPAddress>
  <SubNetMask>255.255.255.0</SubNetMask>
  <DefaultRouter1>192.168.125.1</DefaultRouter1>
  <DomainName>example.com</DomainName>
  <DNSServer1>192.168.125.10</DNSServer1>
  <TFTPServer1>192.168.125.10</TFTPServer1>
  <CallManager1>192.168.125.10</CallManager1>
</NetworkConfiguration>
```

### /PortInformationX

Returns CDP/LLDP neighbor information.

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<PortInformation>
  <PortSpeed>1000 Full</PortSpeed>
  <CDPNeighborDeviceId>switch01.example.com</CDPNeighborDeviceId>
  <CDPNeighborIP>192.168.125.1</CDPNeighborIP>
  <CDPNeighborPort>GigabitEthernet1/0/1</CDPNeighborPort>
  <LLDPNeighborDeviceId>switch01</LLDPNeighborDeviceId>
  <LLDPNeighborIP>192.168.125.1</LLDPNeighborIP>
  <LLDPNeighborPort>Gi1/0/1</LLDPNeighborPort>
</PortInformation>
```

### /StreamingStatisticsX

Returns RTP streaming statistics for the primary stream.

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<StreamingStatistics>
  <RemoteAddr>192.168.125.100/16384</RemoteAddr>
  <LocalAddr>192.168.125.178/24576</LocalAddr>
  <StreamStatus>Active</StreamStatus>
  <Name>SEP001122334455</Name>
  <SenderPackets>1500</SenderPackets>
  <SenderOctets>240000</SenderOctets>
  <SenderCodec>G.711 ulaw</SenderCodec>
  <RcvrPackets>1500</RcvrPackets>
  <RcvrOctets>240000</RcvrOctets>
  <RcvrCodec>G.711 ulaw</RcvrCodec>
  <RcvrLostPackets>0</RcvrLostPackets>
  <AvgJitter>2</AvgJitter>
  <MaxJitter>5</MaxJitter>
  <Latency>15</Latency>
  <MOSLQK>4.1</MOSLQK>
</StreamingStatistics>
```

## Serviceability Endpoints

### /CGI/Java/Serviceability

HTML-based serviceability pages with detailed statistics.

**Per-stream RTP stats:**
```
/CGI/Java/Serviceability?adapter=device.statistics.streaming.0
/CGI/Java/Serviceability?adapter=device.statistics.streaming.1
/CGI/Java/Serviceability?adapter=device.statistics.streaming.2
/CGI/Java/Serviceability?adapter=device.statistics.streaming.3
/CGI/Java/Serviceability?adapter=device.statistics.streaming.4
```

**Note:** Stream indices 0-4 map to Streams 1-5 in the phone UI.

**Response:** HTML table with statistics. Parsed by extracting `<B>label</B>` / `<B>value</B>` pairs.

## Command Endpoints

### /CGI/Execute

Accepts CiscoIPPhoneExecute XML payloads to send commands.

**Method:** POST (form-encoded with `XML` field)

**Request:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<CiscoIPPhoneExecute>
  <ExecuteItem Priority="0" URL="Key:Speaker"/>
  <ExecuteItem Priority="0" URL="Dial:9005551234"/>
</CiscoIPPhoneExecute>
```

**Common URLs:**

| Category | URLs |
|----------|------|
| **Keys** | `Key:Speaker`, `Key:EndCall`, `Key:Hold`, `Key:Transfer`, `Key:Conference`, `Key:Headset`, `Key:Mute` |
| **Lines** | `Key:Line1` through `Key:Line6` |
| **Softkeys** | `Key:Soft1` through `Key:Soft4` |
| **Navigation** | `Key:NavUp`, `Key:NavDown`, `Key:NavLeft`, `Key:NavRight`, `Key:NavSelect` |
| **Volume** | `Key:VolUp`, `Key:VolDn` |
| **Dial** | `Dial:1234`, `Dial:9005551234` |
| **Init** | `Init:Services`, `Init:Directories` |

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<CiscoIPPhoneResponse>
  <ResponseItem Status="0" Data="" URL="Key:Speaker"/>
  <ResponseItem Status="0" Data="" URL="Dial:9005551234"/>
</CiscoIPPhoneResponse>
```

## Screenshot Endpoints

### /CGI/Screenshot

Captures phone display as image.

**Method:** GET

**Response:** Binary image (PNG, BMP, or JPEG depending on model)

**Notes:**
- May require authentication
- Cisco 98xx models require HTTPS
- Response format varies by model

### /CGI/lcd.bmp

Alternative screenshot endpoint for some models (39xx, 69xx).

**Method:** GET

**Response:** BMP image

## Authentication

Phones may require HTTP Basic authentication:

```
Authorization: Basic <base64(username:password)>
```

**Common credentials:**
- CUCM admin credentials
- Phone-specific web access credentials configured in CUCM

## Model-Specific Behaviors

### Cisco 79xx Series

- All XML endpoints available
- Serviceability HTML works well
- `/CGI/Screenshot` returns BMP
- HTTP only (no HTTPS)

### Cisco 88xx Series

- All XML endpoints available
- `/CGI/lcd.bmp` may be available
- Usually requires auth for screenshots

### Cisco 98xx Series

- Requires HTTPS for some endpoints
- `/CGI/Screenshot` needs HTTPS
- May have stricter auth requirements

### Cisco 39xx/69xx Series

- Uses `/CGI/lcd.bmp` for screenshots
- Lower resolution displays
- Simpler endpoint structure

## Troubleshooting

### 401 Unauthorized

```bash
# Check if auth is required
curl -v http://192.168.1.100/DeviceInformationX

# Try with credentials
curl -u admin:password http://192.168.1.100/DeviceInformationX
```

### 404 Not Found

Endpoint may not exist on this phone model. Try alternative paths.

### Connection Refused

- Phone may have web access disabled
- Check CUCM Device Configuration → Web Access

### Timeout

- Network connectivity issues
- Phone may be busy/overloaded

## Related Documentation

- [Architecture Overview](./overview.md) - System design
- [Tool Reference](../tools.md) - MCP tool documentation
- [Troubleshooting](../ops/troubleshooting.md) - Common issues

