"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/shared/ui/button";

import {
  listSequenceProgress,
  updateWorkflowSchedule,
} from "./mail-workflow-api";
import type { SequenceProgressItem, SequenceStepProgress, SequenceStepStatus } from "./types";

type StatusStyle = { label: string; className: string };

const STATUS_STYLES: Record<SequenceStepStatus, StatusStyle> = {
  sent: { label: "Sent", className: "bg-success/10 text-success" },
  pending: { label: "Pending", className: "bg-light text-textmuted" },
  failed: { label: "Failed", className: "bg-danger/10 text-danger" },
  skipped: { label: "Skipped", className: "bg-warning/10 text-warning" },
};

function formatDateTime(iso: string | null, timezone: string): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(dt);
  } catch {
    return dt.toLocaleString();
  }
}

function toLocalInput(iso: string, timezone: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(dt);
    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") map[p.type] = p.value;
    }
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  } catch {
    return "";
  }
}

/** Best-effort: interpret datetime-local as workspace timezone via offset-free ISO. */
export function localInputToIso(local: string, timezone: string): string | null {
  if (!local) return null;
  const [datePart, timePart] = local.split("T");
  if (!datePart || !timePart) return null;
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  if (![y, mo, d, h, mi].every(Number.isFinite)) return null;
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi));
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const target = `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")} ${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
  let lo = guess.getTime() - 36e5 * 14;
  let hi = lo + 36e5 * 28;
  for (let i = 0; i < 24; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const parts: Record<string, string> = {};
    for (const p of fmt.formatToParts(new Date(mid))) {
      if (p.type !== "literal") parts[p.type] = p.value;
    }
    const cur = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
    if (cur === target) return new Date(mid).toISOString();
    if (cur < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return null;
}

function StepRow({ step, timezone }: { step: SequenceStepProgress; timezone: string }) {
  const style = STATUS_STYLES[step.status] ?? STATUS_STYLES.pending;
  return (
    <li className="relative pl-6 pb-3 last:pb-0">
      <span
        className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-primary"
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="mb-0 text-[0.8125rem] font-medium">
            Step {step.index} · {step.templateName}
          </p>
          <p className="mb-0 text-[0.75rem] text-textmuted">
            {formatDateTime(step.at, timezone)}
            {step.sentAt ? ` · sent ${formatDateTime(step.sentAt, timezone)}` : ""}
          </p>
        </div>
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[0.6875rem] font-medium shrink-0 ${style.className}`}
        >
          {style.label}
        </span>
      </div>
    </li>
  );
}

function SequenceCard({
  item,
  expanded,
  editing,
  editTimes,
  saving,
  saveError,
  onToggle,
  onEdit,
  onCancelEdit,
  onSave,
  onEditTime,
}: {
  item: SequenceProgressItem;
  expanded: boolean;
  editing: boolean;
  editTimes: Record<number, string>;
  saving: boolean;
  saveError: string | null;
  onToggle: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onEditTime: (index: number, value: string) => void;
}) {
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
            {item.name}
            {item.contact.name ? (
              <span className="text-textmuted font-normal"> · {item.contact.name}</span>
            ) : null}
          </p>
          <p className="mb-0 text-[0.75rem] text-textmuted break-all">{item.contact.email}</p>
        </div>
        <div className="text-end shrink-0">
          <p className="mb-0 text-[0.75rem]">
            <span className="text-success">{item.sentSteps} sent</span>
            <span className="text-textmuted"> · {item.remainingCount} remaining</span>
          </p>
          <p className="mb-0 text-[0.75rem] text-textmuted">
            Next: {formatDateTime(item.nextPendingAt, item.timezone)}
          </p>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-defaultborder dark:border-defaultborder/10 p-3 space-y-3">
          <ul className="mb-0 list-none ps-0">
            {item.steps.map((step) =>
              editing && (step.status === "pending" || step.status === "failed") ? (
                <li key={step.index} className="pb-3 last:pb-0">
                  <label className="text-[0.75rem] text-textmuted block mb-1">
                    Step {step.index} ({step.templateName})
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control form-control-sm"
                    value={editTimes[step.index] ?? toLocalInput(step.at, item.timezone)}
                    onChange={(e) => onEditTime(step.index, e.target.value)}
                  />
                </li>
              ) : (
                <StepRow key={step.index} step={step} timezone={item.timezone} />
              )
            )}
          </ul>

          {saveError ? (
            <div className="alert alert-warning mb-0 text-[0.8125rem]" role="alert">
              {saveError}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {editing ? (
              <>
                <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button variant="light" size="sm" onClick={onCancelEdit} disabled={saving}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="light"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                Edit schedule
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SequenceProgressPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [items, setItems] = useState<SequenceProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTimes, setEditTimes] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listSequenceProgress();
    setLoading(false);
    if (!res.live) {
      setError(res.error);
      return;
    }
    setError(null);
    setItems(res.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const visible = useMemo(() => items, [items]);

  const startEdit = (item: SequenceProgressItem) => {
    const times: Record<number, string> = {};
    for (const step of item.steps) {
      if (step.status === "pending" || step.status === "failed") {
        times[step.index] = toLocalInput(step.at, item.timezone);
      }
    }
    setEditTimes(times);
    setEditingId(item.workflowId);
    setSaveError(null);
    setExpandedId(item.workflowId);
  };

  const saveEdit = async (item: SequenceProgressItem) => {
    setSaving(true);
    setSaveError(null);
    const steps = item.steps.map((step) => {
      if (!(step.status === "pending" || step.status === "failed")) return step;
      const local = editTimes[step.index] ?? toLocalInput(step.at, item.timezone);
      const at = localInputToIso(local, item.timezone) ?? step.at;
      return { ...step, at };
    });
    const res = await updateWorkflowSchedule(item.workflowId, crypto.randomUUID(), {
      frequency: "sequence",
      startAt: item.startAt ?? item.steps[0]?.at,
      steps: steps.map((s) => ({
        at: s.at,
        spec: s.spec,
        templateId: s.templateId,
      })),
    });
    setSaving(false);
    if (!res.live) {
      setSaveError(res.error);
      return;
    }
    setEditingId(null);
    setEditTimes({});
    await load();
  };

  return (
    <div className="box custom-box !mb-0">
      <div className="box-header flex flex-wrap items-center justify-between gap-2">
        <div>
          <h6 className="box-title mb-0 before:!hidden">Sequence progress</h6>
          <p className="text-[0.75rem] text-textmuted mb-0 mt-1">
            Active multi-step sequences — sent, pending, and next up.
          </p>
        </div>
        <Button variant="light" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <div className="box-body space-y-3">
        {error ? (
          <div className="alert alert-warning mb-0 text-[0.8125rem]" role="alert">
            Could not load sequence progress ({error}).
          </div>
        ) : null}

        {loading && items.length === 0 ? (
          <p className="text-textmuted text-[0.8125rem] mb-0">Loading sequences…</p>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <p className="text-textmuted text-[0.8125rem] mb-0">
            No sequences in progress. Multi-step sequences show up here once scheduled.
          </p>
        ) : null}

        {visible.map((item) => (
          <SequenceCard
            key={item.workflowId}
            item={item}
            expanded={expandedId === item.workflowId}
            editing={editingId === item.workflowId}
            editTimes={editTimes}
            saving={saving}
            saveError={editingId === item.workflowId ? saveError : null}
            onToggle={() =>
              setExpandedId((prev) => (prev === item.workflowId ? null : item.workflowId))
            }
            onEdit={() => startEdit(item)}
            onCancelEdit={() => {
              setEditingId(null);
              setEditTimes({});
              setSaveError(null);
            }}
            onSave={() => void saveEdit(item)}
            onEditTime={(index, value) =>
              setEditTimes((prev) => ({ ...prev, [index]: value }))
            }
          />
        ))}
      </div>
    </div>
  );
}
