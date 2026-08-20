"use client";

import WorkflowConfirmCard from "@/shared/crm/mail-workflow/WorkflowConfirmCard";
import {
  confirmCreate,
  sendChatMessage,
} from "@/shared/crm/mail-workflow/mail-workflow-api";
import type {
  ChatResponse,
  ClarificationPrompt,
  CommandResult,
  MailWorkflow,
  PreviewSummary,
  WorkflowAction,
} from "@/shared/crm/mail-workflow/types";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { Fragment, useCallback, useRef, useState } from "react";

type ChatItem =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; response: ChatResponse }
  | { id: string; role: "assistant"; error: string }
  | { id: string; role: "system"; text: string };

function newId(): string {
  return crypto.randomUUID();
}

function statusLabel(status: MailWorkflow["status"]): string {
  return status.replace(/_/g, " ");
}

function formatNextRun(workflow: MailWorkflow): string {
  if (!workflow.nextRunAt) return "No upcoming send scheduled.";
  try {
    return `Next send: ${new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: workflow.timezone,
    }).format(new Date(workflow.nextRunAt))}`;
  } catch {
    return `Next send: ${new Date(workflow.nextRunAt).toLocaleString()}`;
  }
}

function workflowNeedsInbox(workflow: MailWorkflow): boolean {
  return (
    workflow.status === "draft_requires_auth" ||
    workflow.status === "pending_confirm"
  );
}

function ConnectInboxLink() {
  return (
    <Link
      href="/inbox/"
      className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0 inline-flex items-center mt-2"
    >
      Connect inbox
    </Link>
  );
}

function CommandResultView({ result }: { result: CommandResult }) {
  if (result.workflows?.length) {
    return (
      <div className="space-y-2">
        <p className="mb-0 text-[0.8125rem]">
          {result.workflows.length} workflow
          {result.workflows.length === 1 ? "" : "s"} found.
        </p>
        <ul className="list-none mb-0 ps-0 space-y-1">
          {result.workflows.map((wf) => (
            <li key={wf.id} className="text-[0.8125rem]">
              <span className="badge bg-light text-default me-2">
                {statusLabel(wf.status)}
              </span>
              {formatNextRun(wf)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const workflow = result.workflow;
  if (!workflow) {
    return <p className="mb-0 text-[0.8125rem]">Done.</p>;
  }

  return (
    <div>
      <p className="mb-1 text-[0.8125rem]">
        <span className="badge bg-light text-default me-2">
          {statusLabel(workflow.status)}
        </span>
        {formatNextRun(workflow)}
      </p>
      {workflowNeedsInbox(workflow) ? (
        <p className="text-textmuted text-[0.75rem] mb-0">
          Connect Outlook to finish setup.
          <ConnectInboxLink />
        </p>
      ) : null}
    </div>
  );
}

function ClarificationView({
  prompt,
  onConfirmCancel,
  confirming,
}: {
  prompt: ClarificationPrompt;
  onConfirmCancel?: () => void;
  confirming?: boolean;
}) {
  return (
    <div>
      <p className="mb-0 text-[0.8125rem]">{prompt.prompt}</p>
      {prompt.code === "CONFIRMATION_REQUIRED" && onConfirmCancel ? (
        <button
          type="button"
          className="ti-btn ti-btn-danger !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0 mt-2"
          onClick={onConfirmCancel}
          disabled={confirming}
        >
          {confirming ? "Cancelling…" : "Confirm cancel"}
        </button>
      ) : null}
    </div>
  );
}

export default function MailAssistantPage() {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<{
    workflowId: string;
    text: string;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const appendAssistant = useCallback(
    (response: ChatResponse) => {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", response },
      ]);
      scrollToBottom();
    },
    [scrollToBottom]
  );

  const appendError = useCallback(
    (error: string) => {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", error },
      ]);
      scrollToBottom();
    },
    [scrollToBottom]
  );

  const handleSubmit = async (text: string, confirm?: { action: WorkflowAction; workflowId: string }) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    if (!confirm) {
      setMessages((prev) => [...prev, { id: newId(), role: "user", text: trimmed }]);
      setInput("");
      scrollToBottom();
    }

    const res = await sendChatMessage(trimmed, newId(), confirm);
    setBusy(false);

    if (!res.live) {
      appendError(res.error);
      return;
    }

    appendAssistant(res.data);
    if (
      res.data.kind === "clarification_prompt" &&
      res.data.code === "CONFIRMATION_REQUIRED" &&
      res.data.workflowId
    ) {
      setCancelConfirm({ workflowId: res.data.workflowId, text: trimmed });
    } else {
      setCancelConfirm(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmit(input);
  };

  const handleConfirmPreview = async (messageId: string, preview: PreviewSummary) => {
    setConfirmingId(messageId);
    const res = await confirmCreate({
      ...preview.contract,
      requestId: newId(),
      confirmed: true,
    });
    setConfirmingId(null);

    if (!res.live) {
      appendError(res.error);
      return;
    }

    setMessages((prev) => {
      const withoutPreview = prev.filter((m) => m.id !== messageId);
      if ("kind" in res.data && res.data.kind === "preview_summary") {
        return [
          ...withoutPreview,
          { id: newId(), role: "assistant" as const, response: res.data },
        ];
      }
      const workflow = res.data as MailWorkflow;
      return [
        ...withoutPreview,
        {
          id: newId(),
          role: "assistant" as const,
          response: { kind: "command_result" as const, workflow },
        },
      ];
    });
    scrollToBottom();
  };

  const handleDiscardPreview = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "system", text: "Preview discarded." },
    ]);
  };

  const handleEditPreview = () => {
    setInput("What should I change?");
    inputRef.current?.focus();
  };

  const handleConfirmCancel = async () => {
    if (!cancelConfirm) return;
    await handleSubmit(cancelConfirm.text, {
      action: "cancel",
      workflowId: cancelConfirm.workflowId,
    });
  };

  return (
    <Fragment>
      <Seo title="Mail assistant" />

      <div className="box custom-box !mb-0 flex flex-col min-h-[calc(100vh-10rem)]">
        <div className="box-header">
          <div>
            <h5 className="box-title mb-0 before:!hidden">Mail assistant</h5>
            <p className="text-[0.75rem] text-textmuted mb-0 mt-1">
              Describe a recurring email workflow in plain language.
            </p>
          </div>
        </div>

        <div
          ref={listRef}
          className="box-body flex-1 overflow-y-auto min-h-[20rem] space-y-4"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <p className="text-textmuted text-[0.8125rem] mb-0">
              Example: &ldquo;Every Monday at 10am, send the follow-up template to
              Acme Pharma.&rdquo;
            </p>
          ) : null}

          {messages.map((item) => {
            if (item.role === "user") {
              return (
                <div key={item.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-md bg-primary/10 px-3 py-2 text-[0.8125rem]">
                    {item.text}
                  </div>
                </div>
              );
            }

            if (item.role === "system") {
              return (
                <p key={item.id} className="text-textmuted text-[0.75rem] mb-0 text-center">
                  {item.text}
                </p>
              );
            }

            if ("error" in item) {
              return (
                <div key={item.id} className="alert alert-danger mb-0" role="alert">
                  {item.error}
                </div>
              );
            }

            const { response } = item;
            if (response.kind === "preview_summary") {
              return (
                <WorkflowConfirmCard
                  key={item.id}
                  preview={response}
                  confirming={confirmingId === item.id}
                  onConfirm={() => void handleConfirmPreview(item.id, response)}
                  onCancel={() => handleDiscardPreview(item.id)}
                  onEdit={handleEditPreview}
                />
              );
            }

            if (response.kind === "clarification_prompt") {
              return (
                <div
                  key={item.id}
                  className="rounded-md border border-defaultborder dark:border-defaultborder/10 px-3 py-2 bg-light/30 dark:bg-black/10"
                >
                  <ClarificationView
                    prompt={response}
                    onConfirmCancel={
                      response.code === "CONFIRMATION_REQUIRED"
                        ? () => void handleConfirmCancel()
                        : undefined
                    }
                    confirming={busy}
                  />
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className="rounded-md border border-defaultborder dark:border-defaultborder/10 px-3 py-2 bg-light/30 dark:bg-black/10"
              >
                <CommandResultView result={response} />
              </div>
            );
          })}
        </div>

        <div className="box-footer border-t border-defaultborder dark:border-defaultborder/10">
          <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2">
            <textarea
              ref={inputRef}
              className="form-control flex-1 min-h-[2.75rem] resize-y"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask to create, pause, resume, or cancel a recurring email…"
              disabled={busy}
              aria-label="Message"
            />
            <button
              type="submit"
              className="ti-btn ti-btn-primary !py-2 !px-4 !text-[0.8125rem] !w-auto !h-auto !mb-0 shrink-0 !min-h-[2.75rem]"
              disabled={busy || !input.trim()}
            >
              {busy ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      </div>
    </Fragment>
  );
}
