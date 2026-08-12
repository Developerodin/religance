"use client";

import {
  buildQuotationInput,
  emptyQuotationForm,
  formatMoney,
  QuotationFormFields,
  quotationToForm,
  type QuotationFormModel,
} from "@/shared/crm/quotations/quotation-form";
import { LeadFormRowActions } from "@/shared/crm/active-leads/lead-form-sections/lead-form-section-shell";
import { useCrm } from "@/shared/crm/store/crm-context";
import type { CrmQuotation } from "@/shared/crm/store/types";
import {
  QUOTATION_CURRENCIES,
  QUOTATION_STATUSES,
} from "@/shared/crm/store/types";
import { BottomSheet } from "@/shared/crm/ui/bottom-sheet";
import { ConfirmDeleteOverlay } from "@/shared/crm/ui/confirm-delete-overlay";
import Seo from "@/shared/layout-components/seo/seo";
import { Fragment, useMemo, useState } from "react";

const dash = (v: string | null | undefined) => (v?.trim() ? v : "—");

type EditorState = { quotation: CrmQuotation | null } | null;

export default function QuotationsRegisterPage() {
  const {
    quotations,
    leads,
    medicines,
    hydrated,
    addQuotation,
    updateQuotation,
    deleteQuotation,
  } = useCrm();

  const [status, setStatus] = useState("");
  const [currency, setCurrency] = useState("");
  const [owner, setOwner] = useState("");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState<CrmQuotation | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [pendingDelete, setPendingDelete] = useState<CrmQuotation | null>(null);

  const ownerOptions = useMemo(
    () => [...new Set(quotations.map((q) => q.owner).filter(Boolean))].sort(),
    [quotations]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quotations.filter(
      (q) =>
        (!status || q.status === status) &&
        (!currency || q.currency === currency) &&
        (!owner || q.owner === owner) &&
        (!term ||
          `${q.quoteNo} ${q.companyName} ${q.product}`
            .toLowerCase()
            .includes(term))
    );
  }, [quotations, status, currency, owner, search]);

  const activeFilters = [
    status && `Status: ${status}`,
    currency && `Currency: ${currency}`,
    owner && `Owner: ${owner}`,
  ].filter(Boolean) as string[];
  const filtersActive = activeFilters.length > 0;
  const clearFilters = () => {
    setStatus("");
    setCurrency("");
    setOwner("");
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteQuotation(pendingDelete.id);
    setPendingDelete(null);
  };

  if (!hydrated) {
    return <div className="p-6 text-textmuted">Loading quotations…</div>;
  }

  return (
    <Fragment>
      <Seo title="Quotations" />
      <div className="p-2 sm:p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
          <div>
            <h1 className="text-[1.25rem] font-semibold mb-1">Quotation Register</h1>
            <p className="text-textmuted text-[0.8125rem] mb-0">
              All quotations issued across leads. Filter by status, currency, or owner.
            </p>
          </div>
          <button
            type="button"
            className="ti-btn ti-btn-primary shrink-0 w-full sm:w-auto"
            onClick={() => setEditor({ quotation: null })}
            disabled={leads.length === 0}
            title={leads.length === 0 ? "Create a lead first" : undefined}
          >
            <i className="ri-add-line me-1"></i>Add quotation
          </button>
        </div>

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
                placeholder="Search quotations…"
                aria-label="Search quotations"
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
              <QuotationFilterFields
                idPrefix="qt-desktop"
                status={status}
                currency={currency}
                owner={owner}
                ownerOptions={ownerOptions}
                onStatus={setStatus}
                onCurrency={setCurrency}
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

        {/* Phone + tablet cards — denser meta from md. Tap opens BottomSheet. */}
        <div className="xl:hidden">
          {filtered.length === 0 ? (
            <div className="box custom-box !mb-0">
              <div className="box-body text-center !text-textmuted !py-8 text-[0.8125rem]">
                {quotations.length === 0
                  ? "No quotations yet. Issue quotes from a lead's detail page."
                  : "No quotations match this search."}
              </div>
            </div>
          ) : (
            filtered.map((q) => (
              <button
                key={q.id}
                type="button"
                className="box custom-box !mb-3 w-full text-start"
                onClick={() => setDetail(q)}
              >
                <div className="box-body !p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[0.6875rem] uppercase tracking-wide text-textmuted">
                      Quotation {dash(q.quoteNo)}
                      {q.quoteDate?.trim() ? ` · ${q.quoteDate}` : ""}
                    </span>
                    <span className="badge bg-light text-default shrink-0">
                      {q.status}
                    </span>
                  </div>
                  <p className="font-semibold text-[0.875rem] mb-0.5 min-w-0 truncate">
                    {dash(q.companyName)}
                  </p>
                  <p className="text-[0.8125rem] text-textmuted mb-3 line-clamp-2">
                    {dash(q.product)}
                  </p>
                  <p className="text-[0.6875rem] uppercase tracking-wide text-textmuted mb-0.5">
                    Grand total
                  </p>
                  <p className="text-[1.125rem] font-semibold tabular-nums mb-3">
                    {formatMoney(q.grandTotal, q.currency)}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-[0.75rem] text-textmuted mb-2">
                    <span>Owner {dash(q.owner)}</span>
                    <span>Valid until {dash(q.validUntil)}</span>
                  </div>
                  <div className="flex justify-end">
                    <span className="text-primary font-medium text-[0.75rem] whitespace-nowrap">
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
                      "Quote No.",
                      "Date",
                      "Company",
                      "Products",
                      "Sub total",
                      "GST",
                      "Grand total",
                      "Basis",
                      "Valid until",
                      "Status",
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
                      <td colSpan={12} className="text-center text-textmuted py-6">
                        {quotations.length === 0
                          ? "No quotations yet. Issue quotes from a lead's detail page."
                          : "No quotations match these filters. Issue quotes from a lead's detail page."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((q) => (
                      <tr key={q.id}>
                        <td className="align-middle whitespace-nowrap">{dash(q.quoteNo)}</td>
                        <td className="align-middle">{dash(q.quoteDate)}</td>
                        <td className="align-middle">{dash(q.companyName)}</td>
                        <td className="align-middle">{dash(q.product)}</td>
                        <td className="align-middle whitespace-nowrap">
                          {formatMoney(q.subTotal, q.currency)}
                        </td>
                        <td className="align-middle whitespace-nowrap">
                          {q.gstAmount > 0
                            ? formatMoney(q.gstAmount, q.currency)
                            : "—"}
                        </td>
                        <td className="align-middle whitespace-nowrap">
                          {formatMoney(q.grandTotal, q.currency)}
                        </td>
                        <td className="align-middle">{dash(q.priceBasis)}</td>
                        <td className="align-middle">{dash(q.validUntil)}</td>
                        <td className="align-middle">
                          <span className="badge bg-light text-default">{q.status}</span>
                        </td>
                        <td className="align-middle">{dash(q.owner)}</td>
                        <td className="align-middle text-end whitespace-nowrap">
                          <LeadFormRowActions
                            onEdit={() => setEditor({ quotation: q })}
                            onDelete={() => setPendingDelete(q)}
                            editAriaLabel={`Edit quotation ${q.quoteNo}`}
                            deleteAriaLabel={`Delete quotation ${q.quoteNo}`}
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
              <QuotationFilterFields
                idPrefix="qt-sheet"
                status={status}
                currency={currency}
                owner={owner}
                ownerOptions={ownerOptions}
                onStatus={setStatus}
                onCurrency={setCurrency}
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
          title={`Quotation ${dash(detail.quoteNo)}`}
          onClose={() => setDetail(null)}
        >
          <div className="box-body">
            <p className="font-semibold text-[0.9375rem] mb-4">
              {dash(detail.companyName)}
            </p>
            <dl className="mb-0 divide-y divide-defaultborder dark:divide-white/10">
              <DetailRow label="Date" value={dash(detail.quoteDate)} />
              <DetailRow label="Products" value={dash(detail.product)} />
              <DetailRow
                label="Sub total"
                value={formatMoney(detail.subTotal, detail.currency)}
              />
              <DetailRow
                label="GST"
                value={
                  detail.gstAmount > 0
                    ? formatMoney(detail.gstAmount, detail.currency)
                    : "—"
                }
              />
              <DetailRow
                label="Grand total"
                value={formatMoney(detail.grandTotal, detail.currency)}
                emphasis
              />
              <DetailRow label="Basis" value={dash(detail.priceBasis)} />
              <DetailRow label="Valid until" value={dash(detail.validUntil)} />
              <DetailRow label="Status" value={detail.status} />
              <DetailRow label="Owner" value={dash(detail.owner)} />
            </dl>
          </div>
          <div className="box-footer flex gap-2">
            <button
              type="button"
              className="ti-btn ti-btn-light flex-1 !mb-0"
              onClick={() => {
                setEditor({ quotation: detail });
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
        <QuotationEditorModal
          quotation={editor.quotation}
          onClose={() => setEditor(null)}
          onSave={(leadId, form) => {
            const input = buildQuotationInput(form, medicines);
            if (editor.quotation) {
              updateQuotation(editor.quotation.id, { ...input, leadId });
            } else {
              addQuotation(leadId, input);
            }
            setEditor(null);
          }}
        />
      )}

      <ConfirmDeleteOverlay
        open={pendingDelete != null}
        entityName={
          pendingDelete
            ? `${pendingDelete.quoteNo || "Quotation"} · ${pendingDelete.companyName}`
            : "this quotation"
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Fragment>
  );
}

function QuotationFilterFields({
  idPrefix,
  status,
  currency,
  owner,
  ownerOptions,
  onStatus,
  onCurrency,
  onOwner,
}: {
  idPrefix: string;
  status: string;
  currency: string;
  owner: string;
  ownerOptions: string[];
  onStatus: (v: string) => void;
  onCurrency: (v: string) => void;
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
          {QUOTATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-12 sm:col-span-4">
        <label className="form-label text-[0.75rem]" htmlFor={`${idPrefix}-currency`}>
          Currency
        </label>
        <select
          id={`${idPrefix}-currency`}
          className="form-select"
          value={currency}
          onChange={(e) => onCurrency(e.target.value)}
        >
          <option value="">All</option>
          {QUOTATION_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
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
            ? "text-[0.9375rem] font-semibold tabular-nums"
            : "text-[0.8125rem]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/** Mobile sheet: slides up from the bottom, closes on backdrop tap or Escape. */
function QuotationEditorModal({
  quotation,
  onClose,
  onSave,
}: {
  quotation: CrmQuotation | null;
  onClose: () => void;
  onSave: (leadId: string, form: QuotationFormModel) => void;
}) {
  const { leads, medicines } = useCrm();
  const [leadId, setLeadId] = useState(quotation?.leadId ?? "");
  const [form, setForm] = useState<QuotationFormModel>(
    quotation ? quotationToForm(quotation) : emptyQuotationForm()
  );

  const leadOptions = useMemo(
    () =>
      [...leads].sort((a, b) =>
        (a.companyName || a.title).localeCompare(b.companyName || b.title)
      ),
    [leads]
  );
  const selectedLead = leads.find((l) => l.id === leadId);
  const canSave = Boolean(leadId && form.productId);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="box custom-box w-full max-w-2xl max-h-[90vh] overflow-y-auto !mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="box-header flex items-center justify-between">
          <h6 className="box-title mb-0">
            {quotation ? "Edit quotation" : "Add quotation"}
          </h6>
          <button
            type="button"
            className="ti-btn ti-btn-sm ti-btn-light"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="box-body">
          <div className="mb-3">
            <label className="form-label text-[0.75rem]" htmlFor="qt-lead">
              Lead
            </label>
            <select
              id="qt-lead"
              className="form-select"
              value={leadId}
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
            {selectedLead && (
              <p className="text-[0.75rem] text-textmuted mb-0 mt-1">
                Owner: {selectedLead.assignedTo || "—"}
              </p>
            )}
          </div>
          {quotation && (
            <p className="text-[0.75rem] text-textmuted mb-3">
              Quote no.: {quotation.quoteNo}
            </p>
          )}
          <QuotationFormFields
            form={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            medicines={medicines}
            idPrefix="qt-modal"
          />
        </div>
        <div className="box-footer flex justify-end gap-2">
          <button type="button" className="ti-btn ti-btn-light" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-primary"
            disabled={!canSave}
            onClick={() => onSave(leadId, form)}
          >
            {quotation ? "Save changes" : "Add quotation"}
          </button>
        </div>
      </div>
    </div>
  );
}
