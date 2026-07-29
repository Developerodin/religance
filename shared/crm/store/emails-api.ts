"use client";

import { apiGet, apiSend, type JsonResult } from "./api-client";
import type { CrmEmailMeta } from "./types";

// Per-user email overlay (lead links + star/read/archive/trash), persisted in
// Mongo. The emails themselves stay in Graph and are re-synced, not stored.
export async function getBackendEmailMeta(): Promise<JsonResult<CrmEmailMeta[]>> {
  return apiGet<CrmEmailMeta[]>("/v1/crm/emails");
}

export async function saveBackendEmailMeta(
  meta: CrmEmailMeta[],
  baseIds: string[]
): Promise<JsonResult<CrmEmailMeta[]>> {
  return apiSend<CrmEmailMeta[]>("PUT", "/v1/crm/emails", { items: meta, baseIds });
}
