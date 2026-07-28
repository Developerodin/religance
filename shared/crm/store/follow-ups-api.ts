"use client";

import { apiGet, apiPut, type JsonResult } from "./api-client";
import type { CrmFollowUp } from "./types";

export async function getBackendFollowUps(): Promise<JsonResult<CrmFollowUp[]>> {
  return apiGet<CrmFollowUp[]>("/v1/crm/followUps");
}

export async function saveBackendFollowUps(
  followUps: CrmFollowUp[],
  baseIds: string[]
): Promise<JsonResult<CrmFollowUp[]>> {
  return apiPut<CrmFollowUp[]>("/v1/crm/followUps", {
    items: followUps,
    baseIds,
  });
}
