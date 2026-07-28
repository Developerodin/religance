import type { CrmLead } from "@/shared/crm/store/types";

/** Recipient context for SendEmailModal — full lead or contact-only outreach. */
export type SendEmailTarget = {
  leadId?: string | null;
  contactName: string;
  contactEmail: string;
  companyName?: string;
  matchedSalt?: string;
  matchedMedicine?: string;
  dosageForm?: string;
};

export function sendEmailTargetFromLead(lead: CrmLead): SendEmailTarget {
  return {
    leadId: lead.id,
    contactName: lead.contactName,
    contactEmail: lead.contactEmail,
    companyName: lead.companyName,
    matchedSalt: lead.matchedSalt,
    matchedMedicine: lead.matchedMedicine,
    dosageForm: lead.dosageForm,
  };
}

export function sendEmailTargetFromContact(input: {
  name: string;
  email: string;
  companyName?: string;
  lead?: CrmLead | null;
}): SendEmailTarget {
  if (input.lead) {
    return sendEmailTargetFromLead(input.lead);
  }
  return {
    contactName: input.name,
    contactEmail: input.email,
    companyName: input.companyName,
  };
}
