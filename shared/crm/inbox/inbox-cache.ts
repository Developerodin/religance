import type { CrmEmail } from "@/shared/crm/store/types";

/** Bump when cache row shape changes — stale entries are ignored. */
export const INBOX_CACHE_SCHEMA_VERSION = 1;

const CACHE_PREFIX = "outlook-inbox";
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ROWS = 200;

export type InboxFolderPagination = {
  nextPageToken: string | null;
};

export type InboxCacheSnapshot = {
  schemaVersion: number;
  emails: CrmEmail[];
  lastSyncedAt: string;
  folderPagination: Record<string, InboxFolderPagination>;
  savedAt: number;
};

function cacheKey(userId: string, accountId: string): string {
  return `${CACHE_PREFIX}:${userId}:${accountId}`;
}

function trimRows(emails: CrmEmail[]): CrmEmail[] {
  const sorted = [...emails].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  return sorted.slice(0, MAX_ROWS);
}

export function readInboxCache(
  userId: string,
  accountId: string
): InboxCacheSnapshot | null {
  if (typeof window === "undefined" || !userId || !accountId) return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(userId, accountId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InboxCacheSnapshot;
    if (parsed.schemaVersion !== INBOX_CACHE_SCHEMA_VERSION) return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > TTL_MS) return null;
    if (!Array.isArray(parsed.emails)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeInboxCache(
  userId: string,
  accountId: string,
  snapshot: Omit<InboxCacheSnapshot, "schemaVersion" | "savedAt">
): void {
  if (typeof window === "undefined" || !userId || !accountId) return;
  try {
    const payload: InboxCacheSnapshot = {
      schemaVersion: INBOX_CACHE_SCHEMA_VERSION,
      savedAt: Date.now(),
      emails: trimRows(snapshot.emails),
      lastSyncedAt: snapshot.lastSyncedAt,
      folderPagination: snapshot.folderPagination,
    };
    sessionStorage.setItem(cacheKey(userId, accountId), JSON.stringify(payload));
  } catch {
    // ponytail: sessionStorage quota — drop pagination tokens first on next write if needed
  }
}

/** First non-empty cache row for userId — used to paint inbox before async sync. */
export function findInboxCacheForUser(
  userId: string
): (InboxCacheSnapshot & { accountId: string }) | null {
  if (typeof window === "undefined" || !userId) return null;
  const prefix = `${CACHE_PREFIX}:${userId}:`;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const accountId = key.slice(prefix.length);
      const snapshot = readInboxCache(userId, accountId);
      if (snapshot?.emails.length) return { ...snapshot, accountId };
    }
  } catch {
    // ignore
  }
  return null;
}

export function purgeInboxCache(userId?: string | null, accountId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (userId && accountId) {
      sessionStorage.removeItem(cacheKey(userId, accountId));
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(`${CACHE_PREFIX}:`)) keys.push(key);
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
