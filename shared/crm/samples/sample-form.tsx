"use client";

import type { DiscoveryMedicine } from "@/shared/crm/store/medicines-master";
import type { CrmSample } from "@/shared/crm/store/types";
import { SAMPLE_STATUSES } from "@/shared/crm/store/types";

export type SampleFormModel = {
  productId: string;
  qty: string;
  batchNo: string;
  status: string;
  dispatchDate: string;
  courier: string;
  awb: string;
  coaSent: boolean;
  feedback: string;
};

export function emptySampleForm(): SampleFormModel {
  return {
    productId: "",
    qty: "",
    batchNo: "",
    status: "Requested",
    dispatchDate: "",
    courier: "",
    awb: "",
    coaSent: false,
    feedback: "",
  };
}

/** Load an existing sample into the editable form model. */
export function sampleToForm(s: CrmSample): SampleFormModel {
  return {
    productId: s.productId,
    qty: s.qty,
    batchNo: s.batchNo,
    status: s.status,
    // API calendar fields are null when unset (Date with no default); inputs need "".
    dispatchDate: s.dispatchDate ?? "",
    courier: s.courier,
    awb: s.awb,
    coaSent: s.coaSent,
    feedback: s.feedback,
  };
}

/** The fields a caller supplies to record a sample (company/owner come from the lead). */
export type SampleInput = Omit<
  CrmSample,
  "id" | "leadId" | "companyId" | "companyName" | "owner" | "createdAt"
>;

/** Load a buffered (pre-save) sample input back into the editable form model. */
export function inputToForm(input: SampleInput): SampleFormModel {
  return {
    productId: input.productId,
    qty: input.qty,
    batchNo: input.batchNo,
    status: input.status,
    dispatchDate: input.dispatchDate ?? "",
    courier: input.courier,
    awb: input.awb,
    coaSent: input.coaSent,
    feedback: input.feedback,
  };
}

/** Map the form to the payload addSample/updateSample expect (resolves product name). */
export function buildSampleInput(
  form: SampleFormModel,
  medicines: DiscoveryMedicine[]
): SampleInput {
  const product =
    medicines.find((m) => m.id === form.productId)?.name ?? form.productId;
  return {
    productId: form.productId,
    product,
    qty: form.qty.trim(),
    batchNo: form.batchNo.trim(),
    status: form.status,
    dispatchDate: form.dispatchDate,
    courier: form.courier.trim(),
    awb: form.awb.trim(),
    coaSent: form.coaSent,
    feedback: form.feedback.trim(),
  };
}

type Props = {
  form: SampleFormModel;
  onChange: (patch: Partial<SampleFormModel>) => void;
  medicines: DiscoveryMedicine[];
  /** Show the customer-feedback field (register edit uses it; lead form hides it on new rows). */
  showFeedback?: boolean;
  idPrefix?: string;
  disabled?: boolean;
};

/** Shared field set for recording / editing a sample. */
export function SampleFormFields({
  form,
  onChange,
  medicines,
  showFeedback = true,
  idPrefix = "sm",
  disabled = false,
}: Props) {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 md:col-span-4">
        <label className="form-label text-[0.75rem]" htmlFor={`${idPrefix}-product`}>
          Product
        </label>
        <select
          id={`${idPrefix}-product`}
          className="form-select"
          value={form.productId}
          disabled={disabled}
          onChange={(e) => onChange({ productId: e.target.value })}
        >
          <option value="">—</option>
          {medicines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-12 md:col-span-4">
        <label className="form-label text-[0.75rem]" htmlFor={`${idPrefix}-qty`}>
          Quantity
        </label>
        <input
          id={`${idPrefix}-qty`}
          className="form-control"
          placeholder="e.g. 2 x 10 g"
          value={form.qty}
          disabled={disabled}
          onChange={(e) => onChange({ qty: e.target.value })}
        />
      </div>
      <div className="col-span-12 md:col-span-4">
        <label className="form-label text-[0.75rem]" htmlFor={`${idPrefix}-batch`}>
          Batch no.
        </label>
        <input
          id={`${idPrefix}-batch`}
          className="form-control"
          value={form.batchNo}
          disabled={disabled}
          onChange={(e) => onChange({ batchNo: e.target.value })}
        />
      </div>
      <div className="col-span-12">
        <label className="form-label text-[0.75rem]" htmlFor={`${idPrefix}-status`}>
          Status
        </label>
        <select
          id={`${idPrefix}-status`}
          className="form-select"
          value={form.status}
          disabled={disabled}
          onChange={(e) => onChange({ status: e.target.value })}
        >
          {SAMPLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-12 md:col-span-4">
        <label className="form-label text-[0.75rem]" htmlFor={`${idPrefix}-dispatch`}>
          Dispatch date
        </label>
        <input
          id={`${idPrefix}-dispatch`}
          type="date"
          className="form-control"
          value={form.dispatchDate}
          disabled={disabled}
          onChange={(e) => onChange({ dispatchDate: e.target.value })}
        />
      </div>
      <div className="col-span-12 md:col-span-4">
        <label className="form-label text-[0.75rem]" htmlFor={`${idPrefix}-courier`}>
          Courier
        </label>
        <input
          id={`${idPrefix}-courier`}
          className="form-control"
          value={form.courier}
          disabled={disabled}
          onChange={(e) => onChange({ courier: e.target.value })}
        />
      </div>
      <div className="col-span-12 md:col-span-4">
        <label className="form-label text-[0.75rem]" htmlFor={`${idPrefix}-awb`}>
          AWB / tracking no.
        </label>
        <input
          id={`${idPrefix}-awb`}
          className="form-control"
          value={form.awb}
          disabled={disabled}
          onChange={(e) => onChange({ awb: e.target.value })}
        />
      </div>
      {showFeedback && (
        <div className="col-span-12">
          <label className="form-label text-[0.75rem]" htmlFor={`${idPrefix}-feedback`}>
            Customer feedback
          </label>
          <textarea
            id={`${idPrefix}-feedback`}
            className="form-control"
            rows={2}
            placeholder="Notes from the customer's evaluation…"
            value={form.feedback}
            disabled={disabled}
            onChange={(e) => onChange({ feedback: e.target.value })}
          />
        </div>
      )}
      <div className="col-span-12">
        <label className="flex items-center gap-2 text-[0.8125rem] cursor-pointer min-h-[2.75rem]">
          <input
            type="checkbox"
            className="form-check-input"
            checked={form.coaSent}
            disabled={disabled}
            onChange={(e) => onChange({ coaSent: e.target.checked })}
          />
          CoA sent with sample
        </label>
      </div>
    </div>
  );
}
