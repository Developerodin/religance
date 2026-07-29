import type { EmailTemplate } from "./email-templates";
import type { DiscoveryMedicine } from "./medicines-master";
import type { SaltMasterItem } from "./salts-master";

export type LeadStage =
  | "Saved"
  | "Verified"
  | "Intro Email Sent"
  | "Follow-up Sent"
  | "Replied"
  | "Sample Requested"
  | "Quotation Sent"
  | "Negotiation"
  | "Won"
  | "Lost"
  | "Dormant";

export type SaveToContactOption =
  | "company_only"
  | "company_and_contact"
  | "create_lead"
  | "create_lead_and_email";

export type CrmCompany = {
  id: string;
  name: string;
  location: string;
  website: string;
  companyType: string;
  certification: string;
  city?: string;
  country?: string;
  gstin?: string;
  pan?: string;
  discoveryCompanyId?: string;
  sourceLinks: { label: string; url: string }[];
  createdAt: string;
};

export type CrmContact = {
  id: string;
  companyId: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  createdAt: string;
};

export type CrmLead = {
  id: string;
  title: string;
  companyId: string;
  contactId: string | null;
  discoveryCompanyId?: string;
  companyName: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  matchedSalt: string;
  matchedMedicine: string;
  saltId?: string;
  medicineId?: string;
  /** Multi-select products of interest (medicine catalogue ids). */
  medicineIds?: string[];
  dosageForm: string;
  location: string;
  stage: LeadStage;
  /** Discovery-derived score; not the RPPL qual. score. */
  leadScore: number;
  assignedTo: string;
  marketTier?: string;
  segment?: string;
  leadSource?: string;
  priority?: string;
  /** RPPL qualification score (0–25). */
  qualScore?: number;
  potentialQty?: string;
  estAnnualValue?: string;
  lastContactDate?: string;
  followUpDate: string;
  nextAction?: string;
  docsShared?: string;
  lastDiscussionSummary?: string;
  lastActivity: string;
  notes: string;
  createdAt: string;
  sourceLinks: { label: string; url: string }[];
};

export const SAMPLE_STATUSES = [
  "Requested",
  "Dispatched",
  "In transit",
  "Delivered",
  "Feedback received",
  "Cancelled",
] as const;

export type SampleStatus = (typeof SAMPLE_STATUSES)[number];

export type CrmSample = {
  id: string;
  leadId: string;
  companyId: string;
  /** Snapshot for register display, mirrors how leads carry companyName. */
  companyName: string;
  productId: string;
  /** Product name snapshot (medicine names can be renamed later). */
  product: string;
  qty: string;
  batchNo: string;
  status: string;
  /** YYYY-MM-DD, or "" if not dispatched yet. */
  dispatchDate: string;
  courier: string;
  awb: string;
  coaSent: boolean;
  feedback: string;
  /** Inherited from the lead's assignedTo. */
  owner: string;
  createdAt: string;
};

export const QUOTATION_STATUSES = [
  "Draft",
  "Sent",
  "Accepted",
  "Rejected",
  "Expired",
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_CURRENCIES = ["INR", "USD", "EUR"] as const;

export const QUOTATION_GST_RATES = ["", "0%", "5%", "12%", "18%", "28%"] as const;

export const QUOTATION_PRICE_BASES = [
  "",
  "Ex-works",
  "FOB",
  "CIF",
  "DDP",
] as const;

export type CrmQuotation = {
  id: string;
  leadId: string;
  companyId: string;
  companyName: string;
  owner: string;
  quoteNo: string;
  /** YYYY-MM-DD */
  quoteDate: string;
  productId: string;
  product: string;
  casNo: string;
  hsnSac: string;
  /** Quantity in kg (stored as string, e.g. "100"). */
  qty: string;
  unitPrice: string;
  currency: string;
  gstRate: string;
  priceBasis: string;
  /** YYYY-MM-DD, or "" if open-ended. */
  validUntil: string;
  status: string;
  note: string;
  subTotal: number;
  gstAmount: number;
  grandTotal: number;
  createdAt: string;
};

export type CrmFollowUp = {
  id: string;
  leadId: string;
  /** DD-MM-YYYY display date from the form. */
  entryDate: string;
  contactedBy: string;
  mode: string;
  outcome: string;
  summary: string;
  infoShared: string;
  nextStep: string;
  nextFollowUp: string;
  createdAt: string;
};

/** Discrete note on a lead (list CRUD). Separate from CrmLead.notes free-text. */
export type CrmLeadNote = {
  id: string;
  leadId: string;
  body: string;
  author: string;
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp */
  updatedAt: string;
};

export type CrmDeal = {
  id: string;
  leadId: string;
  title: string;
  companyName: string;
  value: string;
  stage: "Open" | "Won" | "Lost";
  createdAt: string;
};

export type CrmEmailAttachment = {
  filename: string;
  mimeType: string;
  size: number;
  /** Both required to download; absent on locally composed mail. */
  attachmentId?: string;
  messageId?: string;
};

export type CrmEmail = {
  id: string;
  leadId: string | null;
  threadId: string;
  /** Latest Graph message id in the thread — used for reply/forward APIs. */
  messageId?: string | null;
  direction: "inbound" | "outbound";
  mailboxLabels?: string[];
  /** Graph message importance — used for Important folder (distinct from starred). */
  importance?: "low" | "normal" | "high";
  /** Outlook category names from Graph `categories` on synced messages. */
  outlookCategories?: string[];
  subject: string;
  body: string;
  preview: string;
  fromEmail: string;
  toEmail: string;
  sentAt: string;
  attachments?: CrmEmailAttachment[];
};

/**
 * CRM-owned overlay on a mail item. Graph owns the email itself (subject, body,
 * sender); these are the bits the user creates here and would otherwise lose on
 * every re-sync — the lead link and the folder/star flags. Keyed by CrmEmail.id.
 */
export type CrmEmailMeta = {
  id: string;
  leadId: string | null;
  starred: boolean;
  read: boolean;
  archived: boolean;
  trashed: boolean;
};

export type EmailFlag = "starred" | "read" | "archived" | "trashed";

export type CrmTimelineEvent = {
  id: string;
  leadId: string;
  date: string;
  title: string;
  description: string;
  type: "stage" | "email" | "note" | "call" | "verification" | "deal";
  /** Links email timeline events to inbox threads for deep navigation. */
  emailId?: string;
};

export type OutlookMailboxAccount = {
  id: string;
  provider: "outlook";
  email: string;
  displayName?: string | null;
  status: "active" | "revoked" | "error";
  createdAt: string;
};

export type CrmState = {
  companies: CrmCompany[];
  contacts: CrmContact[];
  leads: CrmLead[];
  deals: CrmDeal[];
  samples: CrmSample[];
  quotations: CrmQuotation[];
  followUps: CrmFollowUp[];
  leadNotes: CrmLeadNote[];
  emails: CrmEmail[];
  /** Persisted overlay for `emails` (which are re-fetched from Graph, not stored). */
  emailMeta: CrmEmailMeta[];
  timeline: CrmTimelineEvent[];
  outlookConnected: boolean;
  outlookAccountId?: string | null;
  outlookEmail?: string | null;
  outlookAccounts?: OutlookMailboxAccount[];
  emailTemplates: EmailTemplate[];
  salts: SaltMasterItem[];
  medicines: DiscoveryMedicine[];
};

/** Fallback when team list API is unavailable; not sourced from CRM contacts. */
export const FALLBACK_TEAM_ASSIGNEES = ["Priya Sharma", "Arjun Nair"] as const;

/** @deprecated Use getUserDisplayName() for the signed-in assignee default. */
export const DEFAULT_ASSIGNEES = FALLBACK_TEAM_ASSIGNEES;

/** @deprecated Use getUserDisplayName() instead of a hardcoded name. */
export const CURRENT_USER = FALLBACK_TEAM_ASSIGNEES[0];

/** Assigned on every new CRM lead; not user-editable in v1. */
export const DEFAULT_LEAD_SCORE = 100;

export type CreateLeadWithCompanyInput = {
  company: {
    name: string;
    companyType?: string;
    city?: string;
    country?: string;
    gstin?: string;
    pan?: string;
    location?: string;
    website?: string;
    certification?: string;
  };
  contact?: {
    name: string;
    role?: string;
    email?: string;
    phone?: string;
  } | null;
  lead: {
    saltId: string;
    medicineId: string;
    matchedSalt: string;
    matchedMedicine: string;
    dosageForm: string;
    medicineIds?: string[];
    title?: string;
    stage?: LeadStage;
    assignedTo?: string;
    leadScore?: number;
    marketTier?: string;
    segment?: string;
    leadSource?: string;
    priority?: string;
    qualScore?: number;
    potentialQty?: string;
    estAnnualValue?: string;
    lastContactDate?: string;
    followUpDate?: string;
    nextAction?: string;
    docsShared?: string;
    lastDiscussionSummary?: string;
    notes?: string;
    location?: string;
  };
};
