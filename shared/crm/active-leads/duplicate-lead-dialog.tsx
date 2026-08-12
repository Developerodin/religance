"use client";

import type { CrmLead } from "@/shared/crm/store/types";
import { useEffect, useRef } from "react";

type DuplicateLeadDialogProps = {
  open: boolean;
  existingLead: CrmLead | null;
  companyName: string;
  matchedMedicine: string;
  onEditExisting: () => void;
  onCreateDuplicate: () => void;
  onCancel: () => void;
};

export function DuplicateLeadDialog({
  open,
  existingLead,
  companyName,
  matchedMedicine,
  onEditExisting,
  onCreateDuplicate,
  onCancel,
}: DuplicateLeadDialogProps) {
  const editRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    editRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || !existingLead) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[160]"
        onClick={onCancel}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-lead-title"
        className="fixed inset-0 z-[170] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="box custom-box !mb-0 w-full max-w-lg pointer-events-auto !shadow-lg">
          <div className="box-header border-b border-defaultborder dark:border-defaultborder/10">
            <h6
              id="duplicate-lead-title"
              className="box-title mb-0 before:!hidden"
            >
              Lead already exists
            </h6>
            <button
              type="button"
              className="ti-btn ti-btn-sm ti-btn-icon ti-btn-light"
              onClick={onCancel}
              aria-label="Close"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
          <div className="box-body">
            <p className="text-[0.8125rem] text-textmuted mb-3">
              A lead for this company and medicine already exists. What would you
              like to do?
            </p>
            <div className="active-leads-info-card mb-4">
              <p className="font-semibold text-[0.875rem] mb-1">
                {existingLead.title}
              </p>
              <p className="text-[0.8125rem] text-textmuted mb-0.5">
                <i className="ri-building-2-line me-1"></i>
                {companyName}
              </p>
              <p className="text-[0.8125rem] text-textmuted mb-0">
                <i className="ri-capsule-line me-1"></i>
                {matchedMedicine}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                ref={editRef}
                type="button"
                className="ti-btn ti-btn-primary !min-h-[2.75rem] w-full"
                onClick={onEditExisting}
              >
                Edit existing lead
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-outline-primary !min-h-[2.75rem] w-full"
                onClick={onCreateDuplicate}
              >
                Create duplicate anyway
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-light !min-h-[2.75rem] w-full"
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
