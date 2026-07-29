"use client";

import { apiGet, apiSend, type JsonResult } from "./api-client";
import type { CrmTimelineEvent } from "./types";

// Per-user CRM timeline events, persisted in Mongo (source of truth).
export async function getBackendTimeline(): Promise<JsonResult<CrmTimelineEvent[]>> {
  return apiGet<CrmTimelineEvent[]>("/v1/crm/timeline");
}

export async function saveBackendTimeline(
  timeline: CrmTimelineEvent[],
  baseIds: string[]
): Promise<JsonResult<CrmTimelineEvent[]>> {
  return apiSend<CrmTimelineEvent[]>("PUT", "/v1/crm/timeline", { items: timeline, baseIds });
}
