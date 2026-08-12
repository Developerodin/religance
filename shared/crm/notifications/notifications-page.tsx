"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import {
  deleteNotification,
  getNotifications,
  type NotificationCategory,
  type NotificationItem,
} from "./notifications-api";
import { triggerNotificationRefresh } from "./notification-context";
import { formatNotificationTime } from "./notification-time";

const PAGE_LIMIT = 50;

type Tab = "all" | NotificationCategory;

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "action", label: "Action items" },
  { id: "activity", label: "Activity" },
];

const iconColorForCategory = (category: NotificationCategory) =>
  category === "action"
    ? { bg: "!bg-primary/10", text: "text-primary" }
    : { bg: "!bg-secondary/10", text: "text-secondary" };

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    // Same unfiltered list as the header bell (actions + activity).
    const res = await getNotifications({ limit: PAGE_LIMIT });
    if (!res.live) {
      setError(res.error);
      setItems([]);
    } else {
      setError(null);
      setItems(res.data.items);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = tab === "all" ? items : items.filter((n) => n.category === tab);
  const actionCount = items.filter((n) => n.category === "action").length;
  const activityCount = items.length - actionCount;

  const onOpen = async (item: NotificationItem) => {
    const res = await deleteNotification(item.id, "navigate");
    if (!res.live) {
      void refresh();
      return;
    }
    setItems((prev) => prev.filter((n) => n.id !== item.id));
    triggerNotificationRefresh();
    router.push(item.href);
  };

  const onDismiss = async (id: string) => {
    const res = await deleteNotification(id, "dismiss");
    if (!res.live) {
      void refresh();
      return;
    }
    setItems((prev) => prev.filter((n) => n.id !== id));
    triggerNotificationRefresh();
  };

  const emptyTitle =
    tab === "action"
      ? "No action items"
      : tab === "activity"
        ? "No activity notifications"
        : "No notifications";

  return (
    <Fragment>
      <Seo title="Notifications" />
      <Pageheader
        currentpage="Notifications"
        activepage="CRM"
        mainpage="Notifications"
      />
      <div className="box custom-box">
        <div className="box-header justify-between">
          <h5 className="box-title mb-0 before:!hidden">Notifications</h5>
          {!loading && !error ? (
            <span className="badge bg-secondary/10 text-secondary">
              {visible.length} item{visible.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
          <nav className="flex gap-1" role="tablist" aria-label="Notification categories">
            {TABS.map((t) => {
              const count =
                t.id === "all"
                  ? items.length
                  : t.id === "action"
                    ? actionCount
                    : activityCount;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 text-[0.75rem] font-medium rounded-md whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                    tab === t.id
                      ? "bg-primary/10 text-primary"
                      : "text-textmuted hover:text-primary"
                  }`}
                >
                  {t.label}
                  {!loading && !error ? (
                    <span className="ms-1 opacity-70">({count})</span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
        <p className="mb-0 px-4 pt-2 text-[0.8125rem] text-textmuted">
          Action items and pipeline activity — the same list as the header bell.
        </p>
        <div className="box-body !pt-3">
          {loading ? (
            <p className="mb-0 py-8 text-center text-[0.8125rem] text-textmuted" role="status">
              Loading notifications…
            </p>
          ) : error ? (
            <p className="mb-0 py-8 text-center text-[0.8125rem] text-danger" role="alert">
              {error}
            </p>
          ) : visible.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <span
                className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10 text-[1.5rem] text-secondary"
                aria-hidden="true"
              >
                <i className="ti ti-bell-off" />
              </span>
              <p className="mb-1 mt-3 text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white">
                {emptyTitle}
              </p>
              <p className="mb-0 text-[0.8125rem] text-textmuted dark:text-white/50">
                You&apos;re all caught up.
              </p>
            </div>
          ) : (
            <ul className="list-none !m-0 !p-0 divide-y divide-defaultborder dark:divide-white/10">
              {visible.map((item) => {
                const colors = iconColorForCategory(item.category);
                const received = formatNotificationTime(item.createdAt);
                return (
                  <li key={item.id} className="flex items-start gap-3 px-1 py-3">
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[1.125rem] ${colors.bg} ${colors.text}`}
                      aria-hidden="true"
                    >
                      <i className={`ti ti-${item.icon}`} />
                    </span>
                    <button
                      type="button"
                      className="min-w-0 flex-1 rounded-md text-start transition-colors hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 dark:hover:bg-white/[0.04]"
                      onClick={() => void onOpen(item)}
                    >
                      <p className="mb-0 text-[0.8125rem] font-semibold leading-snug text-defaulttextcolor dark:text-white">
                        {item.title}
                      </p>
                      <p className="mb-0 mt-0.5 text-[0.75rem] font-normal leading-snug text-textmuted dark:text-white/50">
                        {item.body}
                      </p>
                      <time
                        className="mt-1 block text-[0.6875rem] font-normal text-textmuted/80 dark:text-white/40"
                        dateTime={received.iso}
                        title={received.title}
                      >
                        {received.label}
                      </time>
                    </button>
                    <button
                      type="button"
                      aria-label={`Dismiss ${item.title}`}
                      className="inline-flex shrink-0 items-center justify-center rounded-md text-textmuted transition-colors hover:bg-black/5 hover:text-defaulttextcolor focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white min-h-[2.75rem] min-w-[2.75rem]"
                      onClick={() => void onDismiss(item.id)}
                    >
                      <i className="ti ti-x" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Fragment>
  );
}
