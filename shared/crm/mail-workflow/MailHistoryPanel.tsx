"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getMailLink, listMailHistory } from "./mail-workflow-api";
import type { MailHistoryContact, MailHistoryEvent, RecipientSendStatus } from "./types";

type StatusStyle = { label: string; className: string };

const STATUS_STYLES: Record<RecipientSendStatus, StatusStyle> = {
  sent: { label: "Sent", className: "bg-success/10 text-success" },
  failed: { label: "Failed", className: "bg-danger/10 text-danger" },
  sending: { label: "Sending", className: "bg-info/10 text-info" },
  pending: { label: "Queued", className: "bg-light text-textmuted" },
  // Never dress this up as success — it is the one state that needs a human to go look.
  unknown: { label: "Unconfirmed", className: "bg-warning/10 text-warning" },
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatDay(iso: string | null): string {
  if (!iso) return "Unknown date";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "Unknown date";
  return dt.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** "3 days ago" without pulling in a date library. */
export function relativeFrom(iso: string | null, now = Date.now()): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const days = Math.floor((now - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function matchesQuery(contact: MailHistoryContact, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    contact.name.toLowerCase().includes(q) ||
    contact.company.toLowerCase().includes(q) ||
    contact.email.toLowerCase().includes(q) ||
    contact.events.some((e) => e.subject.toLowerCase().includes(q))
  );
}

function TimelineRow({
  event,
  onOpen,
  opening,
}: {
  event: MailHistoryEvent;
  onOpen: (e: MailHistoryEvent) => void;
  opening: boolean;
}) {
  const style = STATUS_STYLES[event.status] ?? STATUS_STYLES.unknown;
  return (
    <li className="relative pl-6 pb-4 last:pb-0">
      <span
        className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-primary"
        aria-hidden="true"
      />
      <span
        className="absolute left-[0.1875rem] top-4 bottom-0 w-px bg-defaultborder dark:bg-defaultborder/10 last:hidden"
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="mb-0 text-[0.8125rem] font-medium break-words">{event.subject}</p>
          <p className="mb-0 text-[0.75rem] text-textmuted">
            {formatDateTime(event.sentAt ?? event.scheduledAt)} · {event.templateName}
          </p>
          {event.errorMessage ? (
            <p className="mb-0 text-[0.75rem] text-danger break-words">
              {event.errorCode ? `${event.errorCode}: ` : ""}
              {event.errorMessage}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${style.className}`}
          >
            {style.label}
          </span>
          {event.linkable ? (
            <button
              type="button"
              className="ti-btn ti-btn-sm ti-btn-light !mb-0 !py-1 !px-2 !text-[0.6875rem]"
              onClick={() => onOpen(event)}
              disabled={opening}
            >
              {opening ? "Opening…" : "Open in mailbox"}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ContactCard({
  contact,
  expanded,
  onToggle,
  onOpen,
  openingKey,
}: {
  contact: MailHistoryContact;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (e: MailHistoryEvent) => void;
  openingKey: string | null;
}) {
  const grouped = useMemo(() => {
    const byDay = new Map<string, MailHistoryEvent[]>();
    for (const e of contact.events) {
      const day = formatDay(e.sentAt ?? e.scheduledAt);
      const bucket = byDay.get(day);
      if (bucket) bucket.push(e);
      else byDay.set(day, [e]);
    }
    return [...byDay.entries()];
  }, [contact.events]);

  return (
    <div className="rounded-md border border-defaultborder dark:border-defaultborder/10">
      <button
        type="button"
        className="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-3 text-start"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="mb-0 text-[0.8125rem] font-medium break-words">
            {contact.name}
            {contact.company ? (
              <span className="text-textmuted font-normal"> · {contact.company}</span>
            ) : null}
          </p>
          <p className="mb-0 text-[0.75rem] text-textmuted break-all">{contact.email}</p>
        </div>
        <div className="text-end shrink-0">
          <p className="mb-0 text-[0.75rem] text-textmuted">
            Last contacted {relativeFrom(contact.lastContactedAt)}
          </p>
          <p className="mb-0 text-[0.75rem]">
            <span className="text-success">{contact.totalSent} sent</span>
            {contact.totalFailed > 0 ? (
              <span className="text-danger"> · {contact.totalFailed} failed</span>
            ) : null}
          </p>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-defaultborder dark:border-defaultborder/10 p-3 space-y-3">
          {grouped.map(([day, events]) => (
            <div key={day}>
              <p className="mb-2 text-[0.6875rem] uppercase tracking-wide text-textmuted">
                {day}
              </p>
              <ul className="mb-0 list-none ps-0">
                {events.map((e) => (
                  <TimelineRow
                    key={`${e.runId}:${e.recipientId}`}
                    event={e}
                    onOpen={onOpen}
                    opening={openingKey === `${e.runId}:${e.recipientId}`}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function MailHistoryPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [contacts, setContacts] = useState<MailHistoryContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listMailHistory();
    setLoading(false);
    if (!res.live) {
      setError(res.error);
      return;
    }
    setError(null);
    setContacts(res.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const handleOpen = useCallback(async (event: MailHistoryEvent) => {
    const key = `${event.runId}:${event.recipientId}`;
    // Open the tab synchronously inside the click, then redirect it once the backend
    // answers — a window.open() after the await gets eaten by the popup blocker.
    const tab = window.open("", "_blank", "noopener,noreferrer");
    setOpeningKey(key);
    setLinkError(null);
    const res = await getMailLink(event.runId, event.recipientId);
    setOpeningKey(null);

    if (!res.live || !res.data.webLink) {
      tab?.close();
      setLinkError(
        res.live ? "That message is no longer in the mailbox." : res.error
      );
      return;
    }
    if (tab) tab.location.href = res.data.webLink;
    else window.location.href = res.data.webLink;
  }, []);

  const visible = useMemo(
    () => contacts.filter((c) => matchesQuery(c, query)),
    [contacts, query]
  );

  return (
    <div className="box custom-box !mb-0">
      <div className="box-header flex flex-wrap items-center justify-between gap-2">
        <div>
          <h6 className="box-title mb-0 before:!hidden">Mail history</h6>
          <p className="text-[0.75rem] text-textmuted mb-0 mt-1">
            Every send, grouped by the person contacted.
          </p>
        </div>
        <button
          type="button"
          className="ti-btn ti-btn-sm ti-btn-light !mb-0"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="box-body space-y-3">
        <input
          type="search"
          className="form-control form-control-sm"
          placeholder="Search by person, company or subject…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search mail history"
        />

        {linkError ? (
          <div className="alert alert-warning mb-0 text-[0.8125rem]" role="alert">
            {linkError}
          </div>
        ) : null}

        {error ? (
          <div className="alert alert-warning mb-0 text-[0.8125rem]" role="alert">
            Could not load mail history ({error}).
          </div>
        ) : null}

        {loading && contacts.length === 0 ? (
          <p className="text-textmuted text-[0.8125rem] mb-0">Loading history…</p>
        ) : null}

        {!loading && !error && contacts.length === 0 ? (
          <p className="text-textmuted text-[0.8125rem] mb-0">
            No mail sent yet. Once you send something, it shows up here against the
            person who received it.
          </p>
        ) : null}

        {contacts.length > 0 && visible.length === 0 ? (
          <p className="text-textmuted text-[0.8125rem] mb-0">
            No one matches “{query}”.
          </p>
        ) : null}

        {visible.map((contact) => (
          <ContactCard
            key={contact.contactId}
            contact={contact}
            expanded={expandedId === contact.contactId}
            onToggle={() =>
              setExpandedId((prev) =>
                prev === contact.contactId ? null : contact.contactId
              )
            }
            onOpen={handleOpen}
            openingKey={openingKey}
          />
        ))}
      </div>
    </div>
  );
}
