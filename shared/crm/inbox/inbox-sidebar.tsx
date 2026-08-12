"use client";

import { getUser, getUserDisplayName } from "@/shared/auth/auth-client";
import { resolveMailboxProfile } from "./inbox-utils";
import { INBOX_FOLDERS, type InboxFolderName } from "./inbox-constants";
import { INBOX_TAG_LABELS, type InboxTag } from "./inbox-utils";
import { InboxAvatar } from "./inbox-avatar";

const TAG_FILTERS: { tag: InboxTag; dotClass: string }[] = [
  { tag: "lead", dotClass: "bg-primary" },
  { tag: "unlinked", dotClass: "bg-warning" },
  { tag: "internal", dotClass: "bg-info" },
  { tag: "finance", dotClass: "bg-success" },
];

function folderBadgeClasses(badge?: "purple-soft" | "danger") {
  if (badge === "purple-soft") {
    return "bg-primary/90 text-white";
  }
  if (badge === "danger") {
    return "bg-danger/25 text-danger";
  }
  return "bg-black/10 text-textmuted dark:bg-white/10";
}

export function InboxSidebar({
  outlookConnected,
  accountEmail,
  accountDisplayName,
  onDisconnectOutlook,
  onConnect,
  onCompose,
  activeFolder,
  onFolderChange,
  folderCounts,
  activeTag,
  onTagChange,
  compact = false,
}: {
  outlookConnected: boolean;
  accountEmail: string | null;
  accountDisplayName?: string | null;
  onDisconnectOutlook?: () => void | Promise<void>;
  onConnect: () => void;
  onCompose: () => void;
  activeFolder: InboxFolderName;
  onFolderChange: (folder: InboxFolderName) => void;
  folderCounts: Partial<Record<InboxFolderName, number | null>>;
  activeTag: InboxTag | null;
  onTagChange: (tag: InboxTag | null) => void;
  /** Tablet: icon-first narrow rail. Desktop: full sidebar. */
  compact?: boolean;
}) {
  const mailboxProfile =
    outlookConnected && accountEmail
      ? resolveMailboxProfile({
          email: accountEmail,
          displayName: accountDisplayName,
        })
      : null;
  const displayName = mailboxProfile?.name ?? getUserDisplayName();
  const displayEmail = mailboxProfile?.email ?? getUser()?.email ?? accountEmail;

  return (
    <aside
      className={`crm-inbox-sidebar${compact ? " is-compact" : ""}`}
      aria-label="Mail folders"
    >
      <div className="crm-inbox-sidebar-scroll">
        <button
          type="button"
          disabled={!outlookConnected}
          onClick={onCompose}
          className="crm-inbox-compose-mail"
          title="Compose Mail"
          aria-label="Compose Mail"
        >
          <i className="ri-add-line" aria-hidden />
          <span className="crm-inbox-sidebar-label">Compose Mail</span>
        </button>

        {!compact ? (
          <div className="crm-inbox-profile-card">
            <InboxAvatar name={displayName} size="lg" />
            <div className="crm-inbox-profile-meta">
              <p className="crm-inbox-profile-name">{displayName}</p>
              <p className="crm-inbox-profile-email">
                {outlookConnected
                  ? displayEmail ?? "Outlook connected"
                  : displayEmail ?? "Connect Outlook to sync"}
              </p>
              {outlookConnected && onDisconnectOutlook ? (
                <button
                  type="button"
                  className="crm-inbox-profile-logout"
                  onClick={() => void onDisconnectOutlook()}
                >
                  <i className="ri-logout-box-r-line" aria-hidden />
                  Disconnect Outlook
                </button>
              ) : null}
            </div>
          </div>
        ) : outlookConnected && onDisconnectOutlook ? (
          <button
            type="button"
            className="crm-inbox-sidebar-icon-btn"
            onClick={() => void onDisconnectOutlook()}
            title="Disconnect Outlook"
            aria-label="Disconnect Outlook"
          >
            <i className="ri-logout-box-r-line" aria-hidden />
          </button>
        ) : null}

        {!outlookConnected ? (
          <button
            type="button"
            className="crm-inbox-connect-btn"
            onClick={onConnect}
          >
            <i className="ri-microsoft-fill me-1" aria-hidden />
            <span className="crm-inbox-sidebar-label">Connect Outlook</span>
          </button>
        ) : null}

        <p className="crm-inbox-nav-title">
          <span className="crm-inbox-sidebar-label">Mails</span>
        </p>
        <nav className="crm-inbox-folders" aria-label="Mail folders">
          {INBOX_FOLDERS.map((f) => {
            const count = folderCounts[f.name];
            const isActive = activeFolder === f.name;
            return (
              <button
                key={f.name}
                type="button"
                onClick={() => {
                  onFolderChange(f.name);
                  onTagChange(null);
                }}
                aria-current={isActive ? "page" : undefined}
                title={f.name}
                className={`crm-inbox-folder-btn${isActive ? " is-active" : ""}`}
              >
                <span className="crm-inbox-folder-label">
                  <i className={f.icon} aria-hidden />
                  <span className="crm-inbox-sidebar-label">{f.name}</span>
                </span>
                {count === null || count === undefined ? (
                  <span className="crm-inbox-folder-badge crm-inbox-sidebar-label">
                    —
                  </span>
                ) : count > 0 ? (
                  <span
                    className={`crm-inbox-folder-badge ${
                      f.badge === "purple-soft"
                        ? "badge-purple-soft"
                        : f.badge === "danger"
                          ? "badge-danger"
                          : ""
                    } ${folderBadgeClasses(f.badge)}`}
                  >
                    {count > 9999 ? "9999+" : count.toLocaleString()}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <p className="crm-inbox-nav-title">
          <span className="crm-inbox-sidebar-label">Quick filters</span>
        </p>
        <div className="crm-inbox-folders crm-inbox-quick-filters">
          {TAG_FILTERS.map(({ tag, dotClass }) => {
            const isActive = activeTag === tag;
            const label = INBOX_TAG_LABELS[tag];
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={isActive}
                title={label}
                onClick={() => onTagChange(isActive ? null : tag)}
                className={`crm-inbox-folder-btn${isActive ? " is-active" : ""}`}
              >
                <span className="crm-inbox-folder-label">
                  <span
                    className={`crm-inbox-filter-dot ${dotClass}`}
                    aria-hidden
                  />
                  <span className="crm-inbox-sidebar-label">{label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
