"use client";

import { useState } from "react";
import type { PreviewSummary } from "./types";

type WorkflowConfirmCardProps = {
  preview: PreviewSummary;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: () => void;
};

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
  const recipientLabel =
    preview.recipients.length <= 5
      ? preview.recipients.map((r) => r.name || r.email).join(", ")
      : `${preview.recipients.length} recipients`;

  return (
    <div className="box custom-box !mb-0">
      <div className="box-header">
        <h6 className="box-title mb-0 before:!hidden">Confirm recurring email</h6>
      </div>
      <div className="box-body space-y-3">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mb-0 text-[0.8125rem]">
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
            <dt className="text-textmuted mb-0.5">End condition</dt>
            <dd className="mb-0 font-medium">{preview.endLabel}</dd>
          </div>
          <div>
            <dt className="text-textmuted mb-0.5">Mailbox</dt>
            <dd className="mb-0 font-medium">{preview.mailbox || "—"}</dd>
          </div>
          <div>
            <dt className="text-textmuted mb-0.5">Next send</dt>
            <dd className="mb-0 font-medium">
              {formatWhen(preview.nextSendAt, preview.timezone)}
            </dd>
          </div>
        </dl>

        <div>
          <p className="text-textmuted text-[0.75rem] mb-1">Subject preview</p>
          <p className="mb-0 text-[0.8125rem] font-medium">{preview.subjectPreview}</p>
        </div>

        {showEmail ? (
          <div className="rounded-md border border-defaultborder dark:border-defaultborder/10 p-3 bg-white dark:bg-black/20">
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
          {confirming ? "Confirming…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}
