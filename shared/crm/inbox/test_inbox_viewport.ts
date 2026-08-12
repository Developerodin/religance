import assert from "node:assert/strict";
import { inboxViewportFromWidth } from "./inbox-utils";

assert.equal(inboxViewportFromWidth(389), "mobile");
assert.equal(inboxViewportFromWidth(767), "mobile");
assert.equal(inboxViewportFromWidth(768), "tablet");
assert.equal(inboxViewportFromWidth(1024), "tablet");
assert.equal(inboxViewportFromWidth(1199), "tablet");
assert.equal(inboxViewportFromWidth(1200), "desktop");
assert.equal(inboxViewportFromWidth(1280), "desktop");

console.log("test_inbox_viewport: ok");
