"use client";

import { apiGet, apiSend, type JsonResult } from "@/shared/crm/store/api-client";
import type {
  ChatConfirm,
  ChatMessageApiResponse,
  ChatResponse,
  MailChatSessionView,
  MailHistoryContact,
  MailLink,
  MailWorkflow,
  Preflight,
  PreviewSummary,
  WorkflowCommandContractV1,
} from "./types";

export function getChatSession(): Promise<JsonResult<MailChatSessionView>> {
  return apiGet<MailChatSessionView>("/v1/chat/session");
}

export function clearChat(): Promise<JsonResult<{ ok: boolean }>> {
  return apiSend("POST", "/v1/chat/clear", {});
}

export function sendChatMessage(
  text: string,
  requestId: string,
  confirm?: ChatConfirm,
  choiceId?: string
): Promise<JsonResult<ChatMessageApiResponse>> {
  return apiSend<ChatMessageApiResponse>("POST", "/v1/chat/message", {
    text,
    requestId,
    ...(confirm ? { confirm } : {}),
    ...(choiceId ? { choiceId } : {}),
  });
}

export function recordChatSessionUpdate(payload: {
  requestId: string;
  removeMessageIds?: string[];
  assistantResponse?: ChatResponse;
  systemText?: string;
  clearDraft?: boolean;
}): Promise<JsonResult<MailChatSessionView>> {
  return apiSend<MailChatSessionView>("POST", "/v1/chat/session/record", payload);
}

/**
 * THE confirmation call. Posts to the same backend entry point a spoken "yes" uses, so
 * the button and natural language cannot diverge. The server reuses the draft's stored
 * requestId, which makes a double-click or retry idempotent.
 */
export function confirmPendingChat(
  requestId: string,
  confirmToken?: string
): Promise<JsonResult<ChatMessageApiResponse>> {
  return apiSend<ChatMessageApiResponse>("POST", "/v1/chat/confirm", {
    requestId,
    ...(confirmToken ? { confirmToken } : {}),
  });
}

/** Activate a workflow parked awaiting Outlook authentication. */
export function confirmWorkflow(
  id: string,
  requestId: string
): Promise<JsonResult<MailWorkflow>> {
  return apiSend("POST", `/v1/workflows/${encodeURIComponent(id)}/confirm`, {
    requestId,
  });
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

/** Per-contact mail timeline, newest contact first. */
export function listMailHistory(
  contactId?: string
): Promise<JsonResult<MailHistoryContact[]>> {
  const qs = contactId ? `?contactId=${encodeURIComponent(contactId)}` : "";
  return apiGet<MailHistoryContact[]>(`/v1/workflows/mail-history${qs}`);
}

/**
 * Resolves one timeline row to the message in the mailbox. Deliberately per-click:
 * loading the panel must not fan out one Graph call per row.
 */
export function getMailLink(
  runId: string,
  recipientId: string
): Promise<JsonResult<MailLink>> {
  return apiGet<MailLink>(
    `/v1/workflows/mail-history/${encodeURIComponent(runId)}/${encodeURIComponent(
      recipientId
    )}/link`
  );
}
