import type { CrmContact, CrmEmail, CrmLead } from "@/shared/crm/store/types";

export type InboxTag = "lead" | "unlinked" | "internal" | "finance";

export const INBOX_TAG_COLORS: Record<InboxTag, string> = {
  lead: "bg-primary/10 text-primary",
  unlinked: "bg-warning/10 text-warning",
  internal: "bg-info/10 text-info",
  finance: "bg-success/10 text-success",
};

export const INBOX_TAG_LABELS: Record<InboxTag, string> = {
  lead: "Linked leads",
  unlinked: "Unlinked",
  internal: "Internal",
  finance: "Billing",
};

export const INBOX_LIST_TAG_CLASS: Record<InboxTag, string> = {
  lead: "crm-inbox-list-tag--promo",
  unlinked: "crm-inbox-list-tag--personal",
  internal: "crm-inbox-list-tag--social",
  finance: "crm-inbox-list-tag--promo",
};

const AVATAR_TONES = [
  "primary",
  "success",
  "info",
  "warning",
  "secondary",
] as const;

export type InboxAvatarTone = (typeof AVATAR_TONES)[number];

export function inboxAvatarTone(seed: string): InboxAvatarTone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h + seed.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  }
  return AVATAR_TONES[h];
}

export function inboxAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Parses CRM date-only (YYYY-MM-DD) and full ISO datetime strings. */
export function parseCrmDate(iso: string): Date | null {
  if (!iso || iso === "—") return null;
  const normalized = iso.includes("T") ? iso : `${iso}T12:00:00`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatCrmDate(iso: string, fallback = "Unknown date"): string {
  const d = parseCrmDate(iso);
  if (!d) return fallback;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatCrmDateTime(iso: string, fallback = "Unknown date"): string {
  const d = parseCrmDate(iso);
  if (!d) return fallback;
  const hasTime = iso.includes("T") && iso.length > 10;
  if (hasTime) {
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return formatCrmDate(iso, fallback);
}

export function stripHtmlForPreview(html: string, maxLen = 120): string {
  const plain = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|blockquote|tr|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "";
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen)}…`;
}

export function emailPreviewSnippet(email: CrmEmail): string {
  const raw = email.preview?.trim() || email.body || "";
  return stripHtmlForPreview(raw);
}

export function formatInboxTime(sentAt: string): string {
  const d = parseCrmDate(sentAt);
  if (!d) return sentAt;
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function titleCaseFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function resolveSenderName(
  email: CrmEmail,
  leads: CrmLead[],
  contacts: CrmContact[]
): string {
  const peer =
    email.direction === "inbound" ? email.fromEmail : email.toEmail;
  const lead = email.leadId
    ? leads.find((l) => l.id === email.leadId)
    : leads.find((l) => l.contactEmail.toLowerCase() === peer.toLowerCase());
  if (lead) return lead.contactName;
  const contact = contacts.find(
    (c) => c.email.toLowerCase() === peer.toLowerCase()
  );
  if (contact) return contact.name;
  if (email.direction === "outbound") return "You";
  return titleCaseFromEmail(peer);
}

export function resolvePeerEmail(email: CrmEmail): string {
  return email.direction === "inbound" ? email.fromEmail : email.toEmail;
}

export function getInboxTag(
  email: CrmEmail,
  lead: CrmLead | undefined
): InboxTag {
  if (/invoice|payment|billing/i.test(email.subject)) return "finance";
  if (email.leadId && lead) return "lead";
  if (!email.leadId) return "unlinked";
  return "internal";
}

export function splitEmailBody(body: string): string[] {
  const plain = body
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|blockquote|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ");

  const trimmed = plain.trim();
  if (!trimmed) return [];
  const byPara = trimmed.split(/\n\n+/).filter(Boolean);
  if (byPara.length > 1) return byPara;
  return trimmed.split(/\n/).filter(Boolean);
}

export type EmailBodyPartType = "greeting" | "body" | "signoff" | "cta";

export type EmailBodyPart = {
  type: EmailBodyPartType;
  text: string;
};

const GREETING_RE =
  /^(hi|hello|dear|hey|good\s+(morning|afternoon|evening)|greetings)\b/i;
const SIGNOFF_RE =
  /^(regards|thanks|thank you|best|sincerely|cheers|warm regards|kind regards|yours)\b/i;

function cleanTemplateArtifacts(text: string): string {
  return text
    .replace(/\babout\s+\/\s*\./gi, "about our products.")
    .replace(/\bactive in\s*,\s*including\s*\./gi, "active in your region.")
    .replace(/\bIf\s+is\b/gi, "If your team is")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function classifyParagraph(
  text: string,
  index: number,
  total: number
): EmailBodyPartType {
  const t = text.trim();
  if (index === 0 && GREETING_RE.test(t)) return "greeting";
  if (index === 1 && total > 2 && GREETING_RE.test(t)) return "greeting";
  if (index >= total - 2 && SIGNOFF_RE.test(t)) return "signoff";
  if (
    /would you like|please let us know|share our portfolio|product details or samples|evaluating partners/i.test(
      t
    )
  ) {
    return "cta";
  }
  return "body";
}

function mergeDuplicateGreetings(parts: EmailBodyPart[]): EmailBodyPart[] {
  const greetings = parts.filter((p) => p.type === "greeting");
  if (greetings.length <= 1) return parts;
  const preferred =
    greetings.find((p) => /^dear\b/i.test(p.text)) ??
    greetings.find((p) => !/greetings\s*👋/i.test(p.text)) ??
    greetings[greetings.length - 1];
  let used = false;
  return parts.flatMap((part) => {
    if (part.type !== "greeting") return [part];
    if (!used) {
      used = true;
      return [{ ...preferred, type: "greeting" as const }];
    }
    return [];
  });
}

function mergeDuplicateSignoffs(parts: EmailBodyPart[]): EmailBodyPart[] {
  const signoffs = parts.filter((p) => p.type === "signoff");
  if (signoffs.length <= 1) return parts;
  const preferred = signoffs.reduce((best, cur) =>
    cur.text.length > best.text.length ? cur : best
  );
  let used = false;
  return parts.flatMap((part) => {
    if (part.type !== "signoff") return [part];
    if (!used) {
      used = true;
      return [{ ...preferred, type: "signoff" as const }];
    }
    return [];
  });
}

/** Structured email body for inbox detail — dedupes greetings/signoffs, cleans template gaps. */
export function parseEmailBody(body: string): EmailBodyPart[] {
  const paragraphs = splitEmailBody(body)
    .map(cleanTemplateArtifacts)
    .filter(Boolean);
  if (paragraphs.length === 0) return [];

  const parts = paragraphs.map((text, i) => ({
    type: classifyParagraph(text, i, paragraphs.length),
    text,
  }));

  return mergeDuplicateSignoffs(mergeDuplicateGreetings(parts));
}

export function suggestLeadForEmail(
  fromEmail: string,
  leads: CrmLead[]
): CrmLead | null {
  const lower = fromEmail.toLowerCase();
  const exact = leads.find((l) => l.contactEmail.toLowerCase() === lower);
  if (exact) return exact;
  const domain = lower.split("@")[1];
  if (!domain) return null;
  const stem = domain.split(".")[0] ?? "";
  return (
    leads.find((l) => l.contactEmail.toLowerCase().includes(stem)) ?? null
  );
}

export function mailboxDisplayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function resolveMailboxProfile(
  account:
    | {
        email: string;
        displayName?: string | null;
      }
    | null
    | undefined
): { name: string; email: string } | null {
  if (!account?.email) return null;
  const name =
    account.displayName?.trim() || mailboxDisplayNameFromEmail(account.email);
  return { name, email: account.email };
}
