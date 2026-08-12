"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

type ComposeDraft = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string; // HTML
};
type ComposeTemplateOption = { id: string; name: string; category: string };

export type ComposeAttachment = {
  name: string;
  contentType: string;
  contentBytes: string; // base64, no data: prefix
  size: number;
};

// Graph sendMail request cap is ~4MB; keep raw file total under 3MB.
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

const FORMAT_ACTIONS: { command: string; icon: string; label: string; stateful: boolean }[] = [
  { command: "bold", icon: "ri-bold", label: "Bold", stateful: true },
  { command: "italic", icon: "ri-italic", label: "Italic", stateful: true },
  { command: "underline", icon: "ri-underline", label: "Underline", stateful: true },
  { command: "insertUnorderedList", icon: "ri-list-unordered", label: "Bulleted list", stateful: true },
  { command: "insertOrderedList", icon: "ri-list-ordered", label: "Numbered list", stateful: true },
  { command: "removeFormat", icon: "ri-format-clear", label: "Clear formatting", stateful: false },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function InboxCompose({
  open,
  onClose,
  draft,
  templates,
  selectedTemplateId,
  onTemplateChange,
  onDraftChange,
  onToBlur,
  attachments,
  onAttachmentsChange,
  onSend,
  sending,
  sendError,
}: {
  open: boolean;
  onClose: () => void;
  draft: ComposeDraft;
  templates: ComposeTemplateOption[];
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  onDraftChange: (patch: Partial<ComposeDraft>) => void;
  onToBlur?: () => void;
  attachments: ComposeAttachment[];
  onAttachmentsChange: (attachments: ComposeAttachment[]) => void;
  onSend: () => void;
  sending?: boolean;
  sendError?: string | null;
}) {
  const templateFieldId = useId();
  const toFieldId = useId();
  const ccFieldId = useId();
  const bccFieldId = useId();
  const subjectFieldId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setShowCc(false);
      setShowBcc(false);
      setAttachError(null);
      setDragOver(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, sending]);

  // A field with content must never be hidden behind its toggle.
  useEffect(() => {
    if (draft.cc) setShowCc(true);
    if (draft.bcc) setShowBcc(true);
  }, [draft.cc, draft.bcc]);

  // Push external body changes (template apply/reset) into the editor without
  // clobbering the caret while the user types (innerHTML matches then).
  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (el && el.innerHTML !== draft.body) el.innerHTML = draft.body;
  }, [open, draft.body]);

  const refreshFormats = useCallback(() => {
    const next = new Set<string>();
    for (const action of FORMAT_ACTIONS) {
      if (!action.stateful) continue;
      try {
        if (document.queryCommandState(action.command)) next.add(action.command);
      } catch {
        /* unsupported command — leave inactive */
      }
    }
    setActiveFormats(next);
  }, []);

  if (!open) return null;

  const bodyText = draft.body
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
  const canSend =
    draft.to.trim() && draft.subject.trim() && bodyText && !sending;

  const syncBody = () => {
    onDraftChange({ body: bodyRef.current?.innerHTML ?? "" });
  };

  const applyFormat = (command: string) => {
    bodyRef.current?.focus();
    document.execCommand(command);
    syncBody();
    refreshFormats();
  };

  const handleFiles = async (files: FileList | File[] | null) => {
    const list = files ? Array.from(files) : [];
    if (!list.length) return;
    setAttachError(null);
    const next = [...attachments];
    for (const file of list) {
      const total = next.reduce((sum, att) => sum + att.size, 0) + file.size;
      if (total > MAX_ATTACHMENT_BYTES) {
        setAttachError("Attachments must stay under 3 MB combined.");
        break;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      }).catch(() => null);
      if (!dataUrl) {
        setAttachError(`Could not read "${file.name}".`);
        continue;
      }
      next.push({
        name: file.name,
        contentType: file.type || "application/octet-stream",
        contentBytes: dataUrl.split(",")[1] ?? "",
        size: file.size,
      });
    }
    onAttachmentsChange(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachError(null);
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <div
      className="crm-inbox-compose"
      role="dialog"
      aria-modal="true"
      aria-label="Compose email"
    >
      <div className="crm-inbox-compose-backdrop" onClick={onClose} aria-hidden />
      <div className="crm-inbox-compose-panel">
        <div className="crm-inbox-compose-header">
          <div className="min-w-0">
            <p className="crm-inbox-compose-eyebrow">New message</p>
            <h3 className="crm-inbox-compose-title">Compose email</h3>
          </div>
          <button
            type="button"
            className="crm-inbox-compose-close"
            onClick={onClose}
            aria-label="Close compose"
          >
            <i className="ri-close-line" aria-hidden />
          </button>
        </div>

        <div className="crm-inbox-compose-fields">
          <div className="crm-inbox-compose-row">
            <label htmlFor={templateFieldId} className="crm-inbox-compose-label">
              Template
            </label>
            <select
              id={templateFieldId}
              className="crm-inbox-compose-input crm-inbox-compose-select"
              value={selectedTemplateId}
              onChange={(e) => onTemplateChange(e.target.value)}
            >
              <option value="">No template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.category})
                </option>
              ))}
            </select>
          </div>
          <div className="crm-inbox-compose-row">
            <label htmlFor={toFieldId} className="crm-inbox-compose-label">
              To
            </label>
            <div className="crm-inbox-compose-to-wrap">
              <input
                id={toFieldId}
                type="email"
                className="crm-inbox-compose-input"
                value={draft.to}
                onChange={(e) => onDraftChange({ to: e.target.value })}
                onBlur={onToBlur}
                placeholder="contact@pharma.com"
              />
              {(!showCc || !showBcc) && (
                <span className="crm-inbox-compose-reveals">
                  {!showCc && (
                    <button
                      type="button"
                      className="crm-inbox-compose-reveal"
                      onClick={() => setShowCc(true)}
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      type="button"
                      className="crm-inbox-compose-reveal"
                      onClick={() => setShowBcc(true)}
                    >
                      Bcc
                    </button>
                  )}
                </span>
              )}
            </div>
          </div>
          {showCc && (
            <div className="crm-inbox-compose-row">
              <label htmlFor={ccFieldId} className="crm-inbox-compose-label">
                Cc
              </label>
              <input
                id={ccFieldId}
                type="text"
                className="crm-inbox-compose-input"
                value={draft.cc}
                onChange={(e) => onDraftChange({ cc: e.target.value })}
                placeholder="Separate addresses with commas"
                autoFocus={!draft.cc}
              />
            </div>
          )}
          {showBcc && (
            <div className="crm-inbox-compose-row">
              <label htmlFor={bccFieldId} className="crm-inbox-compose-label">
                Bcc
              </label>
              <input
                id={bccFieldId}
                type="text"
                className="crm-inbox-compose-input"
                value={draft.bcc}
                onChange={(e) => onDraftChange({ bcc: e.target.value })}
                placeholder="Separate addresses with commas"
                autoFocus={!draft.bcc}
              />
            </div>
          )}
          <div className="crm-inbox-compose-row">
            <label htmlFor={subjectFieldId} className="crm-inbox-compose-label">
              Subject
            </label>
            <input
              id={subjectFieldId}
              type="text"
              className="crm-inbox-compose-input"
              value={draft.subject}
              onChange={(e) => onDraftChange({ subject: e.target.value })}
              placeholder="e.g. Re: API supply enquiry"
            />
          </div>
          <div className="crm-inbox-compose-body-wrap">
            <div
              className={`crm-inbox-compose-editor-group${dragOver ? " is-dragover" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void handleFiles(e.dataTransfer.files);
              }}
            >
              <div
                className="crm-inbox-compose-toolbar"
                role="toolbar"
                aria-label="Formatting"
              >
                {FORMAT_ACTIONS.map((action) => (
                  <button
                    key={action.command}
                    type="button"
                    className={`crm-inbox-compose-tool${
                      activeFormats.has(action.command) ? " is-active" : ""
                    }`}
                    title={action.label}
                    aria-label={action.label}
                    aria-pressed={action.stateful ? activeFormats.has(action.command) : undefined}
                    // preventDefault keeps focus (and selection) in the editor
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFormat(action.command)}
                  >
                    <i className={action.icon} aria-hidden />
                  </button>
                ))}
              </div>
              <div
                ref={bodyRef}
                className="crm-inbox-compose-body crm-inbox-compose-editor"
                contentEditable
                role="textbox"
                aria-multiline="true"
                aria-label="Message"
                data-placeholder="Write your message…"
                onInput={syncBody}
                onBlur={syncBody}
                onKeyUp={refreshFormats}
                onMouseUp={refreshFormats}
                onFocus={refreshFormats}
              />
              {attachments.length > 0 && (
                <div className="crm-inbox-compose-attachments">
                  {attachments.map((att, index) => (
                    <span
                      key={`${att.name}-${index}`}
                      className="crm-inbox-compose-attachment"
                    >
                      <i className="ri-attachment-2" aria-hidden />
                      <span className="crm-inbox-compose-attachment-name">
                        {att.name}
                      </span>
                      <span className="crm-inbox-compose-attachment-size">
                        {formatSize(att.size)}
                      </span>
                      <button
                        type="button"
                        className="crm-inbox-compose-attachment-remove"
                        onClick={() => removeAttachment(index)}
                        aria-label={`Remove ${att.name}`}
                      >
                        <i className="ri-close-line" aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {dragOver && (
                <div className="crm-inbox-compose-drop-hint" aria-hidden>
                  <i className="ri-attachment-2" /> Drop files to attach
                </div>
              )}
            </div>
            {attachError && (
              <p className="crm-inbox-compose-attach-error" role="alert">
                {attachError}
              </p>
            )}
          </div>
        </div>

        {sendError && (
          <div className="crm-inbox-compose-error" role="alert">
            <i className="ri-error-warning-fill" aria-hidden />
            {sendError}
          </div>
        )}

        <div className="crm-inbox-compose-footer">
          <button
            type="button"
            className="crm-inbox-compose-btn crm-inbox-compose-btn--secondary"
            onClick={onClose}
          >
            Discard
          </button>
          <div className="crm-inbox-compose-footer-actions">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <button
              type="button"
              className="crm-inbox-compose-btn crm-inbox-compose-btn--ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="ri-attachment-2" aria-hidden />
              Attach files
            </button>
            <button
              type="button"
              className="crm-inbox-compose-btn crm-inbox-compose-btn--primary"
              disabled={!canSend}
              onClick={onSend}
            >
              <i className="ri-send-plane-fill" aria-hidden />
              {sending ? "Sending…" : "Send email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
