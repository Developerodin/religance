"use client";

import { applyTemplate, useCrm } from "@/shared/crm/store/crm-context";
import { getUserDisplayName } from "@/shared/auth/auth-client";
import type { SendEmailTarget } from "@/shared/crm/send-email/send-email-types";
import type { TemplateVariables } from "@/shared/crm/store/email-templates";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type SendEmailModalProps = {
  target: SendEmailTarget | null;
  onClose: () => void;
};

function templateVarsFromTarget(target: SendEmailTarget): TemplateVariables {
  return {
    company_name: target.companyName ?? "",
    contact_name: target.contactName,
    salt_name: target.matchedSalt ?? "",
    medicine_name: target.matchedMedicine ?? "",
    dosage_form: target.dosageForm ?? "",
    sender_name: getUserDisplayName(),
  };
}

export function SendEmailModal({ target, onClose }: SendEmailModalProps) {
  const {
    emailTemplates,
    sendCrmEmail,
    syncOutlookInbox,
    outlookConnected,
    connectOutlook,
    outlookAccountId,
    outlookEmail,
    setPendingComposeLeadId,
  } = useCrm();
  const [templateId, setTemplateId] = useState(emailTemplates[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const titleId = useId();
  const descId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const updatesLead = Boolean(target?.leadId);

  useEffect(() => {
    if (!target || emailTemplates.length === 0) return;
    const tpl = emailTemplates[0];
    const vars = templateVarsFromTarget(target);
    setTemplateId(tpl.id);
    setSubject(applyTemplate(tpl.subject, vars));
    setBody(applyTemplate(tpl.body, vars));
  }, [target, emailTemplates]);

  useEffect(() => {
    if (!target) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [target, busy, onClose]);

  if (!target || typeof document === "undefined") return null;

  const applySelectedTemplate = (id: string) => {
    const tpl = emailTemplates.find((t) => t.id === id);
    if (!tpl) return;
    const vars = templateVarsFromTarget(target);
    setTemplateId(id);
    setSubject(applyTemplate(tpl.subject, vars));
    setBody(applyTemplate(tpl.body, vars));
  };

  const canSend = Boolean(subject.trim() && body.trim() && target.contactEmail.trim());

  const handleConnect = async () => {
    setBusy(true);
    try {
      await connectOutlook();
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    if (!canSend || busy) return;
    if (!outlookConnected) {
      await handleConnect();
      return;
    }
    setBusy(true);
    setSendError(null);
    try {
      const error = await sendCrmEmail({
        leadId: target.leadId ?? null,
        toEmail: target.contactEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
      });
      if (error) {
        setSendError(error);
        return;
      }
      void syncOutlookInbox(outlookAccountId, outlookEmail, { background: true });
      setPendingComposeLeadId(null);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="send-email-overlay" role="presentation">
      <button
        type="button"
        className="send-email-overlay__scrim"
        aria-label="Close dialog"
        onClick={busy ? undefined : onClose}
        tabIndex={-1}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="send-email-overlay__dialog"
      >
        <header className="send-email-overlay__header">
          <div className="send-email-overlay__heading">
            <p className="send-email-overlay__eyebrow">Lead outreach</p>
            <h2 id={titleId} className="send-email-overlay__title">
              Send email
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="send-email-overlay__close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <i className="ri-close-line" aria-hidden />
          </button>
        </header>

        <div className="send-email-overlay__body">
          {!outlookConnected && (
            <div className="send-email-overlay__notice" role="status">
              <span className="send-email-overlay__notice-icon" aria-hidden>
                <i className="ri-mail-settings-line" />
              </span>
              <div className="send-email-overlay__notice-copy">
                <p className="send-email-overlay__notice-title">Outlook not connected</p>
                <p className="send-email-overlay__notice-text">
                  Connect your mailbox to send this email
                  {updatesLead ? " and log it to the lead timeline." : "."}
                </p>
              </div>
            </div>
          )}

          {sendError && (
            <div className="send-email-overlay__notice" role="alert">
              <span className="send-email-overlay__notice-icon" aria-hidden>
                <i className="ri-error-warning-line" />
              </span>
              <div className="send-email-overlay__notice-copy">
                <p className="send-email-overlay__notice-title">Could not send</p>
                <p className="send-email-overlay__notice-text">{sendError}</p>
              </div>
            </div>
          )}

          <div className="send-email-overlay__recipient">
            <span className="send-email-overlay__recipient-label">To</span>
            <div className="send-email-overlay__recipient-value">
              <strong>{target.contactName}</strong>
              <span className="send-email-overlay__recipient-email">
                {target.contactEmail}
              </span>
            </div>
          </div>

          <div className="send-email-overlay__field">
            <label htmlFor="send-email-template" className="send-email-overlay__label">
              Template
            </label>
            <select
              id="send-email-template"
              className="send-email-overlay__input send-email-overlay__select"
              value={templateId}
              onChange={(e) => applySelectedTemplate(e.target.value)}
              disabled={busy}
            >
              {emailTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="send-email-overlay__field">
            <label htmlFor="send-email-subject" className="send-email-overlay__label">
              Subject
            </label>
            <input
              id="send-email-subject"
              type="text"
              className="send-email-overlay__input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={busy}
              placeholder="Email subject"
            />
          </div>

          <div className="send-email-overlay__field send-email-overlay__field--grow">
            <label htmlFor="send-email-body" className="send-email-overlay__label">
              Message
            </label>
            <textarea
              id="send-email-body"
              className="send-email-overlay__textarea"
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
              placeholder="Write your message…"
            />
          </div>

          <p id={descId} className="send-email-overlay__hint">
            Sends via your connected Outlook mailbox
            {updatesLead
              ? ", then updates the lead stage and timeline."
              : ". Link this contact to a lead to track stage and timeline."}
          </p>
        </div>

        <footer className="send-email-overlay__footer">
          <button
            type="button"
            className="ti-btn ti-btn-light send-email-overlay__btn"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>

          {!outlookConnected ? (
            <button
              type="button"
              className="ti-btn ti-btn-primary send-email-overlay__btn send-email-overlay__btn--primary"
              onClick={handleConnect}
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="send-email-overlay__spinner" aria-hidden />
                  Connecting…
                </>
              ) : (
                <>
                  <i className="ri-microsoft-line me-1" aria-hidden />
                  Connect Outlook
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="ti-btn ti-btn-primary send-email-overlay__btn send-email-overlay__btn--primary"
              onClick={handleSend}
              disabled={!canSend || busy}
            >
              {busy ? (
                <>
                  <span className="send-email-overlay__spinner" aria-hidden />
                  Sending…
                </>
              ) : (
                <>
                  <i className="ri-mail-send-line me-1" aria-hidden />
                  {updatesLead ? "Send & update stage" : "Send email"}
                </>
              )}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body
  );
}
