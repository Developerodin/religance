"use client";

import MailHistoryPanel from "@/shared/crm/mail-workflow/MailHistoryPanel";
import WorkflowConfirmCard from "@/shared/crm/mail-workflow/WorkflowConfirmCard";
import {
  clearChat,
  confirmPendingChat,
  getChatSession,
  recordChatSessionUpdate,
  sendChatMessage,
} from "@/shared/crm/mail-workflow/mail-workflow-api";
import type {
  AssistantMessage,
  ChatConfirm,
  ChatMessageExchange,
  ChatResponse,
  MailChatSessionView,
  MailWorkflow,
  WorkflowAction,
} from "@/shared/crm/mail-workflow/types";
import SlashCommandPicker, {
  buildSlashCommandInput,
  filterSlashCommands,
  isSlashPickerOpen,
  resolveSlashCommandInput,
  shouldBlockSlashSubmit,
} from "@/shared/crm/mail-workflow/SlashCommandPicker";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

type ChatRetryPayload = {
  text: string;
  confirm?: ChatConfirm;
  choiceId?: string;
  /** Reused on retry so the server ledger can dedupe instead of re-executing. */
  requestId: string;
};

type ChatItem =
  | { id: string; role: "user"; text: string; status?: "sending" | "complete" }
  | {
      id: string;
      role: "assistant";
      response: ChatResponse;
      status?: "complete";
    }
  | {
      id: string;
      role: "assistant";
      status: "streaming";
      context?: ThinkingContext;
    }
  | {
      id: string;
      role: "assistant";
      status: "error";
      error: string;
      retry?: ChatRetryPayload;
    }
  | { id: string; role: "system"; text: string };

function newId(): string {
  return crypto.randomUUID();
}

function sessionToChatItems(session: MailChatSessionView): ChatItem[] {
  return session.messages.map((m) => {
    if (m.role === "user") {
      return { id: m.id, role: "user" as const, text: m.text };
    }
    if (m.role === "system") {
      return { id: m.id, role: "system" as const, text: m.text };
    }
    return { id: m.id, role: "assistant" as const, response: m.response };
  });
}

function reconcileExchange(
  prev: ChatItem[],
  tempUserId: string | null,
  tempAssistantId: string,
  exchange: ChatMessageExchange
): ChatItem[] {
  let replacedUser = false;
  let replacedAssistant = false;

  const next = prev.flatMap((m) => {
    if (tempUserId && m.id === tempUserId) {
      if (!exchange.user) return [];
      replacedUser = true;
      return [
        {
          id: exchange.user.id,
          role: "user" as const,
          text: exchange.user.text,
          status: "complete" as const,
        },
      ];
    }
    if (m.id === tempAssistantId) {
      replacedAssistant = true;
      return [
        {
          id: exchange.assistant.id,
          role: "assistant" as const,
          response: exchange.assistant.response,
          status: "complete" as const,
        },
      ];
    }
    return [m];
  });

  if (exchange.user && !replacedUser && !next.some((m) => m.id === exchange.user!.id)) {
    next.push({
      id: exchange.user.id,
      role: "user",
      text: exchange.user.text,
      status: "complete",
    });
  }
  if (!replacedAssistant && !next.some((m) => m.id === exchange.assistant.id)) {
    next.push({
      id: exchange.assistant.id,
      role: "assistant",
      response: exchange.assistant.response,
      status: "complete",
    });
  }

  return next;
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

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

type ThinkingContext = { recipient?: string; template?: string };

/**
 * Staged progress while the request is in flight.
 *
 * The assistant's reply is a single JSON object from the model, so there is no prose to
 * stream token-by-token. Naming what is being worked on reads like a person thinking,
 * not like a system trace, and needs no streaming transport.
 */
function thinkingStages(context?: ThinkingContext): string[] {
  const stages = ["Thinking"];
  if (context?.recipient) stages.push(`Checking ${context.recipient}`);
  if (context?.template) stages.push(`Finding the ${context.template} template`);
  if (!context?.recipient && !context?.template) {
    stages.push("Checking your contacts and templates");
  }
  stages.push("Preparing your email");
  return stages;
}

/** Each stage after the first waits this long before appearing. */
const STAGE_DELAY_MS = 1400;

function TypingIndicator({ context }: { context?: ThinkingContext }) {
  const stages = useMemo(() => thinkingStages(context), [context]);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(0);
    const timers = stages
      .slice(1)
      .map((_, i) => window.setTimeout(() => setStage(i + 1), (i + 1) * STAGE_DELAY_MS));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [stages]);

  return (
    <div
      className="rounded-md bg-light/40 dark:bg-black/20 px-3 py-2 text-[0.8125rem] text-textmuted"
      aria-label="Assistant is working"
    >
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex gap-0.5" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
          <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
          <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
        </span>
        <span aria-live="polite">{stages[stage] ?? stages[0]}…</span>
      </span>
    </div>
  );
}

/** Closing beat of the sequence, shown once the preview is actually on screen. */
function ReadyToReview() {
  return (
    <p className="text-[0.75rem] text-success mb-0 inline-flex items-center gap-1">
      <span aria-hidden="true">✓</span> Ready to review
    </p>
  );
}

/**
 * Pull a name / template hint out of what the user just typed so the waiting state can
 * say "Checking Prakhar Sharma" instead of something generic. Best-effort only.
 */
/** Words that end a name — "to Rahul every Monday" must not become "Rahul every". */
const NAME_STOP_WORDS =
  /^(every|each|daily|weekly|monthly|tomorrow|today|at|on|next|once|now|and|about|regarding|re)$/i;
const NOT_A_NAME = /^(the|a|an|it|me|them|him|her|us|everyone|everybody|all|team|list)$/i;

export function thinkingContextFromText(text: string): ThinkingContext | undefined {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 300) return undefined;

  const context: ThinkingContext = {};

  const to = trimmed.match(/\bto\s+(.+)$/i);
  if (to?.[1]) {
    const words = to[1].trim().split(/\s+/);
    const name: string[] = [];
    for (const raw of words) {
      const word = raw.replace(/[^A-Za-z.'-]/g, "");
      if (!word || NAME_STOP_WORDS.test(word)) break;
      if (name.length === 0 && NOT_A_NAME.test(word)) break;
      name.push(word);
      if (name.length === 2) break; // first + last is enough
    }
    if (name.length) context.recipient = name.join(" ");
  }

  const template = trimmed.match(/\b(follow[\s-]?up(?:\s+\d+)?|introduction|quotation|weekly update)\b/i);
  if (template?.[1]) context.template = template[1].toLowerCase().replace(/\s+/g, " ");

  return context.recipient || context.template ? context : undefined;
}

function ConnectInboxLink() {
  return (
    <Link
      href="/inbox/"
      className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0 inline-flex items-center mt-2 cursor-pointer"
    >
      Connect Outlook
    </Link>
  );
}

function AssistantMessageView({
  message,
  busy,
  onSuggestion,
  onChoice,
  onConfirmAction,
}: {
  message: AssistantMessage;
  busy: boolean;
  onSuggestion: (text: string) => void;
  onChoice: (choiceId: string) => void;
  onConfirmAction: (action: AssistantMessage["confirmAction"]) => void;
}) {
  const paragraphs = message.message.split(/\n\n+/);

  return (
    <div className="rounded-md bg-light/40 dark:bg-black/20 px-3 py-2 text-[0.8125rem]">
      <div className="space-y-2 mb-0">
        {paragraphs.map((p, idx) => (
          <p key={idx} className="mb-0 whitespace-pre-wrap">
            {renderInlineMarkdown(p)}
          </p>
        ))}
      </div>

      {message.suggestions?.length ? (
        <div className="mt-3 pt-2 border-t border-defaultborder/30 dark:border-defaultborder/10">
          <p className="text-textmuted text-[0.75rem] mb-1.5">Try:</p>
          <div className="flex flex-wrap gap-1.5">
            {message.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="text-left rounded-full border border-defaultborder/60 dark:border-defaultborder/20 px-3 py-1 text-[0.75rem] bg-white/60 dark:bg-black/30 hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => onSuggestion(s)}
                disabled={busy}
              >
                &ldquo;{s}&rdquo;
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {message.choices?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {message.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              className="text-left rounded-md border border-defaultborder/60 dark:border-defaultborder/20 px-3 py-2 text-[0.8125rem] bg-white/60 dark:bg-black/30 hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onChoice(c.id)}
              disabled={busy}
            >
              <span className="font-medium block">{c.label}</span>
              {c.sublabel ? (
                <span className="text-textmuted text-[0.75rem] block mt-0.5">
                  {c.sublabel}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {message.connectInbox ? <ConnectInboxLink /> : null}

      {message.confirmAction &&
      message.confirmAction.type !== "schedule" &&
      message.confirmAction.workflowId ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={`ti-btn !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0 cursor-pointer disabled:cursor-not-allowed ${
              message.confirmAction.type === "cancel"
                ? "ti-btn-danger"
                : "ti-btn-primary"
            }`}
            onClick={() => onConfirmAction(message.confirmAction)}
            disabled={busy}
          >
            {message.confirmAction.label}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function MailAssistantPage() {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  /** Bumped after a confirmed send so the timeline refetches. */
  const [historyKey, setHistoryKey] = useState(0);
  const [slashHighlight, setSlashHighlight] = useState(0);
  const [slashPickerSuppressed, setSlashPickerSuppressed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inflightRequestRef = useRef(false);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getChatSession();
      if (cancelled) return;
      setLoading(false);
      if (!res.live) {
        setLoadError(res.error);
        return;
      }
      if (res.data.messages.length > 0) {
        setMessages(sessionToChatItems(res.data));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior,
      });
    });
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      stickToBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollToBottom(messages.some((m) => m.role === "assistant" && "status" in m && m.status === "streaming") ? "auto" : "smooth");
  }, [messages, scrollToBottom]);

  const appendError = useCallback(
    (error: string, retry?: ChatRetryPayload) => {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant" as const,
          status: "error" as const,
          error,
          ...(retry ? { retry } : {}),
        },
      ]);
      scrollToBottom();
    },
    [scrollToBottom]
  );

  const handleSubmit = async (
    text: string,
    confirm?: ChatConfirm,
    choiceId?: string,
    retryAssistantId?: string,
    reuseRequestId?: string
  ) => {
    const trimmed = text.trim();
    // Cross-guard with the confirm button: both mutate the same server-side draft,
    // and they used to be able to run at once.
    if ((!trimmed && !choiceId && !confirm) || busy || confirmingId) return;

    if (!confirm && !choiceId && trimmed.startsWith("/")) {
      const pickerOpen = isSlashPickerOpen(text) && !slashPickerSuppressed;
      if (shouldBlockSlashSubmit(text, pickerOpen)) return;
    }

    const outgoing = !confirm && !choiceId && trimmed
      ? resolveSlashCommandInput(trimmed)
      : trimmed;

    if (inflightRequestRef.current) return;
    inflightRequestRef.current = true;

    const requestId = reuseRequestId ?? newId();
    const thinkingContext = thinkingContextFromText(outgoing);
    const showUser = !confirm && !choiceId && Boolean(trimmed);
    const tempUserId = showUser ? newId() : null;
    const tempAssistantId = retryAssistantId ?? newId();

    setBusy(true);
    if (!confirm && !choiceId && trimmed) {
      setInput("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }

    setMessages((prev) => {
      const withoutRetry = retryAssistantId
        ? prev.filter((m) => m.id !== retryAssistantId)
        : prev;
      const next: ChatItem[] = [...withoutRetry];
      if (showUser && tempUserId) {
        next.push({
          id: tempUserId,
          role: "user",
          text: outgoing,
          status: "sending",
        });
      }
      next.push({
        id: tempAssistantId,
        role: "assistant",
        status: "streaming",
        ...(thinkingContext ? { context: thinkingContext } : {}),
      });
      return next;
    });
    stickToBottomRef.current = true;
    scrollToBottom("auto");

    let res:
      | Awaited<ReturnType<typeof sendChatMessage>>
      | null = null;
    try {
      res = await sendChatMessage(
        outgoing || (choiceId ? " " : ""),
        requestId,
        confirm,
        choiceId
      );
    } catch (err) {
      inflightRequestRef.current = false;
      setBusy(false);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong while sending the message.";
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== tempAssistantId)
          .map((m) =>
            tempUserId && m.id === tempUserId && m.role === "user"
              ? { ...m, status: "complete" as const }
              : m
          )
      );
      appendError(message, { text, confirm, choiceId, requestId });
      return;
    }

    inflightRequestRef.current = false;
    setBusy(false);

    if (!res.live) {
      setMessages((prev) =>
        prev.map((m) => {
          if (tempUserId && m.id === tempUserId && m.role === "user") {
            return { ...m, status: "complete" as const };
          }
          if (
            m.id === tempAssistantId &&
            m.role === "assistant" &&
            "status" in m &&
            m.status === "streaming"
          ) {
            return {
              id: tempAssistantId,
              role: "assistant" as const,
              status: "error" as const,
              error: res.error,
              retry: { text, confirm, choiceId, requestId },
            };
          }
          return m;
        })
      );
      scrollToBottom();
      return;
    }

    setMessages((prev) =>
      reconcileExchange(prev, tempUserId, tempAssistantId, res.data.exchange)
    );
    scrollToBottom();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmit(input);
  };

  const slashPickerOpen =
    isSlashPickerOpen(input) && !slashPickerSuppressed;
  const slashOptions = filterSlashCommands(input);
  const slashSubmitBlocked =
    input.trim().startsWith("/") &&
    shouldBlockSlashSubmit(input, slashPickerOpen);

  useEffect(() => {
    setSlashPickerSuppressed(false);
  }, [input]);

  useEffect(() => {
    if (!slashPickerOpen) {
      setSlashHighlight(0);
      return;
    }
    setSlashHighlight((prev) =>
      slashOptions.length ? Math.min(prev, slashOptions.length - 1) : 0
    );
  }, [input, slashPickerOpen, slashOptions.length]);

  const insertSlashCommand = (command: string) => {
    const next = buildSlashCommandInput(input, command);
    setInput(next);
    setSlashHighlight(0);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const end = next.length;
      el.setSelectionRange(end, end);
    });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashPickerOpen && slashOptions.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashHighlight((i) => (i + 1) % slashOptions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashHighlight((i) => (i - 1 + slashOptions.length) % slashOptions.length);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        insertSlashCommand(slashOptions[slashHighlight]?.command ?? slashOptions[0].command);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashPickerSuppressed(true);
        return;
      }
    }

    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    void handleSubmit(input);
  };

  const handleConfirmPreview = async (messageId: string, confirmToken: string) => {
    if (confirmingId || busy) return;
    setConfirmingId(messageId);

    // One canonical confirmation path, shared with a spoken "yes". The token identifies
    // WHICH card was clicked: every preview ever rendered stays on screen and rehydrates
    // on reload, so without it an older card would confirm the current draft instead of
    // the one it displays. Reusing it as the requestId also makes a repeat click replay
    // the first answer through the server's ledger.
    const res = await confirmPendingChat(confirmToken, confirmToken);
    setConfirmingId(null);

    if (!res.live) {
      appendError(res.error);
      return;
    }

    // A confirm is the only thing that actually puts mail in flight, so this is the
    // one place the timeline needs to refetch.
    setHistoryKey((k) => k + 1);

    // Drop the spent preview card and append whatever the server actually decided.
    setMessages((prev) => {
      const withoutPreview = prev.filter((m) => m.id !== messageId);
      const assistant = res.data.exchange.assistant;
      if (withoutPreview.some((m) => m.id === assistant.id)) return withoutPreview;
      return [
        ...withoutPreview,
        {
          id: assistant.id,
          role: "assistant" as const,
          response: assistant.response,
          status: "complete" as const,
        },
      ];
    });
    scrollToBottom();
  };

  const handleDiscardPreview = async (messageId: string) => {
    const sessionRes = await recordChatSessionUpdate({
      requestId: newId(),
      removeMessageIds: [messageId],
      systemText: "Preview discarded.",
      clearDraft: true,
    });
    if (sessionRes.live) {
      setMessages(sessionToChatItems(sessionRes.data));
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "system", text: "Preview discarded." },
    ]);
  };

  const handleEditPreview = () => {
    // The backend leaves awaiting_confirmation on the first content-bearing reply, so
    // whatever the user types here is applied to the SAME draft — not a new workflow.
    setInput("Actually, make it ");
    inputRef.current?.focus();
  };

  const handleConfirmAction = (
    action: AssistantMessage["confirmAction"]
  ) => {
    if (!action?.workflowId) return;
    void handleSubmit("", {
      action: action.type as WorkflowAction,
      workflowId: action.workflowId,
    });
  };

  const handleClearChat = async () => {
    if (busy || messages.length === 0) return;
    setBusy(true);
    const res = await clearChat();
    setBusy(false);
    if (!res.live) {
      appendError(res.error);
      return;
    }
    setMessages([]);
    setInput("");
    setConfirmingId(null);
    inputRef.current?.focus();
  };

  const canClear = messages.length > 0 && !busy;

  return (
    <Fragment>
      <Seo title="Mail assistant" />

      <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 xl:col-span-8 box custom-box !mb-0 flex flex-col min-h-[calc(100vh-10rem)]">
        <div className="box-header">
          <div>
            <h5 className="box-title mb-0 before:!hidden">Mail assistant</h5>
            <p className="text-[0.75rem] text-textmuted mb-0 mt-1">
              Describe a recurring or one-time email in plain language.
            </p>
          </div>
        </div>

        <div
          ref={listRef}
          className="box-body flex-1 overflow-y-auto min-h-[20rem] space-y-4"
          aria-live="polite"
        >
          {loading ? (
            <p className="text-textmuted text-[0.8125rem] mb-0">Loading conversation…</p>
          ) : null}

          {loadError ? (
            <div className="alert alert-warning mb-0" role="alert">
              Could not load your earlier conversation ({loadError}). You can keep
              chatting — history will reappear once the connection recovers.
            </div>
          ) : null}

          {!loading && !loadError && messages.length === 0 ? (
            <div className="flex justify-start">
              <div className="max-w-[85%] min-w-0">
                <AssistantMessageView
                  message={{
                    kind: "assistant_message",
                    message:
                      "Hey! Tell me what you'd like to send, who it's for, and when.",
                    suggestions: [
                      "Send the weekly project update to Rahul every Monday at 10 AM.",
                    ],
                  }}
                  busy={busy}
                  onSuggestion={(s) => void handleSubmit(s)}
                  onChoice={(id) => void handleSubmit("", undefined, id)}
                  onConfirmAction={handleConfirmAction}
                />
              </div>
            </div>
          ) : null}

          {messages.map((item) => {
            if (item.role === "user") {
              return (
                <div key={item.id} className="flex justify-end">
                  <div
                    className={`max-w-[85%] min-w-0 rounded-md bg-primary/10 px-3 py-2 text-[0.8125rem] ${
                      item.status === "sending" ? "opacity-70" : ""
                    }`}
                  >
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

            if (item.role === "assistant") {
              if (item.status === "streaming") {
                return (
                  <div key={item.id} className="flex justify-start">
                    <div className="max-w-[85%] min-w-0">
                      <TypingIndicator context={item.context} />
                    </div>
                  </div>
                );
              }

              if (item.status === "error") {
                return (
                  <div key={item.id} className="flex justify-start">
                    <div className="max-w-[85%] min-w-0 space-y-2">
                      <div className="alert alert-danger mb-0" role="alert">
                        {item.error}
                      </div>
                      {item.retry ? (
                        <button
                          type="button"
                          className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0 cursor-pointer disabled:cursor-not-allowed"
                          onClick={() =>
                            void handleSubmit(
                              item.retry!.text,
                              item.retry!.confirm,
                              item.retry!.choiceId,
                              item.id,
                              item.retry!.requestId
                            )
                          }
                          disabled={busy}
                        >
                          Try again
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              }

              if (!("response" in item)) return null;

              const { response } = item;

            if (response.kind === "assistant_message") {
              return (
                <div key={item.id} className="space-y-3">
                  <div className="flex justify-start">
                    <div className="max-w-[85%] min-w-0">
                      <AssistantMessageView
                        message={response}
                        busy={busy}
                        onSuggestion={(s) => void handleSubmit(s)}
                        onChoice={(id) => void handleSubmit("", undefined, id)}
                        onConfirmAction={handleConfirmAction}
                      />
                    </div>
                  </div>

                  {response.preview ? (
                    <div className="flex justify-start">
                      <ReadyToReview />
                    </div>
                  ) : null}

                  {response.preview ? (
                    <WorkflowConfirmCard
                      preview={response.preview}
                      confirming={confirmingId === item.id}
                      onConfirm={() =>
                        void handleConfirmPreview(
                          item.id,
                          response.preview!.contract.requestId
                        )
                      }
                      onCancel={() => void handleDiscardPreview(item.id)}
                      onEdit={handleEditPreview}
                    />
                  ) : null}

                  {response.workflows?.length && !response.preview ? (
                    <ul className="list-none mb-0 ps-0 space-y-1 text-[0.8125rem]">
                      {response.workflows.map((wf: MailWorkflow) => (
                        <li key={wf.id} className="text-textmuted">
                          {formatNextRun(wf)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            }

            if (response.kind === "preview_summary") {
              return (
                <WorkflowConfirmCard
                  key={item.id}
                  preview={response}
                  confirming={confirmingId === item.id}
                  onConfirm={() =>
                    void handleConfirmPreview(item.id, response.contract.requestId)
                  }
                  onCancel={() => void handleDiscardPreview(item.id)}
                  onEdit={handleEditPreview}
                />
              );
            }

            if (response.kind === "clarification_prompt") {
              return (
                <div key={item.id} className="flex justify-start">
                  <div className="max-w-[85%] min-w-0 rounded-md bg-light/40 dark:bg-black/20 px-3 py-2 text-[0.8125rem]">
                    <p className="mb-0">{response.prompt}</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={item.id} className="flex justify-start">
                <div className="max-w-[85%] min-w-0 rounded-md bg-light/40 dark:bg-black/20 px-3 py-2 text-[0.8125rem]">
                  <p className="mb-0">Done.</p>
                </div>
              </div>
            );
            }

            return null;
          })}
        </div>

        <div className="box-footer border-t border-defaultborder dark:border-defaultborder/10">
          <form onSubmit={handleFormSubmit} className="space-y-2">
            <div className="flex items-end gap-2">
              <div className="relative flex-1">
                <SlashCommandPicker
                  input={input}
                  open={slashPickerOpen}
                  highlightIndex={slashHighlight}
                  onHighlight={setSlashHighlight}
                  onSelect={insertSlashCommand}
                />
                <textarea
                  ref={inputRef}
                  id="mail-assistant-input"
                  className="form-control w-full min-h-[2.75rem] max-h-32 resize-none py-2.5 leading-normal touch-manipulation"
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Type / for commands, or describe a recurring or one-time email…"
                  disabled={busy}
                  aria-label="Message"
                  aria-describedby="mail-assistant-input-hint"
                  aria-expanded={slashPickerOpen && slashOptions.length > 0}
                  aria-autocomplete="list"
                  role="combobox"
                />
              </div>
              <button
                type="button"
                className="ti-btn ti-btn-light !py-2 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0 shrink-0 !min-h-[2.75rem] cursor-pointer disabled:cursor-not-allowed"
                onClick={() => void handleClearChat()}
                disabled={!canClear}
                aria-label="Clear chat"
              >
                Clear
              </button>
              <button
                type="submit"
                className="ti-btn ti-btn-primary !py-2 !px-4 !text-[0.8125rem] !w-auto !h-auto !mb-0 shrink-0 !min-h-[2.75rem] cursor-pointer disabled:cursor-not-allowed"
                disabled={busy || !input.trim() || slashSubmitBlocked}
                aria-busy={busy}
              >
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
            <p
              id="mail-assistant-input-hint"
              className="text-[0.75rem] text-textmuted mb-0"
            >
              Press{" "}
              <kbd className="px-1 py-0.5 rounded bg-light dark:bg-black/20 text-[0.6875rem]">
                Enter
              </kbd>{" "}
              to send ·{" "}
              <kbd className="px-1 py-0.5 rounded bg-light dark:bg-black/20 text-[0.6875rem]">
                Shift
              </kbd>
              +
              <kbd className="px-1 py-0.5 rounded bg-light dark:bg-black/20 text-[0.6875rem]">
                Enter
              </kbd>{" "}
              for a new line · type{" "}
              <kbd className="px-1 py-0.5 rounded bg-light dark:bg-black/20 text-[0.6875rem]">
                /
              </kbd>{" "}
              for commands
            </p>
          </form>
        </div>
      </div>

      <div className="col-span-12 xl:col-span-4">
        <MailHistoryPanel refreshKey={historyKey} />
      </div>
      </div>
    </Fragment>
  );
}
