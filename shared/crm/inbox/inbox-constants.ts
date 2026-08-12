import type { InboxTag } from "./inbox-utils";

// `badge` is spelled out on every folder (undefined where there is none) so the
// union stays uniform and `folder.badge` type-checks at the call site.
export const INBOX_FOLDERS = [
  { name: "Inbox", icon: "ri-inbox-line", badge: "purple-soft" as const },
  { name: "Drafts", icon: "ri-draft-line", badge: undefined },
  { name: "Sent Items", icon: "ri-send-plane-line", badge: undefined },
  { name: "Deleted Items", icon: "ri-delete-bin-line", badge: undefined },
  { name: "Junk Email", icon: "ri-spam-2-line", badge: "danger" as const },
  { name: "Archive", icon: "ri-archive-line", badge: undefined },
  {
    name: "Conversation History",
    icon: "ri-chat-history-line",
    badge: undefined,
  },
] as const;

export type InboxFolderName = (typeof INBOX_FOLDERS)[number]["name"];

/** Outlook folder label ids used by Graph listThreads. */
export const INBOX_FOLDER_LABEL_IDS: Record<InboxFolderName, string> = {
  Inbox: "INBOX",
  Drafts: "DRAFT",
  "Sent Items": "SENT",
  "Deleted Items": "TRASH",
  "Junk Email": "JUNK",
  Archive: "ARCHIVE",
  "Conversation History": "CONVERSATION_HISTORY",
};

export const INBOX_LABELS: {
  name: InboxTag;
  label: string;
  bagClass: string;
}[] = [
  { name: "finance", label: "Mall", bagClass: "bag-blue" },
  { name: "internal", label: "Home", bagClass: "bag-red" },
  { name: "lead", label: "Work", bagClass: "bag-green" },
  { name: "unlinked", label: "Friends", bagClass: "bag-yellow" },
];
