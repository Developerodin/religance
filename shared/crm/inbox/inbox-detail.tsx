"use client";

import { useState } from "react";
import { companyInitials } from "@/shared/crm/active-leads/active-leads-utils";
import LeadStageBadge from "@/shared/crm/active-leads/lead-stage-badge";
import type {
  CrmCompany,
  CrmEmail,
  CrmEmailAttachment,
  CrmLead,
} from "@/shared/crm/store/types";
import { ConfirmDeleteOverlay } from "@/shared/crm/ui/confirm-delete-overlay";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { InboxAvatar } from "./inbox-avatar";
import { REPLY_TOOLBAR_GROUPS } from "./inbox-constants";
import { InboxOverflowMenu } from "./inbox-overflow-menu";
import { parseEmailBody } from "./inbox-utils";
import type { InboxRowMeta } from "./inbox-list";

function formatAttachmentSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentIcon(mimeType: string): string {
  if (mimeType.includes("pdf")) return "ri-file-pdf-line text-danger";
  if (mimeType.startsWith("image/")) return "ri-image-line text-info";
  if (mimeType.includes("sheet") || mimeType.includes("excel"))
    return "ri-file-excel-line text-success";
  if (mimeType.includes("word")) return "ri-file-word-line text-primary";
  return "ri-file-line";
}

function formatDetailDate(sentAt: string): string {
  const d = new Date(sentAt);
  if (Number.isNaN(d.getTime())) return sentAt;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InboxDetailPanel({
  active,
  meta,
  mailboxDisplayName: _mailboxDisplayName,
  outlookConnected,
  starred,
  onToggleStar,
  onMarkUnread,
  onArchive,
  onUnarchive,
  onDelete,
  isArchived = false,
  isTrashed = false,
  replyText,
  onReplyChange,
  onSendReply,
  replyMode,
  onReplyModeChange,
  forwardTo,
  onForwardToChange,
  onDownloadAttachment,
  sending,
  sentFlash,
  sendError,
  leads,
  companies,
  suggested,
  suggestedCompany,
  onLinkLead,
  onUnlinkLead,
}: {
  active: CrmEmail;
  meta: InboxRowMeta & { lead?: CrmLead };
  mailboxDisplayName?: string | null;
  outlookConnected: boolean;
  starred: boolean;
  onToggleStar: () => void;
  onMarkUnread: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  isArchived?: boolean;
  isTrashed?: boolean;
  replyText: string;
  onReplyChange: (v: string) => void;
  onSendReply: () => void;
  replyMode: "reply" | "replyAll" | "forward";
  onReplyModeChange: (mode: "reply" | "replyAll" | "forward") => void;
  forwardTo: string;
  onForwardToChange: (v: string) => void;
  onDownloadAttachment: (att: CrmEmailAttachment) => void;
  sending?: boolean;
  sentFlash?: boolean;
  sendError?: string | null;
  leads: CrmLead[];
  companies: CrmCompany[];
  suggested: CrmLead | null;
  suggestedCompany: CrmCompany | null | undefined;
  onLinkLead: (leadId: string) => void;
  onUnlinkLead: () => void;
}) {
  const [pendingLinkLeadId, setPendingLinkLeadId] = useState<string | null>(
    null
  );
  const [pendingUnlink, setPendingUnlink] = useState(false);

  const pendingLinkLead = pendingLinkLeadId
    ? leads.find((l) => l.id === pendingLinkLeadId) ?? null
    : null;
  const pendingLinkCompany = pendingLinkLead
    ? companies.find((c) => c.id === pendingLinkLead.companyId)
    : null;
  const pendingLinkLabel = pendingLinkLead
    ? pendingLinkCompany
      ? `${pendingLinkCompany.name} — ${pendingLinkLead.title}`
      : pendingLinkLead.title
    : "";
  const company =
    meta.lead && companies.find((c) => c.id === meta.lead!.companyId);
  const linkedLeadLabel =
    meta.lead && company
      ? `${company.name} — ${meta.lead.title}`
      : meta.lead?.title ?? "";

  const bodyParts = parseEmailBody(active.body);
  const attachments = active.attachments ?? [];
  const attachmentsTotal = attachments.reduce((sum, a) => sum + (a.size || 0), 0);

  return (
    <section className="crm-inbox-detail">
      <div className="crm-inbox-detail-top">
        <div className="crm-inbox-detail-sender">
          <InboxAvatar name={meta.from} size="lg" />
          <div>
            <p className="crm-inbox-detail-from">{meta.from}</p>
            <p className="crm-inbox-detail-email">{meta.peer}</p>
          </div>
        </div>
        <div className="crm-inbox-detail-actions">
          <button
            type="button"
            className={`crm-inbox-icon-btn ${starred ? "is-active" : ""}`}
            onClick={onToggleStar}
            title="Star"
          >
            <i className={starred ? "ri-star-fill" : "ri-star-line"}></i>
          </button>
          <button
            type="button"
            className="crm-inbox-icon-btn"
            onClick={isArchived || isTrashed ? onUnarchive : onArchive}
            title={isArchived || isTrashed ? "Move to Inbox" : "Archive"}
            aria-label={isArchived || isTrashed ? "Move to Inbox" : "Archive"}
          >
            <i
              className={
                isArchived || isTrashed
                  ? "ri-inbox-unarchive-line"
                  : "ri-archive-line"
              }
            ></i>
          </button>
          <button
            type="button"
            className="crm-inbox-icon-btn"
            onClick={onMarkUnread}
            title="Mark unread"
          >
            <i className="ri-time-line"></i>
          </button>
          <button
            type="button"
            className="crm-inbox-icon-btn"
            onClick={onDelete}
            title="Delete"
          >
            <i className="ri-delete-bin-line"></i>
          </button>
          <button
            type="button"
            className="crm-inbox-icon-btn"
            title="Reply all"
            aria-pressed={replyMode === "replyAll"}
            onClick={() =>
              onReplyModeChange(replyMode === "replyAll" ? "reply" : "replyAll")
            }
          >
            <i
              className={
                replyMode === "replyAll"
                  ? "ri-reply-all-fill"
                  : "ri-reply-all-line"
              }
            ></i>
          </button>
          <InboxOverflowMenu
            items={[
              {
                id: "unread",
                label: "Mark as unread",
                icon: "ri-mail-unread-line",
                onClick: onMarkUnread,
              },
              ...(isArchived || isTrashed
                ? [
                    {
                      id: "unarchive",
                      label: "Move to Inbox",
                      icon: "ri-inbox-unarchive-line",
                      onClick: onUnarchive,
                    },
                  ]
                : [
                    {
                      id: "archive",
                      label: "Archive",
                      icon: "ri-archive-line",
                      onClick: onArchive,
                    },
                  ]),
              {
                id: "delete",
                label: isTrashed ? "Delete permanently" : "Move to Deleted Items",
                icon: "ri-delete-bin-line",
                onClick: onDelete,
                destructive: true,
              },
            ]}
            ariaLabel="Message actions"
          />
        </div>
      </div>

      <div className="crm-inbox-detail-subject-row">
        <h1 className="crm-inbox-detail-subject">{active.subject}</h1>
        <time className="crm-inbox-detail-datetime">
          {formatDetailDate(active.sentAt)}
        </time>
      </div>

      {active.outlookCategories && active.outlookCategories.length > 0 ? (
        <div className="crm-inbox-detail-categories">
          {active.outlookCategories.map((category) => (
            <span key={category} className="crm-inbox-detail-category">
              {category}
            </span>
          ))}
        </div>
      ) : null}

      <div className="crm-inbox-detail-scroll">
        {meta.lead && company && (
          <div className="crm-inbox-lead-context">
            <div className="crm-inbox-lead-context-main">
              <div className="crm-inbox-lead-context-avatar">
                {companyInitials(company.name)}
              </div>
              <div className="crm-inbox-lead-context-body">
                <p className="crm-inbox-lead-context-company">{company.name}</p>
                <p className="crm-inbox-lead-context-title">{meta.lead.title}</p>
              </div>
            </div>
            <div className="crm-inbox-lead-context-actions">
              <button
                type="button"
                className="crm-inbox-lead-context-remove"
                aria-label="Remove linked lead"
                onClick={() => setPendingUnlink(true)}
              >
                <i className="ri-close-line" aria-hidden />
              </button>
              <LeadStageBadge stage={meta.lead.stage} compact />
              <Link
                href={`/active-leads?lead=${meta.lead.id}`}
                className="crm-inbox-open-lead-btn"
                aria-label={`Open lead: ${meta.lead.title}`}
              >
                Open lead
                <i className="ri-arrow-right-up-line" aria-hidden />
              </Link>
            </div>
          </div>
        )}

        {!active.leadId && outlookConnected && (
          <div className="crm-inbox-link-banner">
            <i className="ri-link-unlink-m"></i>
            <div>
              <strong>Link to a lead</strong>
              {suggested && suggestedCompany ? (
                <p>
                  Suggested: {suggestedCompany.name} — {suggested.title}
                </p>
              ) : (
                <p>Track pipeline and follow-ups after linking.</p>
              )}
              <div className="crm-inbox-link-banner-actions">
                <select
                  className="form-select form-select-sm"
                  defaultValue=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) setPendingLinkLeadId(id);
                    e.target.value = "";
                  }}
                >
                  <option value="">Choose lead…</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
                {suggested && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setPendingLinkLeadId(suggested.id)}
                  >
                    Use suggestion
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <article className="crm-inbox-message-card">
          {bodyParts.length === 0 ? (
            <p className="crm-inbox-message-empty">No message content.</p>
          ) : (
            bodyParts.map((part, i) => (
              <p
                key={i}
                className={
                  part.type === "greeting"
                    ? "crm-inbox-message-greeting"
                    : part.type === "signoff"
                      ? "crm-inbox-message-signoff"
                      : part.type === "cta"
                        ? "crm-inbox-message-cta"
                        : "crm-inbox-message-paragraph"
                }
              >
                {part.text}
              </p>
            ))
          )}
        </article>

        {attachments.length > 0 && (
          <div className="crm-inbox-attachments">
            <div className="crm-inbox-attachments-head">
              <span>
                <i className="ri-attachment-2 me-1"></i>
                Attachments{" "}
                {attachmentsTotal > 0 &&
                  `(${formatAttachmentSize(attachmentsTotal)})`}
              </span>
            </div>
            <div className="crm-inbox-attachment-grid">
              {attachments.map((att, i) => (
                <button
                  type="button"
                  key={`${att.messageId ?? ""}-${att.attachmentId ?? i}`}
                  className="crm-inbox-attachment-card"
                  onClick={() => onDownloadAttachment(att)}
                  disabled={!att.attachmentId || !att.messageId}
                  title={`Download ${att.filename}`}
                >
                  <i className={attachmentIcon(att.mimeType)}></i>
                  <div className="crm-inbox-attachment-meta">
                    <p className="crm-inbox-attachment-name" title={att.filename}>
                      {att.filename}
                    </p>
                    <span>{formatAttachmentSize(att.size)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      <footer className="crm-inbox-reply">
        {sentFlash && (
          <div className="crm-inbox-sent-toast" role="status">
            <i className="ri-checkbox-circle-fill"></i>
            Message sent successfully
          </div>
        )}
        {sendError && (
          <div className="crm-inbox-sent-toast !bg-danger/10 !text-danger" role="alert">
            <i className="ri-error-warning-fill"></i>
            {sendError}
          </div>
        )}
        <div className="crm-inbox-reply-card">
          <div className="crm-inbox-reply-label-row">
            <button type="button" className="crm-inbox-toolbar-btn" aria-label="Back">
              <i className="ri-arrow-left-line"></i>
            </button>
            <span className="crm-inbox-reply-label">
              {replyMode === "forward"
                ? "Forward :"
                : replyMode === "replyAll"
                  ? "Reply all :"
                  : "Reply :"}
            </span>
          </div>
          <div className="crm-inbox-reply-toolbar">
            {REPLY_TOOLBAR_GROUPS.map((group, gi) =>
              group.type === "select" ? (
                <select
                  key={gi}
                  className="crm-inbox-toolbar-select"
                  defaultValue={group.options[0]}
                  aria-label="Text style"
                >
                  {group.options.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                group.icons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className="crm-inbox-toolbar-btn"
                  >
                    <i className={icon}></i>
                  </button>
                ))
              )
            )}
          </div>
          {replyMode === "forward" && (
            <input
              type="email"
              value={forwardTo}
              onChange={(e) => onForwardToChange(e.target.value)}
              disabled={!outlookConnected}
              placeholder="Forward to (email address)"
              className="crm-inbox-reply-input"
              aria-label="Forward to"
            />
          )}
          <textarea
            value={replyText}
            onChange={(e) => onReplyChange(e.target.value)}
            disabled={!outlookConnected}
            placeholder={
              replyMode === "forward"
                ? "Add a note (optional)…"
                : `Write your reply to ${meta.from}…`
            }
            className="crm-inbox-reply-input"
            rows={6}
          />
          <div className="crm-inbox-reply-actions">
            <div className="crm-inbox-reply-actions-left">
              <button type="button" className="crm-inbox-toolbar-btn">
                <i className="ri-printer-line"></i>
              </button>
              <button type="button" className="crm-inbox-toolbar-btn">
                <i className="ri-folder-transfer-line"></i>
              </button>
              <button type="button" className="crm-inbox-toolbar-btn">
                <i className="ri-refresh-line"></i>
              </button>
            </div>
            <div className="crm-inbox-reply-actions-right">
              <button
                type="button"
                className="crm-inbox-btn-forward"
                onClick={() =>
                  onReplyModeChange(
                    replyMode === "forward" ? "reply" : "forward"
                  )
                }
              >
                {replyMode === "forward" ? "Cancel" : "Forward"}
              </button>
              <button
                type="button"
                className="crm-inbox-btn-reply"
                disabled={
                  !outlookConnected ||
                  sending ||
                  (replyMode === "forward"
                    ? !forwardTo.trim()
                    : !replyText.trim())
                }
                onClick={onSendReply}
              >
                {sending
                  ? "Sending…"
                  : replyMode === "forward"
                    ? "Forward"
                    : replyMode === "replyAll"
                      ? "Reply all"
                      : "Reply"}
              </button>
            </div>
          </div>
        </div>
      </footer>
      </div>

      <ConfirmDeleteOverlay
        open={pendingLinkLeadId !== null}
        title="Link email to lead?"
        entityName={pendingLinkLabel}
        description="This thread will be associated with"
        entitySuffix="for pipeline tracking and follow-ups."
        confirmLabel="Link lead"
        tone="primary"
        onConfirm={() => {
          if (pendingLinkLeadId) onLinkLead(pendingLinkLeadId);
          setPendingLinkLeadId(null);
        }}
        onCancel={() => setPendingLinkLeadId(null)}
      />

      <ConfirmDeleteOverlay
        open={pendingUnlink}
        title="Remove linked lead?"
        entityName={linkedLeadLabel}
        description="This email will no longer be associated with"
        entitySuffix="The lead and email are not deleted."
        confirmLabel="Remove link"
        onConfirm={() => {
          onUnlinkLead();
          setPendingUnlink(false);
        }}
        onCancel={() => setPendingUnlink(false)}
      />
    </section>
  );
}

export function InboxDetailEmpty() {
  return (
    <div className="crm-inbox-detail-empty">
      <span className="crm-inbox-empty-icon">
        <i className="ri-mail-open-line"></i>
      </span>
      <h3>Select a message</h3>
      <p>Pick an email from the list to read and reply.</p>
    </div>
  );
}

export function InboxDetailLoading({ email }: { email?: string | null }) {
  return (
    <div
      className="crm-inbox-detail-empty"
      role="status"
      aria-live="polite"
    >
      <span
        className="spinner-border spinner-border-sm crm-inbox-detail-spinner"
        aria-hidden
      />
      <h3>Loading mailbox</h3>
      <p>{email ? `Syncing ${email}` : "Syncing your latest threads."}</p>
    </div>
  );
}
