import {
  getRtpStats,
  getDeviceInformation,
  getNetworkConfiguration,
  getPortInformation,
  getStreamingStatisticsAllStreams,
} from "./phone.js";

function usage(): never {
  console.error("Usage: yarn cli <command> --host <host>");
  console.error("Commands: device, network, port, rtp, streams");
  process.exit(2);
}

const args = process.argv.slice(2);
const cmd = args[0];
if (!cmd) usage();

let host: string | undefined;
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--host") {
    host = args[i + 1];
    i++;
  }
}

if (!host) usage();

const targetHost = host;

async function main() {
  switch (cmd) {
    case "device":
      console.log(JSON.stringify(await getDeviceInformation(targetHost), null, 2));
      return;
    case "network":
      console.log(JSON.stringify(await getNetworkConfiguration(targetHost), null, 2));
      return;
    case "port":
      console.log(JSON.stringify(await getPortInformation(targetHost), null, 2));
      return;
    case "rtp":
      console.log(JSON.stringify(await getRtpStats(targetHost), null, 2));
      return;
    case "streams":
      console.log(JSON.stringify(await getStreamingStatisticsAllStreams(targetHost), null, 2));
      return;
    default:
      usage();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
