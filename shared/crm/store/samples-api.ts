"use client";

import { apiGet, apiSend, type JsonResult } from "./api-client";
import type { CrmSample } from "./types";

// Per-user sample register, persisted in Mongo (source of truth).
export async function getBackendSamples(): Promise<JsonResult<CrmSample[]>> {
  return apiGet<CrmSample[]>("/v1/crm/samples");
}

export async function saveBackendSamples(
  samples: CrmSample[],
  baseIds: string[]
): Promise<JsonResult<CrmSample[]>> {
  return apiSend<CrmSample[]>("PUT", "/v1/crm/samples", { items: samples, baseIds });
}
