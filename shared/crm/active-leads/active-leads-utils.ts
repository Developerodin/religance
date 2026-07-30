import type { CrmLead } from "@/shared/crm/store/types";
import { isTerminalStage } from "./lead-stages";

export type LeadFormSource = "discovery" | "active-leads";

export type LeadEditPrefill = {
  from?: LeadFormSource;
  saltId?: string | null;
  medicineId?: string | null;
  focus?: string;
};

/** Static-export-safe edit URL — lead IDs are runtime-generated, not path segments. */
export function leadEditHref(
  leadId: string,
  prefill: LeadEditPrefill = {}
): string {
  const params = new URLSearchParams();
  params.set("id", leadId);
  if (prefill.from) params.set("from", prefill.from);
  if (prefill.saltId) params.set("saltId", prefill.saltId);
  if (prefill.medicineId) params.set("medicineId", prefill.medicineId);
  if (prefill.focus) params.set("focus", prefill.focus);
  return `/active-leads/edit/?${params.toString()}`;
}

export type LeadNewPrefill = {
  from?: LeadFormSource;
  medicineId?: string | null;
  saltId?: string | null;
  companyName?: string;
  companyType?: string;
  location?: string;
  country?: string;
  contactName?: string;
  contactRole?: string;
  contactEmail?: string;
  contactPhone?: string;
};

/** Lead Discovery return URL — preserves salt/medicine selection when provided. */
export function leadDiscoveryHref(opts?: {
  saltId?: string | null;
  medicineId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts?.saltId) params.set("saltId", opts.saltId);
  if (opts?.medicineId) params.set("medicineId", opts.medicineId);
  const q = params.toString();
  return q ? `/lead-discovery/?${q}` : "/lead-discovery/";
}

/** Create-mode URL with optional discovery / catalogue pre-fill. */
export function leadNewHref(prefill: LeadNewPrefill = {}): string {
  const params = new URLSearchParams();
  if (prefill.from) params.set("from", prefill.from);
  if (prefill.medicineId) params.set("medicineId", prefill.medicineId);
  if (prefill.saltId) params.set("saltId", prefill.saltId);
  if (prefill.companyName) params.set("companyName", prefill.companyName);
  if (prefill.companyType) params.set("companyType", prefill.companyType);
  if (prefill.location) params.set("location", prefill.location);
  if (prefill.country) params.set("country", prefill.country);
  if (prefill.contactName) params.set("contactName", prefill.contactName);
  if (prefill.contactRole) params.set("contactRole", prefill.contactRole);
  if (prefill.contactEmail) params.set("contactEmail", prefill.contactEmail);
  if (prefill.contactPhone) params.set("contactPhone", prefill.contactPhone);
  const q = params.toString();
  return q ? `/active-leads/new/?${q}` : "/active-leads/new/";
}

export function companyInitials(name: string): string {
  const parts = name
    .replace(/\b(Pvt|Ltd|LLC|Inc)\b/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function parseIsoDate(iso: string): Date | null {
  if (iso === "—") return null;
  const d = new Date(iso + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getFollowUpStatus(
  followUpDate: string
): "none" | "ok" | "soon" | "overdue" {
  const due = parseIsoDate(followUpDate);
  if (!due) return "none";

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diffDays = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "soon";
  return "ok";
}

export function hasActiveLeadFilters(filters: {
  search: string;
  stageFilter: string;
  saltFilter: string;
  assigneeFilter: string;
  pipelineFilter: string;
}): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.stageFilter !== "" ||
    filters.saltFilter !== "" ||
    filters.assigneeFilter !== "" ||
    filters.pipelineFilter !== "all"
  );
}

export function countLeadsByStage(
  leads: CrmLead[]
): Partial<Record<CrmLead["stage"], number>> {
  const counts: Partial<Record<CrmLead["stage"], number>> = {};
  for (const lead of leads) {
    counts[lead.stage] = (counts[lead.stage] ?? 0) + 1;
  }
  return counts;
}

export function filterLeadsForBoard(
  leads: CrmLead[],
  opts: {
    search: string;
    stageFilter: CrmLead["stage"] | "";
    saltFilter: string;
    assigneeFilter: string;
    pipelineFilter: "all" | "active" | "closed";
  }
): CrmLead[] {
  const q = opts.search.trim().toLowerCase();
  return leads.filter((lead) => {
    if (opts.stageFilter && lead.stage !== opts.stageFilter) return false;
    if (opts.saltFilter && lead.matchedSalt !== opts.saltFilter) return false;
    if (opts.assigneeFilter && lead.assignedTo !== opts.assigneeFilter)
      return false;
    if (opts.pipelineFilter === "active" && isTerminalStage(lead.stage))
      return false;
    if (opts.pipelineFilter === "closed" && !isTerminalStage(lead.stage))
      return false;
    if (!q) return true;
    return (
      lead.title.toLowerCase().includes(q) ||
      lead.companyName.toLowerCase().includes(q) ||
      lead.contactName.toLowerCase().includes(q) ||
      lead.matchedSalt.toLowerCase().includes(q) ||
      lead.matchedMedicine.toLowerCase().includes(q)
    );
  });
}
