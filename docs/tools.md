# phone-mcp Tool Reference

This doc describes the most commonly used MCP tools exposed by `phone-mcp`.

All tools accept `host` as either an IP/hostname or a URL (e.g. `192.168.125.178` or `http://192.168.125.178`).

Auth:

- `auth` is optional. If omitted, the server uses `PHONE_USERNAME` / `PHONE_PASSWORD`.

## execute

Send a CiscoIPPhoneExecute payload to the phone.

Inputs:

- `host`
- `urls`: list of ExecuteItem URLs, e.g. `Key:Speaker`, `Key:EndCall`, `Dial:9000`
- `path` (optional): defaults to `/CGI/Execute`

Example:

```json
{
  "host": "192.168.125.178",
  "urls": ["Key:Speaker", "Dial:9000"]
}
```

## dial

Convenience wrapper for dialing.

Inputs:

- `digits`: e.g. `9000`
- `speaker` (optional): default `true` (sends `Key:Speaker` first)

Example:

```json
{
  "host": "192.168.125.178",
  "digits": "9000"
}
```

## end_call

Convenience wrapper to ensure an active call is terminated.

Inputs:

- `repeat` (optional): default `2` (sends multiple end-call presses)

Example:

```json
{
  "host": "192.168.125.178",
  "repeat": 3
}
```

## get_streaming_statistics_stream

Queries the phone's Serviceability HTML page for a stream index (0-4).

Inputs:

- `streamIndex`: `0..4`

Notes:

- The active call stream is often streamIndex `0`.
- The "Local Address" includes the phone RTP port (`<phone-ip>/<port>`), which can be used for correlation.

## get_streaming_statistics

Fetches `/StreamingStatisticsX` and returns the parsed values.

Useful fields:

- `RcvrCodec` / `SenderCodec`
- `RcvrPackets` / `RcvrLostPackets`
