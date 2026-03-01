import test from "node:test";
import assert from "node:assert/strict";

import { withMockFetch, responseText } from "./helpers.js";

import { getDeviceInformation, getNetworkConfiguration, getPortInformation } from "../src/phone.js";

test("phone: getDeviceInformation parses DeviceInformationX XML", async () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<DeviceInformation>
  <HostName>SEP001122334455</HostName>
  <phoneDN>1001</phoneDN>
  <MACAddress>00:11:22:33:44:55</MACAddress>
  <serialNumber>FCH1234ABCD</serialNumber>
  <modelNumber>CP-8841</modelNumber>
  <versionID>sip88xx.12-5-1SR3-74</versionID>
  <appLoadID>sip88xx.12-5-1SR3-74</appLoadID>
</DeviceInformation>`;

  const h = withMockFetch(async () => {
    const di = await getDeviceInformation("192.168.125.178");
    assert.equal(di.hostName, "SEP001122334455");
    assert.equal(di.phoneDn, "1001");
    assert.equal(di.macAddress, "00:11:22:33:44:55");
    assert.equal(di.serialNumber, "FCH1234ABCD");
    assert.equal(di.modelNumber, "CP-8841");
    assert.equal(di.versionId, "sip88xx.12-5-1SR3-74");
    assert.equal(di.appLoadId, "sip88xx.12-5-1SR3-74");
  });

  await h.run(async (url) => {
    if (url.endsWith("/DeviceInformationX")) {
      return responseText(xml, { status: 200, headers: { "content-type": "text/xml" } });
    }
    return responseText("not found", { status: 404 });
  });
});

test("phone: getDeviceInformation throws on HTTP 400+", async () => {
  const h = withMockFetch(async () => {
    await assert.rejects(
      () => getDeviceInformation("192.168.125.178"),
      (err: Error) => {
        assert.ok(err.message.includes("DeviceInformationX HTTP 403"));
        return true;
      }
    );
  });

  await h.run(async (url) => {
    if (url.endsWith("/DeviceInformationX")) {
      return responseText("Forbidden", { status: 403 });
    }
    return responseText("not found", { status: 404 });
  });
});

test("phone: getDeviceInformation with auth credentials", async () => {
  const xml = `<DeviceInformation><HostName>TestPhone</HostName></DeviceInformation>`;

  const h = withMockFetch(async ({ calls }) => {
    const di = await getDeviceInformation("192.168.125.178", { username: "admin", password: "cisco" });
    assert.equal(di.hostName, "TestPhone");
    assert.equal(calls.length, 1);
    const authHeader = calls[0].init.headers?.authorization;
    assert.ok(authHeader?.startsWith("Basic "));
  });

  await h.run(async (url) => {
    if (url.endsWith("/DeviceInformationX")) {
      return responseText(xml, { status: 200 });
    }
    return responseText("not found", { status: 404 });
  });
});

test("phone: getNetworkConfiguration parses NetworkConfigurationX XML", async () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<NetworkConfiguration>
  <HostName>SEP001122334455</HostName>
  <IPAddress>192.168.125.178</IPAddress>
  <SubNetMask>255.255.255.0</SubNetMask>
  <DefaultRouter1>192.168.125.1</DefaultRouter1>
  <DomainName>example.com</DomainName>
  <DNSServer1>8.8.8.8</DNSServer1>
  <DNSServer2>8.8.4.4</DNSServer2>
  <TFTPServer1>192.168.125.10</TFTPServer1>
  <CallManager1>192.168.125.10</CallManager1>
</NetworkConfiguration>`;

  const h = withMockFetch(async () => {
    const nc = await getNetworkConfiguration("192.168.125.178");
    assert.equal(nc.hostName, "SEP001122334455");
    assert.equal(nc.ipAddress, "192.168.125.178");
    assert.equal(nc.subNetMask, "255.255.255.0");
    assert.equal(nc.defaultRouter1, "192.168.125.1");
    assert.equal(nc.domainName, "example.com");
    assert.equal(nc.dnsServer1, "8.8.8.8");
    assert.equal(nc.dnsServer2, "8.8.4.4");
    assert.equal(nc.tftpServer1, "192.168.125.10");
    assert.equal(nc.callManager1, "192.168.125.10");
  });

  await h.run(async (url) => {
    if (url.endsWith("/NetworkConfigurationX")) {
      return responseText(xml, { status: 200, headers: { "content-type": "text/xml" } });
    }
    return responseText("not found", { status: 404 });
  });
});

test("phone: getNetworkConfiguration throws on HTTP 500", async () => {
  const h = withMockFetch(async () => {
    await assert.rejects(
      () => getNetworkConfiguration("192.168.125.178"),
      (err: Error) => {
        assert.ok(err.message.includes("NetworkConfigurationX HTTP 500"));
        return true;
      }
    );
  });

  await h.run(async (url) => {
    if (url.endsWith("/NetworkConfigurationX")) {
      return responseText("Internal Server Error", { status: 500 });
    }
    return responseText("not found", { status: 404 });
  });
});

test("phone: getPortInformation parses PortInformationX XML", async () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<PortInformation>
  <PortSpeed>1000-Full</PortSpeed>
  <CDPNeighborDeviceId>switch01.example.com</CDPNeighborDeviceId>
  <CDPNeighborIP>192.168.125.1</CDPNeighborIP>
  <CDPNeighborPort>GigabitEthernet1/0/5</CDPNeighborPort>
  <LLDPNeighborDeviceId>switch01</LLDPNeighborDeviceId>
  <LLDPNeighborIP>192.168.125.1</LLDPNeighborIP>
  <LLDPNeighborPort>Gi1/0/5</LLDPNeighborPort>
</PortInformation>`;

  const h = withMockFetch(async () => {
    const pi = await getPortInformation("192.168.125.178");
    assert.equal(pi.portSpeed, "1000-Full");
    assert.equal(pi.cdpNeighborDeviceId, "switch01.example.com");
    assert.equal(pi.cdpNeighborIp, "192.168.125.1");
    assert.equal(pi.cdpNeighborPort, "GigabitEthernet1/0/5");
    assert.equal(pi.lldpNeighborDeviceId, "switch01");
    assert.equal(pi.lldpNeighborIp, "192.168.125.1");
    assert.equal(pi.lldpNeighborPort, "Gi1/0/5");
  });

  await h.run(async (url) => {
    if (url.endsWith("/PortInformationX")) {
      return responseText(xml, { status: 200, headers: { "content-type": "text/xml" } });
    }
    return responseText("not found", { status: 404 });
  });
});

test("phone: getPortInformation throws on HTTP 401", async () => {
  const h = withMockFetch(async () => {
    await assert.rejects(
      () => getPortInformation("192.168.125.178"),
      (err: Error) => {
        assert.ok(err.message.includes("PortInformationX HTTP 401"));
        return true;
      }
    );
  });

  await h.run(async (url) => {
    if (url.endsWith("/PortInformationX")) {
      return responseText("Unauthorized", { status: 401 });
    }
    return responseText("not found", { status: 404 });
  });
});
