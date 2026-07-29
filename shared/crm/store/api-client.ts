"use client";

import { getToken, logout } from "@/shared/auth/auth-client";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_RELIGENCE_BACKEND_URL ?? "http://localhost:4000";
const REQUEST_TIMEOUT_MS = 12000;

export type JsonResult<T> =
  | { live: true; data: T }
  | { live: false; error: string };

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken() ?? ""}`,
  };
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function normalizeFetchError(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "Request timed out. Please try again.";
  }
  return err instanceof Error ? err.message : "Network request failed";
}

function handleUnauthorized(status: number): boolean {
  if (status !== 401) return false;
  logout();
  if (typeof window !== "undefined") window.location.href = "/";
  return true;
}

export async function apiGet<T>(path: string): Promise<JsonResult<T>> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_BASE}${path}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      if (handleUnauthorized(res.status)) {
        return { live: false, error: "Session expired. Please sign in again." };
      }
      const body = await res.json().catch(() => ({}));
      const message =
        (body as { error?: string }).error ?? `Request failed (${res.status})`;
      return { live: false, error: message };
    }
    return { live: true, data: (await res.json()) as T };
  } catch (err) {
    return { live: false, error: normalizeFetchError(err) };
  }
}

export async function apiSend<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  payload?: unknown
): Promise<JsonResult<T>> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_BASE}${path}`, {
      method,
      headers: authHeaders(),
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    if (!res.ok) {
      if (handleUnauthorized(res.status)) {
        return { live: false, error: "Session expired. Please sign in again." };
      }
      const body = await res.json().catch(() => ({}));
      const message =
        (body as { error?: string }).error ?? `Request failed (${res.status})`;
      return { live: false, error: message };
    }
    if (res.status === 204) return { live: true, data: undefined as T };
    return { live: true, data: (await res.json()) as T };
  } catch (err) {
    return { live: false, error: normalizeFetchError(err) };
  }
}
