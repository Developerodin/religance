"use client";

import { register } from "@/shared/auth/auth-client";
import BrandLogo from "@/shared/layout-components/brand-logo/brand-logo";
import Link from "next/link";
import { useRef, useState } from "react";

// ponytail: policy mirrors the reference plan — >=8 chars, a letter and a number.
const isStrong = (pw: string) =>
  pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);

const fieldClass =
  "form-control form-control-lg w-full !h-11 !rounded-md !text-sm !leading-normal !px-3.5 transition-colors duration-200 focus:!border-primary/60 focus-visible:!ring-2 focus-visible:!ring-primary/25";

const groupFieldClass =
  "form-control form-control-lg w-full !h-11 !rounded-md !text-sm !leading-normal !ps-3.5 !pe-11 transition-colors duration-200 focus:!border-primary/60 focus-visible:!ring-2 focus-visible:!ring-primary/25";

const toggleBtnClass =
  "absolute inset-y-0 end-0 flex items-center justify-center !h-11 !w-11 text-defaulttextcolor/60 hover:text-defaulttextcolor rounded-md transition-colors duration-150 active:scale-95 focus-visible:outline-none focus-visible:!ring-2 focus-visible:!ring-primary/25 focus-visible:!ring-offset-1 dark:focus-visible:!ring-offset-bodybg";

const linkClass =
  "text-primary font-medium hover:underline underline-offset-4 transition-colors rounded-sm focus-visible:!ring-2 focus-visible:!ring-primary/40 focus-visible:!ring-offset-1 dark:focus-visible:!ring-offset-bodybg";

function CheckDot({ done }: { done: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 transition-colors duration-150 ${done ? "text-success" : "text-defaulttextcolor/70"}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      {done ? (
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 010 1.415l-7.004 7a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 111.414-1.414l2.793 2.792 6.297-6.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      ) : (
        <circle cx="10" cy="10" r="4" />
      )}
    </svg>
  );
}

export default function Register() {
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [err, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmBlurred, setConfirmBlurred] = useState(false);
  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const { name, email, password, confirmPassword } = data;
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const passwordChecks = {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
  };
  const confirmTouched = confirmPassword.length > 0;
  const passwordsMatch = confirmTouched && password === confirmPassword;
  const showConfirmStatus = confirmTouched && (confirmBlurred || passwordsMatch);

  const changeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
    setError("");
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      nameRef.current?.focus();
      return;
    }
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      emailRef.current?.focus();
      return;
    }
    if (!password) {
      setError("Password is required.");
      passwordRef.current?.focus();
      return;
    }
    if (!confirmPassword) {
      setError("Confirm password is required.");
      confirmPasswordRef.current?.focus();
      return;
    }
    if (password !== confirmPassword) {
      setError("Password and confirm password must match.");
      confirmPasswordRef.current?.focus();
      return;
    }
    if (!isStrong(password)) {
      setError("Password must be at least 8 characters with a letter and a number.");
      passwordRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await register(name.trim(), email, password, confirmPassword);
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!busy) handleRegister();
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
                  Create Account
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
                    {err}
                  </div>
                )}

                {done ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mb-2 flex items-start gap-2.5 rounded-md border border-success/25 bg-success/10 dark:bg-success/15 px-4 py-3 text-sm text-[#065f46] dark:text-emerald-300"
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
                      Account created. We sent a verification link to{" "}
                      <strong>{email}</strong>. Verify your email, then{" "}
                      <Link href="/" className={`underline underline-offset-2 ${linkClass}`}>
                        sign in
                      </Link>
                      .
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mb-7 text-center text-sm text-defaulttextcolor/70">
                      Register for a Religence CRM account
                    </p>
                    <form onSubmit={handleSubmit} noValidate>
                      <div className="grid grid-cols-12 gap-y-5">
                        <div className="xl:col-span-12 col-span-12">
                          <label htmlFor="reg-name" className="form-label">
                            Name<span className="text-danger" aria-hidden="true"> *</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            autoComplete="name"
                            className={fieldClass}
                            id="reg-name"
                            onChange={changeHandler}
                            value={name}
                            ref={nameRef}
                            aria-required="true"
                          />
                        </div>
                        <div className="xl:col-span-12 col-span-12">
                          <label htmlFor="reg-email" className="form-label">
                            Email<span className="text-danger" aria-hidden="true"> *</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            autoComplete="email"
                            className={fieldClass}
                            id="reg-email"
                            onChange={changeHandler}
                            value={email}
                            ref={emailRef}
                            aria-required="true"
                          />
                        </div>
                        <div className="xl:col-span-12 col-span-12">
                          <label htmlFor="reg-password" className="form-label block">
                            Password<span className="text-danger" aria-hidden="true"> *</span>
                          </label>
                          <div className="relative">
                            <input
                              name="password"
                              type={show ? "text" : "password"}
                              autoComplete="new-password"
                              value={password}
                              onChange={changeHandler}
                              className={groupFieldClass}
                              id="reg-password"
                              ref={passwordRef}
                              aria-required="true"
                              aria-describedby="reg-password-requirements"
                            />
                            <button
                              onClick={() => setShow(!show)}
                              aria-label={show ? "Hide password" : "Show password"}
                              aria-pressed={show}
                              className={toggleBtnClass}
                              type="button"
                            >
                              <i
                                className={`${show ? "ri-eye-line" : "ri-eye-off-line"} align-middle text-base transition-transform duration-150`}
                              ></i>
                            </button>
                          </div>
                          <ul
                            id="reg-password-requirements"
                            className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
                          >
                            <li
                              className={`flex items-center gap-1 ${passwordChecks.length ? "text-[#065f46] dark:text-success" : "text-defaulttextcolor/70"}`}
                            >
                              <CheckDot done={passwordChecks.length} /> 8+ characters
                            </li>
                            <li
                              className={`flex items-center gap-1 ${passwordChecks.letter ? "text-[#065f46] dark:text-success" : "text-defaulttextcolor/70"}`}
                            >
                              <CheckDot done={passwordChecks.letter} /> a letter
                            </li>
                            <li
                              className={`flex items-center gap-1 ${passwordChecks.number ? "text-[#065f46] dark:text-success" : "text-defaulttextcolor/70"}`}
                            >
                              <CheckDot done={passwordChecks.number} /> a number
                            </li>
                          </ul>
                        </div>
                        <div className="xl:col-span-12 col-span-12">
                          <label htmlFor="reg-confirm-password" className="form-label block">
                            Confirm Password<span className="text-danger" aria-hidden="true"> *</span>
                          </label>
                          <div className="relative">
                            <input
                              name="confirmPassword"
                              type={showConfirm ? "text" : "password"}
                              autoComplete="new-password"
                              value={confirmPassword}
                              onChange={changeHandler}
                              onBlur={() => setConfirmBlurred(true)}
                              className={`${groupFieldClass} ${
                                showConfirmStatus
                                  ? passwordsMatch
                                    ? "!border-success/50"
                                    : "!border-danger/50"
                                  : ""
                              }`}
                              id="reg-confirm-password"
                              ref={confirmPasswordRef}
                              aria-required="true"
                              aria-describedby="reg-confirm-password-status"
                              aria-invalid={showConfirmStatus ? !passwordsMatch : undefined}
                            />
                            <button
                              onClick={() => setShowConfirm(!showConfirm)}
                              aria-label={showConfirm ? "Hide password" : "Show password"}
                              aria-pressed={showConfirm}
                              className={toggleBtnClass}
                              type="button"
                            >
                              <i
                                className={`${showConfirm ? "ri-eye-line" : "ri-eye-off-line"} align-middle text-base transition-transform duration-150`}
                              ></i>
                            </button>
                          </div>
                          {showConfirmStatus && (
                            <p
                              id="reg-confirm-password-status"
                              className={`mt-1.5 flex items-center gap-1 text-xs transition-colors duration-150 ${passwordsMatch ? "text-[#065f46] dark:text-success" : "text-[#b91c1c] dark:text-red-300"}`}
                              aria-live="polite"
                            >
                              <CheckDot done={passwordsMatch} />
                              {passwordsMatch ? "Passwords match" : "Passwords don't match"}
                            </p>
                          )}
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
                            {busy ? "Creating…" : "Create Account"}
                          </button>
                        </div>
                      </div>
                    </form>
                    <div className="text-center mt-8">
                      <p className="text-defaulttextcolor/70 text-sm">
                        Already have an account?{" "}
                        <Link href="/" className={linkClass}>
                          Sign in
                        </Link>
                      </p>
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
