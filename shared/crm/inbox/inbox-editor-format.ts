export type FormatAction = {
  command: string;
  icon: string;
  label: string;
  stateful: boolean;
};

export const FORMAT_ACTIONS: FormatAction[] = [
  { command: "bold", icon: "ri-bold", label: "Bold", stateful: true },
  { command: "italic", icon: "ri-italic", label: "Italic", stateful: true },
  { command: "underline", icon: "ri-underline", label: "Underline", stateful: true },
  {
    command: "insertUnorderedList",
    icon: "ri-list-unordered",
    label: "Bulleted list",
    stateful: true,
  },
  {
    command: "insertOrderedList",
    icon: "ri-list-ordered",
    label: "Numbered list",
    stateful: true,
  },
  { command: "createLink", icon: "ri-link", label: "Insert link", stateful: false },
  {
    command: "removeFormat",
    icon: "ri-format-clear",
    label: "Clear formatting",
    stateful: false,
  },
];

/** http(s) only — blocks javascript: and bare hostnames without a scheme. */
export function isHttpUrl(url: string): boolean {
  return /^https?:\/\/\S+$/i.test(url.trim());
}

export function collectActiveFormats(
  actions: FormatAction[] = FORMAT_ACTIONS
): Set<string> {
  const next = new Set<string>();
  for (const action of actions) {
    if (!action.stateful) continue;
    try {
      if (document.queryCommandState(action.command)) next.add(action.command);
    } catch {
      /* unsupported command — leave inactive */
    }
  }
  return next;
}

/**
 * Apply a toolbar format to the focused contentEditable.
 * createLink prompts for a URL and only inserts when it is http(s).
 */
export function applyFormat(command: string): void {
  if (command === "createLink") {
    const raw = window.prompt("Link URL (https://…)");
    if (raw == null) return;
    const url = raw.trim();
    if (!isHttpUrl(url)) {
      window.alert("Enter a full http:// or https:// URL.");
      return;
    }
    document.execCommand("createLink", false, url);
    return;
  }
  document.execCommand(command);
}
