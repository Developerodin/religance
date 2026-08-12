/** Allow only same-origin relative paths (blocks //evil.com). */
export function safeAppRedirect(raw: string | null | undefined, fallback = "/active-leads/"): string {
  if (!raw) return fallback;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) return fallback;
  return path;
}
