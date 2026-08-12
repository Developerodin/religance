"use client";

import { getToken } from "@/shared/auth/auth-client";
import { apiGet, apiSend, type JsonResult } from "./api-client";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_RELIGENCE_BACKEND_URL ?? "http://localhost:4000";

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken() ?? ""}`,
  };
}

export type OutlookAccount = {
  id: string;
  provider: "outlook";
  email: string;
  displayName?: string | null;
  status: "active" | "revoked" | "error";
  createdAt: string;
};

export type OutlookThreadItem = {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string | null;
  labelIds?: string[];
  isUnread: boolean;
  lastMessageId?: string;
  importance?: string;
  inferenceClassification?: string;
  categories?: string[];
};

export type OutlookThread = {
  id: string;
  messages: Array<{
    id: string;
    threadId?: string;
    snippet: string;
    from: string;
    to: string;
    subject: string;
    date: string | null;
    htmlBody: string | null;
    textBody: string | null;
    importance?: string;
    inferenceClassification?: string;
    categories?: string[];
    isDraft?: boolean;
    attachments?: Array<{
      filename: string;
      mimeType: string;
      size: number;
      attachmentId?: string;
      messageId?: string;
    }>;
  }>;
};

export async function fetchOutlookConnectUrl(): Promise<JsonResult<{ url: string }>> {
  return apiGet<{ url: string }>("/v1/email/auth/microsoft");
}

export async function listOutlookAccounts(): Promise<JsonResult<OutlookAccount[]>> {
  return apiGet<OutlookAccount[]>("/v1/email/accounts");
}

export async function disconnectOutlookAccount(
  accountId: string
): Promise<JsonResult<{ success: boolean }>> {
  return apiSend<{ success: boolean }>(
    "DELETE",
    `/v1/email/accounts/${encodeURIComponent(accountId)}`
  );
}

export async function listOutlookThreads(
  accountId: string,
  pageSize = 20,
  labelId?: string,
  pageToken?: string
): Promise<JsonResult<{ threads: OutlookThreadItem[]; nextPageToken: string | null }>> {
  const params = new URLSearchParams({
    accountId,
    pageSize: String(pageSize),
  });
  if (labelId?.trim()) {
    params.set("labelId", labelId.trim());
  }
  if (pageToken?.trim()) {
    params.set("pageToken", pageToken.trim());
  }
  return apiGet<{ threads: OutlookThreadItem[]; nextPageToken: string | null }>(
    `/v1/email/threads?${params.toString()}`
  );
}

export type OutlookSyncRemoval = {
  folder: string;
  conversationId: string;
  messageId?: string;
};

export type OutlookSyncThread = OutlookThreadItem & {
  mailboxLabels: string[];
};

export async function syncOutlookMailbox(input: {
  accountId: string;
  folders?: string[];
  mode?: "delta" | "bootstrap";
}): Promise<
  JsonResult<{
    threads: OutlookSyncThread[];
    removed: OutlookSyncRemoval[];
    folderSyncAt: Record<string, string>;
  }>
> {
  return apiSend("POST", "/v1/email/sync", input);
}

export type OutlookFolderStat = {
  unreadItemCount: number;
  totalItemCount: number;
  loaded: true;
};

export async function fetchOutlookFolderStats(
  accountId: string
): Promise<JsonResult<{ folders: Record<string, OutlookFolderStat> }>> {
  const qs = new URLSearchParams({ accountId }).toString();
  return apiGet<{ folders: Record<string, OutlookFolderStat> }>(
    `/v1/email/folders/stats?${qs}`
  );
}

export async function getOutlookThread(
  accountId: string,
  threadId: string
): Promise<JsonResult<OutlookThread>> {
  const qs = new URLSearchParams({ accountId }).toString();
  return apiGet<OutlookThread>(
    `/v1/email/threads/${encodeURIComponent(threadId)}?${qs}`
  );
}

export async function sendOutlookMessage(input: {
  accountId: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  attachments?: { name: string; contentType: string; contentBytes: string }[];
}): Promise<JsonResult<{ id: string | null; threadId?: string | null }>> {
  return apiSend<{ id: string | null; threadId?: string | null }>(
    "POST",
    "/v1/email/messages/send",
    input
  );
}

export async function replyOutlookMessage(input: {
  accountId: string;
  messageId: string;
  html: string;
}): Promise<JsonResult<{ id: string | null; threadId?: string | null }>> {
  return apiSend(
    "POST",
    `/v1/email/messages/${encodeURIComponent(input.messageId)}/reply`,
    { accountId: input.accountId, html: input.html }
  );
}

export async function replyAllOutlookMessage(input: {
  accountId: string;
  messageId: string;
  html: string;
}): Promise<JsonResult<{ id: string | null; threadId?: string | null }>> {
  return apiSend(
    "POST",
    `/v1/email/messages/${encodeURIComponent(input.messageId)}/reply-all`,
    { accountId: input.accountId, html: input.html }
  );
}

export async function forwardOutlookMessage(input: {
  accountId: string;
  messageId: string;
  to: string;
  html: string;
}): Promise<JsonResult<{ id: string | null; threadId?: string | null }>> {
  return apiSend(
    "POST",
    `/v1/email/messages/${encodeURIComponent(input.messageId)}/forward`,
    { accountId: input.accountId, to: input.to, html: input.html }
  );
}

export async function batchModifyOutlookThreads(input: {
  accountId: string;
  threadIds: string[];
  addLabelIds?: string[];
  removeLabelIds?: string[];
}): Promise<JsonResult<{ success: boolean; modified: number }>> {
  return apiSend("POST", "/v1/email/threads/batch-modify", input);
}

export async function trashOutlookThreads(input: {
  accountId: string;
  threadIds: string[];
}): Promise<JsonResult<{ success: boolean }>> {
  return apiSend("POST", "/v1/email/threads/trash", input);
}

export async function downloadOutlookAttachment(input: {
  accountId: string;
  messageId: string;
  attachmentId: string;
  filename: string;
}): Promise<string | null> {
  try {
    const qs = new URLSearchParams({ accountId: input.accountId }).toString();
    const res = await fetch(
      `${BACKEND_BASE}/v1/email/messages/${encodeURIComponent(
        input.messageId
      )}/attachments/${encodeURIComponent(input.attachmentId)}?${qs}`,
      { headers: authHeaders(), cache: "no-store" }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return (
        (body as { error?: string }).error ?? `Download failed (${res.status})`
      );
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = input.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Download failed";
  }
}

export type BackendSaltMaster = {
  id: string;
  name: string;
  casNumbers: string[];
  sourceFiles: string[];
  buyerCount: number;
  totalAnnualBuyingCapacityKg: number;
  companyCategories: string[];
  countries: string[];
  certifications: string[];
};

export type BackendMedicineMaster = {
  id: string;
  saltId: string;
  name: string;
  dosageForm: string;
  casNumber: string | null;
  sourceFiles: string[];
  buyerCount: number;
  totalAnnualBuyingCapacityKg: number;
};

export type BackendBuyerMaster = {
  id: string;
  medicineId: string;
  saltId: string;
  productName: string;
  casNo: string | null;
  buyerName: string;
  companyCategory: string | null;
  certifications: string[];
  annualBuyingCapacityKg: number | null;
  contactPersons: string[];
  designations: string[];
  emails: string[];
  phoneNumbers: string[];
  country: string | null;
  sourceFile: string;
  sourceRow: number;
};

export type BackendMasterData = {
  generatedAt: string;
  sourceDirectory: string;
  sourceFiles: string[];
  salts: BackendSaltMaster[];
  medicines: BackendMedicineMaster[];
  buyers: BackendBuyerMaster[];
};

export async function listBackendMasterData(
  reload = false
): Promise<JsonResult<BackendMasterData>> {
  const query = reload ? "?reload=true" : "";
  return apiGet<BackendMasterData>(`/v1/master-data${query}`);
}

export type BuyerImportResult = {
  sourceFile: string;
  buyers: number;
  buyersNew: number;
  salts: number;
  medicines: number;
};

export async function importBuyerExcel(
  file: File
): Promise<JsonResult<BuyerImportResult>> {
  try {
    const res = await fetch(
      `${BACKEND_BASE}/v1/master-data/import?filename=${encodeURIComponent(
        file.name
      )}`,
      {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/octet-stream",
        },
        body: await file.arrayBuffer(),
      }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        (body as { error?: string }).error ?? `Import failed (${res.status})`;
      return { live: false, error: message };
    }
    return { live: true, data: (await res.json()) as BuyerImportResult };
  } catch (err) {
    return {
      live: false,
      error: err instanceof Error ? err.message : "Import failed",
    };
  }
}
