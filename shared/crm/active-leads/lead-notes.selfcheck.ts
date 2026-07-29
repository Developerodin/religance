import assert from "node:assert/strict";
import { normalizeNoteBody, notePreview } from "./lead-notes";

// ponytail: run with `npx tsx shared/crm/active-leads/lead-notes.selfcheck.ts`
assert.equal(normalizeNoteBody("  hello  "), "hello");
assert.equal(normalizeNoteBody("   "), null);
assert.equal(normalizeNoteBody(""), null);
assert.equal(notePreview("a".repeat(100)).endsWith("…"), true);
console.log("lead-notes self-check ok");
