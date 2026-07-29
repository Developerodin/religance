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

const navBtnBase =
  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-defaulttextcolor outline-none transition-[transform,opacity,background-color] duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2";

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
    <aside className="flex w-full shrink-0 flex-col border-defaultborder/80 bg-light/35 dark:bg-black/20 xl:w-[268px] xl:border-e max-xl:max-h-64 max-xl:border-b max-xl:border-e-0">
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-4">
        <button
          type="button"
          disabled={!outlookConnected}
          onClick={onCompose}
          className="ti-btn ti-btn-primary mb-4 flex w-full items-center justify-center gap-2 !rounded-lg !py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          <i className="ri-add-line text-base" aria-hidden />
          Compose Mail
        </button>

        <div className="mb-3 rounded-lg border border-defaultborder/70 bg-white/60 p-3 dark:bg-black/25">
          <div className="flex items-start gap-3">
            <InboxAvatar name={displayName} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 truncate text-sm font-semibold text-defaulttextcolor">
                {displayName}
              </p>
              <p className="mb-0 break-all text-xs text-textmuted">
                {outlookConnected
                  ? displayEmail ?? "Outlook connected"
                  : displayEmail ?? "Connect Outlook to sync"}
              </p>
            </div>
          </div>
        </div>

        {outlookConnected && onDisconnectOutlook ? (
          <>
            <div
              className="mb-3 border-t border-defaultborder/60"
              role="separator"
              aria-hidden
            />
            <button
              type="button"
              className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-textmuted transition-[transform,opacity,background-color] duration-150 hover:bg-danger/10 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-2 motion-reduce:transition-none"
              onClick={() => void onDisconnectOutlook()}
            >
              <i className="ri-logout-box-r-line text-base" aria-hidden />
              Disconnect Outlook
            </button>
          </>
        ) : null}

        {!outlookConnected ? (
          <button
            type="button"
            className="ti-btn ti-btn-primary ti-btn-sm mb-4 w-full"
            onClick={onConnect}
          >
            <i className="ri-microsoft-fill me-1" aria-hidden />
            Connect Outlook
          </button>
        ) : null}

        <p className="mb-2 mt-0 px-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-textmuted">
          Mails
        </p>
        <nav
          className="mb-1 flex flex-col gap-0.5 px-1"
          aria-label="Mail folders"
        >
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
                className={`${navBtnBase} ${
                  isActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "hover:bg-light dark:hover:bg-white/5"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <i className={`${f.icon} text-base opacity-85`} aria-hidden />
                  <span className="truncate">{f.name}</span>
                </span>
                {count === null || count === undefined ? (
                  <span className="shrink-0 px-1 text-[0.62rem] font-medium tabular-nums text-textmuted">
                    —
                  </span>
                ) : count > 0 ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-bold tabular-nums ${folderBadgeClasses(f.badge)}`}
                  >
                    {count > 9999 ? "9999+" : count.toLocaleString()}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <p className="mb-2 mt-4 px-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-textmuted">
          Quick filters
        </p>
        <div className="flex flex-col gap-0.5 px-1 pb-1">
          {TAG_FILTERS.map(({ tag, dotClass }) => {
            const isActive = activeTag === tag;
            const label = INBOX_TAG_LABELS[tag];
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={isActive}
                onClick={() => onTagChange(isActive ? null : tag)}
                className={`${navBtnBase} ${
                  isActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "hover:bg-light dark:hover:bg-white/5"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`}
                    aria-hidden
                  />
                  <span className="truncate">{label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
