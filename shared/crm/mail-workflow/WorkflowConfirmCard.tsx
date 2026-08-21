"use client";

import { useEffect, useState } from "react";
import type { PreviewSummary, WorkflowSchedule } from "./types";

/** setTimeout silently fires immediately past this, so anything further out is ignored. */
const MAX_TIMEOUT_MS = 2_147_483_647;

type WorkflowConfirmCardProps = {
  preview: PreviewSummary;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: () => void;
};

function scheduleOf(preview: PreviewSummary): WorkflowSchedule | undefined {
  return preview.contract.schedule;
}

function isOnce(preview: PreviewSummary): boolean {
  return scheduleOf(preview)?.frequency === "once";
}

/** A one-time send whose moment is already here — the button must say "Send Now". */
function isImmediate(preview: PreviewSummary): boolean {
  const schedule = scheduleOf(preview);
  if (schedule?.frequency !== "once") return false;
  const runAt = schedule.runAt ?? preview.contract.oneTimeSendAt;
  if (!runAt) return true;
  const at = new Date(runAt);
  if (Number.isNaN(at.getTime())) return true;
  return at.getTime() <= Date.now() + 60_000;
}

/**
 * True when a one-time card's moment is already behind us. Confirming then sends
 * immediately (a past runAt fires now), so the card must stop advertising a clock time.
 */
export function sendTimeHasPassed(preview: PreviewSummary, now = Date.now()): boolean {
  if (!isOnce(preview)) return false;
  const at = new Date(preview.nextSendAt).getTime();
  return Number.isFinite(at) && at <= now;
}

function confirmLabel(preview: PreviewSummary): string {
  if (!isOnce(preview)) return "Confirm & Schedule";
  return isImmediate(preview) ? "Send Now" : "Send Once";
}

function formatWhen(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export default function WorkflowConfirmCard({
  preview,
  confirming = false,
  onConfirm,
  onCancel,
  onEdit,
}: WorkflowConfirmCardProps) {
  const [showEmail, setShowEmail] = useState(false);
  const once = isOnce(preview);

  // A one-time card left sitting on screen goes stale: it keeps saying "Send Once" and
  // "Sends at 10:14" long after 10:14, while confirming it actually sends immediately —
  // a past runAt fires now. One exact timer, no polling, self-terminating.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!once) return;
    const ms = new Date(preview.nextSendAt).getTime() - Date.now();
    if (!Number.isFinite(ms) || ms <= 0 || ms > MAX_TIMEOUT_MS) return;
    const timer = window.setTimeout(() => tick((n) => n + 1), ms + 500);
    return () => window.clearTimeout(timer);
  }, [once, preview.nextSendAt]);

  const sendTimePassed = sendTimeHasPassed(preview);
  const label = confirmLabel(preview);
  const pendingLabel = label.startsWith("Send") ? "Sending…" : "Scheduling…";
  const recipientLabel =
    preview.recipients.length <= 5
      ? preview.recipients.map((r) => r.name || r.email).join(", ")
      : `${preview.recipients.length} recipients`;

  return (
    <div className="box custom-box !mb-0">
      <div className="box-header">
        <h6 className="box-title mb-0 before:!hidden">
          {once ? "Confirm one-time email" : "Confirm recurring email"}
        </h6>
      </div>
      <div className="box-body space-y-3">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mb-0 text-[0.8125rem]">
          <div>
            <dt className="text-textmuted mb-0.5">Action</dt>
            <dd className="mb-0 font-medium">
              {once
                ? isImmediate(preview)
                  ? "Send once, immediately"
                  : "Send once, at a set time"
                : "Send on a repeating schedule"}
            </dd>
          </div>
          <div>
            <dt className="text-textmuted mb-0.5">Template</dt>
            <dd className="mb-0 font-medium">{preview.templateName}</dd>
          </div>
          <div>
            <dt className="text-textmuted mb-0.5">Recipients</dt>
            <dd className="mb-0 font-medium">{recipientLabel}</dd>
          </div>
          <div>
            <dt className="text-textmuted mb-0.5">Schedule</dt>
            <dd className="mb-0 font-medium">
              {preview.scheduleLabel} ({preview.timezone})
            </dd>
          </div>
          <div>
            <dt className="text-textmuted mb-0.5">
              {once ? "Sends at" : "First send"}
            </dt>
            <dd className="mb-0 font-medium">
              {sendTimePassed ? (
                <>
                  Immediately
                  <span className="text-textmuted font-normal">
                    {" "}
                    — {formatWhen(preview.nextSendAt, preview.timezone)} has passed
                  </span>
                </>
              ) : (
                formatWhen(preview.nextSendAt, preview.timezone)
              )}
            </dd>
          </div>
          <div>
            <dt className="text-textmuted mb-0.5">End condition</dt>
            <dd className="mb-0 font-medium">{preview.endLabel}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-textmuted mb-0.5">Sending account</dt>
            <dd className="mb-0 font-medium">
              {preview.mailbox || "Not connected — connect Outlook to send"}
            </dd>
          </div>
        </dl>

        <div>
          <p className="text-textmuted text-[0.75rem] mb-1">
            Subject
            {/*
              The backend renders the preview against the first recipient only, so with
              several recipients this is a sample, not the whole picture — say so rather
              than letting "3 recipients" sit above one person's substituted values.
            */}
            {preview.recipients.length > 1 && preview.recipients[0] ? (
              <span>
                {" "}
                — sample for {preview.recipients[0].name || preview.recipients[0].email}
                ; each recipient gets their own version
              </span>
            ) : null}
          </p>
          <p className="mb-0 text-[0.8125rem] font-medium">{preview.subjectPreview}</p>
        </div>

        {showEmail ? (
          <div className="rounded-md border border-defaultborder dark:border-defaultborder/10 p-3 bg-white dark:bg-black/20">
            {/*
              Safe: bodyPreviewHtml is produced by the backend's render.ts, which escapes
              both the plain-text template body and every substituted CRM value. The only
              markup it emits is its own <p>/<br>.
            */}
            <div
              className="text-[0.8125rem] prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: preview.bodyPreviewHtml }}
            />
          </div>
        ) : null}
      </div>
      <div className="box-footer flex flex-wrap gap-2">
        <button
          type="button"
          className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0"
          onClick={() => setShowEmail((v) => !v)}
          aria-expanded={showEmail}
        >
          {showEmail ? "Hide email" : "Preview email"}
        </button>
        <button
          type="button"
          className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0"
          onClick={onEdit}
          disabled={confirming}
        >
          Edit
        </button>
        <button
          type="button"
          className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0 ms-auto"
          onClick={onCancel}
          disabled={confirming}
        >
          Cancel
        </button>
        <button
          type="button"
          className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0"
          onClick={onConfirm}
          disabled={confirming}
        >
          {confirming ? pendingLabel : label}
        </button>
      </div>
    </div>
  );
}
