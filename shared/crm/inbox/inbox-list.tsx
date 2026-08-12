"use client";

import type { CrmEmail } from "@/shared/crm/store/types";
import { InboxAvatar } from "./inbox-avatar";
import type { InboxFolderName } from "./inbox-constants";
import { InboxOverflowMenu } from "./inbox-overflow-menu";
import {
  formatInboxTime,
  INBOX_LIST_TAG_CLASS,
  INBOX_TAG_LABELS,
} from "./inbox-utils";
import { InboxSyncIndicator } from "./inbox-sync-indicator";

function formatLastSynced(iso: string): string {
  const syncedAt = new Date(iso).getTime();
  if (Number.isNaN(syncedAt)) return "just now";
  const minutes = Math.floor((Date.now() - syncedAt) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatInboxTime(iso);
}

export type InboxRowMeta = {
  from: string;
  peer: string;
  tag: import("./inbox-utils").InboxTag;
  read: boolean;
  lead?: { title: string; stage: import("@/shared/crm/store/types").LeadStage };
};

export function InboxListPanel({
  outlookConnected,
  onConnect,
  activeFolder,
  searchQuery,
  onSearchChange,
  emails,
  rowMeta,
  selectedId,
  onSelect,
  starredIds,
  onToggleStar,
  checkedIds,
  onToggleCheck,
  onToggleCheckAll,
  allChecked,
  loading = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  syncing = false,
  syncError = null,
  lastSyncedAt = null,
  onRefresh,
  onBulkMarkRead,
  onBulkArchive,
  onBulkUnarchive,
  onBulkDelete,
  variant = "rows",
  hideToolbar = false,
  unreadCount = null,
  onOpenFilters,
}: {
  outlookConnected: boolean;
  onConnect: () => void;
  loading?: boolean;
  activeFolder: InboxFolderName;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  emails: CrmEmail[];
  rowMeta: (email: CrmEmail) => InboxRowMeta;
  selectedId: string | null;
  onSelect: (id: string) => void;
  starredIds: string[];
  onToggleStar: (id: string, ev: React.MouseEvent) => void;
  checkedIds: string[];
  onToggleCheck: (id: string) => void;
  onToggleCheckAll: () => void;
  allChecked: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  syncing?: boolean;
  syncError?: string | null;
  lastSyncedAt?: string | null;
  onRefresh?: () => void;
  onBulkMarkRead?: () => void;
  onBulkArchive?: () => void;
  onBulkUnarchive?: () => void;
  onBulkDelete?: () => void;
  /** Card layout for tablet/mobile lists. */
  variant?: "rows" | "cards";
  /** Mobile uses its own header; hide the desktop toolbar. */
  hideToolbar?: boolean;
  unreadCount?: number | null;
  onOpenFilters?: () => void;
}) {
  const bulkMenuItems =
    checkedIds.length === 0
      ? []
      : [
          ...(onBulkMarkRead
            ? [
                {
                  id: "read",
                  label: "Mark as read",
                  icon: "ri-mail-open-line",
                  onClick: onBulkMarkRead,
                },
              ]
            : []),
          ...(activeFolder === "Archive" || activeFolder === "Deleted Items"
            ? onBulkUnarchive
              ? [
                  {
                    id: "unarchive",
                    label: "Move to Inbox",
                    icon: "ri-inbox-unarchive-line",
                    onClick: onBulkUnarchive,
                  },
                ]
              : []
            : onBulkArchive
              ? [
                  {
                    id: "archive",
                    label: "Archive",
                    icon: "ri-archive-line",
                    onClick: onBulkArchive,
                  },
                ]
              : []),
          ...(onBulkDelete
            ? [
                {
                  id: "delete",
                  label: "Delete",
                  icon: "ri-delete-bin-line",
                  onClick: onBulkDelete,
                  destructive: true,
                },
              ]
            : []),
        ];

  const isCards = variant === "cards";

  return (
    <section
      className={`crm-inbox-list-panel${isCards ? " is-cards" : ""}`}
    >
      {!hideToolbar ? (
        <header className="crm-inbox-list-toolbar">
          <div className="crm-inbox-list-toolbar-left">
            <input
              type="checkbox"
              className="form-check-input crm-inbox-check"
              checked={allChecked && emails.length > 0}
              onChange={onToggleCheckAll}
              aria-label="Select all"
            />
            <h2 className="crm-inbox-list-folder-title">
              {activeFolder}
              {activeFolder === "Inbox" &&
              typeof unreadCount === "number" &&
              unreadCount > 0 ? (
                <span className="crm-inbox-list-unread-pill">
                  {unreadCount > 999 ? "999+" : unreadCount}
                </span>
              ) : null}
            </h2>
            {outlookConnected && (syncing || lastSyncedAt || onRefresh) ? (
              <div className="crm-inbox-list-sync-meta">
                {syncing ? (
                  <span className="crm-inbox-sync-status" aria-live="polite">
                    <InboxSyncIndicator active />
                    Syncing…
                  </span>
                ) : lastSyncedAt ? (
                  <span className="crm-inbox-sync-status" aria-live="polite">
                    Updated {formatLastSynced(lastSyncedAt)}
                  </span>
                ) : null}
                {onRefresh ? (
                  <button
                    type="button"
                    className="crm-inbox-refresh-btn"
                    onClick={onRefresh}
                    disabled={syncing}
                    aria-label="Refresh inbox"
                    title="Refresh inbox"
                  >
                    {syncing ? (
                      <InboxSyncIndicator active size="sm" />
                    ) : (
                      <i className="ri-refresh-line" aria-hidden />
                    )}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="crm-inbox-list-toolbar-right">
            {onOpenFilters ? (
              <button
                type="button"
                className="crm-inbox-icon-btn"
                onClick={onOpenFilters}
                aria-label="Filters"
                title="Filters"
              >
                <i className="ri-filter-3-line" aria-hidden />
              </button>
            ) : null}
            <InboxOverflowMenu
              items={
                bulkMenuItems.length > 0
                  ? bulkMenuItems
                  : [
                      {
                        id: "hint",
                        label: "Select messages for bulk actions",
                        onClick: () => {},
                        disabled: true,
                      },
                    ]
              }
              ariaLabel="List actions"
            />
          </div>
        </header>
      ) : null}

      <div className="crm-inbox-search">
        <i className="ri-search-line"></i>
        <input
          type="search"
          placeholder="Search Email"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search email"
        />
        {onOpenFilters && hideToolbar ? (
          <button
            type="button"
            className="crm-inbox-search-filter-btn"
            onClick={onOpenFilters}
            aria-label="Open filters"
          >
            <i className="ri-filter-3-line" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="crm-inbox-list-scroll">
        {!outlookConnected ? (
          <InboxEmptyState
            icon="ri-mail-lock-line"
            title="Connect your inbox"
            description="Sync Outlook to load threads and send from CRM."
            action={
              <button
                type="button"
                className="crm-inbox-connect-btn"
                onClick={onConnect}
              >
                Connect Outlook
              </button>
            }
          />
        ) : loading ? (
          <InboxListSkeleton cards={isCards} />
        ) : syncError && emails.length === 0 ? (
          <InboxEmptyState
            icon="ri-mail-close-line"
            title="Couldn't load your inbox"
            description={syncError}
            action={
              <button
                type="button"
                className="crm-inbox-connect-btn"
                onClick={onConnect}
              >
                Reconnect Outlook
              </button>
            }
          />
        ) : emails.length === 0 ? (
          <InboxEmptyState
            icon="ri-inbox-archive-line"
            title={`No messages in ${activeFolder}`}
            description="Try another folder or clear filters."
          />
        ) : (
          <>
            {emails.map((email) => {
              const meta = rowMeta(email);
              const selected = selectedId === email.id;
              const starred = starredIds.includes(email.id);
              const checked = checkedIds.includes(email.id);
              const tagLabel = INBOX_TAG_LABELS[meta.tag];
              const linked = Boolean(meta.lead) || meta.tag === "lead";
              return (
                <article
                  key={email.id}
                  className={`crm-inbox-list-item${isCards ? " is-card" : ""}${
                    selected ? " is-selected" : ""
                  }${!meta.read ? " is-unread" : ""}`}
                >
                  {!isCards ? (
                    <input
                      type="checkbox"
                      className="form-check-input crm-inbox-check crm-inbox-row-check"
                      checked={checked}
                      onChange={() => onToggleCheck(email.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${email.subject}`}
                    />
                  ) : null}
                  <button
                    type="button"
                    className="crm-inbox-list-item-main"
                    onClick={() => onSelect(email.id)}
                  >
                    <InboxAvatar name={meta.from} size="md" />
                    <div className="crm-inbox-list-item-body">
                      <div className="crm-inbox-list-item-row">
                        <div className="crm-inbox-list-sender-wrap">
                          <span className="crm-inbox-list-sender">
                            {meta.from}
                          </span>
                          <span
                            className={`crm-inbox-link-badge${
                              linked ? " is-linked" : " is-unlinked"
                            }`}
                          >
                            {linked ? "Linked" : "Unlinked"}
                          </span>
                          {!isCards ? (
                            <span
                              className={`crm-inbox-list-tag ${INBOX_LIST_TAG_CLASS[meta.tag]}`}
                            >
                              {tagLabel}
                            </span>
                          ) : null}
                        </div>
                        <span className="crm-inbox-list-time">
                          {formatInboxTime(email.sentAt)}
                        </span>
                      </div>
                      <p className="crm-inbox-list-subject">{email.subject}</p>
                      <p className="crm-inbox-list-preview">{email.preview}</p>
                    </div>
                  </button>
                  <div className="crm-inbox-list-item-end">
                    <button
                      type="button"
                      className={`crm-inbox-star-btn${starred ? " is-starred" : ""}`}
                      onClick={(e) => onToggleStar(email.id, e)}
                      aria-label={starred ? "Unstar" : "Star"}
                    >
                      <i
                        className={starred ? "ri-star-fill" : "ri-star-line"}
                      ></i>
                    </button>
                  </div>
                </article>
              );
            })}
            {hasMore && onLoadMore ? (
              <div className="crm-inbox-load-more">
                <p className="crm-inbox-load-more-count">
                  Showing {emails.length}{" "}
                  {emails.length === 1 ? "message" : "messages"}
                </p>
                <button
                  type="button"
                  className="crm-inbox-load-more-btn"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  aria-busy={loadingMore}
                  aria-label="Load older messages"
                >
                  {loadingMore ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        aria-hidden
                      />
                      Loading older messages…
                    </>
                  ) : (
                    "Load older messages"
                  )}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

/**
 * Mirrors the real row's structure so the list doesn't reflow when mail lands.
 * A skeleton, not a spinner: the switch usually resolves in about a second, and
 * a shape that matches the content reads as "loading" without a blocking overlay.
 */
function InboxListSkeleton({ cards = false }: { cards?: boolean }) {
  return (
    <div
      className={`crm-inbox-list-skeleton${cards ? " is-cards" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading messages"
    >
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className={`crm-inbox-list-item crm-inbox-skeleton-item${
            cards ? " is-card" : ""
          }`}
        >
          <span className="crm-inbox-skeleton-avatar crm-inbox-shimmer" />
          <div className="crm-inbox-skeleton-body">
            <div className="crm-inbox-skeleton-row">
              <span className="crm-inbox-shimmer crm-inbox-skeleton-sender" />
              <span className="crm-inbox-shimmer crm-inbox-skeleton-time" />
            </div>
            <span className="crm-inbox-shimmer crm-inbox-skeleton-subject" />
            <span className="crm-inbox-shimmer crm-inbox-skeleton-preview" />
          </div>
        </div>
      ))}
    </div>
  );
}

function InboxEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="crm-inbox-empty">
      <span className="crm-inbox-empty-icon">
        <i className={icon}></i>
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
