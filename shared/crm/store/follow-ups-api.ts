"use client";

import { apiGet, apiSend, type JsonResult } from "./api-client";
import type { CrmFollowUp } from "./types";

export async function getBackendFollowUps(): Promise<JsonResult<CrmFollowUp[]>> {
  return apiGet<CrmFollowUp[]>("/v1/crm/followUps");
}

export async function saveBackendFollowUps(
  followUps: CrmFollowUp[],
  baseIds: string[]
): Promise<JsonResult<CrmFollowUp[]>> {
  return apiSend<CrmFollowUp[]>("PUT", "/v1/crm/followUps", {
    items: followUps,
    baseIds,
  });
}
