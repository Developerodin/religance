"use client";

import {
  buildSampleInput,
  emptySampleForm,
  SampleFormFields,
  sampleToForm,
  type SampleFormModel,
} from "@/shared/crm/samples/sample-form";
import { useCrm } from "@/shared/crm/store/crm-context";
import type { CrmSample } from "@/shared/crm/store/types";
import { SAMPLE_STATUSES } from "@/shared/crm/store/types";
import { LeadFormRowActions } from "@/shared/crm/active-leads/lead-form-sections/lead-form-section-shell";
import { ConfirmDeleteOverlay } from "@/shared/crm/ui/confirm-delete-overlay";
import Seo from "@/shared/layout-components/seo/seo";
import { Button } from "@/shared/ui/button";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Samples still "in the field" — dispatched but not yet closed out.
const IN_FIELD = new Set(["Dispatched", "In transit", "Delivered", "Feedback received"]);
const dash = (v: string | null | undefined) => (v?.trim() ? v : "—");

type EditorState = { sample: CrmSample | null } | null;

export default function SamplesRegisterPage() {
  const { samples, leads, medicines, hydrated, addSample, updateSample, deleteSample } =
    useCrm();

  const [status, setStatus] = useState("");
  const [product, setProduct] = useState("");
  const [owner, setOwner] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const [pendingDelete, setPendingDelete] = useState<CrmSample | null>(null);

  const productOptions = useMemo(
    () => [...new Set(samples.map((s) => s.product).filter(Boolean))].sort(),
    [samples]
  );
  const ownerOptions = useMemo(
    () => [...new Set(samples.map((s) => s.owner).filter(Boolean))].sort(),
    [samples]
  );

  const filtered = useMemo(
    () =>
      samples.filter(
        (s) =>
          (!status || s.status === status) &&
          (!product || s.product === product) &&
          (!owner || s.owner === owner)
      ),
    [samples, status, product, owner]
  );

  const inField = useMemo(
    () => samples.filter((s) => IN_FIELD.has(s.status)).length,
    [samples]
  );

  const filtersActive = Boolean(status || product || owner);
  const clearFilters = () => {
    setStatus("");
    setProduct("");
    setOwner("");
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteSample(pendingDelete.id);
    setPendingDelete(null);
  };

  if (!hydrated) {
    return <div className="p-6 text-textmuted">Loading samples…</div>;
  }

  return (
    <Fragment>
      <Seo title="Samples" />
      <div className="p-2 sm:p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
          <div>
            <h1 className="text-[1.25rem] font-semibold mb-1">Sample Register</h1>
            <p className="text-textmuted text-[0.8125rem] mb-0">
              Every sample dispatched to a customer, across all leads. Update the
              status and feedback right here — no need to open the lead.
            </p>
          </div>
          <button
            type="button"
            className="ti-btn ti-btn-primary shrink-0"
            onClick={() => setEditor({ sample: null })}
            disabled={leads.length === 0}
            title={leads.length === 0 ? "Create a lead first" : undefined}
          >
            <i className="ri-add-line me-1"></i>Add sample
          </button>
        </div>

        <span className="badge bg-primary/10 text-primary text-[0.75rem] mb-3 inline-block">
          {inField} in field (dispatched / delivered / under evaluation)
        </span>

        <div className="box custom-box mb-4">
          <div className="box-body">
            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-12 sm:col-span-4">
                <label className="form-label text-[0.75rem]">Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All</option>
                  {SAMPLE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-12 sm:col-span-4">
                <label className="form-label text-[0.75rem]">Product</label>
                <select
                  className="form-select"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                >
                  <option value="">All</option>
                  {productOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-12 sm:col-span-4">
                <label className="form-label text-[0.75rem]">Owner</label>
                <select
                  className="form-select"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                >
                  <option value="">All</option>
                  {ownerOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              {filtersActive && (
                <div className="col-span-12">
                  <button
                    type="button"
                    className="ti-btn ti-btn-sm ti-btn-light"
                    onClick={clearFilters}
                  >
                    <i className="ri-filter-off-line me-1"></i>Clear
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="box custom-box">
          <div className="box-body p-0">
            <div className="table-responsive">
              <table className="table ti-custom-table min-w-full mb-0 text-[0.8125rem]">
                <thead className="ti-custom-table-head">
                  <tr>
                    {[
                      "Company",
                      "Product",
                      "Qty",
                      "Batch",
                      "Dispatched",
                      "Courier / AWB",
                      "CoA",
                      "Status",
                      "Feedback",
                      "Owner",
                      "",
                    ].map((c) => (
                      <th
                        key={c}
                        className="text-[0.6875rem] uppercase tracking-wide whitespace-nowrap"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center text-textmuted py-6">
                        {samples.length === 0
                          ? "No samples yet. Record samples from a lead, or use Add sample above."
                          : "No samples match these filters."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => (
                      <tr key={s.id}>
                        <td className="align-middle">{dash(s.companyName)}</td>
                        <td className="align-middle">{dash(s.product)}</td>
                        <td className="align-middle">{dash(s.qty)}</td>
                        <td className="align-middle">{dash(s.batchNo)}</td>
                        <td className="align-middle">{dash(s.dispatchDate)}</td>
                        <td className="align-middle">
                          {dash([s.courier, s.awb].filter(Boolean).join(" / "))}
                        </td>
                        <td className="align-middle">{s.coaSent ? "Yes" : "No"}</td>
                        <td className="align-middle">
                          <span className="badge bg-light text-default">
                            {s.status}
                          </span>
                        </td>
                        <td className="align-middle max-w-[16rem] truncate" title={s.feedback}>
                          {dash(s.feedback)}
                        </td>
                        <td className="align-middle">{dash(s.owner)}</td>
                        <td className="align-middle text-end whitespace-nowrap">
                          <LeadFormRowActions
                            onEdit={() => setEditor({ sample: s })}
                            onDelete={() => setPendingDelete(s)}
                            editAriaLabel={`Edit sample for ${s.companyName}`}
                            deleteAriaLabel={`Delete sample for ${s.companyName}`}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {editor && (
        <SampleEditorModal
          sample={editor.sample}
          onClose={() => setEditor(null)}
          onSave={(leadId, form) => {
            const input = buildSampleInput(form, medicines);
            if (editor.sample) {
              updateSample(editor.sample.id, { ...input, leadId });
            } else {
              addSample(leadId, input);
            }
            setEditor(null);
          }}
        />
      )}

      <ConfirmDeleteOverlay
        open={pendingDelete != null}
        entityName={
          pendingDelete
            ? `${pendingDelete.product || "this sample"} · ${pendingDelete.companyName}`
            : "this sample"
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Fragment>
  );
}

function SampleEditorModal({
  sample,
  onClose,
  onSave,
}: {
  sample: CrmSample | null;
  onClose: () => void;
  onSave: (leadId: string, form: SampleFormModel) => void;
}) {
  const { leads, medicines } = useCrm();
  const [leadId, setLeadId] = useState(sample?.leadId ?? "");
  const [form, setForm] = useState<SampleFormModel>(
    sample ? sampleToForm(sample) : emptySampleForm()
  );
  const [saving, setSaving] = useState(false);
  const titleId = useId();
  const leadSelectRef = useRef<HTMLSelectElement>(null);
  const isEdit = Boolean(sample);
  const canSave = Boolean(leadId && form.productId) && !saving;

  const leadOptions = useMemo(
    () =>
      [...leads].sort((a, b) =>
        (a.companyName || a.title).localeCompare(b.companyName || b.title)
      ),
    [leads]
  );
  const selectedLead = leads.find((l) => l.id === leadId);

  useEffect(() => {
    const t = window.setTimeout(() => leadSelectRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || saving) return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose, saving]);

  const closeOverlay = () => {
    if (saving) return;
    onClose();
  };

  const saveOverlay = () => {
    if (!canSave) return;
    setSaving(true);
    try {
      onSave(leadId, form);
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="sample-editor-overlay" role="presentation">
      <button
        type="button"
        className="sample-editor-overlay__scrim"
        aria-label="Close dialog"
        onClick={closeOverlay}
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sample-editor-overlay__dialog"
      >
        <div className="sample-editor-overlay__header">
          <h2 id={titleId} className="sample-editor-overlay__title">
            {isEdit ? "Edit sample" : "Add sample"}
          </h2>
          <button
            type="button"
            className="sample-editor-overlay__close"
            aria-label="Close"
            onClick={closeOverlay}
            disabled={saving}
          >
            <i className="ri-close-line" aria-hidden />
          </button>
        </div>

        <div className="sample-editor-overlay__body">
          <div className="sample-editor-overlay__field">
            <label
              className="sample-editor-overlay__label"
              htmlFor="sm-lead"
            >
              Lead
            </label>
            <select
              ref={leadSelectRef}
              id="sm-lead"
              className="form-select sample-editor-overlay__control"
              value={leadId}
              disabled={saving}
              onChange={(e) => setLeadId(e.target.value)}
            >
              <option value="">Select a lead…</option>
              {leadOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {(l.companyName || l.title) +
                    (l.matchedMedicine ? ` · ${l.matchedMedicine}` : "")}
                </option>
              ))}
            </select>
            {selectedLead ? (
              <p className="sample-editor-overlay__hint">
                Owner: {selectedLead.assignedTo || "—"}
              </p>
            ) : null}
          </div>
          <SampleFormFields
            form={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            medicines={medicines}
            idPrefix="sm-modal"
            disabled={saving}
          />
        </div>

        <div className="sample-editor-overlay__footer">
          <Button
            variant="light"
            size="md"
            className="sample-editor-overlay__btn"
            onClick={closeOverlay}
            disabled={saving}
          >
            Cancel
          </Button>
          {/* ponytail: raw primary-full — Button variant=primary is soft (bg/10) and beats primary-full in CSS order */}
          <button
            type="button"
            className="ti-btn ti-btn-primary-full crm-btn crm-btn--md sample-editor-overlay__btn sample-editor-overlay__save"
            onClick={saveOverlay}
            disabled={!canSave}
          >
            {saving
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Add sample"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
