"use client";

import type { SaltMasterItem } from "@/shared/crm/store/salts-master";
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

function saltEquals(a: SaltMasterItem, b: SaltMasterItem): boolean {
  return a.name === b.name;
}

export default function SaltsSettingsPage() {
  const {
    salts,
    medicines,
    leads,
    hydrated,
    addSalt,
    updateSalt,
    deleteSalt,
  } = useCrm();

  const [selectedId, setSelectedId] = useState(salts[0]?.id ?? "");
  const [draft, setDraft] = useState<SaltMasterItem | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [savedFlash, setSavedFlash] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const savedSalt = useMemo(
    () => salts.find((s) => s.id === selectedId),
    [salts, selectedId]
  );

  useEffect(() => {
    if (!savedSalt) return;
    setDraft({ ...savedSalt });
    setDeleteError("");
  }, [savedSalt]);

  useEffect(() => {
    if (salts.length && !salts.some((s) => s.id === selectedId)) {
      setSelectedId(salts[0].id);
    }
  }, [salts, selectedId]);

  const medicineCountBySalt = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of medicines) {
      for (const saltId of m.saltIds) {
        counts.set(saltId, (counts.get(saltId) ?? 0) + 1);
      }
    }
    return counts;
  }, [medicines]);

  const leadCountBySaltName = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) {
      counts.set(lead.matchedSalt, (counts.get(lead.matchedSalt) ?? 0) + 1);
    }
    return counts;
  }, [leads]);

  const filteredSalts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return salts;
    return salts.filter((s) => s.name.toLowerCase().includes(q));
  }, [salts, search]);

  const totalPages = Math.max(1, Math.ceil(filteredSalts.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const paginatedSalts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSalts.slice(start, start + pageSize);
  }, [filteredSalts, page, pageSize]);

  useEffect(() => {
    if (!selectedId || filteredSalts.length === 0) return;
    const index = filteredSalts.findIndex((s) => s.id === selectedId);
    if (index >= 0) {
      setPage(Math.floor(index / pageSize) + 1);
    }
  }, [selectedId, filteredSalts, pageSize]);

  const isDirty = useMemo(() => {
    if (!draft || !savedSalt) return false;
    return !saltEquals(draft, savedSalt);
  }, [draft, savedSalt]);

  const medicineCount = savedSalt
    ? (medicineCountBySalt.get(savedSalt.id) ?? 0)
    : 0;
  const leadCount = draft ? (leadCountBySaltName.get(draft.name) ?? 0) : 0;

  const handleSave = async () => {
    if (!draft || !isDirty) return;
    setDeleteError("");
    const ok = await updateSalt(draft.id, {
      name: draft.name.trim() || savedSalt?.name || "Untitled salt",
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
    const id = await addSalt();
    if (!id) {
      setDeleteError("Could not create the salt. Nothing was saved.");
      return;
    }
    setSelectedId(id);
    setSearch("");
  };

  const performDelete = async () => {
    if (!selectedId) return;
    setDeleting(true);
    setDeleteError("");
    const ok = await deleteSalt(selectedId);
    setDeleting(false);
    if (!ok) {
      setDeleteError("Could not delete this salt. Check your connection.");
      return;
    }
    setConfirmingDelete(false);
  };

  if (!hydrated || !draft) {
    return (
      <div className="p-8 text-center text-textmuted">Loading salts…</div>
    );
  }

  return (
    <Fragment>
      <Seo title="Salts Master" />

      <div className="box custom-box !mb-0 flex flex-col min-h-[calc(100vh-12rem)]">
        <div className="box-header !flex-wrap gap-x-4 gap-y-3 !items-start">
          <div className="min-w-0 flex-1 basis-full lg:basis-auto">
            <h5 className="box-title mb-0 before:!hidden">Salts Master</h5>
            <p className="text-[0.75rem] text-textmuted mb-0 mt-1">
              API salts used in Lead Discovery matching and lead records. Shared
              across the team — edits apply to everyone.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 ms-auto">
            <span className="badge bg-light text-defaulttextcolor whitespace-nowrap">
              {salts.length} salts
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
                    Salt library
                  </h6>
                  <div className="flex items-center gap-2">
                    <ExcelMenu />
                    <button
                      type="button"
                      className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0"
                      onClick={handleAdd}
                    >
                      <i className="ri-add-line me-1"></i>
                      New salt
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
                    placeholder="Search salts…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search salts"
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto">
                <table className="table table-hover ti-custom-table mb-0 text-[0.8125rem]">
                  <thead className="ti-custom-table-head sticky top-0 z-[1]">
                    <tr>
                      <th className="!w-10 !px-2">#</th>
                      <th className="!px-2">Salt name</th>
                      <th className="!w-16 !px-2 text-center">Meds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSalts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center text-textmuted !py-6 !px-2"
                        >
                          No salts match your search
                        </td>
                      </tr>
                    ) : (
                      paginatedSalts.map((salt, index) => {
                        const selected = selectedId === salt.id;
                        const medCount = medicineCountBySalt.get(salt.id) ?? 0;
                        const rowNum = (page - 1) * pageSize + index + 1;
                        return (
                          <tr
                            key={salt.id}
                            className={`cursor-pointer ${selected ? "table-active" : ""}`}
                            onClick={() => setSelectedId(salt.id)}
                          >
                            <td className="!px-2 text-textmuted">{rowNum}</td>
                            <td
                              className={`!px-2 font-medium max-w-0 truncate ${
                                selected ? "text-primary" : ""
                              }`}
                              title={salt.name}
                            >
                              {salt.name}
                            </td>
                            <td className="!px-2 text-center">
                              <span className="badge bg-light text-defaulttextcolor text-[0.65rem]">
                                {medCount}
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
                      aria-label="Salts per page"
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>

                  <nav aria-label="Salts pagination">
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
                    {filteredSalts.length === 0
                      ? "0 salts"
                      : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredSalts.length)} of ${filteredSalts.length}`}
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
                      {medicineCount} linked medicines
                    </span>
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
                      disabled={!isDirty || !draft.name.trim()}
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
                  <label className="form-label text-[0.75rem]">Salt name</label>
                  <input
                    type="text"
                    className="form-control w-full"
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                    placeholder="e.g. Budesonide"
                  />
                  <p className="text-[0.6875rem] text-textmuted mt-2 mb-0">
                    Renaming updates matched salt on all linked leads.
                  </p>
                </div>

                {medicineCount > 0 && (
                  <div className="rounded-md border border-defaultborder dark:border-defaultborder/10 p-4">
                    <p className="text-[0.75rem] font-medium mb-2">
                      Linked medicines
                    </p>
                    <ul className="list-none mb-0 space-y-1">
                      {medicines.filter(
                        (m) => m.saltIds.includes(draft.id)
                      ).map((med) => (
                        <li
                          key={med.id}
                          className="text-[0.8125rem] text-textmuted"
                        >
                          {med.name}{" "}
                          <span className="badge bg-light text-defaulttextcolor text-[0.65rem] ms-1">
                            {med.dosageForm}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDeleteOverlay
        open={confirmingDelete}
        title="Delete salt?"
        entityName={draft.name}
        description={buildSaltDeleteWarning(medicineCount, leadCount)}
        busy={deleting}
        onConfirm={performDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </Fragment>
  );
}

/** Spells out the cascade so the user knows what deleting a salt takes with it. */
function buildSaltDeleteWarning(medicineCount: number, leadCount: number): string {
  const parts: string[] = [];
  if (medicineCount > 0) {
    parts.push(
      `${medicineCount} linked medicine${medicineCount === 1 ? "" : "s"} will be unlinked (and removed if this was their only salt)`
    );
  }
  if (leadCount > 0) {
    parts.push(
      `${leadCount} active lead${leadCount === 1 ? "" : "s"} keep the name but lose the link`
    );
  }
  const detail = parts.length ? `${parts.join("; ")}. ` : "";
  return `${detail}This cannot be undone —`;
}
