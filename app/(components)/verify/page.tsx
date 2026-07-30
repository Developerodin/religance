"use client";

import { resendVerification, verifyEmail } from "@/shared/auth/auth-client";
import BrandLogo from "@/shared/layout-components/brand-logo/brand-logo";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function readToken(): string {
  const raw = new URLSearchParams(window.location.search).get("token") ?? "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export default function Verify() {
  const [state, setState] = useState<"working" | "ok" | "fail">("working");
  const [email, setEmail] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = readToken();
    if (!token) {
      setState("fail");
      return;
    }

    const cacheKey = `religence.verify.${token}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached === "ok") {
      setState("ok");
      return;
    }
    if (cached === "fail") {
      setState("fail");
      return;
    }

    verifyEmail(token)
      .then(() => {
        sessionStorage.setItem(cacheKey, "ok");
        setState("ok");
      })
      .catch(() => {
        sessionStorage.setItem(cacheKey, "fail");
        setState("fail");
      });
  }, []);

  const handleResend = async () => {
    if (!email.trim()) {
      setResendMsg("Enter the email you used to register.");
      return;
    }
    setResendBusy(true);
    setResendMsg("");
    try {
      await resendVerification(email.trim());
      setResendMsg("Verification email sent. Check your inbox.");
    } catch {
      setResendMsg("Could not send verification email. Try again.");
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="flex justify-center authentication authentication-basic items-center h-full text-defaultsize text-defaulttextcolor">
        <div className="grid grid-cols-12">
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2"></div>
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-6 sm:col-span-8 col-span-12">
            <div className="box !p-[3rem] verify-page">
              <div className="flex justify-center mb-6">
                <Link href="/" aria-label="Religence home">
                  <BrandLogo auth />
                </Link>
              </div>
              <div className="box-body !p-0 text-center">
                <p className="h5 font-semibold mb-1">Email Verification</p>
                <p className="mb-5 text-sm text-[#8c9097] dark:text-white/50">
                  One step left before you can sign in.
                </p>

                {state === "working" && (
                  <div className="verify-page__status" role="status" aria-live="polite">
                    <div className="verify-page__spinner" aria-hidden="true" />
                    <p className="text-[#8c9097] dark:text-white/50">Verifying your email…</p>
                  </div>
                )}

                {state === "ok" && (
                  <div
                    className="verify-page__alert verify-page__alert--success"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="verify-page__icon verify-page__icon--success" aria-hidden="true">
                      ✓
                    </span>
                    <p className="verify-page__alert-title">Email verified</p>
                    <p className="verify-page__alert-body">
                      Your account is active. You can sign in now.
                    </p>
                    <Link href="/" className="ti-btn ti-btn-primary !bg-primary !text-bodybg !font-medium mt-3">
                      Continue to sign in
                    </Link>
                  </div>
                )}

                {state === "fail" && (
                  <div className="verify-page__fail">
                    <div className="verify-page__alert verify-page__alert--error" role="alert">
                      <span className="verify-page__icon verify-page__icon--error" aria-hidden="true">
                        !
                      </span>
                      <p className="verify-page__alert-title">Link invalid or expired</p>
                      <p className="verify-page__alert-body">
                        This verification link may have already been used or timed out after 24 hours.
                      </p>
                    </div>

                    <div className="verify-page__resend text-start mt-5">
                      <label htmlFor="verify-resend-email" className="form-label text-default block mb-2">
                        Resend verification email
                      </label>
                      <input
                        id="verify-resend-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setResendMsg("");
                        }}
                        placeholder="you@company.com"
                        className="form-control form-control-lg w-full !rounded-md mb-3"
                      />
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendBusy}
                        className="ti-btn ti-btn-primary !bg-primary !text-bodybg !font-medium w-full disabled:opacity-60"
                      >
                        {resendBusy ? "Sending…" : "Send new verification link"}
                      </button>
                      {resendMsg && (
                        <p className="mt-3 text-sm text-[#8c9097] dark:text-white/60" role="status">
                          {resendMsg}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <Link href="/" className="text-primary text-sm font-medium">
                        Back to sign in
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2"></div>
        </div>
      </div>
    </div>
  );
}
