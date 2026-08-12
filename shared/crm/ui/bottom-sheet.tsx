"use client";

import { useEffect, type ReactNode } from "react";

/** Mobile-only sheet that slides up from the bottom edge. Hidden at md+. */
export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end bg-black/50 md:hidden motion-safe:animate-backdrop-in"
      onClick={onClose}
    >
      <div
        className="box custom-box !mb-0 w-full max-h-[85vh] overflow-y-auto !rounded-b-none pb-[env(safe-area-inset-bottom)] motion-safe:animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="box-header flex items-center justify-between">
          <h6 className="box-title mb-0">{title}</h6>
          <button
            type="button"
            className="ti-btn ti-btn-sm ti-btn-light !mb-0"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="ri-close-line" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default BottomSheet;
