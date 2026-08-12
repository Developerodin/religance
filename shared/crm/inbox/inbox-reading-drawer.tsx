"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Tablet reading overlay (768–1199). Wider than BottomSheet so the message
 * isn't squeezed beside the list. Hidden from the DOM on mobile/desktop by
 * the parent — do not dual-render with the inline desktop pane.
 */
export function InboxReadingDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="crm-inbox-reading-overlay" role="presentation">
      <button
        type="button"
        className="crm-inbox-reading-backdrop"
        aria-label="Close message"
        onClick={onClose}
      />
      <aside
        className="crm-inbox-reading-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Message"
      >
        <div className="crm-inbox-reading-drawer-bar">
          <button
            type="button"
            className="crm-inbox-reading-close"
            onClick={onClose}
            aria-label="Close reading pane"
          >
            <i className="ri-close-line" aria-hidden />
            <span>Close</span>
          </button>
        </div>
        <div className="crm-inbox-reading-drawer-body">{children}</div>
      </aside>
    </div>
  );
}

export default InboxReadingDrawer;
