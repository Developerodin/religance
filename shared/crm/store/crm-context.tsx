"use client";

import { isAuthed, getUser, getUserDisplayName } from "@/shared/auth/auth-client";
import type { CompanyProfileDetail } from "@/shared/crm/lead-discovery/company-profile-types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applyTemplate,
  cloneDefaultEmailTemplates,
  createBlankEmailTemplate,
  getDefaultEmailTemplate,
  isDefaultEmailTemplate,
  type EmailTemplate,
  type TemplateVariables,
} from "./email-templates";
import {
  createBlankMedicine,
  normalizeMedicine,
  type DiscoveryMedicine,
} from "./medicines-master";
import { createBlankSalt, type SaltMasterItem } from "./salts-master";
import {
  createBackendMedicine,
  createBackendSalt,
  getBackendMedicines,
  getBackendSalts,
  patchBackendMedicine,
  patchBackendSalt,
  removeBackendMedicine,
  removeBackendSalt,
} from "./catalogue-api";
import { createInitialCrmState } from "./seed";
import type {
  CrmCompany,
  CrmContact,
  CrmEmail,
  CrmEmailMeta,
  CrmFollowUp,
  CrmLead,
  CrmQuotation,
  CrmSample,
  CrmState,
  CrmTimelineEvent,
  CreateLeadWithCompanyInput,
  EmailFlag,
  LeadStage,
  SaveToContactOption,
} from "./types";
import { DEFAULT_LEAD_SCORE } from "./types";
import { findCompanyByNormalizedName } from "./lead-form-utils";
import {
  buildLeadTitle,
  followUpInDays,
  generateCrmId,
  getNextLeadStage,
  optionCreatesContact,
  optionCreatesLead,
  primaryContactFromProfile,
  stageAfterSendEmail,
  todayIso,
} from "./workflow";
import {
  fetchOutlookConnectUrl,
  disconnectOutlookAccount as disconnectOutlookAccountApi,
  getOutlookThread,
  listOutlookAccounts,
  listOutlookThreads,
  type OutlookAccount,
  type OutlookThreadItem,
  sendOutlookMessage,
  replyOutlookMessage,
  replyAllOutlookMessage,
  forwardOutlookMessage,
  batchModifyOutlookThreads,
  trashOutlookThreads,
} from "./outlook-api";
import { getBackendContacts, saveBackendContacts } from "./contacts-api";
import { getBackendCompanies, saveBackendCompanies } from "./companies-api";
import { getBackendEmailMeta, saveBackendEmailMeta } from "./emails-api";
import { getBackendLeads, saveBackendLeads } from "./leads-api";
import { getBackendSamples, saveBackendSamples } from "./samples-api";
import { getBackendQuotations, saveBackendQuotations } from "./quotations-api";
import { getBackendFollowUps, saveBackendFollowUps } from "./follow-ups-api";
import {
  deleteNotificationByDedupeKey,
  postNotification,
  postNotificationScan,
} from "@/shared/crm/notifications/notifications-api";
import { triggerNotificationRefresh } from "@/shared/crm/notifications/notification-context";
import { getBackendDeals, saveBackendDeals } from "./deals-api";
import { getBackendTimeline, saveBackendTimeline } from "./timeline-api";
import {
  getBackendEmailTemplates,
  saveBackendEmailTemplates,
} from "./templates-api";
import { nextQuoteNo } from "../quotations/quotation-form";
import {
  INBOX_FOLDER_LABEL_IDS,
  type InboxFolderName,
} from "../inbox/inbox-constants";

export type SaveFromDiscoveryInput = {
  profile: CompanyProfileDetail;
  option: SaveToContactOption;
  contactIndex?: number;
};

export type SendCrmEmailInput = {
  leadId?: string | null;
  toEmail: string;
  subject: string;
  body: string;
  /** Outlook message id to thread against. Only synced emails have one. */
  replyToMessageId?: string | null;
  mode?: "reply" | "replyAll" | "forward";
};

export type OutlookSyncOptions = {
  /** Lightweight INBOX/SENT poll — preserves load-more threads. */
  background?: boolean;
};

const OUTLOOK_POLL_INTERVAL_MS = 30_000;

const OUTLOOK_FOLDER_SOURCES = [
  { labelId: "INBOX", mailboxLabel: "INBOX" },
  { labelId: "SENT", mailboxLabel: "SENT" },
  { labelId: "DRAFT", mailboxLabel: "DRAFT" },
  { labelId: "JUNK", mailboxLabel: "JUNK" },
  { labelId: "ARCHIVE", mailboxLabel: "ARCHIVE" },
  { labelId: "TRASH", mailboxLabel: "TRASH" },
  { labelId: "OUTBOX", mailboxLabel: "OUTBOX" },
  {
    labelId: "CONVERSATION_HISTORY",
    mailboxLabel: "CONVERSATION_HISTORY",
  },
] as const;

type CrmContextValue = CrmState & {
  hydrated: boolean;
  masterDataSynced: boolean;
  masterDataRevision: number;
  crmSynced: boolean;
  outlookInboxSyncing: boolean;
  outlookInboxLastSyncedAt: string | null;
  outlookSyncError: string | null;
  saveFromDiscovery: (input: SaveFromDiscoveryInput) => {
    companyId: string;
    contactId: string | null;
    leadId: string | null;
    openCompose: boolean;
  };
  createLeadWithCompany: (input: CreateLeadWithCompanyInput) => {
    companyId: string;
    contactId: string | null;
    leadId: string;
  };
  updateLeadWithCompany: (
    leadId: string,
    input: Partial<CreateLeadWithCompanyInput>
  ) => void;
  createLeadManual: (input: Omit<CrmLead, "id" | "createdAt" | "lastActivity" | "sourceLinks"> & {
    sourceLinks?: CrmLead["sourceLinks"];
  }) => string;
  updateLead: (leadId: string, patch: Partial<CrmLead>) => void;
  deleteLead: (
    leadId: string,
    opts?: { samples?: boolean; quotations?: boolean; contact?: boolean }
  ) => void;
  setLeadStage: (leadId: string, stage: LeadStage) => void;
  advanceLeadStage: (leadId: string) => void;
  verifyLead: (leadId: string) => void;
  markLeadLost: (leadId: string) => void;
  markLeadDormant: (leadId: string) => void;
  createDealFromLead: (leadId: string, value?: string) => string | null;
  /** Resolves to null on success, or an error message if the send failed. */
  sendCrmEmail: (input: SendCrmEmailInput) => Promise<string | null>;
  linkEmailToLead: (emailId: string, leadId: string) => void;
  /** Star / read / archive / trash. Persisted, so it survives a reload. */
  setEmailFlag: (emailId: string, flag: EmailFlag, on: boolean) => void;
  emailIdsWithFlag: (flag: EmailFlag) => string[];
  connectOutlook: () => Promise<void>;
  disconnectOutlook: (accountId?: string | null) => Promise<void>;
  syncOutlookInbox: (
    preferredAccountId?: string | null,
    preferredEmail?: string | null,
    options?: OutlookSyncOptions
  ) => Promise<void>;
  switchOutlookAccount: (accountId: string) => Promise<void>;
  /** True when Graph has another page for this folder. */
  inboxFolderHasMore: (folder: InboxFolderName) => boolean;
  loadingMoreInboxFolder: InboxFolderName | null;
  loadMoreInboxEmails: (folder: InboxFolderName) => Promise<void>;
  getCompany: (id: string) => CrmCompany | undefined;
  getContact: (id: string) => CrmContact | undefined;
  deleteContact: (id: string) => void;
  getLead: (id: string) => CrmLead | undefined;
  /** Record a sample against a lead; company + owner are copied from the lead. */
  addSample: (
    leadId: string,
    input: Omit<
      CrmSample,
      "id" | "leadId" | "companyId" | "companyName" | "owner" | "createdAt"
    >
  ) => string;
  updateSample: (id: string, patch: Partial<Omit<CrmSample, "id">>) => void;
  deleteSample: (id: string) => void;
  addQuotation: (
    leadId: string,
    input: Omit<
      CrmQuotation,
      | "id"
      | "leadId"
      | "companyId"
      | "companyName"
      | "owner"
      | "quoteNo"
      | "createdAt"
    >
  ) => string;
  updateQuotation: (id: string, patch: Partial<Omit<CrmQuotation, "id">>) => void;
  deleteQuotation: (id: string) => void;
  addFollowUp: (
    leadId: string,
    input: Omit<CrmFollowUp, "id" | "leadId" | "contactedBy" | "createdAt">
  ) => string;
  updateFollowUp: (id: string, patch: Partial<Omit<CrmFollowUp, "id">>) => void;
  deleteFollowUp: (id: string) => void;
  getLeadFollowUps: (leadId: string) => CrmFollowUp[];
  getLeadEmails: (leadId: string) => CrmEmail[];
  getLeadTimeline: (leadId: string) => CrmTimelineEvent[];
  findCompanyByDiscoveryId: (discoveryId: string) => CrmCompany | undefined;
  buildTemplateVars: (lead: CrmLead) => TemplateVariables;
  updateEmailTemplate: (
    id: string,
    patch: Partial<Omit<EmailTemplate, "id">>
  ) => void;
  replaceEmailTemplates: (templates: EmailTemplate[]) => void;
  addEmailTemplate: () => string;
  deleteEmailTemplate: (id: string) => void;
  resetEmailTemplate: (id: string) => void;
  resetAllEmailTemplates: () => void;
  /** Shared catalogue: every edit is a per-item server call. */
  refreshMasterData: () => Promise<boolean>;
  addSalt: () => Promise<string | null>;
  updateSalt: (
    id: string,
    patch: Partial<Omit<SaltMasterItem, "id">>
  ) => Promise<boolean>;
  deleteSalt: (id: string) => Promise<boolean>;
  addMedicine: (saltId?: string) => Promise<string | null>;
  updateMedicine: (
    id: string,
    patch: Partial<Omit<DiscoveryMedicine, "id">>
  ) => Promise<boolean>;
  deleteMedicine: (id: string) => Promise<boolean>;
  pendingComposeLeadId: string | null;
  setPendingComposeLeadId: (id: string | null) => void;
  resetStore: () => void;
};

const CrmContext = createContext<CrmContextValue | null>(null);

function appendTimeline(
  timeline: CrmTimelineEvent[],
  event: Omit<CrmTimelineEvent, "id">
): CrmTimelineEvent[] {
  return [{ ...event, id: generateCrmId("tl") }, ...timeline];
}

function extractEmailAddress(raw: string): string {
  const s = String(raw || "").trim();
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
}

/**
 * Graph re-sends every email with leadId: null on each sync, so the CRM's own
 * overlay has to be re-applied afterwards or the user's lead links vanish.
 */
function outlookEmailId(threadId: string): string {
  return `outlook-${threadId}`;
}

/** Local-only row added on send before Graph sync; replaced by outlook-* id. */
function isLocalOnlyCrmEmail(email: CrmEmail): boolean {
  return email.id.startsWith("em-") && !email.messageId;
}

function emailListFingerprint(email: CrmEmail): string {
  const peer =
    email.direction === "inbound" ? email.fromEmail : email.toEmail;
  return `${email.subject.trim().toLowerCase()}\0${extractEmailAddress(peer)}`;
}

function preferSyncedEmailRow(a: CrmEmail, b: CrmEmail): CrmEmail {
  if (isLocalOnlyCrmEmail(a) && !isLocalOnlyCrmEmail(b)) return b;
  if (isLocalOnlyCrmEmail(b) && !isLocalOnlyCrmEmail(a)) return a;
  const aTimed = a.sentAt.includes("T");
  const bTimed = b.sentAt.includes("T");
  if (aTimed !== bTimed) return aTimed ? a : b;
  if (a.messageId && !b.messageId) return a;
  if (b.messageId && !a.messageId) return b;
  return a.sentAt.localeCompare(b.sentAt) >= 0 ? a : b;
}

function mergeEmailMeta(a: CrmEmailMeta, b: CrmEmailMeta): CrmEmailMeta {
  return {
    id: a.id,
    leadId: a.leadId ?? b.leadId,
    starred: a.starred || b.starred,
    read: a.read && b.read,
    archived: a.archived || b.archived,
    trashed: a.trashed || b.trashed,
  };
}

/** Keeps star/archive/trash flags when Graph rotates the latest message id. */
function reconcileEmailMetaAfterSync(
  meta: CrmEmailMeta[],
  prevEmails: CrmEmail[],
  nextEmails: CrmEmail[]
): CrmEmailMeta[] {
  const nextIds = new Set(nextEmails.map((e) => e.id));
  const prevById = new Map(prevEmails.map((e) => [e.id, e]));
  const nextByThread = new Map(nextEmails.map((e) => [e.threadId, e]));
  const reconciled = new Map<string, CrmEmailMeta>();

  for (const entry of meta) {
    if (nextIds.has(entry.id)) {
      const existing = reconciled.get(entry.id);
      reconciled.set(
        entry.id,
        existing ? mergeEmailMeta(existing, entry) : entry
      );
      continue;
    }

    const byOutlookId = entry.id.startsWith("outlook-")
      ? nextEmails.find((e) => outlookEmailId(e.threadId) === entry.id)
      : undefined;
    if (byOutlookId) {
      const existing = reconciled.get(byOutlookId.id);
      const migrated = { ...entry, id: byOutlookId.id };
      reconciled.set(
        byOutlookId.id,
        existing ? mergeEmailMeta(existing, migrated) : migrated
      );
      continue;
    }

    const byMessageId = nextEmails.find((e) => e.messageId === entry.id);
    if (byMessageId) {
      const existing = reconciled.get(byMessageId.id);
      const migrated = { ...entry, id: byMessageId.id };
      reconciled.set(
        byMessageId.id,
        existing ? mergeEmailMeta(existing, migrated) : migrated
      );
      continue;
    }

    const prevEmail = prevById.get(entry.id);
    const threadId = prevEmail?.threadId;
    const nextEmail = threadId ? nextByThread.get(threadId) : undefined;
    const targetId = nextEmail?.id ?? (threadId ? outlookEmailId(threadId) : null);
    if (!targetId) continue;

    const existing = reconciled.get(targetId);
    const migrated = { ...entry, id: targetId };
    reconciled.set(
      targetId,
      existing ? mergeEmailMeta(existing, migrated) : migrated
    );
  }

  return [...reconciled.values()];
}

function findEmailMeta(
  email: CrmEmail,
  meta: CrmEmailMeta[]
): CrmEmailMeta | undefined {
  return (
    meta.find((m) => m.id === email.id) ??
    meta.find((m) => email.messageId && m.id === email.messageId) ??
    meta.find((m) => m.id === outlookEmailId(email.threadId))
  );
}

/** Archived/trashed mail lives in Outlook folders we must re-fetch or it vanishes. */
function mergeFlaggedEmails(
  synced: CrmEmail[],
  prevEmails: CrmEmail[],
  meta: CrmEmailMeta[]
): CrmEmail[] {
  const syncedThreads = new Set(synced.map((e) => e.threadId));
  const syncedIds = new Set(synced.map((e) => e.id));
  const extras: CrmEmail[] = [];

  for (const prev of prevEmails) {
    if (
      isLocalOnlyCrmEmail(prev) ||
      syncedIds.has(prev.id) ||
      syncedThreads.has(prev.threadId)
    ) {
      continue;
    }
    const entry = findEmailMeta(prev, meta);
    if (!entry?.archived && !entry?.trashed) continue;
    const labels = new Set(prev.mailboxLabels ?? []);
    if (entry.archived) labels.add("ARCHIVE");
    if (entry.trashed) labels.add("TRASH");
    extras.push({ ...prev, mailboxLabels: [...labels] });
  }

  return dedupeEmailsByThread([...synced, ...extras]);
}

/** Background poll: keep paginated threads, merge updated INBOX/SENT at top. */
function mergeBackgroundSyncEmails(
  synced: CrmEmail[],
  prevEmails: CrmEmail[]
): CrmEmail[] {
  const syncedThreads = new Set(synced.map((e) => e.threadId));
  const syncedIds = new Set(synced.map((e) => e.id));
  const extras = prevEmails.filter(
    (prev) =>
      !isLocalOnlyCrmEmail(prev) &&
      !syncedIds.has(prev.id) &&
      !syncedThreads.has(prev.threadId)
  );
  return dedupeEmailsByThread([...synced, ...extras]).sort((a, b) =>
    b.sentAt.localeCompare(a.sentAt)
  );
}

/** Pre-Outlook optimistic sends never hit Graph — drop on sync. */
export function dedupeEmailsByThread(emails: CrmEmail[]): CrmEmail[] {
  const synced = emails.filter((email) => !isLocalOnlyCrmEmail(email));

  const byFingerprint = new Map<string, CrmEmail>();
  for (const email of synced) {
    const fp = emailListFingerprint(email);
    const existing = byFingerprint.get(fp);
    byFingerprint.set(
      fp,
      existing ? preferSyncedEmailRow(existing, email) : email
    );
  }

  const byThread = new Map<string, CrmEmail>();
  for (const email of byFingerprint.values()) {
    const existing = byThread.get(email.threadId);
    byThread.set(
      email.threadId,
      existing ? preferSyncedEmailRow(existing, email) : email
    );
  }
  return [...byThread.values()];
}

// ponytail: dev-only guard — fingerprint dedupe must collapse Graph threadId drift.
function assertEmailDedupInvariant(): void {
  const row = (
    id: string,
    threadId: string,
    subject: string,
    sentAt: string
  ): CrmEmail => ({
    id,
    leadId: null,
    threadId,
    direction: "outbound",
    subject,
    body: "",
    preview: "",
    fromEmail: "me@co.com",
    toEmail: "test@co.com",
    sentAt,
  });
  const merged = dedupeEmailsByThread([
    row("outlook-conv1", "conv1", "Re: Budesonide", "2026-07-29T10:23:00Z"),
    row("outlook-msg2", "msg2", "Re: Budesonide", "2026-07-29"),
    row("em-local", "thread-x", "Re: Budesonide", "2026-07-29"),
  ]);
  if (merged.length !== 1 || merged[0].id !== "outlook-conv1") {
    throw new Error("dedupeEmailsByThread invariant failed");
  }
}
if (process.env.NODE_ENV === "development") {
  assertEmailDedupInvariant();
}

function applyEmailMeta(emails: CrmEmail[], meta: CrmEmailMeta[]): CrmEmail[] {
  if (!meta.length) return emails;
  const byId = new Map(meta.map((m) => [m.id, m]));
  return emails.map((e) => {
    const m = byId.get(e.id);
    return m ? { ...e, leadId: m.leadId } : e;
  });
}

function upsertEmailMeta(
  meta: CrmEmailMeta[],
  id: string,
  patchMeta: Partial<Omit<CrmEmailMeta, "id">>
): CrmEmailMeta[] {
  const existing = meta.find((m) => m.id === id);
  if (existing) {
    return meta.map((m) => (m.id === id ? { ...m, ...patchMeta } : m));
  }
  return [
    ...meta,
    {
      id,
      leadId: null,
      starred: false,
      read: false,
      archived: false,
      trashed: false,
      ...patchMeta,
    },
  ];
}

type InboxFolderPagination = {
  nextPageToken: string | null;
};

type ThreadBucketItem = {
  thread: OutlookThreadItem;
  mailboxLabels: Set<string>;
};

function inboxFolderPaginationKey(accountId: string, labelId: string): string {
  return `${accountId}:${labelId}`;
}

function buildCrmEmailFromThreadItem(
  item: ThreadBucketItem,
  detailRes: Awaited<ReturnType<typeof getOutlookThread>>,
  accountEmail: string
): CrmEmail | null {
  const listThreadId = item.thread.threadId || item.thread.id;
  const messages = detailRes.live ? [...detailRes.data.messages] : [];
  messages.sort((a, b) => {
    const ta = new Date(a.date ?? 0).getTime();
    const tb = new Date(b.date ?? 0).getTime();
    return ta - tb;
  });

  const threadId =
    messages.map((m) => m.threadId).find((id): id is string => Boolean(id)) ??
    listThreadId;

  const latestMessage =
    messages.length > 0 ? messages[messages.length - 1] : null;
  const latestMessageId = latestMessage?.id ?? null;
  const hasOutbound = messages.some(
    (message) => extractEmailAddress(message.from) === accountEmail
  );
  const hasInbound = messages.some((message) => {
    const from = extractEmailAddress(message.from);
    return Boolean(from) && from !== accountEmail;
  });

  const mailboxLabels = new Set(item.mailboxLabels);
  if (mailboxLabels.size === 0) {
    if (hasInbound) mailboxLabels.add("INBOX");
    if (hasOutbound) mailboxLabels.add("SENT");
  }

  const fromRaw = latestMessage?.from ?? item.thread.from;
  const toRaw = latestMessage?.to ?? item.thread.to;
  const fromEmail = extractEmailAddress(fromRaw);
  const toEmail = extractEmailAddress(toRaw) || accountEmail;
  const body =
    latestMessage?.textBody ??
    latestMessage?.htmlBody ??
    latestMessage?.snippet ??
    item.thread.snippet ??
    "";
  const preview = (
    latestMessage?.snippet ??
    item.thread.snippet ??
    body
  ).slice(0, 120);

  const attachments = messages.flatMap((m) => m.attachments ?? []);

  const latestImportance = latestMessage?.importance;
  const isGraphImportant = messages.some(
    (m) =>
      m.importance === "high" || m.inferenceClassification === "focused"
  );
  const importance =
    isGraphImportant
      ? "high"
      : latestImportance === "low" ||
          latestImportance === "normal" ||
          latestImportance === "high"
        ? latestImportance
        : undefined;
  const outlookCategories = [
    ...new Set(
      messages.flatMap((m) =>
        Array.isArray(m.categories) ? m.categories.filter(Boolean) : []
      )
    ),
  ];

  return {
    id: outlookEmailId(threadId),
    leadId: null,
    threadId,
    messageId: latestMessageId,
    direction: hasInbound ? "inbound" : "outbound",
    mailboxLabels: [...mailboxLabels],
    importance,
    outlookCategories: outlookCategories.length ? outlookCategories : undefined,
    subject: latestMessage?.subject ?? item.thread.subject ?? "(No subject)",
    body,
    preview,
    fromEmail: fromEmail || accountEmail,
    toEmail,
    sentAt:
      latestMessage?.date ?? item.thread.date ?? new Date().toISOString(),
    attachments,
  };
}

export function CrmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CrmState>(createInitialCrmState);
  const [hydrated, setHydrated] = useState(false);
  const importedMasterLoadedRef = useRef(false);
  const crmLoadedRef = useRef(false);
  const crmSyncedRef = useRef(false);
  // The ids each entity was authoritative about at last sync (loaded + created).
  // Sent with every save so the server scopes deletes to these — a stale second
  // tab can't delete a record another tab created that it never loaded.
  const baseIdsRef = useRef<
    Record<
      | "companies"
      | "contacts"
      | "leads"
      | "deals"
      | "samples"
      | "quotations"
      | "followUps"
      | "timeline"
      | "emailMeta",
      string[]
    >
  >({
    companies: [],
    contacts: [],
    leads: [],
    deals: [],
    samples: [],
    quotations: [],
    followUps: [],
    timeline: [],
    emailMeta: [],
  });
  const templatesLoadedRef = useRef(false);
  const templatesSyncedRef = useRef(false);
  const authUserRef = useRef(getUser()?.id ?? "");
  const outlookAccountIdRef = useRef<string | null | undefined>(null);
  const outlookSyncSeqRef = useRef(0);
  const [authUserId, setAuthUserId] = useState(getUser()?.id ?? "");
  const [masterDataSynced, setMasterDataSynced] = useState(false);
  const [masterDataRevision, setMasterDataRevision] = useState(0);
  const [crmSynced, setCrmSynced] = useState(false);
  const [pendingComposeLeadId, setPendingComposeLeadId] = useState<
    string | null
  >(null);
  const [inboxFolderPagination, setInboxFolderPagination] = useState<
    Record<string, InboxFolderPagination>
  >({});
  const [loadingMoreInboxFolder, setLoadingMoreInboxFolder] =
    useState<InboxFolderName | null>(null);
  const loadingMoreInboxFolderRef = useRef<InboxFolderName | null>(null);
  const outlookSyncInFlightRef = useRef(false);
  const prevInboundSnapshotRef = useRef<
    Map<string, { messageId: string | null; sentAt: string }>
  >(new Map());
  const prevInboundAccountIdRef = useRef<string | null>(null);
  const syncOutlookInboxRef = useRef<
    (
      preferredAccountId?: string | null,
      preferredEmail?: string | null,
      options?: OutlookSyncOptions
    ) => Promise<void>
  >(() => Promise.resolve());
  const [outlookInboxSyncing, setOutlookInboxSyncing] = useState(false);
  const [outlookInboxLastSyncedAt, setOutlookInboxLastSyncedAt] = useState<
    string | null
  >(null);
  const [outlookSyncError, setOutlookSyncError] = useState<string | null>(null);

  useEffect(() => {
    const initial = createInitialCrmState();
    if (isAuthed()) {
      initial.salts = [];
      initial.medicines = [];
    }
    setState(initial);
    setHydrated(true);
    authUserRef.current = getUser()?.id ?? "";
    setAuthUserId(authUserRef.current);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    // Nothing is cached client-side: dropping to the seed state and letting the
    // Mongo sync effects re-run is the whole of "switch user".
    const reloadForAuthUser = () => {
      const nextUserId = getUser()?.id ?? "";
      if (nextUserId === authUserRef.current) return;
      authUserRef.current = nextUserId;

      const next = createInitialCrmState();
      if (nextUserId) {
        next.salts = [];
        next.medicines = [];
      }
      setState(next);

      importedMasterLoadedRef.current = false;
      crmLoadedRef.current = false;
      crmSyncedRef.current = false;
      setCrmSynced(false);
      baseIdsRef.current = {
        companies: [],
        contacts: [],
        leads: [],
        deals: [],
        samples: [],
        quotations: [],
        followUps: [],
        timeline: [],
        emailMeta: [],
      };
      templatesLoadedRef.current = false;
      templatesSyncedRef.current = false;
      setMasterDataSynced(false);
      setAuthUserId(nextUserId);
    };

    window.addEventListener("religence-auth-change", reloadForAuthUser);
    return () => window.removeEventListener("religence-auth-change", reloadForAuthUser);
  }, [hydrated]);

  // The salt/medicine catalogue is SHARED and read-only from here. Mongo is the
  // source of truth; the client never writes the whole list back.
  //
  // This used to GET the catalogue, setState it, and then a debounced effect
  // PUT the entire array straight back — so every login by every user rewrote
  // the same 10 rows under their own userId. That is where the duplicate
  // documents came from. Edits now go through per-item POST/PATCH/DELETE.
  //
  // Exposed so an Excel import (which upserts the catalogue server-side) can pull
  // the fresh salts/medicines back without a page reload.
  // Returns false when the pull didn't complete (not authed / any GET not live)
  // so the caller can retry. A one-shot pull meant a single failed request left
  // masterDataSynced false forever, which permanently disables the lead-form
  // Save button with only a misleading "loading…" banner.
  const refreshMasterData = useCallback(async (): Promise<boolean> => {
    if (!isAuthed()) return false;
    const [saltsRes, medsRes] = await Promise.all([
      getBackendSalts(),
      getBackendMedicines(),
    ]);
    if (!saltsRes.live || !medsRes.live) return false;
    setState((prev) => ({
      ...prev,
      salts: saltsRes.data,
      medicines: medsRes.data.map(normalizeMedicine),
    }));
    setMasterDataSynced(true);
    setMasterDataRevision((n) => n + 1);
    return true;
  }, []);

  useEffect(() => {
    if (!hydrated || importedMasterLoadedRef.current) return;
    importedMasterLoadedRef.current = true;
    let active = true;
    let timer = 0;
    const attempt = async () => {
      const ok = await refreshMasterData();
      if (ok || !active) return;
      // ponytail: fixed 4s retry until the backend answers; add backoff if a
      // down backend causes noticeable request spam.
      timer = window.setTimeout(() => void attempt(), 4000);
    };
    void attempt();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [hydrated, authUserId, refreshMasterData]);

  // Mongo is the source of truth for the CRM entities
  // (companies/contacts/leads/deals/timeline). Each has its own model/service;
  // pull all five once on hydrate. If a user has no server doc for an entity
  // yet, seed it from whatever is in local state.
  useEffect(() => {
    if (!hydrated || crmLoadedRef.current) return;
    crmLoadedRef.current = true;
    let active = true;
    let timer = 0;

    const syncCrm = async (): Promise<boolean> => {
      const [
        companiesRes,
        contactsRes,
        leadsRes,
        dealsRes,
        samplesRes,
        quotationsRes,
        followUpsRes,
        timelineRes,
        emailMetaRes,
      ] = await Promise.all([
        getBackendCompanies(),
        getBackendContacts(),
        getBackendLeads(),
        getBackendDeals(),
        getBackendSamples(),
        getBackendQuotations(),
        getBackendFollowUps(),
        getBackendTimeline(),
        getBackendEmailMeta(),
      ]);
      if (!active) return true;

      // If ANY GET failed, do nothing at all: keep whatever is on screen, and
      // leave crmSyncedRef false so the debounced save effects stay disarmed.
      // Substituting [] here (as this code used to) meant a single timeout could
      // PUT an empty array over the user's entire CRM.
      const allLive =
        companiesRes.live &&
        contactsRes.live &&
        leadsRes.live &&
        dealsRes.live &&
        samplesRes.live &&
        quotationsRes.live &&
        followUpsRes.live &&
        timelineRes.live &&
        emailMetaRes.live;
      if (!allLive) return false;

      const companies = companiesRes.live ? companiesRes.data : [];
      const contacts = contactsRes.live ? contactsRes.data : [];
      const leads = leadsRes.live ? leadsRes.data : [];
      const deals = dealsRes.live ? dealsRes.data : [];
      const samples = samplesRes.live ? samplesRes.data : [];
      const quotations = quotationsRes.live ? quotationsRes.data : [];
      const followUps = followUpsRes.live ? followUpsRes.data : [];
      const timeline = timelineRes.live ? timelineRes.data : [];
      const emailMeta = emailMetaRes.live ? emailMetaRes.data : [];

      setState((prev) => {
        const mergeById = <T extends { id: string }>(
          server: T[],
          previous: T[]
        ): T[] => {
          const serverIds = new Set(server.map((item) => item.id));
          const localOnly = previous.filter((item) => !serverIds.has(item.id));
          return localOnly.length ? [...server, ...localOnly] : server;
        };

        const mergedCompanies = mergeById(companies, prev.companies);
        const mergedContacts = mergeById(contacts, prev.contacts);
        const mergedLeads = mergeById(leads, prev.leads);
        const mergedDeals = mergeById(deals, prev.deals);
        const mergedSamples = mergeById(samples, prev.samples);
        const mergedQuotations = mergeById(quotations, prev.quotations);
        const mergedFollowUps = mergeById(followUps, prev.followUps);
        const mergedTimeline = mergeById(timeline, prev.timeline);

        const reconciledMeta = reconcileEmailMetaAfterSync(
          emailMeta,
          prev.emails,
          prev.emails
        );
        baseIdsRef.current = {
          companies: mergedCompanies.map((c) => c.id),
          contacts: mergedContacts.map((c) => c.id),
          leads: mergedLeads.map((l) => l.id),
          deals: mergedDeals.map((d) => d.id),
          samples: mergedSamples.map((s) => s.id),
          quotations: mergedQuotations.map((q) => q.id),
          followUps: mergedFollowUps.map((f) => f.id),
          timeline: mergedTimeline.map((t) => t.id),
          emailMeta: reconciledMeta.map((e) => e.id),
        };
        return {
          ...prev,
          companies: mergedCompanies,
          contacts: mergedContacts,
          leads: mergedLeads,
          deals: mergedDeals,
          samples: mergedSamples,
          quotations: mergedQuotations,
          followUps: mergedFollowUps,
          timeline: mergedTimeline,
          emailMeta: reconciledMeta,
          emails: applyEmailMeta(prev.emails, reconciledMeta),
        };
      });
      crmSyncedRef.current = true;
      setCrmSynced(true);
      return true;
    };

    const attempt = async () => {
      const ok = await syncCrm();
      if (ok || !active) return;
      // ponytail: fixed 4s retry until every CRM GET is live; without this a
      // single failed initial pull left Save permanently disabled.
      timer = window.setTimeout(() => void attempt(), 4000);
    };
    void attempt();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [hydrated, authUserId]);

  // Email templates: Mongo is the source of truth. Pull once on hydrate; if the
  // user has no server doc yet, seed it from the defaults already in state.
  useEffect(() => {
    if (!hydrated || templatesLoadedRef.current) return;
    templatesLoadedRef.current = true;
    let active = true;

    const syncTemplates = async () => {
      const res = await getBackendEmailTemplates();
      if (!active) return;

      // Never arm the template save-effect on a failed GET: state still holds
      // cloneDefaultEmailTemplates(), and the next edit would PUT those defaults
      // over the user's customised set.
      if (!res.live) return;

      if (res.data.length) {
        setState((prev) => ({ ...prev, emailTemplates: res.data }));
      } else {
        await saveBackendEmailTemplates(state.emailTemplates);
        if (!active) return;
      }
      templatesSyncedRef.current = true;
    };

    void syncTemplates();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, authUserId]);

  useEffect(() => {
    if (!templatesSyncedRef.current) return;
    const t = window.setTimeout(
      () => void saveBackendEmailTemplates(state.emailTemplates),
      800
    );
    return () => window.clearTimeout(t);
  }, [state.emailTemplates]);

  // Persist entity edits to Mongo (debounced) once the initial sync has run.
  // Sends the current baseIds so the server scopes deletes; on success the ids
  // just written become the new baseline (delete-by-omission still works within
  // this tab, but ids this tab never loaded stay protected).
  const persist = useCallback(
    async <T extends { id: string }>(
      key: keyof typeof baseIdsRef.current,
      items: T[],
      save: (items: T[], baseIds: string[]) => Promise<{ live: boolean }>
    ): Promise<void> => {
      const res = await save(items, baseIdsRef.current[key]);
      if (res.live) baseIdsRef.current[key] = items.map((i) => i.id);
    },
    []
  );

  useEffect(() => {
    if (!crmSyncedRef.current) return;
    const t = window.setTimeout(
      () => void persist("companies", state.companies, saveBackendCompanies),
      800
    );
    return () => window.clearTimeout(t);
  }, [state.companies, persist]);

  useEffect(() => {
    if (!crmSyncedRef.current) return;
    const t = window.setTimeout(
      () => void persist("contacts", state.contacts, saveBackendContacts),
      800
    );
    return () => window.clearTimeout(t);
  }, [state.contacts, persist]);

  useEffect(() => {
    if (!crmSyncedRef.current) return;
    const t = window.setTimeout(async () => {
      const res = await saveBackendLeads(state.leads, baseIdsRef.current.leads);
      if (res.live) {
        baseIdsRef.current.leads = state.leads.map((i) => i.id);
        const scanRes = await postNotificationScan();
        if (scanRes.live) triggerNotificationRefresh();
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [state.leads]);

  useEffect(() => {
    if (!crmSyncedRef.current) return;
    const t = window.setTimeout(
      () => void persist("deals", state.deals, saveBackendDeals),
      800
    );
    return () => window.clearTimeout(t);
  }, [state.deals, persist]);

  useEffect(() => {
    if (!crmSyncedRef.current) return;
    const t = window.setTimeout(
      () => void persist("samples", state.samples, saveBackendSamples),
      800
    );
    return () => window.clearTimeout(t);
  }, [state.samples, persist]);

  useEffect(() => {
    if (!crmSyncedRef.current) return;
    const t = window.setTimeout(
      () => void persist("quotations", state.quotations, saveBackendQuotations),
      800
    );
    return () => window.clearTimeout(t);
  }, [state.quotations, persist]);

  useEffect(() => {
    if (!crmSyncedRef.current) return;
    const t = window.setTimeout(async () => {
      const res = await saveBackendFollowUps(
        state.followUps,
        baseIdsRef.current.followUps
      );
      if (res.live) {
        baseIdsRef.current.followUps = state.followUps.map((i) => i.id);
        const scanRes = await postNotificationScan();
        if (scanRes.live) triggerNotificationRefresh();
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [state.followUps]);

  useEffect(() => {
    if (!crmSyncedRef.current) return;
    const t = window.setTimeout(
      () => void persist("timeline", state.timeline, saveBackendTimeline),
      800
    );
    return () => window.clearTimeout(t);
  }, [state.timeline, persist]);

  useEffect(() => {
    if (!crmSyncedRef.current) return;
    const t = window.setTimeout(
      () => void persist("emailMeta", state.emailMeta, saveBackendEmailMeta),
      800
    );
    return () => window.clearTimeout(t);
  }, [state.emailMeta, persist]);

  const patch = useCallback((fn: (prev: CrmState) => CrmState) => {
    setState(fn);
  }, []);

  const findCompanyByDiscoveryId = useCallback(
    (discoveryId: string) =>
      state.companies.find((c) => c.discoveryCompanyId === discoveryId),
    [state.companies]
  );

  // Samples: company/owner are snapshotted from the linked lead, so callers only
  // pass the sample's own fields plus the lead it belongs to.
  const addSample = useCallback(
    (
      leadId: string,
      input: Omit<
        CrmSample,
        "id" | "leadId" | "companyId" | "companyName" | "owner" | "createdAt"
      >
    ): string => {
      const id = generateCrmId("sm");
      patch((prev) => {
        const lead = prev.leads.find((l) => l.id === leadId);
        const sample: CrmSample = {
          ...input,
          id,
          leadId,
          companyId: lead?.companyId ?? "",
          companyName: lead?.companyName ?? "",
          owner: lead?.assignedTo ?? "",
          createdAt: todayIso(),
        };
        return { ...prev, samples: [sample, ...prev.samples] };
      });
      return id;
    },
    [patch]
  );

  const updateSample = useCallback(
    (id: string, samplePatch: Partial<Omit<CrmSample, "id">>) => {
      patch((prev) => ({
        ...prev,
        samples: prev.samples.map((s) => {
          if (s.id !== id) return s;
          const next = { ...s, ...samplePatch };
          // Re-pointed to another lead → re-derive company + owner snapshots.
          if (samplePatch.leadId && samplePatch.leadId !== s.leadId) {
            const lead = prev.leads.find((l) => l.id === samplePatch.leadId);
            next.companyId = lead?.companyId ?? "";
            next.companyName = lead?.companyName ?? "";
            next.owner = lead?.assignedTo ?? "";
          }
          return next;
        }),
      }));
    },
    [patch]
  );

  const deleteSample = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        samples: prev.samples.filter((s) => s.id !== id),
      }));
    },
    [patch]
  );

  const addQuotation = useCallback(
    (
      leadId: string,
      input: Omit<
        CrmQuotation,
        | "id"
        | "leadId"
        | "companyId"
        | "companyName"
        | "owner"
        | "quoteNo"
        | "createdAt"
      >
    ): string => {
      const id = generateCrmId("qt");
      patch((prev) => {
        const lead = prev.leads.find((l) => l.id === leadId);
        const quoteNo = nextQuoteNo(prev.quotations);
        const quotation: CrmQuotation = {
          ...input,
          id,
          leadId,
          companyId: lead?.companyId ?? "",
          companyName: lead?.companyName ?? "",
          owner: lead?.assignedTo ?? "",
          quoteNo,
          createdAt: todayIso(),
        };
        return { ...prev, quotations: [quotation, ...prev.quotations] };
      });
      return id;
    },
    [patch]
  );

  const updateQuotation = useCallback(
    (id: string, quotationPatch: Partial<Omit<CrmQuotation, "id">>) => {
      patch((prev) => ({
        ...prev,
        quotations: prev.quotations.map((q) => {
          if (q.id !== id) return q;
          const next = { ...q, ...quotationPatch };
          if (quotationPatch.leadId && quotationPatch.leadId !== q.leadId) {
            const lead = prev.leads.find((l) => l.id === quotationPatch.leadId);
            next.companyId = lead?.companyId ?? "";
            next.companyName = lead?.companyName ?? "";
            next.owner = lead?.assignedTo ?? "";
          }
          return next;
        }),
      }));
    },
    [patch]
  );

  const deleteQuotation = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        quotations: prev.quotations.filter((q) => q.id !== id),
      }));
    },
    [patch]
  );

  const addFollowUp = useCallback(
    (
      leadId: string,
      input: Omit<CrmFollowUp, "id" | "leadId" | "contactedBy" | "createdAt">
    ): string => {
      const id = generateCrmId("fu");
      patch((prev) => ({
        ...prev,
        followUps: [
          {
            ...input,
            id,
            leadId,
            contactedBy: getUserDisplayName() || "—",
            createdAt: todayIso(),
          },
          ...prev.followUps,
        ],
      }));
      return id;
    },
    [patch]
  );

  const updateFollowUp = useCallback(
    (id: string, followUpPatch: Partial<Omit<CrmFollowUp, "id">>) => {
      patch((prev) => ({
        ...prev,
        followUps: prev.followUps.map((f) =>
          f.id === id ? { ...f, ...followUpPatch } : f
        ),
      }));
    },
    [patch]
  );

  const deleteFollowUp = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        followUps: prev.followUps.filter((f) => f.id !== id),
      }));
    },
    [patch]
  );

  const saveFromDiscovery = useCallback(
    (input: SaveFromDiscoveryInput) => {
      const { profile, option } = input;
      const contactIdx = input.contactIndex ?? 0;
      const openCompose = option === "create_lead_and_email";
      const result = {
        companyId: "",
        contactId: null as string | null,
        leadId: null as string | null,
        openCompose,
      };

      patch((prev) => {
        const existing = prev.companies.find(
          (c) => c.discoveryCompanyId === profile.id
        );
        let companies = prev.companies;
        let contacts = prev.contacts;
        let leads = prev.leads;
        let timeline = prev.timeline;

        let company: CrmCompany;
        if (existing) {
          company = {
            ...existing,
            location: profile.location,
            website: profile.website,
            companyType: profile.companyType,
            certification: profile.certification,
            sourceLinks: profile.sourceLinks,
          };
          companies = companies.map((c) =>
            c.id === existing.id ? company : c
          );
          result.companyId = company.id;
        } else {
          company = {
            id: generateCrmId("co"),
            name: profile.companyName,
            location: profile.location,
            website: profile.website,
            companyType: profile.companyType,
            certification: profile.certification,
            discoveryCompanyId: profile.id,
            sourceLinks: profile.sourceLinks,
            createdAt: todayIso(),
          };
          companies = [...companies, company];
          result.companyId = company.id;
        }

        if (optionCreatesContact(option)) {
          const pc =
            profile.contacts[contactIdx] ?? primaryContactFromProfile(profile);
          const email = pc.email ?? "";
          const existingCt = contacts.find(
            (c) =>
              c.companyId === company.id &&
              c.email.toLowerCase() === email.toLowerCase()
          );
          if (existingCt) {
            result.contactId = existingCt.id;
          } else {
            const contact: CrmContact = {
              id: generateCrmId("ct"),
              companyId: company.id,
              name: pc.name,
              role: pc.role,
              email,
              phone: pc.phone,
              createdAt: todayIso(),
            };
            contacts = [...contacts, contact];
            result.contactId = contact.id;
          }
        }

        if (optionCreatesLead(option)) {
          const pc =
            profile.contacts[contactIdx] ?? primaryContactFromProfile(profile);
          const existingLead = leads.find(
            (l) => l.discoveryCompanyId === profile.id
          );
          if (existingLead) {
            result.leadId = existingLead.id;
          } else {
          const lead: CrmLead = {
            id: generateCrmId("lead"),
            title: buildLeadTitle(profile, profile.companyName),
            companyId: company.id,
            contactId: result.contactId,
            discoveryCompanyId: profile.id,
            companyName: profile.companyName,
            contactName: pc.name,
            contactRole: pc.role,
            contactEmail: pc.email ?? "",
            matchedSalt: profile.matchedSalt,
            matchedMedicine: profile.matchedMedicine,
            dosageForm: profile.dosageForm,
            location: profile.location,
            stage: "Saved",
            leadScore: DEFAULT_LEAD_SCORE,
            assignedTo: getUserDisplayName(),
            followUpDate: followUpInDays(7),
            lastActivity: todayIso(),
            notes: profile.aiNotes,
            createdAt: todayIso(),
            sourceLinks: profile.sourceLinks,
          };
          leads = [...leads, lead];
          result.leadId = lead.id;
          timeline = appendTimeline(timeline, {
            leadId: lead.id,
            date: todayIso(),
            title: "Lead created from discovery",
            description: `Saved via Lead Discovery (${option.replace(/_/g, " ")}).`,
            type: "stage",
          });
          }
        }

        return { ...prev, companies, contacts, leads, timeline };
      });

      if (openCompose && result.leadId) {
        setPendingComposeLeadId(result.leadId);
      }

      return result;
    },
    [patch]
  );

  const createLeadWithCompany = useCallback(
    (input: CreateLeadWithCompanyInput) => {
      const result = {
        companyId: "",
        contactId: null as string | null,
        leadId: "",
      };

      patch((prev) => {
        let companies = prev.companies;
        let contacts = prev.contacts;
        let leads = prev.leads;
        let timeline = prev.timeline;

        const existingCompany = findCompanyByNormalizedName(
          prev.companies,
          input.company.name
        );
        let company: CrmCompany;
        if (existingCompany) {
          company = {
            ...existingCompany,
            name: input.company.name || existingCompany.name,
            companyType:
              input.company.companyType || existingCompany.companyType,
            city: input.company.city ?? existingCompany.city,
            country: input.company.country ?? existingCompany.country,
            gstin: input.company.gstin ?? existingCompany.gstin,
            pan: input.company.pan ?? existingCompany.pan,
            location: input.company.location || existingCompany.location,
            website: input.company.website || existingCompany.website,
            certification:
              input.company.certification || existingCompany.certification,
          };
          companies = companies.map((c) =>
            c.id === existingCompany.id ? company : c
          );
          result.companyId = company.id;
        } else {
          const loc =
            input.company.location ||
            [input.company.city, input.company.country]
              .filter(Boolean)
              .join(", ");
          company = {
            id: generateCrmId("co"),
            name: input.company.name,
            location: loc,
            website: input.company.website ?? "",
            companyType: input.company.companyType ?? "",
            certification: input.company.certification ?? "",
            city: input.company.city ?? "",
            country: input.company.country ?? "",
            gstin: input.company.gstin ?? "",
            pan: input.company.pan ?? "",
            sourceLinks: [],
            createdAt: todayIso(),
          };
          companies = [...companies, company];
          result.companyId = company.id;
        }

        let contactId: string | null = null;
        let contactName = "—";
        let contactRole = "—";
        let contactEmail = "";

        const contactInput = input.contact;
        if (
          contactInput &&
          (contactInput.name?.trim() || contactInput.email?.trim())
        ) {
          const email = contactInput.email ?? "";
          const existingCt = contacts.find(
            (c) =>
              c.companyId === company.id &&
              email &&
              c.email.toLowerCase() === email.toLowerCase()
          );
          if (existingCt) {
            const updated: CrmContact = {
              ...existingCt,
              name: contactInput.name || existingCt.name,
              role: contactInput.role ?? existingCt.role,
              phone: contactInput.phone ?? existingCt.phone,
            };
            contacts = contacts.map((c) =>
              c.id === existingCt.id ? updated : c
            );
            contactId = updated.id;
            contactName = updated.name;
            contactRole = updated.role;
            contactEmail = updated.email;
          } else {
            const contact: CrmContact = {
              id: generateCrmId("ct"),
              companyId: company.id,
              name: contactInput.name || "—",
              role: contactInput.role ?? "",
              email,
              phone: contactInput.phone,
              createdAt: todayIso(),
            };
            contacts = [...contacts, contact];
            contactId = contact.id;
            contactName = contact.name;
            contactRole = contact.role;
            contactEmail = contact.email;
          }
        }
        result.contactId = contactId;

        const leadLocation =
          input.lead.location ||
          company.location ||
          [company.city, company.country].filter(Boolean).join(", ");

        const medicineIds =
          input.lead.medicineIds?.length
            ? input.lead.medicineIds
            : input.lead.medicineId
              ? [input.lead.medicineId]
              : [];

        const lead: CrmLead = {
          id: generateCrmId("lead"),
          title:
            input.lead.title ||
            `${input.lead.matchedMedicine} — ${company.name}`,
          companyId: company.id,
          contactId,
          companyName: company.name,
          contactName,
          contactRole,
          contactEmail,
          matchedSalt: input.lead.matchedSalt,
          matchedMedicine: input.lead.matchedMedicine,
          saltId: input.lead.saltId,
          medicineId: input.lead.medicineId,
          medicineIds,
          dosageForm: input.lead.dosageForm,
          location: leadLocation,
          stage: input.lead.stage ?? "Saved",
          leadScore: DEFAULT_LEAD_SCORE,
          assignedTo: input.lead.assignedTo ?? getUserDisplayName(),
          marketTier: input.lead.marketTier ?? "",
          segment: input.lead.segment ?? "",
          leadSource: input.lead.leadSource ?? "",
          priority: input.lead.priority ?? "",
          qualScore: input.lead.qualScore ?? 0,
          potentialQty: input.lead.potentialQty ?? "",
          estAnnualValue: input.lead.estAnnualValue ?? "",
          lastContactDate: input.lead.lastContactDate ?? "",
          followUpDate: input.lead.followUpDate ?? followUpInDays(7),
          nextAction: input.lead.nextAction ?? "",
          docsShared: input.lead.docsShared ?? "",
          lastDiscussionSummary: input.lead.lastDiscussionSummary ?? "",
          lastActivity: todayIso(),
          notes: input.lead.notes ?? "",
          createdAt: todayIso(),
          sourceLinks: [],
        };
        leads = [...leads, lead];
        result.leadId = lead.id;
        timeline = appendTimeline(timeline, {
          leadId: lead.id,
          date: todayIso(),
          title: "Lead created manually",
          description: "Added via Lead Form.",
          type: "stage",
        });

        return { ...prev, companies, contacts, leads, timeline };
      });

      return result;
    },
    [patch]
  );

  const updateLeadWithCompany = useCallback(
    (leadId: string, input: Partial<CreateLeadWithCompanyInput>) => {
      patch((prev) => {
        const existingLead = prev.leads.find((l) => l.id === leadId);
        if (!existingLead) return prev;

        let companies = prev.companies;
        let contacts = prev.contacts;
        let leads = prev.leads;

        let company = companies.find((c) => c.id === existingLead.companyId);
        if (!company) return prev;

        if (input.company) {
          company = {
            ...company,
            ...(input.company.name ? { name: input.company.name } : {}),
            ...(input.company.companyType !== undefined
              ? { companyType: input.company.companyType }
              : {}),
            ...(input.company.city !== undefined
              ? { city: input.company.city }
              : {}),
            ...(input.company.country !== undefined
              ? { country: input.company.country }
              : {}),
            ...(input.company.gstin !== undefined
              ? { gstin: input.company.gstin }
              : {}),
            ...(input.company.pan !== undefined
              ? { pan: input.company.pan }
              : {}),
            ...(input.company.location !== undefined
              ? { location: input.company.location }
              : {}),
            ...(input.company.website !== undefined
              ? { website: input.company.website }
              : {}),
            ...(input.company.certification !== undefined
              ? { certification: input.company.certification }
              : {}),
          };
          if (
            !input.company.location &&
            (input.company.city !== undefined ||
              input.company.country !== undefined)
          ) {
            const composite = [company.city, company.country]
              .filter(Boolean)
              .join(", ");
            if (composite) company = { ...company, location: composite };
          }
          companies = companies.map((c) =>
            c.id === company!.id ? company! : c
          );
        }

        let contactId = existingLead.contactId;
        let contactName = existingLead.contactName;
        let contactRole = existingLead.contactRole;
        let contactEmail = existingLead.contactEmail;

        if (input.contact !== undefined) {
          if (input.contact === null) {
            contactId = null;
            contactName = "—";
            contactRole = "—";
            contactEmail = "";
          } else if (
            input.contact.name?.trim() ||
            input.contact.email?.trim()
          ) {
            const email = input.contact.email ?? "";
            const existingCt = contacts.find(
              (c) =>
                c.companyId === company!.id &&
                email &&
                c.email.toLowerCase() === email.toLowerCase()
            );
            if (existingCt) {
              const updated: CrmContact = {
                ...existingCt,
                name: input.contact.name || existingCt.name,
                role: input.contact.role ?? existingCt.role,
                phone: input.contact.phone ?? existingCt.phone,
              };
              contacts = contacts.map((c) =>
                c.id === existingCt.id ? updated : c
              );
              contactId = updated.id;
              contactName = updated.name;
              contactRole = updated.role;
              contactEmail = updated.email;
            } else if (existingLead.contactId) {
              const linked = contacts.find(
                (c) => c.id === existingLead.contactId
              );
              if (linked) {
                const updated: CrmContact = {
                  ...linked,
                  name: input.contact.name || linked.name,
                  role: input.contact.role ?? linked.role,
                  email: input.contact.email ?? linked.email,
                  phone: input.contact.phone ?? linked.phone,
                };
                contacts = contacts.map((c) =>
                  c.id === linked.id ? updated : c
                );
                contactId = updated.id;
                contactName = updated.name;
                contactRole = updated.role;
                contactEmail = updated.email;
              }
            } else {
              const contact: CrmContact = {
                id: generateCrmId("ct"),
                companyId: company!.id,
                name: input.contact.name || "—",
                role: input.contact.role ?? "",
                email,
                phone: input.contact.phone,
                createdAt: todayIso(),
              };
              contacts = [...contacts, contact];
              contactId = contact.id;
              contactName = contact.name;
              contactRole = contact.role;
              contactEmail = contact.email;
            }
          }
        }

        const leadPatch = input.lead;
        const updatedLead: CrmLead = {
          ...existingLead,
          ...(leadPatch ?? {}),
          companyId: company!.id,
          contactId,
          companyName: company!.name,
          contactName,
          contactRole,
          contactEmail,
          location:
            leadPatch?.location ||
            company!.location ||
            [company!.city, company!.country].filter(Boolean).join(", ") ||
            existingLead.location,
          lastActivity: todayIso(),
        };

        leads = leads.map((l) => (l.id === leadId ? updatedLead : l));

        return { ...prev, companies, contacts, leads };
      });
    },
    [patch]
  );

  const createLeadManual = useCallback(
    (input: Parameters<CrmContextValue["createLeadManual"]>[0]) => {
      const id = generateCrmId("lead");
      patch((prev) => {
        const lead: CrmLead = {
          ...input,
          id,
          sourceLinks: input.sourceLinks ?? [],
          createdAt: todayIso(),
          lastActivity: todayIso(),
          stage: input.stage ?? "Saved",
        };
        return {
          ...prev,
          leads: [...prev.leads, lead],
          timeline: appendTimeline(prev.timeline, {
            leadId: id,
            date: todayIso(),
            title: "Lead created manually",
            description: "Added from Active Leads.",
            type: "stage",
          }),
        };
      });
      return id;
    },
    [patch]
  );

  const updateLead = useCallback(
    (leadId: string, patchLead: Partial<CrmLead>) => {
      patch((prev) => ({
        ...prev,
        leads: prev.leads.map((l) =>
          l.id === leadId
            ? { ...l, ...patchLead, lastActivity: todayIso() }
            : l
        ),
      }));
    },
    [patch]
  );

  const deleteLead = useCallback(
    (leadId: string, opts: { samples?: boolean; quotations?: boolean; contact?: boolean } = {}) => {
      patch((prev) => {
        const lead = prev.leads.find((l) => l.id === leadId);
        const contactId = opts.contact ? lead?.contactId ?? null : null;
        return {
          ...prev,
          leads: prev.leads
            .filter((l) => l.id !== leadId)
            // Other leads pointing at a contact we're deleting lose the link.
            .map((l) =>
              contactId && l.contactId === contactId
                ? { ...l, contactId: null }
                : l
            ),
          // Deals only exist because of their lead, so they always go with it.
          deals: prev.deals.filter((d) => d.leadId !== leadId),
          samples: opts.samples
            ? prev.samples.filter((s) => s.leadId !== leadId)
            : prev.samples,
          quotations: opts.quotations
            ? prev.quotations.filter((q) => q.leadId !== leadId)
            : prev.quotations,
          followUps: prev.followUps.filter((f) => f.leadId !== leadId),
          contacts: contactId
            ? prev.contacts.filter((c) => c.id !== contactId)
            : prev.contacts,
        };
      });
    },
    [patch]
  );

  const deleteContact = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        contacts: prev.contacts.filter((c) => c.id !== id),
        leads: prev.leads.map((l) =>
          l.contactId === id ? { ...l, contactId: null } : l
        ),
      }));
    },
    [patch]
  );

  const setLeadStage = useCallback(
    (leadId: string, stage: LeadStage) => {
      patch((prev) => {
        const lead = prev.leads.find((l) => l.id === leadId);
        if (!lead || lead.stage === stage) return prev;
        let deals = prev.deals;
        if (stage === "Won" && !prev.deals.some((d) => d.leadId === leadId)) {
          deals = [
            ...deals,
            {
              id: generateCrmId("deal"),
              leadId,
              title: `${lead.matchedMedicine} — supply agreement`,
              companyName: lead.companyName,
              value: "TBD",
              stage: "Won",
              createdAt: todayIso(),
            },
          ];
        }
        return {
          ...prev,
          leads: prev.leads.map((l) =>
            l.id === leadId ? { ...l, stage, lastActivity: todayIso() } : l
          ),
          deals,
          timeline: appendTimeline(prev.timeline, {
            leadId,
            date: todayIso(),
            title: `Stage: ${stage}`,
            description: `Lead moved to ${stage}.`,
            type: "stage",
          }),
        };
      });
    },
    [patch]
  );

  const advanceLeadStage = useCallback(
    (leadId: string) => {
      const lead = state.leads.find((l) => l.id === leadId);
      if (!lead) return;
      const next = getNextLeadStage(lead.stage);
      if (next) setLeadStage(leadId, next);
    },
    [state.leads, setLeadStage]
  );

  const verifyLead = useCallback(
    (leadId: string) => {
      patch((prev) => ({
        ...prev,
        leads: prev.leads.map((l) =>
          l.id === leadId && l.stage === "Saved"
            ? { ...l, stage: "Verified", lastActivity: todayIso() }
            : l
        ),
        timeline: appendTimeline(prev.timeline, {
          leadId,
          date: todayIso(),
          title: "Lead verified",
          description: "Approved in Verification Queue.",
          type: "verification",
        }),
      }));
    },
    [patch]
  );

  const markLeadLost = useCallback(
    (leadId: string) => setLeadStage(leadId, "Lost"),
    [setLeadStage]
  );

  const markLeadDormant = useCallback(
    (leadId: string) => setLeadStage(leadId, "Dormant"),
    [setLeadStage]
  );

  const createDealFromLead = useCallback(
    (leadId: string, value = "TBD") => {
      const lead = state.leads.find((l) => l.id === leadId);
      if (!lead) return null;
      const id = generateCrmId("deal");
      patch((prev) => ({
        ...prev,
        deals: [
          ...prev.deals,
          {
            id,
            leadId,
            title: `${lead.matchedMedicine} — opportunity`,
            companyName: lead.companyName,
            value,
            stage: "Open",
            createdAt: todayIso(),
          },
        ],
        timeline: appendTimeline(prev.timeline, {
          leadId,
          date: todayIso(),
          title: "Deal created",
          description: `Deal opened (${value}).`,
          type: "deal",
        }),
      }));
      if (lead.stage === "Negotiation") {
        setLeadStage(leadId, "Won");
      }
      return id;
    },
    [patch, setLeadStage, state.leads]
  );

  const sendCrmEmail = useCallback(
    async (input: SendCrmEmailInput): Promise<string | null> => {
      if (!state.outlookConnected || !state.outlookAccountId) {
        return "Connect Outlook before sending email.";
      }
      if (!state.outlookEmail) {
        return "Outlook mailbox email unavailable. Reconnect Outlook.";
      }

      const lead =
        (input.leadId
          ? state.leads.find((l) => l.id === input.leadId)
          : null) ??
        state.leads.find(
          (l) =>
            l.contactEmail.toLowerCase() === input.toEmail.toLowerCase()
        );

      const html = input.body.replace(/\n/g, "<br/>");
      const messageId = input.replyToMessageId ?? null;
      const accountId = state.outlookAccountId;
      const sent =
        messageId && input.mode === "forward"
          ? await forwardOutlookMessage({ accountId, messageId, to: input.toEmail, html })
          : messageId && input.mode === "replyAll"
            ? await replyAllOutlookMessage({ accountId, messageId, html })
            : messageId && input.mode === "reply"
              ? await replyOutlookMessage({ accountId, messageId, html })
              : await sendOutlookMessage({
                  accountId,
                  to: input.toEmail,
                  subject: input.subject,
                  html,
                });
      if (!sent.live) {
        return sent.error;
      }

      if (lead) {
        patch((prev) => {
          const newStage = stageAfterSendEmail(lead.stage);
          return {
            ...prev,
            leads: prev.leads.map((l) =>
              l.id === lead.id
                ? {
                    ...l,
                    stage: newStage,
                    lastActivity: todayIso(),
                    followUpDate: followUpInDays(5),
                  }
                : l
            ),
            timeline: appendTimeline(prev.timeline, {
              leadId: lead.id,
              date: todayIso(),
              title: "Email sent",
              description: input.subject,
              type: "email",
            }),
          };
        });
      }

      void syncOutlookInboxRef.current(
        state.outlookAccountId,
        state.outlookEmail,
        { background: true }
      );

      return null;
    },
    [
      patch,
      state.outlookConnected,
      state.leads,
      state.outlookAccountId,
      state.outlookEmail,
    ]
  );

  const linkEmailToLead = useCallback(
    (emailId: string, leadId: string) => {
      patch((prev) => {
        const email = prev.emails.find((e) => e.id === emailId);
        const lead = prev.leads.find((l) => l.id === leadId);
        if (!email || !lead) return prev;
        const replyStages = [
          "Intro Email Sent",
          "Follow-up Sent",
        ] as LeadStage[];
        const newStage =
          email.direction === "inbound" &&
          replyStages.includes(lead.stage)
            ? "Replied"
            : lead.stage;
        return {
          ...prev,
          emails: prev.emails.map((e) =>
            e.id === emailId ? { ...e, leadId } : e
          ),
          // The link is CRM-owned: persist it, or the next Outlook sync drops it.
          emailMeta: upsertEmailMeta(prev.emailMeta, emailId, { leadId }),
          leads: prev.leads.map((l) =>
            l.id === leadId
              ? { ...l, stage: newStage, lastActivity: todayIso() }
              : l
          ),
          timeline: appendTimeline(prev.timeline, {
            leadId,
            date: todayIso(),
            title:
              email.direction === "inbound"
                ? "Reply linked — stage: Replied"
                : "Email linked to lead",
            description: email.subject,
            type: "email",
            emailId,
          }),
        };
      });
    },
    [patch]
  );

  const setEmailFlag = useCallback(
    (emailId: string, flag: EmailFlag, on: boolean) => {
      // Mirror the change into Outlook, best effort: Outlook is the source of
      // truth, so if the call fails the next sync simply restores its state.
      // Locally composed mail without a Graph message id can't be mirrored in Outlook.
      const email = state.emails.find((e) => e.id === emailId);
      const accountId = state.outlookAccountId;
      if (
        email &&
        accountId &&
        state.outlookConnected &&
        email.messageId
      ) {
        const threadIds = [email.threadId];
        if (flag === "trashed" && on) {
          void trashOutlookThreads({ accountId, threadIds });
        } else if (flag === "read") {
          void batchModifyOutlookThreads({
            accountId,
            threadIds,
            ...(on
              ? { removeLabelIds: ["UNREAD"] }
              : { addLabelIds: ["UNREAD"] }),
          });
        } else if (flag === "starred") {
          void batchModifyOutlookThreads({
            accountId,
            threadIds,
            ...(on
              ? { addLabelIds: ["STARRED"] }
              : { removeLabelIds: ["STARRED"] }),
          });
        } else if (flag === "archived" && on) {
          void batchModifyOutlookThreads({
            accountId,
            threadIds,
            removeLabelIds: ["INBOX"],
          });
        } else if (flag === "archived" && !on) {
          void batchModifyOutlookThreads({
            accountId,
            threadIds,
            addLabelIds: ["INBOX"],
          });
        } else if (flag === "trashed" && !on) {
          void batchModifyOutlookThreads({
            accountId,
            threadIds,
            addLabelIds: ["INBOX"],
          });
        }
      }

      patch((prev) => {
        const emailMeta = upsertEmailMeta(prev.emailMeta, emailId, { [flag]: on });
        const emails =
          email && (flag === "archived" || flag === "trashed")
            ? prev.emails.map((item) => {
                if (item.id !== emailId) return item;
                const labels = new Set(item.mailboxLabels ?? []);
                if (flag === "archived") {
                  if (on) {
                    labels.delete("INBOX");
                    labels.add("ARCHIVE");
                  } else {
                    labels.delete("ARCHIVE");
                    labels.add("INBOX");
                  }
                } else if (flag === "trashed") {
                  if (on) {
                    labels.delete("INBOX");
                    labels.add("TRASH");
                  } else {
                    labels.delete("TRASH");
                    labels.add("INBOX");
                  }
                }
                return { ...item, mailboxLabels: [...labels] };
              })
            : prev.emails;
        return {
          ...prev,
          emailMeta,
          emails: applyEmailMeta(emails, emailMeta),
        };
      });
    },
    [patch, state.emails, state.outlookConnected, state.outlookAccountId]
  );

  const emailIdsWithFlag = useCallback(
    (flag: EmailFlag) =>
      state.emailMeta.filter((m) => m[flag]).map((m) => m.id),
    [state.emailMeta]
  );

  const emitInboundEmailNotifications = useCallback(
    async (emails: CrmEmail[], accountId: string) => {
      // Account switch: reset snapshot — treat as first sync for new mailbox
      if (prevInboundAccountIdRef.current !== accountId) {
        prevInboundSnapshotRef.current = new Map();
        prevInboundAccountIdRef.current = accountId;
      }

      const prev = prevInboundSnapshotRef.current;
      const isFirstSync = prev.size === 0;
      const syncStartedAt = Date.now();
      const nextSnapshot = new Map<
        string,
        { messageId: string | null; sentAt: string }
      >();
      let didEmit = false;

      for (const email of emails) {
        if (email.direction !== "inbound") continue;
        if (!email.mailboxLabels?.includes("INBOX")) continue;
        const threadId = email.threadId;
        if (!threadId) continue;

        nextSnapshot.set(threadId, {
          messageId: email.messageId ?? null,
          sentAt: email.sentAt,
        });

        const prior = prev.get(threadId);
        const isNewThread = !prior;
        const isNewMessage =
          prior &&
          (prior.messageId !== email.messageId || prior.sentAt !== email.sentAt);
        const arrivedDuringSync =
          new Date(email.sentAt).getTime() > syncStartedAt;

        // First sync: seed snapshot only — no flood of historical inbox
        if (isFirstSync) {
          if (arrivedDuringSync) {
            await postNotification({
              type: "inbound_email",
              dedupeKey: `inbound_email:${threadId}`,
              title: `New email: ${email.subject}`,
              body: `From ${email.fromEmail}`,
              href: `/inbox?email=outlook-${threadId}`,
              meta: {
                threadId,
                messageId: email.messageId ?? undefined,
                sentAt: email.sentAt,
              },
            });
            didEmit = true;
          }
          continue;
        }

        if (isNewThread || isNewMessage) {
          await postNotification({
            type: "inbound_email",
            dedupeKey: `inbound_email:${threadId}`,
            title: `New email: ${email.subject}`,
            body: `From ${email.fromEmail}`,
            href: `/inbox?email=outlook-${threadId}`,
            meta: {
              threadId,
              messageId: email.messageId ?? undefined,
              sentAt: email.sentAt,
            },
          });
          didEmit = true;
        }
      }

      prevInboundSnapshotRef.current = nextSnapshot;
      if (didEmit) triggerNotificationRefresh();
    },
    []
  );

  const emitOutlookErrorNotification = useCallback(
    async (accountId: string, accountEmail: string) => {
      await postNotification({
        type: "outlook_error",
        dedupeKey: `outlook_error:${accountId}`,
        title: "Outlook sync failed",
        body: `${accountEmail} — reconnect to restore inbox.`,
        href: "/inbox",
        meta: { accountId },
      });
      triggerNotificationRefresh();
    },
    []
  );

  const clearOutlookErrorNotification = useCallback(async (accountId: string) => {
    // Idempotent: DELETE /dedupe returns 204 even when row missing (Task 3)
    await deleteNotificationByDedupeKey(`outlook_error:${accountId}`);
    triggerNotificationRefresh();
  }, []);

  const syncOutlookInbox = useCallback(
    async (
      preferredAccountId?: string | null,
      preferredEmail?: string | null,
      options?: OutlookSyncOptions
    ) => {
      const background = options?.background ?? false;
      if (background && outlookSyncInFlightRef.current) return;

      outlookSyncInFlightRef.current = true;
      setOutlookInboxSyncing(true);
      if (!background) setOutlookSyncError(null);

      // Newest sync wins. Switching A -> B -> A can leave an older sync in
      // flight; without this its stale threads would land on top of B's.
      const seq = ++outlookSyncSeqRef.current;
      const isStale = () => seq !== outlookSyncSeqRef.current;

      let accountEmail = "";
      try {
        const accountsRes = await listOutlookAccounts();
        if (isStale()) return;
        if (!accountsRes.live) {
          if (!background) setOutlookSyncError(accountsRes.error);
          return;
        }
        const accounts: OutlookAccount[] = [...accountsRes.data];
        const preferredEmailNorm = (preferredEmail ?? "").trim().toLowerCase();
        const account =
          (preferredAccountId
            ? accounts.find((a) => a.id === preferredAccountId)
            : null) ??
          (preferredEmailNorm
            ? accounts.find((a) => a.email.toLowerCase() === preferredEmailNorm)
            : null) ??
          (outlookAccountIdRef.current
            ? accounts.find((a) => a.id === outlookAccountIdRef.current)
            : null) ??
          accounts.find((a) => a.status === "active") ??
          accounts[0];
        if (!account) {
          patch((prev) => ({
            ...prev,
            outlookConnected: false,
            outlookAccountId: null,
            outlookEmail: null,
            outlookAccounts: [],
            emails: [],
          }));
          return;
        }

        accountEmail = account.email;

        // Token undecryptable / refresh-token revoked: the backend flips the
        // account to status "error", then every Graph call 401s and gets
        // swallowed → silent empty inbox. Surface a reconnect prompt instead.
        if (account.status !== "active") {
          patch((prev) => ({
            ...prev,
            outlookConnected: true,
            outlookAccountId: account.id,
            outlookEmail: account.email,
            outlookAccounts: accounts,
          }));
          if (!background) {
            setOutlookSyncError(
              "Outlook credentials expired. Please reconnect Outlook."
            );
            if (isStale()) return;
            await emitOutlookErrorNotification(account.id, accountEmail);
          }
          return;
        }

        // Select the account before the threads land. The mailbox takes a second
        // to fetch; without this the rail keeps the old account highlighted the
        // whole time and the click reads as "nothing happened".
        patch((prev) => ({
          ...prev,
          outlookConnected: true,
          outlookAccountId: account.id,
          outlookEmail: account.email,
          outlookAccounts: accounts,
          ...(account.id === prev.outlookAccountId ? {} : { emails: [] }),
        }));
        if (!background && account.id !== outlookAccountIdRef.current) {
          setInboxFolderPagination({});
        }

        const folderSources = background
          ? OUTLOOK_FOLDER_SOURCES.filter(
              (source) =>
                source.labelId === "INBOX" || source.labelId === "SENT"
            )
          : OUTLOOK_FOLDER_SOURCES;
        const threadBuckets = new Map<
          string,
          { thread: OutlookThreadItem; mailboxLabels: Set<string> }
        >();
        const nextFolderPagination: Record<string, InboxFolderPagination> = {};

        const ingestFolderThreads = (
          source: (typeof folderSources)[number],
          folderThreadsRes: Awaited<ReturnType<typeof listOutlookThreads>>
        ) => {
          if (!folderThreadsRes.live) return;
          nextFolderPagination[
            inboxFolderPaginationKey(account.id, source.labelId)
          ] = {
            nextPageToken: folderThreadsRes.data.nextPageToken,
          };
          for (const thread of folderThreadsRes.data.threads) {
            const key = thread.threadId || thread.id;
            const existing = threadBuckets.get(key);
            if (!existing) {
              threadBuckets.set(key, {
                thread,
                mailboxLabels: new Set([source.mailboxLabel]),
              });
              continue;
            }
            existing.mailboxLabels.add(source.mailboxLabel);
            const existingDate = existing.thread.date ?? "";
            const incomingDate = thread.date ?? "";
            if (incomingDate > existingDate) {
              existing.thread = thread;
            }
          }
        };

        // INBOX/SENT first — Graph throttles when all seven folders fire at once.
        const primarySources = folderSources.filter(
          (source) => source.labelId === "INBOX" || source.labelId === "SENT"
        );
        const secondarySources = folderSources.filter(
          (source) => source.labelId !== "INBOX" && source.labelId !== "SENT"
        );
        const primaryResults = await Promise.all(
          primarySources.map((source) =>
            listOutlookThreads(account.id, 25, source.labelId)
          )
        );
        if (isStale()) return;
        primarySources.forEach((source, i) =>
          ingestFolderThreads(source, primaryResults[i])
        );

        if (secondarySources.length > 0) {
          const secondaryResults = await Promise.all(
            secondarySources.map((source) =>
              listOutlookThreads(account.id, 25, source.labelId)
            )
          );
          if (isStale()) return;
          secondarySources.forEach((source, i) =>
            ingestFolderThreads(source, secondaryResults[i])
          );
        }

        for (const bucket of threadBuckets.values()) {
          if (
            bucket.mailboxLabels.has("DRAFT") &&
            (bucket.mailboxLabels.has("INBOX") ||
              bucket.mailboxLabels.has("SENT"))
          ) {
            bucket.mailboxLabels.delete("DRAFT");
          }
        }

        if (threadBuckets.size === 0) {
          const allThreadsRes = await listOutlookThreads(account.id, 25);
          if (!allThreadsRes.live) {
            if (isStale()) return;
            // Keep the last good mailbox on transient Graph errors.
            patch((prev) => ({
              ...prev,
              outlookConnected: true,
              outlookAccountId: account.id,
              outlookEmail: account.email,
              outlookAccounts: accounts,
            }));
            if (!background) setOutlookSyncError(allThreadsRes.error);
            return;
          }
          for (const thread of allThreadsRes.data.threads) {
            const key = thread.threadId || thread.id;
            threadBuckets.set(key, {
              thread,
              mailboxLabels: new Set<string>(),
            });
          }
        }

        const normalizedAccountEmail = account.email.toLowerCase();
        const allThreadItems = [...threadBuckets.values()].sort((a, b) => {
          const ta = new Date(a.thread.date ?? 0).getTime();
          const tb = new Date(b.thread.date ?? 0).getTime();
          return tb - ta;
        });

        let rankedThreads: typeof allThreadItems;
        if (background) {
          rankedThreads = allThreadItems.slice(0, 25);
        } else {
          const SYNC_THREAD_CAP = 50;
          const MIN_REGULAR_SYNC_SLOTS = 30;
          const ARCHIVE_TRASH_SYNC_CAP = 20;
          const archiveTrashThreads = allThreadItems.filter(
            (item) =>
              item.mailboxLabels.has("ARCHIVE") ||
              item.mailboxLabels.has("TRASH")
          );
          const regularThreads = allThreadItems.filter(
            (item) =>
              !item.mailboxLabels.has("ARCHIVE") &&
              !item.mailboxLabels.has("TRASH")
          );
          const cappedArchiveTrash = archiveTrashThreads.slice(
            0,
            ARCHIVE_TRASH_SYNC_CAP
          );
          const regularBudget = Math.max(
            MIN_REGULAR_SYNC_SLOTS,
            SYNC_THREAD_CAP - cappedArchiveTrash.length
          );
          rankedThreads = [
            ...regularThreads.slice(0, regularBudget),
            ...cappedArchiveTrash,
          ].slice(0, SYNC_THREAD_CAP);
        }

        // One request per thread, but all in flight at once. Serially this was
        // ~25 round trips to Graph back-to-back — the bulk of the switch delay.
        const threadDetails = await Promise.all(
          rankedThreads.map((item) =>
            getOutlookThread(account.id, item.thread.threadId || item.thread.id)
          )
        );
        if (isStale()) return;

        const syncedEmails: CrmEmail[] = [];
        rankedThreads.forEach((item, i) => {
          const email = buildCrmEmailFromThreadItem(
            item,
            threadDetails[i],
            normalizedAccountEmail
          );
          if (email) syncedEmails.push(email);
        });

        syncedEmails.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
        const dedupedEmails = dedupeEmailsByThread(syncedEmails);
        if (isStale()) return;

        if (background) {
          setInboxFolderPagination((prev) => ({
            ...prev,
            ...nextFolderPagination,
          }));
        } else {
          setInboxFolderPagination(nextFolderPagination);
        }

        patch((prev) => {
          const emailMeta = reconcileEmailMetaAfterSync(
            prev.emailMeta,
            prev.emails,
            dedupedEmails
          );
          const mergedEmails = background
            ? mergeBackgroundSyncEmails(dedupedEmails, prev.emails)
            : mergeFlaggedEmails(dedupedEmails, prev.emails, emailMeta);
          return {
            ...prev,
            outlookConnected: true,
            outlookAccountId: account.id,
            outlookEmail: account.email,
            outlookAccounts: accounts,
            emails: applyEmailMeta(mergedEmails, emailMeta),
            emailMeta,
          };
        });

        if (isStale()) return;
        await emitInboundEmailNotifications(dedupedEmails, account.id);
        await clearOutlookErrorNotification(account.id);

        setOutlookInboxLastSyncedAt(new Date().toISOString());
      } catch (err) {
        // The path used to be catch-less: any thrown error vanished at the
        // `void syncOutlookInbox()` call site, leaving an empty inbox and no clue.
        if (!background) {
          setOutlookSyncError(
            err instanceof Error ? err.message : "Couldn't load your inbox."
          );
          const accountId = outlookAccountIdRef.current;
          if (accountId && accountEmail) {
            if (isStale()) return;
            await emitOutlookErrorNotification(accountId, accountEmail);
          }
        }
      } finally {
        outlookSyncInFlightRef.current = false;
        setOutlookInboxSyncing(false);
      }
    },
    // Deliberately not depending on state.outlookAccountId: the selected
    // account is read through a ref instead. As a dependency it changed this
    // callback's identity on every sync, which re-fired the bootstrap effect
    // that depends on it, which synced again — 2-3x the requests per switch.
    [patch, emitInboundEmailNotifications, emitOutlookErrorNotification, clearOutlookErrorNotification]
  );

  syncOutlookInboxRef.current = syncOutlookInbox;

  useEffect(() => {
    outlookAccountIdRef.current = state.outlookAccountId;
  }, [state.outlookAccountId]);

  useEffect(() => {
    if (!hydrated || !authUserId) return;
    void syncOutlookInbox(null, null);
  }, [hydrated, authUserId, syncOutlookInbox]);

  useEffect(() => {
    if (
      !hydrated ||
      !authUserId ||
      !state.outlookConnected ||
      !state.outlookAccountId
    ) {
      return;
    }

    let intervalId: number | null = null;

    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void syncOutlookInbox(null, null, { background: true });
    };

    const startPolling = () => {
      if (intervalId !== null) return;
      intervalId = window.setInterval(tick, OUTLOOK_POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
        return;
      }
      tick();
      startPolling();
    };

    if (typeof document !== "undefined" && !document.hidden) {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [
    hydrated,
    authUserId,
    state.outlookConnected,
    state.outlookAccountId,
    syncOutlookInbox,
  ]);

  const switchOutlookAccount = useCallback(
    async (accountId: string) => {
      await syncOutlookInbox(accountId, null);
    },
    [syncOutlookInbox]
  );

  const inboxFolderHasMore = useCallback(
    (folder: InboxFolderName) => {
      const accountId = outlookAccountIdRef.current;
      if (!accountId) return false;
      const labelId = INBOX_FOLDER_LABEL_IDS[folder];
      const key = inboxFolderPaginationKey(accountId, labelId);
      return Boolean(inboxFolderPagination[key]?.nextPageToken);
    },
    [inboxFolderPagination]
  );

  const loadMoreInboxEmails = useCallback(
    async (folder: InboxFolderName) => {
      const accountId = outlookAccountIdRef.current;
      if (!accountId || loadingMoreInboxFolderRef.current) return;

      const labelId = INBOX_FOLDER_LABEL_IDS[folder];
      const paginationKey = inboxFolderPaginationKey(accountId, labelId);
      const pageToken = inboxFolderPagination[paginationKey]?.nextPageToken;
      if (!pageToken) return;

      const accountEmail = (state.outlookEmail ?? "").toLowerCase();
      if (!accountEmail) return;

      loadingMoreInboxFolderRef.current = folder;
      setLoadingMoreInboxFolder(folder);
      try {
        const threadsRes = await listOutlookThreads(
          accountId,
          25,
          labelId,
          pageToken
        );
        if (!threadsRes.live) return;

        const mailboxLabel = INBOX_FOLDER_LABEL_IDS[folder];
        const existingThreadIds = new Set(state.emails.map((e) => e.threadId));
        const newItems: ThreadBucketItem[] = [];

        for (const thread of threadsRes.data.threads) {
          const threadId = thread.threadId || thread.id;
          if (existingThreadIds.has(threadId)) continue;
          newItems.push({
            thread,
            mailboxLabels: new Set([mailboxLabel]),
          });
        }

        let loadedEmails: CrmEmail[] = [];
        if (newItems.length > 0) {
          const threadDetails = await Promise.all(
            newItems.map((item) =>
              getOutlookThread(
                accountId,
                item.thread.threadId || item.thread.id
              )
            )
          );
          loadedEmails = newItems
            .map((item, i) =>
              buildCrmEmailFromThreadItem(item, threadDetails[i], accountEmail)
            )
            .filter((email): email is CrmEmail => Boolean(email));
        }

        if (loadedEmails.length > 0) {
          patch((prev) => {
            const combined = dedupeEmailsByThread([
              ...prev.emails,
              ...loadedEmails,
            ]).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
            return {
              ...prev,
              emails: applyEmailMeta(combined, prev.emailMeta),
            };
          });
        }

        setInboxFolderPagination((prev) => ({
          ...prev,
          [paginationKey]: {
            nextPageToken: threadsRes.data.nextPageToken,
          },
        }));
      } finally {
        loadingMoreInboxFolderRef.current = null;
        setLoadingMoreInboxFolder(null);
      }
    },
    [inboxFolderPagination, patch, state.emails, state.outlookEmail]
  );

  const connectOutlook = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!getUser()?.id) return;
    const result = await fetchOutlookConnectUrl();
    if (result.live && result.data.url) {
      window.location.href = result.data.url;
    }
  }, []);

  const disconnectOutlook = useCallback(
    async (accountId?: string | null) => {
      const targetId = accountId ?? state.outlookAccountId;
      if (targetId) {
        await disconnectOutlookAccountApi(targetId);
      }

      const accountsRes = await listOutlookAccounts();
      const remaining = accountsRes.live
        ? accountsRes.data.filter(
            (account) =>
              account.status === "active" &&
              (!targetId || account.id !== targetId)
          )
        : [];

      const nextAccount = remaining[0] ?? null;
      patch((prev) => ({
        ...prev,
        outlookConnected: Boolean(nextAccount),
        outlookAccountId: nextAccount?.id ?? null,
        outlookEmail: nextAccount?.email ?? null,
        outlookAccounts: remaining,
        emails: nextAccount ? prev.emails : [],
      }));
      if (!nextAccount) {
        setInboxFolderPagination({});
      }
    },
    [patch, state.outlookAccountId]
  );

  const resetStore = useCallback(() => {
    setState(createInitialCrmState());
    setPendingComposeLeadId(null);
  }, []);

  const updateEmailTemplate = useCallback(
    (id: string, tplPatch: Partial<Omit<EmailTemplate, "id">>) => {
      patch((prev) => ({
        ...prev,
        emailTemplates: prev.emailTemplates.map((t) =>
          t.id === id ? { ...t, ...tplPatch } : t
        ),
      }));
    },
    [patch]
  );

  const replaceEmailTemplates = useCallback(
    (templates: EmailTemplate[]) => {
      patch((prev) => ({
        ...prev,
        emailTemplates: templates.map((tpl) => ({ ...tpl })),
      }));
    },
    [patch]
  );

  const addEmailTemplate = useCallback((): string => {
    const id = generateCrmId("tpl");
    const tpl = createBlankEmailTemplate(id);
    patch((prev) => ({
      ...prev,
      emailTemplates: [...prev.emailTemplates, tpl],
    }));
    return id;
  }, [patch]);

  const deleteEmailTemplate = useCallback(
    (id: string) => {
      if (isDefaultEmailTemplate(id)) return;
      patch((prev) => ({
        ...prev,
        emailTemplates: prev.emailTemplates.filter((t) => t.id !== id),
      }));
    },
    [patch]
  );

  const resetEmailTemplate = useCallback(
    (id: string) => {
      const def = getDefaultEmailTemplate(id);
      if (!def) return;
      patch((prev) => ({
        ...prev,
        emailTemplates: prev.emailTemplates.map((t) =>
          t.id === id ? { ...def } : t
        ),
      }));
    },
    [patch]
  );

  const resetAllEmailTemplates = useCallback(() => {
    patch((prev) => ({
      ...prev,
      emailTemplates: cloneDefaultEmailTemplates(),
    }));
  }, [patch]);

  // The catalogue is shared, so every edit is a server call first and local state
  // second. Nothing here writes the whole list — that is what duplicated it.
  const addSalt = useCallback(async (): Promise<string | null> => {
    const salt = createBlankSalt(generateCrmId("salt"));
    const res = await createBackendSalt(salt);
    if (!res.live) return null;
    patch((prev) => ({ ...prev, salts: [...prev.salts, res.data] }));
    return res.data.id;
  }, [patch]);

  const updateSalt = useCallback(
    async (
      id: string,
      saltPatch: Partial<Omit<SaltMasterItem, "id">>
    ): Promise<boolean> => {
      const res = await patchBackendSalt(id, saltPatch);
      if (!res.live) return false;
      const next = res.data;
      patch((prev) => {
        const existing = prev.salts.find((s) => s.id === id);
        const renamed =
          existing && existing.name !== next.name
            ? { from: existing.name, to: next.name }
            : null;
        return {
          ...prev,
          // `matchedSalt` on a lead is a NAME SNAPSHOT, not a foreign key, so a
          // rename has to be carried across by hand. This only fixes the current
          // user's leads. A server-side cascade is not safe yet: leads are still
          // on the whole-array PUT, so another user's next save would overwrite
          // it with their stale copy. Revisit once leads are per-item.
          leads: renamed
            ? prev.leads.map((l) =>
                l.matchedSalt === renamed.from
                  ? { ...l, matchedSalt: renamed.to }
                  : l
              )
            : prev.leads,
          salts: prev.salts.map((s) => (s.id === id ? next : s)),
        };
      });
      return true;
    },
    [patch]
  );

  const deleteSalt = useCallback(
    async (id: string): Promise<boolean> => {
      // Salt → medicine is a hard FK (the backend 409s while any medicine still
      // points here), so detach first: unlink this salt from each linked
      // medicine, and delete any medicine that would be left with no salt.
      const linked = state.medicines.filter((m) => (m.saltIds ?? []).includes(id));
      const deletedMedIds: string[] = [];
      const relinked: { id: string; saltIds: string[] }[] = [];
      for (const med of linked) {
        const remaining = (med.saltIds ?? []).filter((s) => s !== id);
        if (remaining.length === 0) {
          const r = await removeBackendMedicine(med.id);
          if (!r.live) return false;
          deletedMedIds.push(med.id);
        } else {
          const r = await patchBackendMedicine(med.id, { saltIds: remaining });
          if (!r.live) return false;
          relinked.push({ id: med.id, saltIds: remaining });
        }
      }
      const res = await removeBackendSalt(id);
      if (!res.live) return false;
      patch((prev) => ({
        ...prev,
        salts: prev.salts.filter((s) => s.id !== id),
        medicines: prev.medicines
          .filter((m) => !deletedMedIds.includes(m.id))
          .map((m) => {
            const hit = relinked.find((r) => r.id === m.id);
            return hit ? { ...m, saltIds: hit.saltIds } : m;
          }),
      }));
      return true;
    },
    [patch, state.medicines]
  );

  const addMedicine = useCallback(
    async (saltId?: string): Promise<string | null> => {
      const fallbackSaltId = saltId ?? state.salts[0]?.id;
      if (!fallbackSaltId) return null; // the backend 400s on an unknown saltId
      const med = createBlankMedicine(generateCrmId("med"), fallbackSaltId);
      const res = await createBackendMedicine(med);
      if (!res.live) return null;
      const created = normalizeMedicine(res.data);
      patch((prev) => ({ ...prev, medicines: [...prev.medicines, created] }));
      return created.id;
    },
    [patch, state.salts]
  );

  const updateMedicine = useCallback(
    async (
      id: string,
      medPatch: Partial<Omit<DiscoveryMedicine, "id">>
    ): Promise<boolean> => {
      const res = await patchBackendMedicine(id, medPatch);
      if (!res.live) return false;
      const next = normalizeMedicine(res.data);
      patch((prev) => {
        const existing = prev.medicines.find((m) => m.id === id);
        // As with salts: `matchedMedicine` / `dosageForm` are name snapshots on
        // the lead, so a rename is carried across by hand, for this user's leads
        // only. See the note in updateSalt.
        let leads = prev.leads;
        if (existing && existing.name !== next.name) {
          leads = leads.map((l) =>
            l.matchedMedicine === existing.name
              ? { ...l, matchedMedicine: next.name }
              : l
          );
        }
        if (existing && existing.dosageForm !== next.dosageForm) {
          leads = leads.map((l) =>
            l.matchedMedicine === next.name &&
            l.dosageForm === existing.dosageForm
              ? { ...l, dosageForm: next.dosageForm }
              : l
          );
        }
        return {
          ...prev,
          leads,
          medicines: prev.medicines.map((m) => (m.id === id ? next : m)),
        };
      });
      return true;
    },
    [patch]
  );

  const deleteMedicine = useCallback(
    async (id: string): Promise<boolean> => {
      // Leads link medicines by name snapshot, so deleting one leaves the lead's
      // matchedMedicine text intact — no orphan. The UI confirms before calling.
      const res = await removeBackendMedicine(id);
      if (!res.live) return false;
      patch((prev) => ({
        ...prev,
        medicines: prev.medicines.filter((m) => m.id !== id),
      }));
      return true;
    },
    [patch]
  );

  const value = useMemo<CrmContextValue>(
    () => ({
      ...state,
      hydrated,
      masterDataSynced,
      masterDataRevision,
      crmSynced,
      outlookInboxSyncing,
      outlookInboxLastSyncedAt,
      outlookSyncError,
      saveFromDiscovery,
      createLeadWithCompany,
      updateLeadWithCompany,
      createLeadManual,
      updateLead,
      deleteLead,
      deleteContact,
      setLeadStage,
      advanceLeadStage,
      verifyLead,
      markLeadLost,
      markLeadDormant,
      createDealFromLead,
      sendCrmEmail,
      linkEmailToLead,
      setEmailFlag,
      emailIdsWithFlag,
      connectOutlook,
      disconnectOutlook,
      syncOutlookInbox,
      switchOutlookAccount,
      inboxFolderHasMore,
      loadingMoreInboxFolder,
      loadMoreInboxEmails,
      getCompany: (id) => state.companies.find((c) => c.id === id),
      getContact: (id) => state.contacts.find((c) => c.id === id),
      getLead: (id) => state.leads.find((l) => l.id === id),
      addSample,
      updateSample,
      deleteSample,
      addQuotation,
      updateQuotation,
      deleteQuotation,
      addFollowUp,
      updateFollowUp,
      deleteFollowUp,
      getLeadFollowUps: (leadId) =>
        state.followUps
          .filter((f) => f.leadId === leadId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      getLeadEmails: (leadId) =>
        state.emails.filter((e) => e.leadId === leadId),
      getLeadTimeline: (leadId) =>
        state.timeline
          .filter((t) => t.leadId === leadId)
          .sort((a, b) => b.date.localeCompare(a.date)),
      findCompanyByDiscoveryId,
      buildTemplateVars: (lead) => ({
        company_name: lead.companyName,
        contact_name: lead.contactName,
        salt_name: lead.matchedSalt,
        medicine_name: lead.matchedMedicine,
        dosage_form: lead.dosageForm,
        sender_name: getUserDisplayName(),
      }),
      updateEmailTemplate,
      replaceEmailTemplates,
      addEmailTemplate,
      deleteEmailTemplate,
      resetEmailTemplate,
      resetAllEmailTemplates,
      refreshMasterData,
      addSalt,
      updateSalt,
      deleteSalt,
      addMedicine,
      updateMedicine,
      deleteMedicine,
      pendingComposeLeadId,
      setPendingComposeLeadId,
      resetStore,
    }),
    [
      state,
      hydrated,
      masterDataSynced,
      masterDataRevision,
      crmSynced,
      outlookInboxSyncing,
      outlookInboxLastSyncedAt,
      outlookSyncError,
      saveFromDiscovery,
      createLeadWithCompany,
      updateLeadWithCompany,
      createLeadManual,
      updateLead,
      deleteLead,
      deleteContact,
      setLeadStage,
      advanceLeadStage,
      verifyLead,
      markLeadLost,
      markLeadDormant,
      createDealFromLead,
      sendCrmEmail,
      linkEmailToLead,
      setEmailFlag,
      emailIdsWithFlag,
      connectOutlook,
      disconnectOutlook,
      syncOutlookInbox,
      switchOutlookAccount,
      inboxFolderHasMore,
      loadingMoreInboxFolder,
      loadMoreInboxEmails,
      addSample,
      updateSample,
      deleteSample,
      addQuotation,
      updateQuotation,
      deleteQuotation,
      addFollowUp,
      updateFollowUp,
      deleteFollowUp,
      findCompanyByDiscoveryId,
      updateEmailTemplate,
      replaceEmailTemplates,
      addEmailTemplate,
      deleteEmailTemplate,
      resetEmailTemplate,
      resetAllEmailTemplates,
      refreshMasterData,
      addSalt,
      updateSalt,
      deleteSalt,
      addMedicine,
      updateMedicine,
      deleteMedicine,
      pendingComposeLeadId,
      resetStore,
    ]
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm(): CrmContextValue {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm must be used within CrmProvider");
  return ctx;
}

export { applyTemplate, DEFAULT_EMAIL_TEMPLATES, EMAIL_TEMPLATES } from "./email-templates";
