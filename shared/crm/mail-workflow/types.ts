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
  | "paused_auth_required"
  | "completed"
  | "cancelled";

/** `once` is a first-class frequency, not maxRuns=1 in disguise. */
export type Frequency = "once" | "daily" | "weekly" | "monthly" | "sequence";
export type ExecutionMode = "recurring" | "once";

export type StepSpec =
  | { kind: "after"; minutes: number; from: "start" | "previous" }
  | { kind: "at"; time: string; dayOffset: number };

export type SequenceStep = {
  spec: StepSpec;
  at: string;
  templateId?: string;
};

export type RunStatus =
  | "running"
  | "success"
  | "partial_success"
  | "failed"
  | "skipped"
  | "unknown";

export type WorkflowSchedule = {
  frequency: Frequency;
  /** HH:mm in the workspace timezone. Absent for `once`. */
  time?: string;
  /** ISO instant. Present for `once`. */
  runAt?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  endDate?: string;
  maxRuns?: number;
  startAt?: string;
  steps?: SequenceStep[];
};

export type WorkflowCommandContractV1 = {
  version: "v1";
  action: WorkflowAction;
  executionMode?: ExecutionMode;
  oneTimeSendAt?: string;
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
  /** sequence only: one row per step, in send order. Absent for every other frequency. */
  steps?: Array<{ index: number; at: string; templateName: string; passed: boolean }>;
  subjectPreview: string;
  bodyPreviewHtml: string;
  contract: WorkflowCommandContractV1;
};

export type AssistantChoice = {
  id: string;
  label: string;
  sublabel?: string;
};

export type AssistantConfirmAction = {
  type: "schedule" | "update" | "pause" | "resume" | "cancel";
  workflowId?: string;
  label: string;
};

export type AssistantMessage = {
  kind: "assistant_message";
  message: string;
  suggestions?: string[];
  choices?: AssistantChoice[];
  preview?: PreviewSummary;
  connectInbox?: boolean;
  confirmAction?: AssistantConfirmAction;
  workflows?: MailWorkflow[];
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
  executionMode: ExecutionMode;
  oneTimeSendAt: string | null;
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

export type ChatResponse =
  | AssistantMessage
  | PreviewSummary
  | ClarificationPrompt
  | CommandResult;

export type ChatMessageExchange = {
  user: { id: string; text: string; createdAt: string } | null;
  assistant: { id: string; response: ChatResponse; createdAt: string };
};

export type ChatMessageApiResponse = {
  result: ChatResponse;
  exchange: ChatMessageExchange;
};

export type MailChatSessionView = {
  sessionId: string;
  messages: Array<
    | { id: string; role: "user"; text: string; createdAt: string }
    | { id: string; role: "assistant"; response: ChatResponse; createdAt: string }
    | { id: string; role: "system"; text: string; createdAt: string }
  >;
  draft: Record<string, unknown>;
  updatedAt: string;
};

export type Preflight = {
  connected: boolean;
  tokenValid: boolean;
  sendAllowed: boolean;
  accountId: string | null;
};

export type ChatConfirm = {
  action: WorkflowAction | "schedule";
  workflowId?: string;
};

export type RecipientSendStatus = "pending" | "sending" | "sent" | "failed" | "unknown";

export type MailHistoryEvent = {
  runId: string;
  workflowId: string;
  recipientId: string;
  templateId: string;
  templateName: string;
  subject: string;
  scheduledAt: string;
  sentAt: string | null;
  status: RecipientSendStatus;
  runStatus: RunStatus;
  errorCode?: string;
  errorMessage?: string;
  /** True when the backend holds an id that can resolve to a real mailbox message. */
  linkable: boolean;
};

export type MailHistoryContact = {
  contactId: string;
  name: string;
  company: string;
  email: string;
  totalSent: number;
  totalFailed: number;
  firstContactedAt: string | null;
  lastContactedAt: string | null;
  events: MailHistoryEvent[];
};

export type MailLink = {
  webLink: string | null;
  conversationId: string | null;
  sentAt: string | null;
};

export type SequenceStepStatus = "sent" | "pending" | "failed" | "skipped";

export type SequenceStepProgress = {
  index: number;
  at: string;
  spec: StepSpec;
  templateId: string;
  templateName: string;
  status: SequenceStepStatus;
  sentAt: string | null;
};

export type SequenceProgressItem = {
  workflowId: string;
  name: string;
  subjectLabel: string;
  status: string;
  contact: { id: string; name: string; email: string; company: string };
  timezone: string;
  totalSteps: number;
  sentSteps: number;
  remainingSteps: number;
  remainingCount: number;
  nextPendingAt: string | null;
  startAt: string | null;
  steps: SequenceStepProgress[];
};
