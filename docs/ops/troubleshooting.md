# Troubleshooting

Common issues and solutions for the Phone MCP server.

## Connection Issues

### Cannot Connect to Phone

**Symptom:** Connection refused or timeout.

**Possible causes:**
- Phone not reachable on network
- Web access disabled on phone
- Firewall blocking access

**Solutions:**

```bash
# Test basic connectivity
ping 192.168.1.100

# Test HTTP access
curl -v http://192.168.1.100/

# Check if phone responds
curl -I http://192.168.1.100/DeviceInformationX
```

**CUCM Fix:**
1. Go to Device → Phone → [phone]
2. Find "Web Access" setting
3. Set to "Enabled"
4. Save and apply config

### 401 Unauthorized

**Symptom:** Phone returns 401 for requests.

**Solutions:**

1. **Set environment variables:**
   ```bash
   export PHONE_USERNAME=admin
   export PHONE_PASSWORD=cisco123
   ```

2. **Pass auth in request:**
   ```typescript
   await mcp__phone__get_device_information({
     host: "192.168.1.100",
     auth: { username: "admin", password: "password" }
   });
   ```

3. **Check CUCM credentials:**
   - Phone may use CUCM admin credentials
   - Or phone-specific web credentials

### Timeout Errors

**Symptom:** Requests hang and timeout.

**Possible causes:**
- Network latency
- Phone busy
- Screenshot endpoint slow

**Solutions:**

1. **Increase timeout:**
   ```typescript
   await mcp__phone__health({
     host: "192.168.1.100",
     timeoutMs: 30000
   });
   ```

2. **Check phone load:**
   - Try during off-peak hours
   - Phone may be processing other requests

## RTP Statistics Issues

### No RTP Stats

**Symptom:** RTP stats return null/zero values.

**Possible causes:**
- No active call
- Wrong stream index
- Stats cleared after call ended

**Solutions:**

```typescript
// Check if call is active
const stats = await mcp__phone__get_streaming_statistics({
  host: "192.168.1.100"
});

if (stats.streamStatus !== "Active") {
  console.log("No active call");
}

// Try all streams
const allStreams = await mcp__phone__get_streaming_statistics_all_streams({
  host: "192.168.1.100"
});
const activeStream = allStreams.find(s => s.streamStatus === "Active");
```

### Serviceability Page Errors

**Symptom:** `get_streaming_statistics_stream` fails.

**Possible causes:**
- Phone model doesn't support Serviceability pages
- Authentication required for Serviceability

**Solutions:**

```bash
# Test Serviceability access directly
curl -u admin:password \
  "http://192.168.1.100/CGI/Java/Serviceability?adapter=device.statistics.streaming.0"
```

## Screenshot Issues

### Screenshot Returns Empty

**Symptom:** Screenshot returns 0 bytes.

**Possible causes:**
- Wrong endpoint for phone model
- HTTPS required (98xx models)
- Authentication required

**Solutions:**

1. **Use auto-detect:**
   ```typescript
   await mcp__phone__screenshot_auto({
     host: "192.168.1.100",
     modelHint: "Cisco 7975"  // Help with detection
   });
   ```

2. **Try different paths:**
   ```typescript
   // Standard path
   await mcp__phone__screenshot({ host, path: "/CGI/Screenshot" });

   // Alternative for 39xx/69xx
   await mcp__phone__screenshot({ host, path: "/CGI/lcd.bmp" });
   ```

3. **Check if HTTPS needed:**
   ```bash
   curl -k https://192.168.1.100/CGI/Screenshot -o screenshot.png
   ```

### Screenshot Authentication

**Symptom:** 401 on screenshot but other endpoints work.

Some phones require auth specifically for screenshots:

```typescript
await mcp__phone__screenshot({
  host: "192.168.1.100",
  auth: {
    username: "admin",
    password: "password"
  }
});
```

## Command Execution Issues

### Dial Not Working

**Symptom:** `dial` tool succeeds but phone doesn't dial.

**Possible causes:**
- Phone needs to go off-hook first
- Phone is locked
- Line not available

**Solutions:**

```typescript
// Ensure speaker is activated
await mcp__phone__dial({
  host: "192.168.1.100",
  digits: "9005551234",
  speaker: true  // Explicitly enable
});

// Or use raw execute
await mcp__phone__execute({
  host: "192.168.1.100",
  urls: ["Key:Speaker", "Dial:9005551234"]
});
```

### EndCall Not Ending Call

**Symptom:** Call remains active after `end_call`.

**Solutions:**

```typescript
// Use multiple presses
await mcp__phone__end_call({
  host: "192.168.1.100",
  repeat: 3
});

// Or raw execute
await mcp__phone__execute({
  host: "192.168.1.100",
  urls: ["Key:EndCall", "Key:EndCall", "Key:EndCall"]
});
```

## XML Parsing Issues

### Malformed XML Response

**Symptom:** Parser errors on phone response.

**Possible causes:**
- Phone returning HTML error page
- Unexpected XML structure

**Solutions:**

```typescript
// Use raw_get to see actual response
const resp = await mcp__phone__raw_get({
  host: "192.168.1.100",
  path: "/DeviceInformationX"
});
console.log(resp.body);  // Inspect raw response
```

## Model-Specific Issues

### Cisco 98xx HTTPS

**Issue:** 98xx phones require HTTPS for some endpoints.

```bash
# Use HTTPS
curl -k https://192.168.1.100/CGI/Screenshot
```

```typescript
// Pass full URL
await mcp__phone__screenshot({
  host: "https://192.168.1.100"
});
```

### Cisco 39xx/69xx LCD

**Issue:** No `/CGI/Screenshot`, use `/CGI/lcd.bmp`.

```typescript
await mcp__phone__screenshot({
  host: "192.168.1.100",
  path: "/CGI/lcd.bmp"
});
```

## Debug Checklist

```bash
# 1. Test basic connectivity
ping 192.168.1.100

# 2. Test HTTP access
curl -v http://192.168.1.100/

# 3. Test device info (no auth)
curl http://192.168.1.100/DeviceInformationX

# 4. Test device info (with auth)
curl -u admin:password http://192.168.1.100/DeviceInformationX

# 5. Test streaming stats
curl http://192.168.1.100/StreamingStatisticsX

# 6. Test screenshot
curl -o /tmp/screenshot.png http://192.168.1.100/CGI/Screenshot

# 7. Check model
curl http://192.168.1.100/DeviceInformationX | grep modelNumber
```

## Environment Checklist

```bash
# Check credentials
echo "PHONE_USERNAME: $PHONE_USERNAME"
echo "PHONE_PASSWORD: ${PHONE_PASSWORD:+<set>}"

# Check Node.js version
node --version

# Check dependencies
cd phone-mcp && yarn list --depth=0
```

## Related Documentation

- [Configuration](./configuration.md) - Environment setup
- [Phone Endpoints](../architecture/endpoints.md) - Endpoint reference
- [Tool Reference](../tools.md) - Tool documentation

