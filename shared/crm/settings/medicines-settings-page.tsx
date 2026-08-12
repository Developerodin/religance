"use client";

import {
  DOSAGE_FORM_OPTIONS,
  type DiscoveryMedicine,
} from "@/shared/crm/store/medicines-master";
import { useCrm } from "@/shared/crm/store/crm-context";
import { ConfirmDeleteOverlay } from "@/shared/crm/ui/confirm-delete-overlay";
import ExcelMenu from "@/shared/crm/settings/excel-menu";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import {
  Fragment,
  useEffect,
  useMemo,
  useState,
} from "react";

const PAGE_SIZE_OPTIONS = [10, 15, 20] as const;
const DEFAULT_PAGE_SIZE = 10;

function sameSalts(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

function medicineEquals(a: DiscoveryMedicine, b: DiscoveryMedicine): boolean {
  return (
    a.name === b.name &&
    sameSalts(a.saltIds, b.saltIds) &&
    a.dosageForm === b.dosageForm
  );
}

export default function MedicinesSettingsPage() {
  const {
    medicines,
    salts,
    leads,
    hydrated,
    addMedicine,
    updateMedicine,
    deleteMedicine,
  } = useCrm();

  const [selectedId, setSelectedId] = useState(medicines[0]?.id ?? "");
  const [draft, setDraft] = useState<DiscoveryMedicine | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [savedFlash, setSavedFlash] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saltNameById = useMemo(
    () => new Map(salts.map((s) => [s.id, s.name])),
    [salts]
  );

  const saltNamesFor = (m: DiscoveryMedicine): string =>
    m.saltIds
      .map((id) => saltNameById.get(id))
      .filter(Boolean)
      .join(", ") || "—";

  const savedMedicine = useMemo(
    () => medicines.find((m) => m.id === selectedId),
    [medicines, selectedId]
  );

  useEffect(() => {
    if (!savedMedicine) return;
    setDraft({ ...savedMedicine });
    setDeleteError("");
  }, [savedMedicine]);

  useEffect(() => {
    if (medicines.length && !medicines.some((m) => m.id === selectedId)) {
      setSelectedId(medicines[0].id);
    }
  }, [medicines, selectedId]);

  const leadCountByMedicineName = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) {
      counts.set(lead.matchedMedicine, (counts.get(lead.matchedMedicine) ?? 0) + 1);
    }
    return counts;
  }, [leads]);

  const sortedMedicines = useMemo(
    () =>
      [...medicines].sort(
        (a, b) =>
          saltNamesFor(a).localeCompare(saltNamesFor(b)) ||
          a.name.localeCompare(b.name)
      ),
    [medicines, saltNameById]
  );

  const filteredMedicines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedMedicines;
    return sortedMedicines.filter((m) => {
      return (
        m.name.toLowerCase().includes(q) ||
        saltNamesFor(m).toLowerCase().includes(q) ||
        m.dosageForm.toLowerCase().includes(q)
      );
    });
  }, [sortedMedicines, search, saltNameById]);

  const totalPages = Math.max(1, Math.ceil(filteredMedicines.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const paginatedMedicines = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMedicines.slice(start, start + pageSize);
  }, [filteredMedicines, page, pageSize]);

  useEffect(() => {
    if (!selectedId || filteredMedicines.length === 0) return;
    const index = filteredMedicines.findIndex((m) => m.id === selectedId);
    if (index >= 0) {
      setPage(Math.floor(index / pageSize) + 1);
    }
  }, [selectedId, filteredMedicines, pageSize]);

  const isDirty = useMemo(() => {
    if (!draft || !savedMedicine) return false;
    return !medicineEquals(draft, savedMedicine);
  }, [draft, savedMedicine]);

  const leadCount = draft ? (leadCountByMedicineName.get(draft.name) ?? 0) : 0;

  const handleSave = async () => {
    if (!draft || !isDirty) return;
    setDeleteError("");
    const ok = await updateMedicine(draft.id, {
      name: draft.name.trim() || savedMedicine?.name || "Untitled medicine",
      saltIds: draft.saltIds,
      dosageForm: draft.dosageForm.trim() || savedMedicine?.dosageForm || "Tablet",
    });
    if (!ok) {
      setDeleteError("Could not save. Your change was not applied.");
      return;
    }
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleAdd = async () => {
    setDeleteError("");
    const id = await addMedicine(salts[0]?.id);
    if (!id) {
      setDeleteError("Could not create the medicine. Nothing was saved.");
      return;
    }
    setSelectedId(id);
    setSearch("");
  };

  const performDelete = async () => {
    if (!selectedId) return;
    setDeleting(true);
    setDeleteError("");
    const ok = await deleteMedicine(selectedId);
    setDeleting(false);
    if (!ok) {
      setDeleteError("Could not delete this medicine. Check your connection.");
      return;
    }
    setConfirmingDelete(false);
  };

  if (!hydrated || !draft) {
    return (
      <div className="p-8 text-center text-textmuted">Loading medicines…</div>
    );
  }

  return (
    <Fragment>
      <Seo title="Medicine Master" />

      <div className="box custom-box !mb-0 flex flex-col min-h-[calc(100vh-12rem)]">
        <div className="box-header !flex-wrap gap-x-4 gap-y-3 !items-start">
          <div className="min-w-0 flex-1 basis-full lg:basis-auto">
            <h5 className="box-title mb-0 before:!hidden">Medicine Master</h5>
            <p className="text-[0.75rem] text-textmuted mb-0 mt-1">
              API medicines mapped to salts from imported buyer master data.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 ms-auto">
            <span className="badge bg-light text-defaulttextcolor whitespace-nowrap">
              {medicines.length} medicines
            </span>
            {savedFlash && (
              <span className="badge bg-success/10 text-success whitespace-nowrap">
                Saved
              </span>
            )}
            {isDirty && (
              <span className="badge bg-warning/10 text-warning whitespace-nowrap">
                Unsaved
              </span>
            )}
            <Link
              href="/lead-discovery"
              className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0"
            >
              <i className="ri-search-eye-line me-1"></i>
              Lead Discovery
            </Link>
          </div>
        </div>

        <div className="box-body !p-0 flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-12 flex-1 min-h-0 items-stretch">
            {/* Library */}
            <div className="lg:col-span-4 col-span-12 border-b lg:border-b-0 lg:border-e border-defaultborder dark:border-defaultborder/10 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-defaultborder dark:border-defaultborder/10 shrink-0 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h6 className="font-semibold text-[0.875rem] mb-0">
                    Medicine library
                  </h6>
                  <div className="flex items-center gap-2">
                    <ExcelMenu />
                    <button
                      type="button"
                      className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0"
                      onClick={handleAdd}
                      disabled={salts.length === 0}
                    >
                      <i className="ri-add-line me-1"></i>
                      New medicine
                    </button>
                  </div>
                </div>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light border-defaultborder dark:border-defaultborder/10">
                    <i className="ri-search-line text-textmuted"></i>
                  </span>
                  <input
                    type="search"
                    className="form-control"
                    placeholder="Search medicines…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search medicines"
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto">
                <table className="table table-hover ti-custom-table mb-0 text-[0.8125rem]">
                  <thead className="ti-custom-table-head sticky top-0 z-[1]">
                    <tr>
                      <th className="!w-10 !px-2">#</th>
                      <th className="!px-2">Medicine</th>
                      <th className="!px-2 hidden xl:table-cell">Salt</th>
                      <th className="!w-20 !px-2">Form</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMedicines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center text-textmuted !py-6 !px-2"
                        >
                          No medicines match your search
                        </td>
                      </tr>
                    ) : (
                      paginatedMedicines.map((med, index) => {
                        const selected = selectedId === med.id;
                        const rowNum = (page - 1) * pageSize + index + 1;
                        return (
                          <tr
                            key={med.id}
                            className={`cursor-pointer ${selected ? "table-active" : ""}`}
                            onClick={() => setSelectedId(med.id)}
                          >
                            <td className="!px-2 text-textmuted">{rowNum}</td>
                            <td
                              className={`!px-2 font-medium max-w-0 truncate ${
                                selected ? "text-primary" : ""
                              }`}
                              title={med.name}
                            >
                              {med.name}
                            </td>
                            <td
                              className="!px-2 max-w-0 truncate hidden xl:table-cell text-textmuted"
                              title={saltNamesFor(med)}
                            >
                              {saltNamesFor(med)}
                            </td>
                            <td className="!px-2">
                              <span className="badge bg-light text-defaulttextcolor text-[0.65rem]">
                                {med.dosageForm}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-3 py-2 border-t border-defaultborder dark:border-defaultborder/10 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
                  <label className="flex items-center gap-1.5 mb-0 whitespace-nowrap">
                    <span className="text-[0.6875rem] text-textmuted">Show</span>
                    <select
                      className="form-select form-select-sm !py-1 !ps-2 !pe-6 !text-[0.7rem] !w-[3.25rem]"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      aria-label="Medicines per page"
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>

                  <nav aria-label="Medicines pagination">
                    <ul className="ti-pagination pagination-sm mb-0 flex-nowrap items-center">
                      <li>
                        <button
                          type="button"
                          className="page-link !px-2 !py-1 !text-[0.7rem]"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          aria-label="Previous page"
                        >
                          ‹
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <li key={p}>
                            <button
                              type="button"
                              className={`page-link !px-2 !py-1 !text-[0.7rem] min-w-[1.5rem] ${p === page ? "active" : ""}`}
                              onClick={() => setPage(p)}
                              aria-current={p === page ? "page" : undefined}
                            >
                              {p}
                            </button>
                          </li>
                        )
                      )}
                      <li>
                        <button
                          type="button"
                          className="page-link !px-2 !py-1 !text-[0.7rem]"
                          disabled={page >= totalPages}
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          aria-label="Next page"
                        >
                          ›
                        </button>
                      </li>
                    </ul>
                  </nav>

                  <span className="text-[0.6875rem] text-textmuted whitespace-nowrap tabular-nums">
                    {filteredMedicines.length === 0
                      ? "0 medicines"
                      : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredMedicines.length)} of ${filteredMedicines.length}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="lg:col-span-8 col-span-12 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-defaultborder dark:border-defaultborder/10 shrink-0 space-y-3">
                <h6 className="font-semibold text-[0.875rem] mb-0 truncate">
                  {draft.name}
                </h6>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge bg-light text-defaulttextcolor text-[0.75rem]">
                      {leadCount} active leads
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="ti-btn ti-btn-danger !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0"
                      onClick={handleSave}
                      disabled={!isDirty || !draft.name.trim() || draft.saltIds.length === 0}
                    >
                      Save changes
                    </button>
                  </div>
                </div>
                {deleteError && (
                  <p className="text-[0.75rem] text-danger mb-0">{deleteError}</p>
                )}
              </div>

              <div className="px-4 py-4 flex-1 overflow-y-auto min-h-0">
                <div className="mb-4">
                  <label className="form-label text-[0.75rem]">Medicine name</label>
                  <input
                    type="text"
                    className="form-control w-full"
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                    placeholder="e.g. Budesonide"
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label text-[0.75rem]">
                    Linked salts
                    <span className="text-textmuted font-normal ms-1">
                      ({draft.saltIds.length} selected)
                    </span>
                  </label>
                  {salts.length === 0 ? (
                    <p className="text-[0.8125rem] text-textmuted mb-0">
                      No salts available
                    </p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto rounded-md border border-defaultborder dark:border-defaultborder/10 divide-y divide-defaultborder dark:divide-defaultborder/10">
                      {salts.map((salt) => {
                        const checked = draft.saltIds.includes(salt.id);
                        return (
                          <label
                            key={salt.id}
                            className="flex items-center gap-2 px-3 py-2 mb-0 cursor-pointer hover:bg-light"
                          >
                            <input
                              type="checkbox"
                              className="form-check-input mt-0"
                              checked={checked}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  saltIds: e.target.checked
                                    ? [...draft.saltIds, salt.id]
                                    : draft.saltIds.filter((id) => id !== salt.id),
                                })
                              }
                            />
                            <span className="text-[0.8125rem]">{salt.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="form-label text-[0.75rem]">Dosage form</label>
                  <select
                    className="form-select w-full"
                    value={draft.dosageForm}
                    onChange={(e) =>
                      setDraft({ ...draft, dosageForm: e.target.value })
                    }
                  >
                    {DOSAGE_FORM_OPTIONS.map((form) => (
                      <option key={form} value={form}>
                        {form}
                      </option>
                    ))}
                    {!DOSAGE_FORM_OPTIONS.includes(
                      draft.dosageForm as (typeof DOSAGE_FORM_OPTIONS)[number]
                    ) && (
                      <option value={draft.dosageForm}>{draft.dosageForm}</option>
                    )}
                  </select>
                  <p className="text-[0.6875rem] text-textmuted mt-2 mb-0">
                    Renaming updates matched medicine on all linked leads.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDeleteOverlay
        open={confirmingDelete}
        title="Delete medicine?"
        entityName={draft.name}
        description={
          leadCount > 0
            ? `${leadCount} active lead${leadCount === 1 ? "" : "s"} reference this medicine. They keep the name but lose the link. This cannot be undone —`
            : "This action cannot be undone —"
        }
        busy={deleting}
        onConfirm={performDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </Fragment>
  );
}
