"use client";

import { isAuthed, login, resendVerification } from "@/shared/auth/auth-client";
import { safeAppRedirect } from "@/shared/auth/safe-redirect";
import BrandLogo from "@/shared/layout-components/brand-logo/brand-logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const fieldClass =
  "form-control form-control-lg w-full !h-11 !rounded-md !text-sm !leading-normal !px-3.5 transition-colors duration-200 focus:!border-primary/60 focus-visible:!ring-2 focus-visible:!ring-primary/25";

const groupFieldClass =
  "form-control form-control-lg w-full !h-11 !rounded-md !text-sm !leading-normal !ps-3.5 !pe-11 transition-colors duration-200 focus:!border-primary/60 focus-visible:!ring-2 focus-visible:!ring-primary/25";

const toggleBtnClass =
  "absolute inset-y-0 end-0 flex items-center justify-center !h-11 !w-11 text-defaulttextcolor/60 hover:text-defaulttextcolor rounded-md transition-colors duration-150 active:scale-95 focus-visible:outline-none focus-visible:!ring-2 focus-visible:!ring-primary/25 focus-visible:!ring-offset-1 dark:focus-visible:!ring-offset-bodybg";

const linkClass =
  "text-primary font-medium hover:underline underline-offset-4 transition-colors rounded-sm focus-visible:!ring-2 focus-visible:!ring-primary/40 focus-visible:!ring-offset-1 dark:focus-visible:!ring-offset-bodybg";

export default function Home() {
  const [passwordshow1, setpasswordshow1] = useState(false);
  const [err, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [unverified, setUnverified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState({ email: "", password: "" });
  const { email, password } = data;
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const changeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
    setError("");
    setNotice("");
    setUnverified(false);
  };

  const router = useRouter();

  // Restore session from localStorage SoT — skip Sign In if already authed.
  useEffect(() => {
    if (!isAuthed()) return;
    const params = new URLSearchParams(window.location.search);
    router.replace(safeAppRedirect(params.get("redirect")));
  }, [router]);

  const handleSignIn = async () => {
    if (!email.trim()) {
      setError("Email is required.");
      emailRef.current?.focus();
      return;
    }
    if (!password) {
      setError("Password is required.");
      passwordRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    setUnverified(false);
    try {
      await login(email, password);
      const params = new URLSearchParams(window.location.search);
      router.push(safeAppRedirect(params.get("redirect")));
    } catch (e: any) {
      // Backend returns 403 "verify your email…" for unverified accounts.
      if (typeof e?.message === "string" && /verify your email/i.test(e.message)) {
        setUnverified(true);
        setError("Please verify your email before signing in.");
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendVerification(email);
      setError("");
      setNotice("Verification email sent. Check your inbox.");
      setUnverified(false);
    } catch {
      setError("Could not resend verification email.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!busy) handleSignIn();
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
                  Sign In
                </p>
                <p className="mb-7 text-center text-sm text-defaulttextcolor/70">
                  Sign in to your Religence CRM account
                </p>

                {err && (
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
                    <div>
                      {err}
                      {unverified && (
                        <button
                          type="button"
                          onClick={handleResend}
                          className="ms-1 underline font-medium underline-offset-2 hover:text-danger/80 rounded-sm focus-visible:outline-none focus-visible:!ring-2 focus-visible:!ring-danger/40"
                        >
                          Resend verification email
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {notice && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mb-6 flex items-start gap-2.5 rounded-md border border-success/25 bg-success/10 dark:bg-success/15 px-4 py-3 text-sm text-[#065f46] dark:text-emerald-300"
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
                    {notice}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="grid grid-cols-12 gap-y-5">
                    <div className="xl:col-span-12 col-span-12">
                      <label htmlFor="signin-email" className="form-label">
                        Email<span className="text-danger" aria-hidden="true"> *</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        className={fieldClass}
                        id="signin-email"
                        onChange={changeHandler}
                        value={email}
                        ref={emailRef}
                        aria-required="true"
                      />
                    </div>
                    <div className="xl:col-span-12 col-span-12">
                      <label htmlFor="signin-password" className="form-label block">
                        Password<span className="text-danger" aria-hidden="true"> *</span>
                      </label>
                      <div className="relative">
                        <input
                          name="password"
                          type={passwordshow1 ? "text" : "password"}
                          autoComplete="current-password"
                          value={password}
                          onChange={changeHandler}
                          className={groupFieldClass}
                          id="signin-password"
                          ref={passwordRef}
                          aria-required="true"
                        />
                        <button
                          onClick={() => setpasswordshow1(!passwordshow1)}
                          aria-label={passwordshow1 ? "Hide password" : "Show password"}
                          aria-pressed={passwordshow1}
                          className={toggleBtnClass}
                          type="button"
                        >
                          <i
                            className={`${passwordshow1 ? "ri-eye-line" : "ri-eye-off-line"} align-middle text-base transition-transform duration-150`}
                          ></i>
                        </button>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Link href="/forgot-password/" className={`text-sm ${linkClass}`}>
                          Forgot password?
                        </Link>
                      </div>
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
                        {busy ? "Signing in…" : "Sign In"}
                      </button>
                    </div>
                  </div>
                </form>
                <div className="text-center mt-8">
                  <p className="text-defaulttextcolor/70 text-sm">
                    Don&apos;t have an account?{" "}
                    <Link href="/register/" className={linkClass}>
                      Create one
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2"></div>
        </div>
      </div>
    </div>
  );
}
