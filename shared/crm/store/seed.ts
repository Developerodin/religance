import type { CrmState } from "./types";
import { cloneDefaultEmailTemplates } from "./email-templates";

/** Empty CRM — real data comes from Mongo + Outlook after user activity. */
export function createInitialCrmState(): CrmState {
  return {
    companies: [],
    contacts: [],
    leads: [],
    deals: [],
    samples: [],
    quotations: [],
    followUps: [],
    emails: [],
    emailMeta: [],
    timeline: [],
    gmailConnected: false,
    outlookAccountId: null,
    outlookEmail: null,
    outlookAccounts: [],
    emailTemplates: cloneDefaultEmailTemplates(),
    // Shared catalogue — loaded from Mongo on boot, never seeded locally.
    salts: [],
    medicines: [],
  };
}
