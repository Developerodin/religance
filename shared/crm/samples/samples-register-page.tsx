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
import { BottomSheet } from "@/shared/crm/ui/bottom-sheet";
import { ConfirmDeleteOverlay } from "@/shared/crm/ui/confirm-delete-overlay";
import Seo from "@/shared/layout-components/seo/seo";
import { Button } from "@/shared/ui/button";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Samples still "in the field" — dispatched but not yet closed out.
const IN_FIELD = new Set(["Dispatched", "In transit", "Delivered", "Feedback received"]);
const dash = (v: string | null | undefined) => (v?.trim() ? v : "—");
const courierAwb = (s: CrmSample) =>
  dash([s.courier, s.awb].filter(Boolean).join(" / "));

type EditorState = { sample: CrmSample | null } | null;

export default function SamplesRegisterPage() {
  const { samples, leads, medicines, hydrated, addSample, updateSample, deleteSample } =
    useCrm();

  const [status, setStatus] = useState("");
  const [product, setProduct] = useState("");
  const [owner, setOwner] = useState("");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState<CrmSample | null>(null);
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return samples.filter(
      (s) =>
        (!status || s.status === status) &&
        (!product || s.product === product) &&
        (!owner || s.owner === owner) &&
        (!term ||
          `${s.companyName} ${s.product} ${s.batchNo} ${s.courier} ${s.awb} ${s.feedback} ${s.owner}`
            .toLowerCase()
            .includes(term))
    );
  }, [samples, status, product, owner, search]);

  const inField = useMemo(
    () => samples.filter((s) => IN_FIELD.has(s.status)).length,
    [samples]
  );

  const activeFilters = [
    status && `Status: ${status}`,
    product && `Product: ${product}`,
    owner && `Owner: ${owner}`,
  ].filter(Boolean) as string[];
  const filtersActive = activeFilters.length > 0;
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
            className="ti-btn ti-btn-primary shrink-0 w-full sm:w-auto"
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

        {/* Phone + tablet: search + filter sheet. Desktop keeps the inline filter card. */}
        <div className="xl:hidden mb-3">
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <i
                className="ri-search-line absolute start-3 top-1/2 -translate-y-1/2 text-textmuted pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                className="form-control !ps-9 !min-h-[2.75rem]"
                placeholder="Search samples…"
                aria-label="Search samples"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="ti-btn ti-btn-light shrink-0 !min-h-[2.75rem] !mb-0"
              onClick={() => setFiltersOpen(true)}
            >
              <i className="ri-equalizer-line me-1" aria-hidden="true" />
              Filters
              {filtersActive && (
                <span className="badge bg-primary text-white ms-1">
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div>
          {filtersActive && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {activeFilters.map((f) => (
                <span key={f} className="badge bg-light text-default">
                  {f}
                </span>
              ))}
              <button
                type="button"
                className="text-[0.75rem] text-primary font-medium"
                onClick={clearFilters}
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Desktop filters. Wrapper carries the breakpoint — `.box` sets its own
            display:flex, which would beat a `hidden` utility on the same element. */}
        <div className="hidden xl:block">
          <div className="box custom-box !mb-4">
            <div className="box-body">
              <div className="grid grid-cols-12 gap-3 items-end">
                <SampleFilterFields
                  idPrefix="sm-desktop"
                  status={status}
                  product={product}
                  owner={owner}
                  productOptions={productOptions}
                  ownerOptions={ownerOptions}
                  onStatus={setStatus}
                  onProduct={setProduct}
                  onOwner={setOwner}
                />
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
        </div>

        {/* Phone + tablet cards — denser 2-col meta from md. Tap opens BottomSheet. */}
        <div className="xl:hidden">
          {filtered.length === 0 ? (
            <div className="box custom-box !mb-0">
              <div className="box-body text-center !text-textmuted !py-8 text-[0.8125rem]">
                {samples.length === 0
                  ? "No samples yet. Record samples from a lead, or use Add sample above."
                  : "No samples match this search."}
              </div>
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                className="box custom-box !mb-3 w-full text-start"
                onClick={() => setDetail(s)}
              >
                <div className="box-body !p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-[0.875rem] mb-0 min-w-0 truncate">
                      {dash(s.companyName)}
                    </p>
                    <span className="badge bg-primary/10 text-primary shrink-0">
                      {s.status}
                    </span>
                  </div>
                  <p className="text-[0.8125rem] text-textmuted mb-2">
                    {dash(s.product)}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-[0.75rem] text-textmuted mb-3">
                    <span>Qty {dash(s.qty)}</span>
                    <span>Batch {dash(s.batchNo)}</span>
                    <span>Dispatched {dash(s.dispatchDate)}</span>
                    <span>{dash(s.owner)}</span>
                  </div>
                  <p className="text-[0.6875rem] uppercase tracking-wide text-textmuted mb-0.5">
                    Feedback
                  </p>
                  <p className="text-[0.875rem] font-medium mb-3 line-clamp-2">
                    {dash(s.feedback)}
                  </p>
                  <div className="flex items-end justify-between gap-2 text-[0.75rem] text-textmuted">
                    <span className="truncate">{courierAwb(s)}</span>
                    <span className="text-primary font-medium whitespace-nowrap">
                      View details
                      <i className="ri-arrow-right-line ms-1" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="hidden xl:block">
          <div className="box custom-box">
            <div className="box-body !p-0">
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
                          <td className="align-middle">{courierAwb(s)}</td>
                          <td className="align-middle">{s.coaSent ? "Yes" : "No"}</td>
                          <td className="align-middle">
                            <span className="badge bg-light text-default">
                              {s.status}
                            </span>
                          </td>
                          <td
                            className="align-middle max-w-[16rem] truncate"
                            title={s.feedback}
                          >
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
      </div>

      {filtersOpen && (
        <BottomSheet title="Filters" onClose={() => setFiltersOpen(false)}>
          <div className="box-body">
            <div className="grid grid-cols-12 gap-3">
              <SampleFilterFields
                idPrefix="sm-sheet"
                status={status}
                product={product}
                owner={owner}
                productOptions={productOptions}
                ownerOptions={ownerOptions}
                onStatus={setStatus}
                onProduct={setProduct}
                onOwner={setOwner}
              />
            </div>
          </div>
          <div className="box-footer flex gap-2">
            <button
              type="button"
              className="ti-btn ti-btn-light flex-1 !mb-0"
              onClick={clearFilters}
            >
              Reset
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-primary flex-1 !mb-0"
              onClick={() => setFiltersOpen(false)}
            >
              Show {filtered.length} {filtered.length === 1 ? "result" : "results"}
            </button>
          </div>
        </BottomSheet>
      )}

      {detail && (
        <BottomSheet
          title={dash(detail.companyName)}
          onClose={() => setDetail(null)}
        >
          <div className="box-body">
            <div className="flex items-center justify-between gap-2 mb-4">
              <p className="font-semibold text-[0.9375rem] mb-0">
                {dash(detail.product)}
              </p>
              <span className="badge bg-primary/10 text-primary shrink-0">
                {detail.status}
              </span>
            </div>
            <dl className="mb-0 divide-y divide-defaultborder dark:divide-white/10">
              <DetailRow label="Qty" value={dash(detail.qty)} />
              <DetailRow label="Batch" value={dash(detail.batchNo)} />
              <DetailRow label="Dispatched" value={dash(detail.dispatchDate)} />
              <DetailRow label="Courier / AWB" value={courierAwb(detail)} />
              <DetailRow label="CoA" value={detail.coaSent ? "Yes" : "No"} />
              <DetailRow label="Status" value={detail.status} emphasis />
              <DetailRow label="Feedback" value={dash(detail.feedback)} emphasis />
              <DetailRow label="Owner" value={dash(detail.owner)} />
            </dl>
          </div>
          <div className="box-footer flex gap-2">
            <button
              type="button"
              className="ti-btn ti-btn-light flex-1 !mb-0"
              onClick={() => {
                setEditor({ sample: detail });
                setDetail(null);
              }}
            >
              <i className="ri-edit-line me-1" aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-outline-danger flex-1 !mb-0"
              onClick={() => {
                setPendingDelete(detail);
                setDetail(null);
              }}
            >
              <i className="ri-delete-bin-line me-1" aria-hidden="true" />
              Delete
            </button>
          </div>
        </BottomSheet>
      )}

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

function SampleFilterFields({
  idPrefix,
  status,
  product,
  owner,
  productOptions,
  ownerOptions,
  onStatus,
  onProduct,
  onOwner,
}: {
  idPrefix: string;
  status: string;
  product: string;
  owner: string;
  productOptions: string[];
  ownerOptions: string[];
  onStatus: (v: string) => void;
  onProduct: (v: string) => void;
  onOwner: (v: string) => void;
}) {
  return (
    <Fragment>
      <div className="col-span-12 sm:col-span-4">
        <label className="form-label text-[0.75rem]" htmlFor={`${idPrefix}-status`}>
          Status
        </label>
        <select
          id={`${idPrefix}-status`}
          className="form-select"
          value={status}
          onChange={(e) => onStatus(e.target.value)}
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
        <label className="form-label text-[0.75rem]" htmlFor={`${idPrefix}-product`}>
          Product
        </label>
        <select
          id={`${idPrefix}-product`}
          className="form-select"
          value={product}
          onChange={(e) => onProduct(e.target.value)}
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
        <label className="form-label text-[0.75rem]" htmlFor={`${idPrefix}-owner`}>
          Owner
        </label>
        <select
          id={`${idPrefix}-owner`}
          className="form-select"
          value={owner}
          onChange={(e) => onOwner(e.target.value)}
        >
          <option value="">All</option>
          {ownerOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    </Fragment>
  );
}

function DetailRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-[0.75rem] text-textmuted shrink-0">{label}</dt>
      <dd
        className={`mb-0 text-end ${
          emphasis
            ? "text-[0.9375rem] font-semibold"
            : "text-[0.8125rem]"
        }`}
      >
        {value}
      </dd>
    </div>
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
