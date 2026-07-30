"use client";

import { apiGet, apiSend, type JsonResult } from "@/shared/crm/store/api-client";

export type NotificationCategory = "action" | "activity";

export type NotificationType =
  | "verification_pending"
  | "follow_up_due"
  | "follow_up_logged"
  | "inbound_email"
  | "outlook_error"
  | "lead_verified"
  | "stage_changed"
  | "sample_logged"
  | "quotation_logged";

export type NotificationMeta = {
  leadId?: string;
  threadId?: string;
  messageId?: string;
  sentAt?: string;
  accountId?: string;
  count?: number;
  actorName?: string;
  previousStage?: string;
  stage?: string;
  quoteNo?: string;
};

export type NotificationItem = {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  icon: string;
  href: string;
  meta?: NotificationMeta;
  createdAt: string;
};

export type NotificationsListResponse = {
  items: NotificationItem[];
  total: number;
  activityTotal: number;
  limit: number;
};

export type ClientEmitInput = {
  type: "inbound_email" | "outlook_error";
  title: string;
  body: string;
  href: string;
  dedupeKey: string;
  meta?: NotificationMeta;
};

export async function getNotifications(opts?: {
  category?: NotificationCategory;
  limit?: number;
}): Promise<JsonResult<NotificationsListResponse>> {
  const params = new URLSearchParams();
  if (opts?.category) params.set("category", opts.category);
  if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiGet<NotificationsListResponse>(
    `/v1/notifications${qs ? `?${qs}` : ""}`
  );
}

export async function postNotificationScan(): Promise<
  JsonResult<{ scanned: boolean }>
> {
  return apiSend<{ scanned: boolean }>("POST", "/v1/notifications/scan");
}

export async function postNotification(
  body: ClientEmitInput
): Promise<JsonResult<{ item: NotificationItem }>> {
  return apiSend<{ item: NotificationItem }>("POST", "/v1/notifications", body);
}

export async function postInboundEmailNotification(input: {
  threadId: string;
  subject: string;
  fromEmail: string;
  messageId?: string;
  sentAt: string;
}): Promise<JsonResult<{ item: NotificationItem }>> {
  return postNotification({
    type: "inbound_email",
    dedupeKey: `inbound_email:${input.threadId}`,
    title: `New email: ${input.subject}`,
    body: `From ${input.fromEmail}`,
    href: `/inbox?email=outlook-${input.threadId}`,
    meta: {
      threadId: input.threadId,
      messageId: input.messageId,
      sentAt: input.sentAt,
    },
  });
}

export async function deleteNotification(
  id: string,
  intent: "dismiss" | "navigate" = "navigate"
): Promise<JsonResult<void>> {
  const qs = intent === "dismiss" ? "?intent=dismiss" : "";
  return apiSend<void>("DELETE", `/v1/notifications/${encodeURIComponent(id)}${qs}`);
}

export async function deleteNotificationByDedupeKey(
  dedupeKey: string
): Promise<JsonResult<void>> {
  return apiSend<void>(
    "DELETE",
    `/v1/notifications/dedupe/${encodeURIComponent(dedupeKey)}`
  );
}
