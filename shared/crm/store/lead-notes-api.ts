"use client";

import { apiGet, apiSend, type JsonResult } from "./api-client";
import type { CrmLeadNote } from "./types";

export async function getBackendLeadNotes(): Promise<JsonResult<CrmLeadNote[]>> {
  return apiGet<CrmLeadNote[]>("/v1/crm/leadNotes");
}

export async function saveBackendLeadNotes(
  leadNotes: CrmLeadNote[],
  baseIds: string[]
): Promise<JsonResult<CrmLeadNote[]>> {
  return apiSend<CrmLeadNote[]>("PUT", "/v1/crm/leadNotes", {
    items: leadNotes,
    baseIds,
  });
}
