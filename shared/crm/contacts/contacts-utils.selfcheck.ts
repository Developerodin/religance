import assert from "node:assert/strict";
import {
  contactCountry,
  leadStatusLabel,
  type EnrichedContact,
} from "./contacts-utils";
import type { CrmCompany, CrmContact } from "@/shared/crm/store/types";

const company = (patch: Partial<CrmCompany>): CrmCompany => ({
  id: "c1",
  name: "Acme",
  location: "Mumbai, India",
  website: "",
  companyType: "",
  certification: "",
  sourceLinks: [],
  createdAt: "2026-01-01",
  ...patch,
});

assert.equal(contactCountry(undefined), "—");
assert.equal(contactCountry(company({ country: "India" })), "India");
assert.equal(
  contactCountry(company({ country: "  ", location: "Dubai" })),
  "Dubai"
);

const row = (leads: number, active: number): EnrichedContact => ({
  contact: { id: "1" } as CrmContact,
  company: undefined,
  leads: [],
  leadCount: leads,
  activeLeadCount: active,
});

assert.equal(leadStatusLabel(row(0, 0)), "No leads");
assert.equal(leadStatusLabel(row(1, 0)), "1 lead");
assert.equal(leadStatusLabel(row(2, 1)), "2 leads · 1 active");

console.log("contacts-utils.selfcheck: ok");
