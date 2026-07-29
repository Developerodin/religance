"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const DEFAULT_DISMISS_MS = 4000;

/** ponytail: one toast at a time per hook instance; global queue if needed later */
export function useCrmSuccessToast(dismissMs = DEFAULT_DISMISS_MS) {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((msg: string) => setMessage(msg), []);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), dismissMs);
    return () => window.clearTimeout(t);
  }, [message, dismissMs]);

  const toast =
    message && typeof document !== "undefined"
      ? createPortal(
          <div className="crm-success-toast" role="status" aria-live="polite">
            <i className="ri-checkbox-circle-fill" aria-hidden />
            {message}
          </div>,
          document.body
        )
      : null;

  return { show, toast };
}
