import assert from "node:assert/strict";
import { localInputToIso } from "./SequenceProgressPanel";

const iso = localInputToIso("2026-08-22T14:30", "Asia/Kolkata");
assert.ok(iso, "local input converts to ISO");
const dt = new Date(iso!);
const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata",
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
});
const parts: Record<string, string> = {};
for (const p of fmt.formatToParts(dt)) {
  if (p.type !== "literal") parts[p.type] = p.value;
}
assert.equal(parts.hour, "14");
assert.equal(parts.minute, "30");

console.log("test_sequence_progress_panel: ok");
