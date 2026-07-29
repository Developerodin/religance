"use client";

import { apiGet, apiSend, type JsonResult } from "./api-client";
import type { CrmCompany } from "./types";

// Per-user companies, persisted in Mongo (source of truth).
export async function getBackendCompanies(): Promise<JsonResult<CrmCompany[]>> {
  return apiGet<CrmCompany[]>("/v1/crm/companies");
}

export async function saveBackendCompanies(
  companies: CrmCompany[],
  baseIds: string[]
): Promise<JsonResult<CrmCompany[]>> {
  return apiSend<CrmCompany[]>("PUT", "/v1/crm/companies", { items: companies, baseIds });
}
