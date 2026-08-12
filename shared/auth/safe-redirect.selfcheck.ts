import assert from "node:assert/strict";
import { safeAppRedirect } from "./safe-redirect";

assert.equal(safeAppRedirect("/notifications/"), "/notifications/");
assert.equal(safeAppRedirect("//evil.com"), "/active-leads/");
assert.equal(safeAppRedirect("https://evil.com"), "/active-leads/");
assert.equal(safeAppRedirect(null), "/active-leads/");
console.log("safe-redirect.selfcheck: ok");
