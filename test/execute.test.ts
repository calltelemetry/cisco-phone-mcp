import test from "node:test";
import assert from "node:assert/strict";

import { withMockFetch, responseText, parseFormBody, mustInclude } from "./helpers.js";

import { executePhoneCommand } from "../src/phone.js";

test("phone: executePhoneCommand sends CiscoIPPhoneExecute XML (escapes URL attr)", async () => {
  const urls = [
    "Key:Speaker",
    "Dial:9000&foo=\"bar\"",
    "Url:https://example.test/?a=1&b=2",
    "Key:<Services>",
  ];

  const h = withMockFetch(async () => {
    const resp = await executePhoneCommand("192.168.125.178", urls, undefined, "/CGI/Execute");
    assert.equal(resp.status, 200);
  });

  await h.run(async (url, init) => {
    if (url.endsWith("/CGI/Execute")) {
      assert.equal((init.method || "GET").toUpperCase(), "POST");
      const form = parseFormBody(init.body);
      assert.ok(form.XML, "Expected form body to include XML field");
      mustInclude(form.XML, "<CiscoIPPhoneExecute>");
      mustInclude(form.XML, "<ExecuteItem Priority=\"0\" URL=\"Key:Speaker\"/>");
      mustInclude(form.XML, "Dial:9000&amp;foo=&quot;bar&quot;");
      mustInclude(form.XML, "Url:https://example.test/?a=1&amp;b=2");
      mustInclude(form.XML, "Key:&lt;Services&gt;");
      return responseText("<CiscoIPPhoneExecuteResponse/>", { status: 200, headers: { "content-type": "text/xml" } });
    }
    return responseText("not found", { status: 404 });
  });
});
