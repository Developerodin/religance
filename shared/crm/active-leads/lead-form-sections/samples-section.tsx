"use client";

import {
  buildSampleInput,
  emptySampleForm,
  inputToForm,
  SampleFormFields,
  sampleToForm,
  type SampleFormModel,
  type SampleInput,
} from "@/shared/crm/samples/sample-form";
import { useCrmSuccessToast } from "@/shared/crm/crm-success-toast";
import { useCrm } from "@/shared/crm/store/crm-context";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  LeadFormDataTable,
  LeadFormRowActions,
  LeadFormSectionShell,
} from "./lead-form-section-shell";

const dash = (v: string | null | undefined) => (v?.trim() ? v : "—");

type DisplayRow = SampleInput & {
  key: string;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * Edit mode (leadId set): samples read/write the persisted store directly.
 * Create mode (no leadId, buffer props set): samples are held in a buffer that
 * lead-form-page flushes into the store once the lead is saved.
 */
export function SamplesSection({
  leadId,
  pendingSamples,
  setPendingSamples,
  defaultProductId,
}: {
  leadId?: string;
  pendingSamples?: SampleInput[];
  setPendingSamples?: Dispatch<SetStateAction<SampleInput[]>>;
  /** The lead's own medicine — pre-selected as the sample product. */
  defaultProductId?: string;
}) {
  const { medicines, samples, addSample, updateSample, deleteSample } = useCrm();
  const newForm = (): SampleFormModel => ({
    ...emptySampleForm(),
    productId: defaultProductId ?? "",
  });
  const [form, setForm] = useState<SampleFormModel>(newForm);
  // In buffer mode this holds the buffer index (as a string); in store mode the sample id.
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const { show: showToast, toast } = useCrmSuccessToast();

  // Pre-fill the product with the lead's medicine once it's known (it may arrive
  // after mount in create mode). Only touches a blank, not-being-edited form.
  useEffect(() => {
    if (defaultProductId && editingKey == null) {
      setForm((f) => (f.productId ? f : { ...f, productId: defaultProductId }));
    }
  }, [defaultProductId, editingKey]);

  const isBuffer = !leadId;
  const resetForm = () => {
    setForm(newForm());
    setEditingKey(null);
  };

  const handleSubmit = () => {
    if (!form.productId) return;
    const input = buildSampleInput(form, medicines);
    const isEdit = editingKey != null;
    if (isBuffer) {
      if (isEdit) {
        const idx = Number(editingKey);
        setPendingSamples?.((prev) => prev.map((s, i) => (i === idx ? input : s)));
      } else {
        setPendingSamples?.((prev) => [input, ...prev]);
      }
    } else if (isEdit) {
      updateSample(editingKey, input);
    } else {
      addSample(leadId, input);
    }
    showToast(isEdit ? "Sample updated." : "Sample recorded.");
    resetForm();
  };

  const rows: DisplayRow[] = isBuffer
    ? (pendingSamples ?? []).map((s, i) => ({
        ...s,
        key: String(i),
        onEdit: () => {
          setForm(inputToForm(s));
          setEditingKey(String(i));
        },
        onDelete: () =>
          setPendingSamples?.((prev) => prev.filter((_, j) => j !== i)),
      }))
    : samples
        .filter((s) => s.leadId === leadId)
        .map((s) => ({
          ...s,
          key: s.id,
          onEdit: () => {
            setForm(sampleToForm(s));
            setEditingKey(s.id);
          },
          onDelete: () => deleteSample(s.id),
        }));

  return (
    <LeadFormSectionShell title="Samples">
      {toast}
      <LeadFormDataTable
        actionsColumn
        columns={[
          "Product",
          "Qty",
          "Batch no.",
          "Dispatched",
          "Courier / AWB",
          "CoA",
          "Status",
          "Feedback",
          "Actions",
        ]}
        emptyMessage="No samples recorded for this lead yet."
        rows={rows.map((r) => [
          dash(r.product),
          dash(r.qty),
          dash(r.batchNo),
          dash(r.dispatchDate),
          dash([r.courier, r.awb].filter(Boolean).join(" / ")),
          r.coaSent ? "Yes" : "No",
          r.status,
          <span key="fb" className="block max-w-[9rem] truncate" title={r.feedback?.trim() || undefined}>
            {dash(r.feedback)}
          </span>,
          <LeadFormRowActions
            key="act"
            onEdit={r.onEdit}
            onDelete={r.onDelete}
          />,
        ])}
      />

      <div className="lead-form-subgroup mt-4">
        <h6 className="text-[0.8125rem] font-semibold mb-3">
          {editingKey != null ? "Edit sample" : "Record sample"}
        </h6>
        <SampleFormFields
          form={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          medicines={medicines}
          showFeedback={editingKey != null}
        />
        <div className="flex justify-end gap-2 mt-3">
          {editingKey != null && (
            <button
              type="button"
              className="ti-btn ti-btn-light !min-h-[2.75rem]"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className="ti-btn ti-btn-primary !min-h-[2.75rem]"
            onClick={handleSubmit}
            disabled={!form.productId}
          >
            {editingKey != null ? "Save changes" : "Record sample"}
          </button>
        </div>
      </div>
    </LeadFormSectionShell>
  );
}
