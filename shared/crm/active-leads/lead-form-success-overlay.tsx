"use client";

import {
  leadDiscoveryHref,
  leadEditHref,
  type LeadFormSource,
} from "@/shared/crm/active-leads/active-leads-utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId } from "react";
import { createPortal } from "react-dom";

const AUTO_DISMISS_MS = 2000;

export type LeadFormSuccessOverlayProps = {
  open: boolean;
  mode?: "create" | "edit";
  leadId: string;
  companyName?: string;
  medicineName?: string;
  source: LeadFormSource;
  saltId?: string;
  medicineId?: string;
  onDismiss: () => void;
};

export function LeadFormSuccessOverlay({
  open,
  mode = "create",
  leadId,
  companyName,
  medicineName,
  source,
  saltId,
  medicineId,
  onDismiss,
}: LeadFormSuccessOverlayProps) {
  const router = useRouter();
  const titleId = useId();
  const messageId = useId();

  const backLabel =
    source === "discovery" ? "Back to Lead Discovery" : "Back to Active Leads";

  const navigateBack = useCallback(() => {
    onDismiss();
    if (source === "discovery") {
      router.replace(
        leadDiscoveryHref({
          saltId: saltId || null,
          medicineId: medicineId || null,
        })
      );
      return;
    }
    router.replace("/active-leads/");
  }, [onDismiss, router, source, saltId, medicineId]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(navigateBack, AUTO_DISMISS_MS);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigateBack();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, navigateBack]);

  if (!open || typeof document === "undefined") return null;

  const detailParts = [companyName, medicineName].filter(Boolean);
  const detailLine =
    detailParts.length > 0
      ? detailParts.join(" · ")
      : mode === "edit"
        ? "Your changes have been saved."
        : "Your new lead has been saved.";
  const title =
    mode === "edit" ? "Lead saved successfully" : "Lead created successfully";

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[160]"
        aria-hidden
        onClick={navigateBack}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="fixed inset-0 z-[170] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="box custom-box !mb-0 w-full max-w-md pointer-events-auto !shadow-lg">
          <div className="box-body text-center !py-6 !px-5">
            <span
              className="avatar avatar-lg bg-success/10 text-success mb-3 inline-flex justify-center items-center"
              aria-hidden
            >
              <i className="ri-check-line text-2xl"></i>
            </span>
            <h2
              id={titleId}
              className="text-[1rem] font-semibold text-defaulttextcolor mb-2"
            >
              {title}
            </h2>
            <p
              id={messageId}
              className="text-[0.8125rem] text-textmuted mb-1"
              aria-live="polite"
            >
              {detailLine}
            </p>
            <p className="text-[0.75rem] text-textmuted mb-4">
              Returning to {source === "discovery" ? "Lead Discovery" : "Active Leads"}…
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="ti-btn ti-btn-primary !min-h-[2.75rem] w-full"
                onClick={navigateBack}
              >
                {backLabel}
              </button>
              {mode === "edit" ? (
                <button
                  type="button"
                  className="ti-btn ti-btn-light !min-h-[2.75rem] w-full"
                  onClick={onDismiss}
                >
                  Stay on page
                </button>
              ) : (
                <Link
                  href={leadEditHref(leadId)}
                  className="ti-btn ti-btn-light !min-h-[2.75rem] w-full"
                  onClick={onDismiss}
                >
                  View lead
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
