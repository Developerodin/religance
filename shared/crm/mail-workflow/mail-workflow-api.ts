"use client";

import { apiGet, apiSend, type JsonResult } from "@/shared/crm/store/api-client";
import type {
  ChatConfirm,
  ChatResponse,
  MailWorkflow,
  Preflight,
  PreviewSummary,
  WorkflowCommandContractV1,
} from "./types";

export function sendChatMessage(
  text: string,
  requestId: string,
  confirm?: ChatConfirm
): Promise<JsonResult<ChatResponse>> {
  return apiSend<ChatResponse>("POST", "/v1/chat/message", {
    text,
    requestId,
    ...(confirm ? { confirm } : {}),
  });
}

export function confirmCreate(
  payload: WorkflowCommandContractV1 & { confirmed: true }
): Promise<JsonResult<MailWorkflow | PreviewSummary>> {
  return apiSend("POST", "/v1/workflows", payload);
}

export function pauseWorkflow(
  id: string,
  requestId: string
): Promise<JsonResult<MailWorkflow>> {
  return apiSend("POST", `/v1/workflows/${encodeURIComponent(id)}/pause`, {
    requestId,
  });
}

export function resumeWorkflow(
  id: string,
  requestId: string
): Promise<JsonResult<MailWorkflow>> {
  return apiSend("POST", `/v1/workflows/${encodeURIComponent(id)}/resume`, {
    requestId,
  });
}

export function cancelWorkflow(
  id: string,
  requestId: string
): Promise<JsonResult<MailWorkflow>> {
  return apiSend("POST", `/v1/workflows/${encodeURIComponent(id)}/cancel`, {
    requestId,
  });
}

export function listWorkflows(): Promise<JsonResult<MailWorkflow[]>> {
  return apiGet<MailWorkflow[]>("/v1/workflows");
}

export function inboxPreflight(): Promise<JsonResult<Preflight>> {
  return apiGet<Preflight>("/v1/inbox/preflight");
}
