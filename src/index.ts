#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer, SERVER_NAME } from "./server.js";

export { createMcpServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
