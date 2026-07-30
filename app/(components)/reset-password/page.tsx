"use client";

import { resetPassword } from "@/shared/auth/auth-client";
import BrandLogo from "@/shared/layout-components/brand-logo/brand-logo";
import Link from "next/link";
import { useState } from "react";

const isStrong = (pw: string) =>
  pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);

export default function ResetPassword() {
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
  const [err, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleReset = async () => {
    if (!isStrong(password)) {
      setError("Password must be at least 8 characters with a letter and a number.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const token = new URLSearchParams(window.location.search).get("token") ?? "";
      await resetPassword(token, password);
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? "Reset failed. The link may be invalid or expired.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="flex justify-center authentication authentication-basic items-center h-full text-defaultsize text-defaulttextcolor">
        <div className="grid grid-cols-12">
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2"></div>
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-6 sm:col-span-8 col-span-12">
            <div className="box !p-[3rem]">
              <div className="flex justify-center mb-6">
                <Link href="/" aria-label="Religence home">
                  <BrandLogo auth />
                </Link>
              </div>
              <div className="box-body !p-0">
                <p className="h5 font-semibold mb-2 text-center">Set New Password</p>

                {err && (
                  <div
                    className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
                    role="alert"
                  >
                    {err}
                  </div>
                )}

                {done ? (
                  <div className="p-4 text-sm border-t-4 border-success text-success rounded-lg bg-green-50 dark:bg-gray-800">
                    Password updated.{" "}
                    <Link href="/" className="underline font-medium">
                      Sign in
                    </Link>
                    .
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-12 gap-y-4">
                      <div className="xl:col-span-12 col-span-12">
                        <label htmlFor="rp-password" className="form-label text-default block">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            name="password"
                            type={show ? "text" : "password"}
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setError("");
                            }}
                            className="form-control form-control-lg !rounded-md !pe-11"
                            id="rp-password"
                            placeholder="new password"
                          />
                          <button
                            onClick={() => setShow(!show)}
                            aria-label="Toggle password visibility"
                            className="absolute inset-y-0 end-0 flex items-center justify-center !h-11 !w-11 text-defaulttextcolor/60 hover:text-defaulttextcolor rounded-md transition-colors duration-150 active:scale-95 focus-visible:outline-none focus-visible:!ring-2 focus-visible:!ring-primary/25 focus-visible:!ring-offset-1 dark:focus-visible:!ring-offset-bodybg"
                            type="button"
                          >
                            <i className={`${show ? "ri-eye-line" : "ri-eye-off-line"} align-middle`}></i>
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-[#8c9097] dark:text-white/50">
                          At least 8 characters, with a letter and a number.
                        </p>
                      </div>
                      <div className="xl:col-span-12 col-span-12 grid mt-0">
                        <button
                          onClick={handleReset}
                          disabled={busy}
                          className="ti-btn ti-btn-primary !bg-primary !text-bodybg !font-medium disabled:opacity-60"
                        >
                          {busy ? "Updating…" : "Update Password"}
                        </button>
                      </div>
                    </div>
                    <div className="text-center mt-4">
                      <Link href="/" className="text-primary text-sm font-medium">
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
