"use client";

import {
  buildFollowUpInput,
  ddmmyyyyToIso,
  emptyFollowUpForm,
  FOLLOW_UP_MODES,
  FOLLOW_UP_OUTCOMES,
  inputToFollowUpForm,
  isoToDdmmyyyy,
  followUpToForm,
  type FollowUpFormModel,
  type FollowUpInput,
} from "@/shared/crm/follow-ups/follow-up-form";
import { useCrmSuccessToast } from "@/shared/crm/crm-success-toast";
import { useCrm } from "@/shared/crm/store/crm-context";
import { useState, type Dispatch, type SetStateAction } from "react";
import {
  LeadFormDataTable,
  LeadFormRowActions,
  LeadFormSectionShell,
} from "./lead-form-section-shell";

const dash = (v: string | null | undefined) => (v?.trim() ? v : "—");

type DisplayRow = FollowUpInput & {
  id: string;
  contactedBy: string;
  onEdit: () => void;
  onDelete: () => void;
};

export function FollowUpsSection({
  leadId,
  pendingFollowUps,
  setPendingFollowUps,
}: {
  leadId?: string;
  pendingFollowUps?: FollowUpInput[];
  setPendingFollowUps?: Dispatch<SetStateAction<FollowUpInput[]>>;
}) {
  const { followUps, addFollowUp, updateFollowUp, deleteFollowUp } = useCrm();
  const [form, setForm] = useState<FollowUpFormModel>(emptyFollowUpForm());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const { show: showToast, toast } = useCrmSuccessToast();

  const isBuffer = !leadId;
  const resetForm = () => {
    setForm(emptyFollowUpForm());
    setEditingKey(null);
  };

  const handleSubmit = () => {
    if (!form.summary.trim() && !form.mode) return;
    const input = buildFollowUpInput(form);
    const isEdit = editingKey != null;
    if (isBuffer) {
      if (isEdit) {
        const idx = Number(editingKey);
        setPendingFollowUps?.((prev) =>
          prev.map((f, i) => (i === idx ? input : f))
        );
      } else {
        setPendingFollowUps?.((prev) => [input, ...prev]);
      }
    } else if (isEdit) {
      updateFollowUp(editingKey, input);
    } else {
      addFollowUp(leadId, input);
    }
    showToast(isEdit ? "Follow-up updated." : "Follow-up added.");
    resetForm();
  };

  const rows: DisplayRow[] = isBuffer
    ? (pendingFollowUps ?? []).map((f, i) => ({
        ...f,
        id: String(i),
        contactedBy: "—",
        onEdit: () => {
          setForm(inputToFollowUpForm(f));
          setEditingKey(String(i));
        },
        onDelete: () =>
          setPendingFollowUps?.((prev) => prev.filter((_, j) => j !== i)),
      }))
    : followUps
        .filter((f) => f.leadId === leadId)
        .map((f) => ({
          ...f,
          onEdit: () => {
            setForm(followUpToForm(f));
            setEditingKey(f.id);
          },
          onDelete: () => deleteFollowUp(f.id),
        }));

  return (
    <LeadFormSectionShell title="Follow-ups">
      {toast}
      <LeadFormDataTable
        actionsColumn
        columns={[
          "Entry date",
          "Contacted by",
          "Mode",
          "Summary",
          "Outcome",
          "Next step",
          "Next follow-up",
          "Actions",
        ]}
        emptyMessage="No follow-ups logged yet."
        rows={rows.map((r) => [
          r.entryDate,
          r.contactedBy,
          dash(r.mode),
          <span key="s" className="max-w-[12rem] truncate block" title={r.summary}>
            {dash(r.summary)}
          </span>,
          dash(r.outcome),
          dash(r.nextStep),
          dash(r.nextFollowUp),
          <LeadFormRowActions
            key="actions"
            onEdit={r.onEdit}
            onDelete={r.onDelete}
          />,
        ])}
      />

      <div className="lead-form-subgroup mt-4">
        <h6 className="text-[0.8125rem] font-semibold mb-3">
          {editingKey != null ? "Edit follow-up" : "Add follow-up"}
        </h6>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-4">
            <label className="form-label text-[0.75rem]" htmlFor="fu-entry-date">
              Entry date <span className="text-muted">(blank = today)</span>
            </label>
            <input
              id="fu-entry-date"
              type="date"
              className="form-control"
              value={ddmmyyyyToIso(form.entryDate)}
              onChange={(e) =>
                setForm((f) => ({ ...f, entryDate: isoToDdmmyyyy(e.target.value) }))
              }
            />
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="form-label text-[0.75rem]" htmlFor="fu-mode">
              Mode
            </label>
            <select
              id="fu-mode"
              className="form-select"
              value={form.mode}
              onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
            >
              {FOLLOW_UP_MODES.map((m) => (
                <option key={m || "empty"} value={m}>
                  {m || "—"}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="form-label text-[0.75rem]" htmlFor="fu-outcome">
              Outcome
            </label>
            <select
              id="fu-outcome"
              className="form-select"
              value={form.outcome}
              onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
            >
              {FOLLOW_UP_OUTCOMES.map((o) => (
                <option key={o || "empty"} value={o}>
                  {o || "—"}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-12">
            <label className="form-label text-[0.75rem]" htmlFor="fu-summary">
              Discussion summary
            </label>
            <textarea
              id="fu-summary"
              className="form-control"
              rows={3}
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            />
          </div>
          <div className="col-span-12">
            <label className="form-label text-[0.75rem]" htmlFor="fu-info">
              Info / docs shared
            </label>
            <input
              id="fu-info"
              className="form-control"
              value={form.infoShared}
              onChange={(e) => setForm((f) => ({ ...f, infoShared: e.target.value }))}
            />
          </div>
          <div className="col-span-12">
            <label className="form-label text-[0.75rem]" htmlFor="fu-next-step">
              Next step agreed
            </label>
            <input
              id="fu-next-step"
              className="form-control"
              value={form.nextStep}
              onChange={(e) => setForm((f) => ({ ...f, nextStep: e.target.value }))}
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <label className="form-label text-[0.75rem]" htmlFor="fu-next-date">
              Next follow-up date
            </label>
            <input
              id="fu-next-date"
              type="date"
              className="form-control"
              value={ddmmyyyyToIso(form.nextFollowUp)}
              onChange={(e) =>
                setForm((f) => ({ ...f, nextFollowUp: isoToDdmmyyyy(e.target.value) }))
              }
            />
          </div>
          <div className="col-span-12 flex justify-end gap-2">
            {editingKey != null && (
              <button
                type="button"
                className="ti-btn ti-btn-light !min-h-[2.75rem]"
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
            <button
              type="button"
              className="ti-btn ti-btn-primary !min-h-[2.75rem]"
              onClick={handleSubmit}
            >
              {editingKey != null ? "Save changes" : "Add follow-up"}
            </button>
          </div>
        </div>
      </div>
    </LeadFormSectionShell>
  );
}
