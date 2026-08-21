"use client";

import { useEffect, useMemo, useRef } from "react";

export type SlashCommandOption = {
  command: string;
  description: string;
};

/** Keep in sync with religence-backend slash-commands.ts SLASH_COMMANDS. */
export const MAIL_ASSISTANT_SLASH_COMMANDS: SlashCommandOption[] = [
  { command: "/create", description: "Schedule a new recurring or one-time email" },
  { command: "/send", description: "Send an email once, now or at a set time" },
  { command: "/list", description: "Show your scheduled emails" },
  { command: "/pause", description: "Pause a recurring email (optional name hint)" },
  { command: "/resume", description: "Resume a paused email (optional name hint)" },
  { command: "/cancel", description: "Cancel a scheduled email (optional name hint)" },
  { command: "/help", description: "Show available commands" },
];

type SlashCommandPickerProps = {
  input: string;
  open: boolean;
  highlightIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (command: string) => void;
};

export function slashCommandToken(input: string): string {
  const trimmed = input.trim();
  const spaceIdx = trimmed.indexOf(" ");
  const token = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
  return token.toLowerCase();
}

/** Unique prefix → full command (e.g. /cre → /create). Null if ambiguous or no match. */
export function resolveSlashCommandPrefix(input: string): string | null {
  const token = slashCommandToken(input);
  if (!token.startsWith("/")) return null;
  if (MAIL_ASSISTANT_SLASH_COMMANDS.some((c) => c.command === token)) return token;

  const matches = MAIL_ASSISTANT_SLASH_COMMANDS.filter((c) => c.command.startsWith(token));
  return matches.length === 1 ? matches[0].command : null;
}

export function isPartialSlashCommand(input: string): boolean {
  const token = slashCommandToken(input);
  if (!token.startsWith("/")) return false;
  if (MAIL_ASSISTANT_SLASH_COMMANDS.some((c) => c.command === token)) return false;
  return MAIL_ASSISTANT_SLASH_COMMANDS.some((c) => c.command.startsWith(token));
}

export function isAmbiguousSlashPrefix(input: string): boolean {
  const token = slashCommandToken(input);
  if (!token.startsWith("/")) return false;
  if (MAIL_ASSISTANT_SLASH_COMMANDS.some((c) => c.command === token)) return false;
  const matches = MAIL_ASSISTANT_SLASH_COMMANDS.filter((c) => c.command.startsWith(token));
  return matches.length > 1;
}

/** Expand unique slash prefix before submit; preserve trailing args. */
export function resolveSlashCommandInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return trimmed;

  const spaceIdx = trimmed.indexOf(" ");
  const args = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx);
  const resolved = resolveSlashCommandPrefix(trimmed);
  if (!resolved) return trimmed;
  return `${resolved}${args}`;
}

export function shouldBlockSlashSubmit(input: string, pickerOpen: boolean): boolean {
  if (!input.trim().startsWith("/")) return false;
  if (pickerOpen) return true;
  return isAmbiguousSlashPrefix(input);
}

export function filterSlashCommands(input: string): SlashCommandOption[] {
  if (!input.startsWith("/")) return [];
  // Match the command token only. Matching the whole input meant "/cre follow up to Bob"
  // filtered to zero options: picker invisible, submit blocked, input dead.
  const query = slashCommandToken(input);
  if (!query || query === "/") return MAIL_ASSISTANT_SLASH_COMMANDS;
  return MAIL_ASSISTANT_SLASH_COMMANDS.filter((c) => c.command.startsWith(query));
}

export function isSlashPickerOpen(input: string): boolean {
  if (!input.startsWith("/")) return false;
  if (input.includes("\n")) return false;
  const trimmed = input.trim().toLowerCase();
  if (MAIL_ASSISTANT_SLASH_COMMANDS.some((c) => c.command === trimmed)) {
    return false;
  }
  const spaceIdx = input.indexOf(" ");
  if (spaceIdx === -1) return true;
  const cmd = input.slice(0, spaceIdx).toLowerCase();
  return !MAIL_ASSISTANT_SLASH_COMMANDS.some((c) => c.command === cmd);
}

/** Replace the typed slash token with `command`, keeping any trailing args. */
export function buildSlashCommandInput(input: string, command: string): string {
  const spaceIdx = input.indexOf(" ");
  const args = spaceIdx === -1 ? "" : input.slice(spaceIdx);
  return args ? `${command}${args}` : `${command} `;
}

export default function SlashCommandPicker({
  input,
  open,
  highlightIndex,
  onHighlight,
  onSelect,
}: SlashCommandPickerProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const options = useMemo(() => filterSlashCommands(input), [input]);

  useEffect(() => {
    if (!open || highlightIndex < 0) return;
    listRef.current?.children[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, highlightIndex]);

  if (!open || !options.length) return null;

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label="Slash commands"
      className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-md border border-defaultborder dark:border-defaultborder/20 bg-white dark:bg-bodybg shadow-sm z-10 list-none p-1 mb-0"
    >
      {options.map((opt, idx) => (
        <li key={opt.command} role="option" aria-selected={idx === highlightIndex}>
          <button
            type="button"
            className={`w-full text-left rounded px-2.5 py-2 text-[0.8125rem] cursor-pointer border-0 ${
              idx === highlightIndex
                ? "bg-primary/10 text-defaulttextcolor"
                : "bg-transparent hover:bg-light/60 dark:hover:bg-black/20 text-defaulttextcolor"
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(opt.command);
            }}
            onMouseEnter={() => onHighlight(idx)}
          >
            <span className="font-medium">{opt.command}</span>
            <span className="text-textmuted text-[0.75rem] block mt-0.5">
              {opt.description}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("SlashCommandPicker.tsx")) {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(msg);
  };
  assert(buildSlashCommandInput("/pau", "/pause") === "/pause ", "no args");
  assert(
    buildSlashCommandInput("/pau weekly project", "/pause") === "/pause weekly project",
    "preserve args"
  );
  assert(isSlashPickerOpen("/create") === false, "exact command closes picker");
  assert(isSlashPickerOpen("/pau") === true, "partial keeps picker open");
  assert(resolveSlashCommandPrefix("/cre") === "/create", "prefix resolve");
  assert(isPartialSlashCommand("/cre") === true, "partial detect");
  assert(isAmbiguousSlashPrefix("/c") === true, "ambiguous prefix");
  assert(
    resolveSlashCommandInput("/crea follow up") === "/create follow up",
    "expand with args"
  );
  assert(shouldBlockSlashSubmit("/cre", true) === true, "block while picker open");
  assert(shouldBlockSlashSubmit("/cre", false) === false, "allow unique prefix submit");
  // regression: a prefix with args must still offer options, or the input is unsubmittable
  assert(
    filterSlashCommands("/cre follow up to Bob").length === 1,
    "prefix with args still matches"
  );
  assert(filterSlashCommands("/pau weekly").length === 1, "pause prefix with args");
  assert(filterSlashCommands("/").length === 7, "bare slash lists everything");
  assert(filterSlashCommands("/zz").length === 0, "no match stays empty");
  assert(filterSlashCommands("/se").length === 1, "/se resolves to /send");
  assert(resolveSlashCommandPrefix("/s") === "/send", "/s is unique");
  assert(isAmbiguousSlashPrefix("/c") === true, "/c stays ambiguous (create/cancel)");
  console.log("SlashCommandPicker self-check passed");
}
