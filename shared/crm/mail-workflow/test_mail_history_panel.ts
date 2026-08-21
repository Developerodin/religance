import assert from "node:assert/strict";
import { matchesQuery, relativeFrom, safeHttpUrl } from "./MailHistoryPanel";
import type { MailHistoryContact } from "./types";

const NOW = new Date("2026-08-21T10:00:00Z").getTime();
const day = 86_400_000;

assert.equal(relativeFrom(null, NOW), "never");
assert.equal(relativeFrom("not-a-date", NOW), "never");
assert.equal(relativeFrom(new Date(NOW - 2 * 3600_000).toISOString(), NOW), "today");
assert.equal(relativeFrom(new Date(NOW - 1 * day).toISOString(), NOW), "yesterday");
assert.equal(relativeFrom(new Date(NOW - 5 * day).toISOString(), NOW), "5 days ago");
assert.equal(relativeFrom(new Date(NOW - 60 * day).toISOString(), NOW), "2 months ago");
assert.equal(relativeFrom(new Date(NOW - 800 * day).toISOString(), NOW), "2 years ago");

const contact: MailHistoryContact = {
  contactId: "lead-1",
  name: "Prakhar Sharma",
  company: "Religence Pharmaceuticals",
  email: "prakhar@theodin.in",
  totalSent: 2,
  totalFailed: 0,
  firstContactedAt: null,
  lastContactedAt: null,
  events: [
    {
      runId: "r1",
      workflowId: "w1",
      recipientId: "lead-1",
      templateId: "t1",
      templateName: "First Introduction",
      subject: "API Supply Inquiry — Corticosteroid APIs",
      scheduledAt: "2026-08-21T04:44:00Z",
      sentAt: "2026-08-21T04:44:03Z",
      status: "sent",
      runStatus: "success",
      linkable: true,
    },
  ],
};

// Empty query keeps everyone — the panel must not start out blank.
assert.equal(matchesQuery(contact, ""), true);
assert.equal(matchesQuery(contact, "   "), true);
assert.equal(matchesQuery(contact, "prakhar"), true);
assert.equal(matchesQuery(contact, "PRAKHAR"), true, "search must be case-insensitive");
assert.equal(matchesQuery(contact, "religence"), true, "company is searchable");
assert.equal(matchesQuery(contact, "theodin.in"), true, "email is searchable");
assert.equal(matchesQuery(contact, "corticosteroid"), true, "subject is searchable");
assert.equal(matchesQuery(contact, "quotation"), false);

// The webLink is server-supplied and ends up in location.href of an about:blank tab,
// which inherits this origin — anything but http(s) must not survive.
assert.equal(
  safeHttpUrl("https://outlook.office.com/mail/id/AAQk"),
  "https://outlook.office.com/mail/id/AAQk",
);
assert.equal(safeHttpUrl("javascript:alert(document.cookie)"), null);
assert.equal(safeHttpUrl("data:text/html,<script>alert(1)</script>"), null);
assert.equal(safeHttpUrl("/mail/id/AAQk"), null, "a relative link is not a mailbox link");
assert.equal(safeHttpUrl(""), null);

console.log("test_mail_history_panel: ok");
