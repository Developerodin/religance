"use client";

import { apiGet, apiSend, type JsonResult } from "./api-client";
import type { CrmQuotation } from "./types";

export async function getBackendQuotations(): Promise<JsonResult<CrmQuotation[]>> {
  return apiGet<CrmQuotation[]>("/v1/crm/quotations");
}

export async function saveBackendQuotations(
  quotations: CrmQuotation[],
  baseIds: string[]
): Promise<JsonResult<CrmQuotation[]>> {
  return apiSend<CrmQuotation[]>("PUT", "/v1/crm/quotations", {
    items: quotations,
    baseIds,
  });
}
