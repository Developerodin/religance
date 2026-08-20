export type WorkflowAction =
  | "create"
  | "update"
  | "pause"
  | "resume"
  | "cancel"
  | "list";

export type WorkflowStatus =
  | "draft_requires_auth"
  | "pending_confirm"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type Frequency = "daily" | "weekly" | "monthly";

export type WorkflowSchedule = {
  frequency: Frequency;
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  endDate?: string;
  maxRuns?: number;
};

export type WorkflowCommandContractV1 = {
  version: "v1";
  action: WorkflowAction;
  workflowId?: string;
  templateId?: string;
  recipientIds?: string[];
  schedule?: WorkflowSchedule;
  variables?: Record<string, string>;
  confidence: number;
  requestId: string;
};

export type PreviewSummary = {
  kind: "preview_summary";
  templateName: string;
  templateId: string;
  recipients: Array<{ id: string; name: string; email: string }>;
  scheduleLabel: string;
  timezone: string;
  endLabel: string;
  mailbox: string;
  accountId: string;
  nextSendAt: string;
  subjectPreview: string;
  bodyPreviewHtml: string;
  contract: WorkflowCommandContractV1;
};

export type ClarificationPrompt = {
  kind: "clarification_prompt";
  prompt: string;
  code?: string;
  workflowId?: string;
};

export type MailWorkflow = {
  id: string;
  userId: string;
  createdByUserId: string;
  status: WorkflowStatus;
  templateId: string;
  recipientIds: string[];
  recipientScope: "crm_only";
  variables: Record<string, string>;
  schedule: WorkflowSchedule;
  timezone: string;
  accountId: string;
  nextRunAt: string | null;
  lastRunAt?: string | null;
  runCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CommandResult = {
  kind: "command_result";
  workflow?: MailWorkflow;
  workflows?: MailWorkflow[];
};

export type ChatResponse = PreviewSummary | ClarificationPrompt | CommandResult;

export type Preflight = {
  connected: boolean;
  tokenValid: boolean;
  sendAllowed: boolean;
  accountId: string | null;
};

export type ChatConfirm = {
  action: WorkflowAction;
  workflowId: string;
};
