"use client";

import { forgotPassword } from "@/shared/auth/auth-client";
import BrandLogo from "@/shared/layout-components/brand-logo/brand-logo";
import Link from "next/link";
import { useRef, useState } from "react";

const fieldClass =
  "form-control form-control-lg w-full !h-11 !rounded-md !text-sm !leading-normal !px-3.5 transition-colors duration-200 focus:!border-primary/60 focus-visible:!ring-2 focus-visible:!ring-primary/25";

const linkClass =
  "text-primary font-medium hover:underline underline-offset-4 transition-colors rounded-sm focus-visible:!ring-2 focus-visible:!ring-primary/40 focus-visible:!ring-offset-1 dark:focus-visible:!ring-offset-bodybg";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  const handleReset = async () => {
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      emailRef.current?.focus();
      return;
    }
    setError("");
    setBusy(true);
    try {
      await forgotPassword(email);
    } catch {
      // ponytail: swallow — never reveal whether the email exists.
    } finally {
      setBusy(false);
      setSent(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!busy) handleReset();
  };

  return (
    <div className="container">
      <div className="flex justify-center authentication authentication-basic items-center h-full text-defaultsize text-defaulttextcolor">
        <div className="grid grid-cols-12">
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2"></div>
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-6 sm:col-span-8 col-span-12">
            <div className="box !p-6 sm:!p-8 lg:!p-10 !rounded-xl !border !border-black/[0.04] dark:!border-white/[0.06] !shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_40px_-16px_rgba(0,0,0,0.35)]">
              <div className="flex justify-center mb-8">
                <Link
                  href="/"
                  aria-label="Religence home"
                  className="rounded-sm focus-visible:outline-none focus-visible:!ring-2 focus-visible:!ring-primary/40 focus-visible:!ring-offset-2 dark:focus-visible:!ring-offset-bodybg"
                >
                  <BrandLogo auth />
                </Link>
              </div>

              <div className="box-body !p-0">
                <p className="text-2xl font-bold tracking-tight text-center mb-1.5">
                  Reset Password
                </p>

                {sent ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex items-start gap-2.5 rounded-md border border-success/25 bg-success/10 dark:bg-success/15 px-4 py-3 text-sm text-[#065f46] dark:text-emerald-300"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 5.29a1 1 0 010 1.415l-7.004 7a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 111.414-1.414l2.793 2.792 6.297-6.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      If an account exists for that email, a reset link is on its way.{" "}
                      <Link href="/" className={`underline underline-offset-2 ${linkClass}`}>
                        Back to sign in
                      </Link>
                      .
                    </div>
                  </div>
                ) : (
                  <>
                    {error && (
                      <div
                        role="alert"
                        aria-live="assertive"
                        className="mb-6 flex items-start gap-2.5 rounded-md border border-danger/25 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-[#b91c1c] dark:text-red-300"
                      >
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.517 11.59c.75 1.336-.213 3.005-1.743 3.005H3.483c-1.53 0-2.493-1.669-1.743-3.005l6.517-11.59zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {error}
                      </div>
                    )}
                    <p className="mb-7 text-center text-sm text-defaulttextcolor/70">
                      Enter your email and we&apos;ll send you a reset link.
                    </p>
                    <form onSubmit={handleSubmit} noValidate>
                      <div className="grid grid-cols-12 gap-y-5">
                        <div className="xl:col-span-12 col-span-12">
                          <label htmlFor="fp-email" className="form-label">
                            Email<span className="text-danger" aria-hidden="true"> *</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            autoComplete="email"
                            className={fieldClass}
                            id="fp-email"
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setError("");
                            }}
                            value={email}
                            ref={emailRef}
                            aria-required="true"
                          />
                        </div>
                        <div className="xl:col-span-12 col-span-12 grid mt-1">
                          <button
                            type="submit"
                            disabled={busy}
                            aria-busy={busy}
                            className="ti-btn ti-btn-primary !bg-primary !text-bodybg !font-semibold !h-11 !rounded-md !text-sm tracking-wide disabled:!opacity-60 disabled:!cursor-not-allowed transition-all duration-200 hover:!bg-primary/90 active:!scale-[0.98] shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/25 focus-visible:!ring-2 focus-visible:!ring-primary/40 focus-visible:!ring-offset-2 dark:focus-visible:!ring-offset-bodybg"
                          >
                            {busy && (
                              <svg
                                className="h-4 w-4 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-90"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                            )}
                            {busy ? "Sending…" : "Send Reset Link"}
                          </button>
                        </div>
                      </div>
                    </form>
                    <div className="text-center mt-8">
                      <Link href="/" className={`text-sm ${linkClass}`}>
                        Back to sign in
                      </Link>
                    </div>
                  </>
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
