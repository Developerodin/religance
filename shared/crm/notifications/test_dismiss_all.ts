import assert from "node:assert/strict";
import { dismissAllPaged } from "./dismiss-all";
import type { NotificationItem } from "./notifications-api";

function item(id: string): NotificationItem {
  return {
    id,
    type: "inbound_email",
    category: "activity",
    title: id,
    body: id,
    icon: "mail",
    href: "/",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

async function main() {
  const remaining = ["a", "b", "c", "d", "e"];
  const pageSize = 2;
  const dismissed: string[] = [];

  const ok = await dismissAllPaged(
    async () => ({
      live: true as const,
      data: {
        items: remaining.slice(0, pageSize).map(item),
        total: remaining.length,
        activityTotal: remaining.length,
        limit: pageSize,
      },
    }),
    async (id) => {
      dismissed.push(id);
      const idx = remaining.indexOf(id);
      if (idx >= 0) remaining.splice(idx, 1);
      return { live: true as const, data: undefined };
    }
  );

  assert.equal(ok, true);
  assert.deepEqual(dismissed, ["a", "b", "c", "d", "e"]);
  assert.equal(remaining.length, 0);

  const fail = await dismissAllPaged(
    async () => ({ live: false as const, error: "boom" }),
    async () => ({ live: true as const, data: undefined })
  );
  assert.equal(fail, false);

  console.log("test_dismiss_all: ok");
}

void main();
