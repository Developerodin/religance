import assert from "node:assert/strict";
import { isHttpUrl } from "./inbox-editor-format";

assert.equal(isHttpUrl("https://example.com"), true);
assert.equal(isHttpUrl("http://example.com/a"), true);
assert.equal(isHttpUrl("javascript:alert(1)"), false);
assert.equal(isHttpUrl("example.com"), false);
assert.equal(isHttpUrl("https://"), false);
console.log("test_inbox_editor_format: ok");
