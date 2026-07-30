"use client";

import {
  buildQuotationInput,
  emptyQuotationForm,
  formatMoney,
  inputToQuotationForm,
  QuotationFormFields,
  quotationToForm,
  type QuotationFormModel,
  type QuotationInput,
} from "@/shared/crm/quotations/quotation-form";
import { useCrmSuccessToast } from "@/shared/crm/crm-success-toast";
import { useCrm } from "@/shared/crm/store/crm-context";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  LeadFormDataTable,
  LeadFormRowActions,
  LeadFormSectionShell,
} from "./lead-form-section-shell";

const dash = (v: string | null | undefined) => (v?.trim() ? v : "—");

type DisplayRow = QuotationInput & {
  key: string;
  quoteNo?: string;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * Edit mode (leadId set): quotations read/write the persisted store directly.
 * Create mode (no leadId, buffer props set): quotations are held in a buffer that
 * lead-form-page flushes into the store once the lead is saved.
 */
export function QuotationsSection({
  leadId,
  pendingQuotations,
  setPendingQuotations,
  defaultProductId,
}: {
  leadId?: string;
  pendingQuotations?: QuotationInput[];
  setPendingQuotations?: Dispatch<SetStateAction<QuotationInput[]>>;
  defaultProductId?: string;
}) {
  const {
    medicines,
    quotations,
    addQuotation,
    updateQuotation,
    deleteQuotation,
  } = useCrm();
  const newForm = (): QuotationFormModel => ({
    ...emptyQuotationForm(),
    productId: defaultProductId ?? "",
  });
  const [form, setForm] = useState<QuotationFormModel>(newForm);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const { show: showToast, toast } = useCrmSuccessToast();

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
    const input = buildQuotationInput(form, medicines);
    const isEdit = editingKey != null;
    if (isBuffer) {
      if (isEdit) {
        const idx = Number(editingKey);
        setPendingQuotations?.((prev) =>
          prev.map((q, i) => (i === idx ? input : q))
        );
      } else {
        setPendingQuotations?.((prev) => [input, ...prev]);
      }
    } else if (isEdit) {
      updateQuotation(editingKey, input);
    } else {
      addQuotation(leadId, input);
    }
    showToast(isEdit ? "Quotation updated." : "Quotation created.");
    resetForm();
  };

  const rows: DisplayRow[] = isBuffer
    ? (pendingQuotations ?? []).map((q, i) => ({
        ...q,
        key: String(i),
        onEdit: () => {
          setForm(inputToQuotationForm(q));
          setEditingKey(String(i));
        },
        onDelete: () =>
          setPendingQuotations?.((prev) => prev.filter((_, j) => j !== i)),
      }))
    : quotations
        .filter((q) => q.leadId === leadId)
        .map((q) => ({
          ...q,
          key: q.id,
          quoteNo: q.quoteNo,
          onEdit: () => {
            setForm(quotationToForm(q));
            setEditingKey(q.id);
          },
          onDelete: () => deleteQuotation(q.id),
        }));

  return (
    <LeadFormSectionShell title="Quotations">
      {toast}
      <LeadFormDataTable
        actionsColumn
        columns={[
          "Quote no.",
          "Product",
          "Quote date",
          "Qty (kg)",
          "Unit price",
          "Grand total",
          "Basis",
          "Valid until",
          "Status",
          "Actions",
        ]}
        emptyMessage="No quotations issued to this lead yet."
        rows={rows.map((r) => [
          dash(r.quoteNo),
          dash(r.product),
          dash(r.quoteDate),
          dash(r.qty),
          r.unitPrice?.trim()
            ? `${r.currency} ${r.unitPrice}/kg`
            : "—",
          formatMoney(r.grandTotal, r.currency),
          dash(r.priceBasis),
          dash(r.validUntil),
          r.status,
          <LeadFormRowActions
            key="act"
            onEdit={r.onEdit}
            onDelete={r.onDelete}
          />,
        ])}
      />

      <div className="lead-form-subgroup mt-4">
        <h6 className="text-[0.8125rem] font-semibold mb-1">
          {editingKey != null ? "Edit quotation" : "New quotation"}
        </h6>
        {!isBuffer && editingKey == null && (
          <p className="text-[0.75rem] text-textmuted mb-3">
            Number auto-assigned; add more products after creating.
          </p>
        )}
        <QuotationFormFields
          form={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          medicines={medicines}
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
            {editingKey != null ? "Save changes" : "Create quotation"}
          </button>
        </div>
      </div>
    </LeadFormSectionShell>
  );
}
