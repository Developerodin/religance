# Recurring Email Chatbot v1 Design

**Date:** 2026-08-20  
**Status:** Finalized  
**Repo:** `religance` (docs-only change)

---

## Executive Summary

This spec finalizes v1 for recurring email workflows created and managed via chatbot, with strict operational safeguards for scheduling, idempotency, and user confirmation. The system uses a hybrid architecture: LLM for intent-to-structured-command conversion only, deterministic backend execution for all side effects, and an in-process scheduler with Mongo claim/lease coordination.

Recurring schedules are in scope for v1 (`daily`, `weekly`, `monthly`), scoped to CRM contacts/leads only, and require explicit confirmation before activation. If an inbox is not connected at creation time, workflows are created as `draft_requires_auth`, then transition to `pending_confirm` after reconnect, and only become active after explicit user confirmation.

---

## Section 1 - Locked Decisions (Approved)

1. **Architecture is hybrid.**  
   - LLM output is a versioned command contract: `WorkflowCommandContract v1`.
   - Scheduler executes in process using Mongo claim/lease.
   - LLM never performs direct side effects (no direct send, no direct DB mutation).

2. **Auth gating behavior is fixed.**  
   - If inbox is disconnected at creation: workflow state = `draft_requires_auth`.
   - After reconnect: transition to `pending_confirm`.
   - Workflow can activate only after explicit user confirmation.

3. **Recipient scope is fixed.**  
   - v1 recipients are CRM contacts/leads only.
   - No free-form arbitrary addresses in v1.

4. **Scheduling scope is fixed.**  
   - v1 supports recurring only: `daily`, `weekly`, `monthly`.
   - Workspace has one global timezone used for scheduling.
   - Optional recurrence termination controls: `endDate` and `maxRuns`.

5. **Retry policy is fixed.**  
   - Transient run failures retry up to 3 attempts.
   - After retry exhaustion, run outcome = `failed`.
   - Workflow remains active unless a lifecycle transition changes it.

6. **Data model and state model are fixed** (Section 2).

7. **Idempotency constraints are hard requirements.**  
   - `UNIQUE(workflowId, scheduledAt)` on run occurrences.
   - `UNIQUE(workspaceId, requestId)` on command processing ledger.

8. **Idempotency correction is mandatory.**  
   - Run uniqueness alone does not prove exactly-once in crash-after-provider-accept windows.
   - Add provider correlation/idempotency key derived from `workspaceId + workflowId + scheduledAt` where provider supports it.
   - If provider cannot guarantee idempotent send semantics, residual risk is explicitly **at-least-once delivery**.

9. **Spec includes implementation-ready details** for API surface, chatbot flows, scheduler algorithm, edge cases, test strategy, and definition of done.

---

## Section 2 - Data Model and State Machines

### 2.1 Core Collections

#### `RecurringWorkflow`

```ts
type RecurringWorkflow = {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  status:
    | "draft_requires_auth"
    | "pending_confirm"
    | "active"
    | "paused"
    | "completed"
    | "cancelled";
  recipientScope: "crm_only";
  recipients: Array<{ type: "lead" | "contact"; id: string }>;
  schedule: {
    frequency: "daily" | "weekly" | "monthly";
    timezone: string; // workspace global timezone
    timeOfDay: string; // HH:mm
    daysOfWeek?: number[]; // weekly
    dayOfMonth?: number; // monthly
    endDate?: string; // ISO date
    maxRuns?: number;
  };
  emailTemplate: {
    subject: string;
    body: string;
  };
  nextRunAt: string | null;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
};
```

#### `WorkflowRunOccurrence`

```ts
type WorkflowRunOccurrence = {
  id: string;
  workflowId: string;
  workspaceId: string;
  scheduledAt: string; // exact slot in workspace timezone, stored in UTC
  status: "scheduled" | "claimed" | "running" | "sent" | "failed" | "skipped";
  attemptCount: number; // max 3 retries for transient failures
  lease: {
    ownerId: string;
    leaseUntil: string;
  } | null;
  providerMessageId?: string;
  providerIdempotencyKey?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
};
```

#### `WorkflowCommandLedger`

```ts
type WorkflowCommandLedger = {
  id: string;
  workspaceId: string;
  requestId: string; // client/chat request id
  contractVersion: "v1";
  commandType: string;
  commandPayload: object;
  processedAt: string;
  resultRef?: string;
};
```

### 2.2 Required Indexes

- `WorkflowRunOccurrence`: `UNIQUE(workflowId, scheduledAt)`
- `WorkflowCommandLedger`: `UNIQUE(workspaceId, requestId)`
- Non-unique support indexes:
  - `RecurringWorkflow(workspaceId, status, nextRunAt)`
  - `WorkflowRunOccurrence(workspaceId, status, scheduledAt)`
  - `WorkflowRunOccurrence(workspaceId, lease.leaseUntil)`

### 2.3 Workflow Lifecycle State Machine

- `draft_requires_auth`
  - Enter when inbox is not connected during create request.
  - Allowed transitions: `pending_confirm`, `cancelled`.
- `pending_confirm`
  - Enter after auth is restored for a draft.
  - Allowed transitions: `active`, `cancelled`.
- `active`
  - Scheduler eligible.
  - Allowed transitions: `paused`, `completed`, `cancelled`.
- `paused`
  - Scheduler ineligible.
  - Allowed transitions: `active`, `cancelled`.
- `completed`
  - Terminal (reached `endDate` or `maxRuns`).
- `cancelled`
  - Terminal (user action).

### 2.4 Run State Model

- `scheduled` -> `claimed` -> `running` -> `sent`
- `running` -> `failed` (after retries exhausted or permanent failure)
- `running` -> `scheduled` (transient failure with attempts remaining)
- `running` -> `skipped` (recipient no longer valid CRM entity at execution time)

---

## Section 3 - Architecture and Execution Model

### 3.1 Hybrid Architecture

1. Chat text is interpreted into `WorkflowCommandContract v1`.
2. Backend validates contract schema and business rules.
3. Backend persists command in ledger with `UNIQUE(workspaceId, requestId)`.
4. Backend performs deterministic state transitions and data writes.
5. Scheduler executes due runs; send pipeline is deterministic and auditable.

### 3.2 No Direct LLM Side Effects

- LLM cannot send emails directly.
- LLM cannot mutate workflow/run records directly.
- LLM output is advisory input to typed command processing only.

### 3.3 Auth-Gated Activation

- Create command while disconnected inbox:
  - persist workflow in `draft_requires_auth`
  - no scheduler eligibility
- On reconnect webhook/user reconnect action:
  - move workflow to `pending_confirm`
- On explicit user confirm:
  - move to `active`
  - compute `nextRunAt`

---

## Section 4 - API Surface (v1)

### 4.1 Chatbot Command Endpoint

- `POST /api/chatbot/workflow-commands`
  - Input: `WorkflowCommandContract v1` envelope + `requestId`
  - Behavior:
    - schema/business validation
    - command dedupe by `UNIQUE(workspaceId, requestId)`
    - deterministic command execution
  - Output: workflow summary + status + action result

### 4.2 Workflow Management

- `POST /api/recurring-email-workflows`
  - Create workflow from validated command payload.
- `POST /api/recurring-email-workflows/:id/confirm`
  - Explicit confirm required before activation.
- `POST /api/recurring-email-workflows/:id/pause`
- `POST /api/recurring-email-workflows/:id/resume`
- `POST /api/recurring-email-workflows/:id/cancel`
- `GET /api/recurring-email-workflows/:id`
- `GET /api/recurring-email-workflows`

### 4.3 Run/Operations Visibility

- `GET /api/recurring-email-workflows/:id/runs`
- `GET /api/recurring-email-workflows/:id/runs/:runId`
- `POST /internal/scheduler/recurring-email/tick` (internal trigger)

### 4.4 Auth/Inbox Integration

- `POST /api/inbox/reconnect-callback`
  - Re-evaluates `draft_requires_auth` workflows and transitions to `pending_confirm`.

---

## Section 5 - Chatbot Flows (v1)

### 5.1 Create Flow (Inbox Connected)

1. User asks chatbot to set recurring email.
2. LLM returns `WorkflowCommandContract v1`.
3. Backend validates:
   - recipients are CRM leads/contacts only
   - recurrence and timezone constraints
4. Backend creates workflow directly in `pending_confirm`.
5. Chatbot returns a confirmation summary.
6. User explicitly confirms.
7. Workflow transitions to `active`.

### 5.2 Create Flow (Inbox Disconnected)

1. Same command parsing and validation.
2. Backend creates workflow as `draft_requires_auth`.
3. Chatbot returns reconnect-required response.
4. After reconnect event, workflow transitions to `pending_confirm`.
5. User explicitly confirms to activate.

### 5.3 Modify Flow

- Update schedule/template/recipients via command contract.
- If active, recompute `nextRunAt` deterministically.
- If update invalidates recipients (non-CRM), reject command.

### 5.4 Pause/Resume/Cancel Flow

- Pause: `active -> paused`; no new claims.
- Resume: `paused -> active`; recompute `nextRunAt`.
- Cancel: non-terminal -> `cancelled`; no further runs.

---

## Section 6 - Scheduler Algorithm (In-Process + Mongo Claim/Lease)

### 6.1 Tick Loop

1. Select due workflows where:
   - `status = active`
   - `nextRunAt <= now`
2. For each due slot, create/run-occurrence upsert keyed by `(workflowId, scheduledAt)`.
3. Attempt atomic claim of run:
   - claim only if status is `scheduled` and lease is absent/expired.
4. Set lease (`ownerId`, `leaseUntil`) and move to `claimed` then `running`.
5. Execute send pipeline:
   - resolve CRM recipients
   - render email content
   - send via provider using provider idempotency key when supported
6. On success:
   - set run `sent`
   - store provider correlation id/message id
   - increment workflow counters and compute next slot
7. On transient failure:
   - retry up to 3 attempts
   - if attempts remain: return run to `scheduled` with backoff
   - else mark run `failed`
8. Release lease on terminal run status transition.

### 6.2 Lease Rules

- Lease must expire automatically (`leaseUntil`) to recover from worker crash.
- A run with live lease cannot be claimed by another worker.
- Expired lease is reclaimable.

### 6.3 Exactly-Once Boundary and Correction

- `UNIQUE(workflowId, scheduledAt)` prevents duplicate run records for the same slot.
- This alone does **not** guarantee exactly-once delivery if crash occurs after provider accepted send but before local commit.
- Therefore:
  - Use provider idempotency/correlation key derived from `workspaceId + workflowId + scheduledAt` where supported.
  - Persist provider response IDs for reconciliation.
- If provider does not provide idempotent send semantics, residual risk is explicitly **at-least-once delivery**.

---

## Section 7 - Edge Cases and Expected Behavior

- **Inbox disconnect after workflow activation:** affected runs fail according to retry policy; workflow remains `active` unless user/system lifecycle transition occurs.
- **Recipient deleted from CRM before run executes:** run becomes `skipped` with reason; workflow continues.
- **Timezone changed at workspace level:** recompute next run slots from current rule at next scheduler tick.
- **`endDate` reached:** transition workflow to `completed`.
- **`maxRuns` reached:** transition workflow to `completed`.
- **Duplicate command delivery (network retries):** deduped by `UNIQUE(workspaceId, requestId)`.
- **Scheduler process crash mid-run:** lease expiry enables recovery and re-claim.
- **Provider accepts send but callback delayed/missing:** reconcile using provider correlation/message IDs.

---

## Section 8 - Test Strategy

### 8.1 Unit Tests

- Contract validation for `WorkflowCommandContract v1`.
- Workflow lifecycle transition guards.
- Schedule slot generation for daily/weekly/monthly in workspace timezone.
- Idempotency key derivation from `workspaceId + workflowId + scheduledAt`.

### 8.2 Integration Tests

- Command dedupe via `UNIQUE(workspaceId, requestId)`.
- Run occurrence dedupe via `UNIQUE(workflowId, scheduledAt)`.
- Auth-gated flow: `draft_requires_auth -> pending_confirm -> active`.
- Retry behavior: transient failures retry 3 times then `failed`.
- Pause/resume/cancel lifecycle behavior under active scheduler ticks.

### 8.3 Failure and Recovery Drills

- Crash after claim before send (lease recovery).
- Crash after provider accept before local commit (idempotency correction path).
- Provider without idempotent semantics (documented at-least-once risk).
- Expired lease re-claim by another worker.

### 8.4 E2E Scenarios

- Create recurring workflow with connected inbox and confirm activation.
- Create while disconnected, reconnect, confirm, then observe first run.
- Weekly/monthly schedules with `endDate` and `maxRuns`.
- CRM-only recipient enforcement and rejection of non-CRM recipients.

---

## Section 9 - Definition of Done

A v1 implementation is done when all conditions below are met:

- Hybrid architecture enforced with `WorkflowCommandContract v1`.
- No direct LLM side effects in send/data mutation paths.
- Auth-gated flow implemented exactly (`draft_requires_auth` -> `pending_confirm` -> explicit confirm -> `active`).
- Recipient scope enforced to CRM contacts/leads only.
- Recurring schedules (`daily/weekly/monthly`) run in workspace global timezone.
- `endDate` and `maxRuns` termination behavior implemented.
- Retry policy implemented (3 transient attempts, run-level `failed`, workflow lifecycle independent).
- Required unique constraints exist and are validated in tests:
  - `UNIQUE(workflowId, scheduledAt)`
  - `UNIQUE(workspaceId, requestId)`
- Provider correlation/idempotency key path implemented where supported.
- Residual at-least-once delivery risk documented for non-idempotent providers.
- API surface, scheduler behavior, and edge-case handling covered by tests.

---

## Out of Scope for v1

- Non-recurring one-off sends managed by this workflow subsystem.
- Arbitrary free-form recipient emails outside CRM entities.
- Per-workflow timezone overrides (v1 uses workspace global timezone).
- Exactly-once guarantees when provider does not support idempotent send semantics.
