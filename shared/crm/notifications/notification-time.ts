import assert from "node:assert/strict";
import { parseCrmDate } from "@/shared/crm/inbox/inbox-utils";

export type NotificationTimeParts = {
  iso: string;
  label: string;
  title: string;
};

function formatAbsoluteShort(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFullTitle(d: Date): string {
  return d.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Relative for recent ("2m ago"); absolute short for older ("Jul 25, 9:57 AM"). */
export function formatNotificationTime(createdAt: string): NotificationTimeParts {
  const d = parseCrmDate(createdAt);
  if (!d) {
    return { iso: createdAt, label: createdAt, title: createdAt };
  }

  const iso = d.toISOString();
  const title = formatFullTitle(d);
  const diffMs = Date.now() - d.getTime();

  if (diffMs < 0) {
    return { iso, label: formatAbsoluteShort(d), title };
  }

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return { iso, label: "Just now", title };

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return { iso, label: `${diffMin}m ago`, title };

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return { iso, label: `${diffHr}h ago`, title };

  return { iso, label: formatAbsoluteShort(d), title };
}

// ponytail: assert self-check — run with `npx tsx shared/crm/notifications/notification-time.ts`
if (process.argv[1]?.endsWith("notification-time.ts")) {
  const recent = formatNotificationTime(new Date(Date.now() - 2 * 60_000).toISOString());
  assert.match(recent.label, /^2m ago$/);

  const older = formatNotificationTime("2026-07-25T09:57:00.000Z");
  assert.match(older.label, /Jul/);
  assert.match(older.label, /25/);
  assert.ok(older.iso.includes("2026-07-25"));
  assert.ok(older.title.length > older.label.length);

  console.log("notification-time self-check passed");
}
