import assert from "node:assert/strict";
import { withTemplateContent } from "./inbox-utils";

const prev = {
  to: "contact@pharma.com",
  cc: "cc@x.com",
  bcc: "",
  subject: "API Supply Inquiry",
  body: "<p>Dear Supplier…</p>",
};

const cleared = withTemplateContent(prev, null);
assert.equal(cleared.to, "contact@pharma.com");
assert.equal(cleared.cc, "cc@x.com");
assert.equal(cleared.bcc, "");
assert.equal(cleared.subject, "");
assert.equal(cleared.body, "");

const applied = withTemplateContent(prev, {
  subject: "New subject",
  body: "<p>New body</p>",
});
assert.equal(applied.to, "contact@pharma.com");
assert.equal(applied.subject, "New subject");
assert.equal(applied.body, "<p>New body</p>");

console.log("test_inbox_compose_template: ok");
