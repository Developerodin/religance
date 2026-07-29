/** Trim + reject empty note bodies at the trust boundary. */
export function normalizeNoteBody(body: string): string | null {
  const trimmed = body.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function notePreview(body: string, max = 80): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}
