"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/shared/ui/button";

export type ConfirmDeleteOverlayProps = {
  open: boolean;
  title?: string;
  entityName: string;
  description?: string;
  /** Text after entity name. Default: removal suffix. Pass false to omit. */
  entitySuffix?: string | false;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  /** Destructive (default) or primary confirmation styling. */
  tone?: "danger" | "primary";
  iconClass?: string;
  confirmVariant?: "danger" | "primary";
  /** Optional extra controls (e.g. cascade checkboxes) shown above the actions. */
  children?: ReactNode;
};

export function ConfirmDeleteOverlay({
  open,
  title = "Delete contact?",
  entityName,
  description = "This action cannot be undone. Any linked lead references will be cleared.",
  entitySuffix = "will be permanently removed.",
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  busy = false,
  tone = "danger",
  iconClass,
  confirmVariant,
  children,
}: ConfirmDeleteOverlayProps) {
  const resolvedIcon =
    iconClass ?? (tone === "primary" ? "ri-link-m" : "ri-delete-bin-line");
  const resolvedConfirmVariant = confirmVariant ?? tone;
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="confirm-delete-overlay" role="presentation">
      <button
        type="button"
        className="confirm-delete-overlay__scrim"
        aria-label="Close dialog"
        onClick={busy ? undefined : onCancel}
        tabIndex={-1}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="confirm-delete-overlay__dialog"
      >
        <div
          className={`confirm-delete-overlay__icon${
            tone === "primary" ? " confirm-delete-overlay__icon--primary" : ""
          }`}
          aria-hidden
        >
          <i className={resolvedIcon}></i>
        </div>
        <h2 id={titleId} className="confirm-delete-overlay__title">
          {title}
        </h2>
        <p id={descId} className="confirm-delete-overlay__desc">
          {description}{" "}
          <strong className="confirm-delete-overlay__entity">{entityName}</strong>
          {entitySuffix !== false ? (
            <>
              {" "}
              {entitySuffix}
            </>
          ) : null}
        </p>
        {children && (
          <div className="confirm-delete-overlay__extra">{children}</div>
        )}
        <div className="confirm-delete-overlay__actions">
          <Button
            ref={cancelRef}
            variant="light"
            size="md"
            className="confirm-delete-overlay__btn"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          {/* ponytail: raw *-full — Button danger/primary are soft (bg/10) */}
          {resolvedConfirmVariant === "danger" ? (
            <button
              type="button"
              className="ti-btn ti-btn-danger-full crm-btn crm-btn--md confirm-delete-overlay__btn confirm-delete-overlay__btn--danger"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? (
                <>
                  <span
                    className="confirm-delete-overlay__spinner"
                    aria-hidden
                  />
                  Deleting…
                </>
              ) : (
                <>
                  <i className="ri-delete-bin-line me-1" aria-hidden />
                  {confirmLabel}
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="ti-btn ti-btn-primary-full crm-btn crm-btn--md confirm-delete-overlay__btn"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? (
                <>
                  <span
                    className="confirm-delete-overlay__spinner"
                    aria-hidden
                  />
                  Working…
                </>
              ) : (
                confirmLabel
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
