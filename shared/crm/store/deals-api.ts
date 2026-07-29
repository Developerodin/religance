"use client";

import { apiGet, apiSend, type JsonResult } from "./api-client";
import type { CrmDeal } from "./types";

// Per-user deals, persisted in Mongo (source of truth).
export async function getBackendDeals(): Promise<JsonResult<CrmDeal[]>> {
  return apiGet<CrmDeal[]>("/v1/crm/deals");
}

export async function saveBackendDeals(
  deals: CrmDeal[],
  baseIds: string[]
): Promise<JsonResult<CrmDeal[]>> {
  return apiSend<CrmDeal[]>("PUT", "/v1/crm/deals", { items: deals, baseIds });
}
