import assert from "node:assert/strict";
import { sendTimeHasPassed } from "./WorkflowConfirmCard";
import type { PreviewSummary, WorkflowSchedule } from "./types";

const NOW = new Date("2026-08-21T10:00:00Z").getTime();

function preview(schedule: WorkflowSchedule, nextSendAt: string): PreviewSummary {
  return {
    kind: "preview_summary",
    templateName: "First Introduction",
    templateId: "t1",
    recipients: [{ id: "l1", name: "Prakhar Sharma", email: "prakhar@theodin.in" }],
    scheduleLabel: "Send once",
    timezone: "Asia/Kolkata",
    endLabel: "Single send",
    mailbox: "prakhar@theodin.in",
    accountId: "acc-1",
    nextSendAt,
    subjectPreview: "API Supply Inquiry",
    bodyPreviewHtml: "<p>Hello</p>",
    contract: {
      version: "v1",
      action: "create",
      schedule,
      confidence: 1,
      requestId: "token-1",
    },
  };
}

const oneMinuteAgo = new Date(NOW - 60_000).toISOString();
const inAnHour = new Date(NOW + 3_600_000).toISOString();

// A one-time card whose moment has passed must stop advertising a clock time —
// confirming it sends immediately.
assert.equal(
  sendTimeHasPassed(preview({ frequency: "once", runAt: oneMinuteAgo }, oneMinuteAgo), NOW),
  true,
);
assert.equal(
  sendTimeHasPassed(preview({ frequency: "once", runAt: inAnHour }, inAnHour), NOW),
  false,
);

// Recurring cards always have a genuine next occurrence — never "immediately".
assert.equal(
  sendTimeHasPassed(preview({ frequency: "daily", time: "10:00" }, oneMinuteAgo), NOW),
  false,
  "a recurring card must never claim to send immediately",
);

// A malformed instant must not read as "already passed" — that would relabel the button.
assert.equal(
  sendTimeHasPassed(preview({ frequency: "once", runAt: "not-a-date" }, "not-a-date"), NOW),
  false,
);

console.log("test_workflow_confirm_card: ok");
