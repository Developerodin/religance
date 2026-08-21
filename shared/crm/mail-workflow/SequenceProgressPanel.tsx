"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ConfirmDeleteOverlay } from "@/shared/crm/ui/confirm-delete-overlay";
import { useCrm } from "@/shared/crm/store/crm-context";
import type { EmailTemplate } from "@/shared/crm/store/email-templates";
import { Button } from "@/shared/ui/button";

import {
  cancelWorkflow,
  listSequenceProgress,
  updateWorkflowSchedule,
} from "./mail-workflow-api";
import type {
  SequenceProgressItem,
  SequenceStepProgress,
  SequenceStepStatus,
  WorkflowProgressKind,
} from "./types";

type StatusStyle = { label: string; className: string };

const KIND_BADGES: Record<WorkflowProgressKind, StatusStyle> = {
  sequence: { label: "Sequence", className: "bg-primary/10 text-primary" },
  recurring: { label: "Repeating", className: "bg-info/10 text-info" },
};

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

function contactKey(item: SequenceProgressItem): string {
  return (item.contact.id || item.contact.email || item.workflowId).toLowerCase();
}

function KindBadge({ kind }: { kind: WorkflowProgressKind }) {
  const style = KIND_BADGES[kind];
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[0.6875rem] font-medium shrink-0 ${style.className}`}
    >
      {style.label}
    </span>
  );
}

function WorkflowProgressCard({
  item,
  expanded,
  editing,
  editTimes,
  editTemplates,
  templates,
  saving,
  saveError,
  grouped = false,
  onToggle,
  onEdit,
  onCancelEdit,
  onSave,
  onEditTime,
  onEditTemplate,
  onDelete,
}: {
  item: SequenceProgressItem;
  expanded: boolean;
  editing: boolean;
  editTimes: Record<number, string>;
  editTemplates: Record<number, string>;
  templates: EmailTemplate[];
  saving: boolean;
  saveError: string | null;
  grouped?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onEditTime: (index: number, value: string) => void;
  onEditTemplate: (index: number, templateId: string) => void;
  onDelete: () => void;
}) {
  const isSequence = item.kind === "sequence";

  return (
    <div className="rounded-md border border-defaultborder dark:border-defaultborder/10">
      <button
        type="button"
        className="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-3 text-start"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex items-start gap-2">
          <KindBadge kind={item.kind} />
          <div className="min-w-0">
            <p className="mb-0 text-[0.8125rem] font-medium break-words">{item.name}</p>
            {!grouped && item.contact.name ? (
              <p className="mb-0 text-[0.75rem] text-textmuted break-words">{item.contact.name}</p>
            ) : null}
            {!grouped ? (
              <p className="mb-0 text-[0.75rem] text-textmuted break-all">{item.contact.email}</p>
            ) : (
              <p className="mb-0 text-[0.75rem] text-textmuted">{item.scheduleLabel}</p>
            )}
          </div>
        </div>
        <div className="text-end shrink-0">
          <p className="mb-0 text-[0.75rem]">
            <span className="text-success">{item.sentSteps} sent</span>
            {isSequence ? (
              <span className="text-textmuted"> · {item.remainingCount} remaining</span>
            ) : (
              <span className="text-textmuted"> · repeating</span>
            )}
          </p>
          <p className="mb-0 text-[0.75rem] text-textmuted">
            Next: {formatDateTime(item.nextPendingAt, item.timezone)}
          </p>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-defaultborder dark:border-defaultborder/10 p-3 space-y-3">
          {isSequence ? (
            <ul className="mb-0 list-none ps-0">
              {item.steps.map((step) =>
                editing && (step.status === "pending" || step.status === "failed") ? (
                  <li key={step.index} className="pb-3 last:pb-0 space-y-2">
                    <p className="mb-0 text-[0.8125rem] font-medium">Step {step.index}</p>
                    <div>
                      <label
                        htmlFor={`seq-${item.workflowId}-step-${step.index}-template`}
                        className="text-[0.75rem] text-textmuted block mb-1"
                      >
                        Template
                      </label>
                      <select
                        id={`seq-${item.workflowId}-step-${step.index}-template`}
                        className="form-select form-select-sm"
                        value={editTemplates[step.index] ?? step.templateId}
                        onChange={(e) => onEditTemplate(step.index, e.target.value)}
                        disabled={saving}
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor={`seq-${item.workflowId}-step-${step.index}-at`}
                        className="text-[0.75rem] text-textmuted block mb-1"
                      >
                        Send at
                      </label>
                      <input
                        id={`seq-${item.workflowId}-step-${step.index}-at`}
                        type="datetime-local"
                        className="form-control form-control-sm"
                        value={editTimes[step.index] ?? toLocalInput(step.at, item.timezone)}
                        onChange={(e) => onEditTime(step.index, e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  </li>
                ) : (
                  <StepRow key={step.index} step={step} timezone={item.timezone} />
                )
              )}
            </ul>
          ) : (
            <dl className="mb-0 text-[0.8125rem] space-y-1">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-textmuted">Schedule</dt>
                <dd className="mb-0">{item.scheduleLabel}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-textmuted">Sent so far</dt>
                <dd className="mb-0">{item.sentSteps}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-textmuted">Next send</dt>
                <dd className="mb-0">{formatDateTime(item.nextPendingAt, item.timezone)}</dd>
              </div>
            </dl>
          )}

          {saveError ? (
            <div className="alert alert-warning mb-0 text-[0.8125rem]" role="alert">
              {saveError}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {isSequence && editing ? (
              <>
                <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button variant="light" size="sm" onClick={onCancelEdit} disabled={saving}>
                  Cancel
                </Button>
              </>
            ) : isSequence ? (
              <>
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
                <Button
                  variant="danger"
                  size="sm"
                  className="ms-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  Delete sequence
                </Button>
              </>
            ) : (
              <Button
                variant="danger"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                Stop repeating
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ContactProgressGroup({
  contact,
  workflows,
  expandedId,
  editingId,
  editTimes,
  editTemplates,
  templates,
  saving,
  saveError,
  onToggle,
  onEdit,
  onCancelEdit,
  onSave,
  onEditTime,
  onEditTemplate,
  onDelete,
}: {
  contact: SequenceProgressItem["contact"];
  workflows: SequenceProgressItem[];
  expandedId: string | null;
  editingId: string | null;
  editTimes: Record<number, string>;
  editTemplates: Record<number, string>;
  templates: EmailTemplate[];
  saving: boolean;
  saveError: string | null;
  onToggle: (workflowId: string) => void;
  onEdit: (item: SequenceProgressItem) => void;
  onCancelEdit: () => void;
  onSave: (item: SequenceProgressItem) => void;
  onEditTime: (index: number, value: string) => void;
  onEditTemplate: (index: number, templateId: string) => void;
  onDelete: (item: SequenceProgressItem) => void;
}) {
  const grouped = workflows.length > 1;

  if (!grouped) {
    const item = workflows[0];
    return (
      <WorkflowProgressCard
        item={item}
        expanded={expandedId === item.workflowId}
        editing={editingId === item.workflowId}
        editTimes={editTimes}
        editTemplates={editTemplates}
        templates={templates}
        saving={saving}
        saveError={editingId === item.workflowId ? saveError : null}
        onToggle={() => onToggle(item.workflowId)}
        onEdit={() => onEdit(item)}
        onCancelEdit={onCancelEdit}
        onSave={() => onSave(item)}
        onEditTime={onEditTime}
        onEditTemplate={onEditTemplate}
        onDelete={() => onDelete(item)}
      />
    );
  }

  return (
    <div className="rounded-md border border-defaultborder dark:border-defaultborder/10 overflow-hidden">
      <div className="px-3 py-2 border-b border-defaultborder dark:border-defaultborder/10 bg-light/40">
        <p className="mb-0 text-[0.8125rem] font-medium">{contact.name || "Unknown contact"}</p>
        {contact.email ? (
          <p className="mb-0 text-[0.75rem] text-textmuted break-all">{contact.email}</p>
        ) : null}
      </div>
      <div className="p-2 space-y-2">
        {workflows.map((item) => (
          <WorkflowProgressCard
            key={item.workflowId}
            item={item}
            grouped
            expanded={expandedId === item.workflowId}
            editing={editingId === item.workflowId}
            editTimes={editTimes}
            editTemplates={editTemplates}
            templates={templates}
            saving={saving}
            saveError={editingId === item.workflowId ? saveError : null}
            onToggle={() => onToggle(item.workflowId)}
            onEdit={() => onEdit(item)}
            onCancelEdit={onCancelEdit}
            onSave={() => onSave(item)}
            onEditTime={onEditTime}
            onEditTemplate={onEditTemplate}
            onDelete={() => onDelete(item)}
          />
        ))}
      </div>
    </div>
  );
}

export default function SequenceProgressPanel({
  refreshKey = 0,
  embedded = false,
}: {
  refreshKey?: number;
  embedded?: boolean;
}) {
  const { emailTemplates } = useCrm();
  const [items, setItems] = useState<SequenceProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTimes, setEditTimes] = useState<Record<number, string>>({});
  const [editTemplates, setEditTemplates] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SequenceProgressItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { contact: SequenceProgressItem["contact"]; workflows: SequenceProgressItem[] }
    >();
    for (const item of items) {
      const key = contactKey(item);
      const existing = map.get(key);
      if (existing) existing.workflows.push(item);
      else map.set(key, { contact: item.contact, workflows: [item] });
    }
    return Array.from(map.values()).map((group) => ({
      ...group,
      workflows: [...group.workflows].sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "sequence" ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    }));
  }, [items]);

  const startEdit = (item: SequenceProgressItem) => {
    if (item.kind !== "sequence") return;
    const times: Record<number, string> = {};
    const templatesByStep: Record<number, string> = {};
    for (const step of item.steps) {
      if (step.status === "pending" || step.status === "failed") {
        times[step.index] = toLocalInput(step.at, item.timezone);
        templatesByStep[step.index] = step.templateId;
      }
    }
    setEditTimes(times);
    setEditTemplates(templatesByStep);
    setEditingId(item.workflowId);
    setSaveError(null);
    setExpandedId(item.workflowId);
  };

  const saveEdit = async (item: SequenceProgressItem) => {
    if (item.kind !== "sequence") return;
    setSaving(true);
    setSaveError(null);
    const steps = item.steps.map((step) => {
      if (!(step.status === "pending" || step.status === "failed")) return step;
      const local = editTimes[step.index] ?? toLocalInput(step.at, item.timezone);
      const at = localInputToIso(local, item.timezone) ?? step.at;
      const templateId = editTemplates[step.index] ?? step.templateId;
      return { ...step, at, templateId };
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
    setEditTemplates({});
    await load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await cancelWorkflow(deleteTarget.workflowId, crypto.randomUUID());
    setDeleting(false);
    if (!res.live) {
      setDeleteError(res.error);
      return;
    }
    if (editingId === deleteTarget.workflowId) {
      setEditingId(null);
      setEditTimes({});
      setEditTemplates({});
      setSaveError(null);
    }
    if (expandedId === deleteTarget.workflowId) setExpandedId(null);
    setDeleteTarget(null);
    await load();
  };

  return (
    <>
      <div className={embedded ? undefined : "box custom-box !mb-0"}>
        {embedded ? (
          <div className="mail-assistant-panel-toolbar">
            <Button variant="light" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        ) : (
          <div className="box-header flex flex-wrap items-center justify-between gap-2">
            <div>
              <h6 className="box-title mb-0 before:!hidden">Sequence progress</h6>
              <p className="text-[0.75rem] text-textmuted mb-0 mt-1">
                Active sequences and repeating mail — sent, pending, and next up.
              </p>
            </div>
            <Button variant="light" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        )}

        <div className={embedded ? "space-y-3" : "box-body space-y-3"}>
        {error ? (
          <div className="alert alert-warning mb-0 text-[0.8125rem]" role="alert">
            Could not load sequence progress ({error}).
          </div>
        ) : null}

        {loading && items.length === 0 ? (
          <p className="text-textmuted text-[0.8125rem] mb-0">Loading scheduled mail…</p>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <p className="text-textmuted text-[0.8125rem] mb-0">
            No sequences or repeating mail in progress yet.
          </p>
        ) : null}

        {grouped.map((group) => (
          <ContactProgressGroup
            key={contactKey(group.workflows[0])}
            contact={group.contact}
            workflows={group.workflows}
            expandedId={expandedId}
            editingId={editingId}
            editTimes={editTimes}
            editTemplates={editTemplates}
            templates={emailTemplates}
            saving={saving}
            saveError={saveError}
            onToggle={(workflowId) =>
              setExpandedId((prev) => (prev === workflowId ? null : workflowId))
            }
            onEdit={startEdit}
            onCancelEdit={() => {
              setEditingId(null);
              setEditTimes({});
              setEditTemplates({});
              setSaveError(null);
            }}
            onSave={(item) => void saveEdit(item)}
            onEditTime={(index, value) =>
              setEditTimes((prev) => ({ ...prev, [index]: value }))
            }
            onEditTemplate={(index, templateId) =>
              setEditTemplates((prev) => ({ ...prev, [index]: templateId }))
            }
            onDelete={(item) => {
              setDeleteError(null);
              setDeleteTarget(item);
            }}
          />
        ))}
        </div>
      </div>

      <ConfirmDeleteOverlay
        open={deleteTarget !== null}
        title={deleteTarget?.kind === "recurring" ? "Stop repeating mail?" : "Delete sequence?"}
        entityName={deleteTarget?.name ?? "this schedule"}
        description={
          deleteTarget?.kind === "recurring"
            ? "Future sends will stop. Emails already sent stay in mail history."
            : "Pending steps will not send. Emails already sent stay in mail history."
        }
        entitySuffix={false}
        confirmLabel={deleteTarget?.kind === "recurring" ? "Stop repeating" : "Delete sequence"}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (deleting) return;
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        busy={deleting}
      >
        {deleteError ? (
          <div className="alert alert-warning mb-0 text-[0.8125rem]" role="alert">
            {deleteError}
          </div>
        ) : null}
      </ConfirmDeleteOverlay>
    </>
  );
}
