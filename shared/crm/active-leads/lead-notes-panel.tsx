"use client";

import {
  normalizeNoteBody,
  notePreview,
} from "@/shared/crm/active-leads/lead-notes";
import { leadEditHref } from "@/shared/crm/active-leads/active-leads-utils";
import { formatCrmDateTime } from "@/shared/crm/inbox/inbox-utils";
import { useCrm } from "@/shared/crm/store/crm-context";
import type { CrmLead, CrmLeadNote } from "@/shared/crm/store/types";
import { ConfirmDeleteOverlay } from "@/shared/crm/ui/confirm-delete-overlay";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type OverlayMode = { kind: "add" } | { kind: "edit"; note: CrmLeadNote };

type LeadNotesPanelProps = {
  lead: CrmLead;
};

export function LeadNotesPanel({ lead }: LeadNotesPanelProps) {
  const { getLeadNotes, addLeadNote, updateLeadNote, deleteLeadNote } =
    useCrm();
  const notes = getLeadNotes(lead.id);
  const [overlay, setOverlay] = useState<OverlayMode | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CrmLeadNote | null>(null);
  const titleId = useId();
  const bodyId = useId();
  const errorId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const legacyNotes = lead.notes.trim();
  const canSave = Boolean(normalizeNoteBody(draft)) && !saving;

  useEffect(() => {
    if (!overlay) return;
    setDraft(overlay.kind === "edit" ? overlay.note.body : "");
    setError(null);
    setSaving(false);
    const t = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [overlay]);

  useEffect(() => {
    if (!overlay) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || saving) return;
      e.stopImmediatePropagation();
      setOverlay(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [overlay, saving]);

  const closeOverlay = () => {
    if (saving) return;
    setOverlay(null);
  };

  const saveOverlay = () => {
    const normalized = normalizeNoteBody(draft);
    if (!normalized) {
      setError("Enter a note before saving.");
      textareaRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      if (overlay?.kind === "edit") {
        if (!updateLeadNote(overlay.note.id, normalized)) {
          setError("Enter a note before saving.");
          return;
        }
      } else if (!addLeadNote(lead.id, normalized)) {
        setError("Enter a note before saving.");
        return;
      }
      setOverlay(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-4" role="tabpanel">
      <div className="active-leads-notes-header">
        <h6 className="active-leads-notes-title">
          Notes
          {notes.length > 0 ? (
            <span className="active-leads-notes-count" aria-label={`${notes.length} notes`}>
              {notes.length}
            </span>
          ) : null}
        </h6>
        <button
          type="button"
          className="ti-btn ti-btn-primary-full crm-btn crm-btn--sm"
          onClick={() => setOverlay({ kind: "add" })}
        >
          <i className="ri-add-line" aria-hidden />
          Add note
        </button>
      </div>

      {legacyNotes ? (
        <div className="active-leads-note-legacy mb-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-textmuted">
              Pipeline notes
            </span>
            <Link
              href={leadEditHref(lead.id, { from: "active-leads" })}
              className="text-[0.75rem] text-primary"
            >
              Edit
            </Link>
          </div>
          <p className="text-[0.875rem] text-defaulttextcolor whitespace-pre-wrap mb-0 leading-relaxed">
            {legacyNotes}
          </p>
        </div>
      ) : null}

      {notes.length === 0 ? (
        <div className="active-leads-notes-empty">
          <span className="active-leads-notes-empty-icon" aria-hidden>
            <i className="ri-sticky-note-line"></i>
          </span>
          <p className="active-leads-notes-empty-title">No notes on this lead yet</p>
          <p className="active-leads-notes-empty-copy">
            Log call outcomes, next steps, or context the team will need later.
          </p>
          <button
            type="button"
            className="ti-btn ti-btn-primary-full crm-btn crm-btn--sm"
            onClick={() => setOverlay({ kind: "add" })}
          >
            <i className="ri-add-line" aria-hidden />
            Add note
          </button>
        </div>
      ) : (
        <ul className="list-none mb-0 space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="active-leads-note-card">
              <div className="active-leads-note-card__meta">
                <div className="min-w-0">
                  <span className="active-leads-note-card__author">
                    {note.author}
                  </span>
                  <span className="active-leads-note-card__time">
                    {formatCrmDateTime(note.updatedAt)}
                    {note.updatedAt !== note.createdAt ? " · edited" : ""}
                  </span>
                </div>
                <div className="active-leads-note-card__actions">
                  <button
                    type="button"
                    className="active-leads-note-action"
                    aria-label={`Edit note by ${note.author}`}
                    onClick={() => setOverlay({ kind: "edit", note })}
                  >
                    <i className="ri-pencil-line" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="active-leads-note-action active-leads-note-action--danger"
                    aria-label={`Delete note by ${note.author}`}
                    onClick={() => setDeleteTarget(note)}
                  >
                    <i className="ri-delete-bin-line" aria-hidden />
                  </button>
                </div>
              </div>
              <p className="active-leads-note-card__body">{note.body}</p>
            </li>
          ))}
        </ul>
      )}

      {overlay && typeof document !== "undefined"
        ? createPortal(
            <div className="lead-note-overlay" role="presentation">
              <button
                type="button"
                className="lead-note-overlay__scrim"
                aria-label="Close dialog"
                onClick={closeOverlay}
                tabIndex={-1}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="lead-note-overlay__dialog"
              >
                <div className="lead-note-overlay__header">
                  <h2 id={titleId} className="lead-note-overlay__title">
                    {overlay.kind === "edit" ? "Edit note" : "Add note"}
                  </h2>
                  <button
                    type="button"
                    className="lead-note-overlay__close"
                    aria-label="Close"
                    onClick={closeOverlay}
                    disabled={saving}
                  >
                    <i className="ri-close-line" aria-hidden />
                  </button>
                </div>

                <div className="lead-note-overlay__body">
                  <label
                    className="lead-note-overlay__label"
                    htmlFor={bodyId}
                  >
                    Note
                  </label>
                  <textarea
                    ref={textareaRef}
                    id={bodyId}
                    className="lead-note-overlay__textarea"
                    rows={6}
                    value={draft}
                    disabled={saving}
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                      error ? errorId : `${bodyId}-hint`
                    }
                    placeholder="What happened, and what should happen next?"
                    onChange={(e) => {
                      setDraft(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e.metaKey || e.ctrlKey) &&
                        e.key === "Enter" &&
                        canSave
                      ) {
                        e.preventDefault();
                        saveOverlay();
                      }
                    }}
                  />
                  {error ? (
                    <p
                      id={errorId}
                      className="lead-note-overlay__error"
                      role="alert"
                    >
                      {error}
                    </p>
                  ) : (
                    <p id={`${bodyId}-hint`} className="lead-note-overlay__hint">
                      Ctrl+Enter to save
                    </p>
                  )}
                </div>

                <div className="lead-note-overlay__footer">
                  <Button
                    variant="light"
                    size="md"
                    className="lead-note-overlay__btn"
                    onClick={closeOverlay}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  {/* ponytail: raw primary-full — Button variant=primary is soft (bg/10) and beats primary-full in CSS order */}
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary-full crm-btn crm-btn--md lead-note-overlay__btn lead-note-overlay__save"
                    onClick={saveOverlay}
                    disabled={!canSave}
                  >
                    {saving
                      ? "Saving…"
                      : overlay.kind === "edit"
                        ? "Save changes"
                        : "Save note"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <ConfirmDeleteOverlay
        open={Boolean(deleteTarget)}
        title="Delete this note?"
        entityName={
          deleteTarget ? notePreview(deleteTarget.body, 48) : "this note"
        }
        description="This permanently removes"
        entitySuffix="from this lead. This cannot be undone."
        confirmLabel="Delete note"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteLeadNote(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
