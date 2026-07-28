import { isTerminalStage } from "@/shared/crm/active-leads/lead-stages";
import type { SendEmailTarget } from "@/shared/crm/send-email/send-email-types";
import { sendEmailTargetFromContact } from "@/shared/crm/send-email/send-email-types";
import type { CrmCompany, CrmContact, CrmLead } from "@/shared/crm/store/types";

export type EnrichedContact = {
  contact: CrmContact;
  company: CrmCompany | undefined;
  leads: CrmLead[];
  leadCount: number;
  activeLeadCount: number;
};

export type ContactSort = "name" | "company" | "newest";

export function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatContactDate(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function enrichContacts(
  contacts: CrmContact[],
  companies: CrmCompany[],
  leads: CrmLead[]
): EnrichedContact[] {
  return contacts.map((contact) => {
    const company = companies.find((c) => c.id === contact.companyId);
    const contactLeads = leads.filter((l) => l.contactId === contact.id);
    const activeLeadCount = contactLeads.filter(
      (l) => !isTerminalStage(l.stage)
    ).length;
    return {
      contact,
      company,
      leads: contactLeads,
      leadCount: contactLeads.length,
      activeLeadCount,
    };
  });
}

export function filterEnrichedContacts(
  rows: EnrichedContact[],
  search: string,
  companyFilter: string
): EnrichedContact[] {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (companyFilter && row.contact.companyId !== companyFilter) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      row.contact.name,
      row.contact.role,
      row.contact.email,
      row.contact.phone ?? "",
      row.company?.name ?? "",
      row.company?.location ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function sortEnrichedContacts(
  rows: EnrichedContact[],
  sort: ContactSort
): EnrichedContact[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "newest") {
      return b.contact.createdAt.localeCompare(a.contact.createdAt);
    }
    if (sort === "company") {
      const ca = a.company?.name ?? "";
      const cb = b.company?.name ?? "";
      const cmp = ca.localeCompare(cb);
      if (cmp !== 0) return cmp;
      return a.contact.name.localeCompare(b.contact.name);
    }
    return a.contact.name.localeCompare(b.contact.name);
  });
  return copy;
}

export function hasContactFilters(search: string, companyFilter: string): boolean {
  return Boolean(search.trim() || companyFilter);
}

export function resolveSendEmailTarget(row: EnrichedContact): SendEmailTarget {
  const activeLead =
    row.leads.find((l) => !isTerminalStage(l.stage)) ?? row.leads[0];
  return sendEmailTargetFromContact({
    name: row.contact.name,
    email: row.contact.email,
    companyName: row.company?.name,
    lead: activeLead ?? null,
  });
}
