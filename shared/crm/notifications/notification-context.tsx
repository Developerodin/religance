"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  deleteNotification,
  getNotifications,
  type NotificationItem,
} from "./notifications-api";

const NOTIFICATION_POLL_INTERVAL_MS = 60_000;
const BELL_DROPDOWN_LIMIT = 20;

// Module-level bridge — CrmContext calls triggerNotificationRefresh() after scan/emit
let notificationRefreshCallback: (() => Promise<void>) | null = null;

export function registerNotificationRefresh(fn: () => Promise<void>): void {
  notificationRefreshCallback = fn;
}

export function triggerNotificationRefresh(): void {
  void notificationRefreshCallback?.();
}

type NotificationContextValue = {
  items: NotificationItem[];
  total: number;
  activityTotal: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  dismiss: (id: string) => Promise<boolean>;
  dismissAndNavigate: (id: string, href: string) => Promise<boolean>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [activityTotal, setActivityTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await getNotifications({ limit: BELL_DROPDOWN_LIMIT });
      if (!res.live) {
        setError(res.error);
        setTotal(0);
        setActivityTotal(0);
        setItems([]);
        return;
      }
      setError(null);
      setItems(res.data.items);
      setTotal(res.data.total);
      setActivityTotal(res.data.activityTotal);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    registerNotificationRefresh(refresh);
    return () => registerNotificationRefresh(async () => {});
  }, [refresh]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, NOTIFICATION_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const dismiss = useCallback(
    async (id: string): Promise<boolean> => {
      const target = items.find((n) => n.id === id);
      // Await DELETE before optimistic UI — ensures dismissal recorded before CRM scan can run
      const res = await deleteNotification(id, "dismiss");
      if (!res.live) {
        void refresh();
        return false;
      }
      setItems((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (target?.category === "activity") {
        setActivityTotal((prev) => Math.max(0, prev - 1));
      }
      return true;
    },
    [items, refresh]
  );

  const dismissAndNavigate = useCallback(
    async (id: string, href: string): Promise<boolean> => {
      const target = items.find((n) => n.id === id);
      const res = await deleteNotification(id, "navigate");
      if (!res.live) {
        void refresh();
        return false;
      }
      setItems((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (target?.category === "activity") {
        setActivityTotal((prev) => Math.max(0, prev - 1));
      }
      router.push(href);
      return true;
    },
    [items, refresh, router]
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      items,
      total,
      activityTotal,
      loading,
      error,
      refresh,
      dismiss,
      dismissAndNavigate,
    }),
    [items, total, activityTotal, loading, error, refresh, dismiss, dismissAndNavigate]
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
