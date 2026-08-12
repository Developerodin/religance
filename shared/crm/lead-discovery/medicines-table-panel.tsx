"use client";

import {
  getMedicinesForCheckedSalts,
  type DiscoveryMedicine,
} from "@/shared/crm/lead-discovery/discovery-catalog";
import { useCrm } from "@/shared/crm/store/crm-context";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 15;
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50] as const;

type MedicinesTablePanelProps = {
  checkedSaltIds: string[];
  checkedMedicineIds: string[];
  onCheckedChange: (ids: string[]) => void;
  activeMedicineId: string | null;
  onActiveMedicineChange: (medicine: DiscoveryMedicine | null) => void;
  onSelectionChange?: () => void;
};

export default function MedicinesTablePanel({
  checkedSaltIds,
  checkedMedicineIds,
  onCheckedChange,
  activeMedicineId,
  onActiveMedicineChange,
  onSelectionChange,
}: MedicinesTablePanelProps) {
  const { salts, medicines: allMedicinesFromStore } = useCrm();
  const saltNameById = useMemo(
    () => new Map(salts.map((s) => [s.id, s.name])),
    [salts]
  );
  const saltNamesFor = (m: { saltIds: string[] }) =>
    m.saltIds
      .map((id) => saltNameById.get(id))
      .filter(Boolean)
      .join(", ") || "—";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const showSaltColumn = checkedSaltIds.length > 1;

  const allMedicines = useMemo(
    () => getMedicinesForCheckedSalts(checkedSaltIds, allMedicinesFromStore),
    [checkedSaltIds, allMedicinesFromStore]
  );

  const filteredMedicines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allMedicines;
    return allMedicines.filter((m) => {
      const salt = saltNamesFor(m).toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        salt.includes(q) ||
        m.dosageForm.toLowerCase().includes(q)
      );
    });
  }, [allMedicines, search, saltNameById]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMedicines.length / pageSize)
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, checkedSaltIds.join(",")]);

  const paginatedMedicines = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMedicines.slice(start, start + pageSize);
  }, [filteredMedicines, page, pageSize]);

  const pageMedicineIds = paginatedMedicines.map((m) => m.id);
  const allPageChecked =
    pageMedicineIds.length > 0 &&
    pageMedicineIds.every((id) => checkedMedicineIds.includes(id));
  const somePageChecked =
    !allPageChecked &&
    pageMedicineIds.some((id) => checkedMedicineIds.includes(id));

  const colSpan = showSaltColumn ? 3 : 2;

  const toggleMedicine = (medicine: DiscoveryMedicine, checked: boolean) => {
    const next = checked
      ? [...checkedMedicineIds, medicine.id]
      : checkedMedicineIds.filter((id) => id !== medicine.id);
    onCheckedChange(next);
    onSelectionChange?.();

    if (checked) {
      onActiveMedicineChange(medicine);
    } else if (activeMedicineId === medicine.id) {
      const fallback =
        allMedicines.find((m) => next.includes(m.id)) ?? null;
      onActiveMedicineChange(fallback);
    }
  };

  const focusMedicine = (medicine: DiscoveryMedicine) => {
    onActiveMedicineChange(medicine);
    if (!checkedMedicineIds.includes(medicine.id)) {
      onCheckedChange([...checkedMedicineIds, medicine.id]);
      onSelectionChange?.();
    }
  };

  const togglePageAll = () => {
    if (allPageChecked) {
      const removed = new Set(pageMedicineIds);
      const next = checkedMedicineIds.filter((id) => !removed.has(id));
      onCheckedChange(next);
      if (activeMedicineId && removed.has(activeMedicineId)) {
        onActiveMedicineChange(null);
      }
    } else {
      const merged = new Set([...checkedMedicineIds, ...pageMedicineIds]);
      onCheckedChange([...merged]);
    }
    onSelectionChange?.();
  };

  return (
    <div className="lead-discovery-medicines flex flex-col h-auto min-h-0 xl:h-full xl:min-h-[calc(100vh-10rem)] min-w-0 overflow-x-hidden">
      <div className="box-header flex-col items-stretch gap-2 !block !px-2.5 !py-2 border-b border-defaultborder dark:border-defaultborder/10">
        <div className="flex items-center justify-between gap-1">
          <div className="box-title mb-0 text-[0.875rem] before:!hidden">
            Medicines
          </div>
          <span className="badge bg-light text-defaulttextcolor font-normal text-[0.65rem]">
            {checkedMedicineIds.length}
          </span>
        </div>
        <div className="input-group input-group-sm">
          <span className="input-group-text !px-2 bg-light border-defaultborder dark:border-defaultborder/10">
            <i className="ri-search-line text-textmuted text-[0.875rem]"></i>
          </span>
          <input
            type="search"
            className="form-control !py-1 !text-[0.8125rem]"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search medicines"
            disabled={checkedSaltIds.length === 0}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto">
        {checkedSaltIds.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-textmuted dark:text-textmuted/90 mb-0 text-[0.8125rem]">
              Select one or more salts to view medicines
            </p>
          </div>
        ) : (
          <table className="table table-hover ti-custom-table w-full table-fixed mb-0 text-[0.8125rem]">
            <thead className="ti-custom-table-head lead-discovery-col-header">
              <tr>
                <th scope="col" className="!w-8 !px-1 !py-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={allPageChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageChecked;
                    }}
                    onChange={togglePageAll}
                    aria-label="Select all medicines on this page"
                  />
                </th>
                {showSaltColumn && (
                  <th scope="col" className="!px-2 !py-2 !w-[38%]">
                    Salt
                  </th>
                )}
                <th scope="col" className="!px-2 !py-2 min-w-0">
                  Medicine name
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedMedicines.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="text-center text-textmuted !py-4 !px-2 text-[0.75rem]"
                  >
                    No medicines match your search
                  </td>
                </tr>
              ) : (
                paginatedMedicines.map((medicine) => {
                  const checked = checkedMedicineIds.includes(medicine.id);
                  const isActive = activeMedicineId === medicine.id;
                  return (
                    <tr
                      key={medicine.id}
                      className={`cursor-pointer ${checked || isActive ? "table-active" : ""}`}
                      onClick={() => focusMedicine(medicine)}
                    >
                      <td
                        className="!px-1 !py-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={checked}
                          onChange={() => toggleMedicine(medicine, !checked)}
                          aria-label={`Select ${medicine.name}`}
                        />
                      </td>
                      {showSaltColumn && (
                        <td
                          className="!px-2 !py-1.5 text-textmuted min-w-0 max-w-0 truncate"
                          title={saltNamesFor(medicine)}
                        >
                          {saltNamesFor(medicine)}
                        </td>
                      )}
                      <td
                        className="!px-2 !py-1.5 font-medium min-w-0 max-w-0 truncate"
                        title={medicine.name}
                      >
                        {medicine.name}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {checkedSaltIds.length > 0 && (
        <div className="box-footer !px-2.5 !py-2 border-t border-defaultborder dark:border-defaultborder/10 min-w-0 overflow-x-hidden">
          <div className="lead-discovery-panel-footer min-h-[2rem]">
            <div className="flex items-center gap-2 justify-start min-w-0">
              <label className="flex items-center gap-1 mb-0 whitespace-nowrap shrink-0">
                <span className="text-[0.65rem] text-textmuted dark:text-textmuted/90 leading-none">
                  Show
                </span>
                <select
                  className="form-select form-select-sm !py-1 !ps-2 !pe-6 !text-[0.7rem] !w-[3.25rem] !min-h-[1.625rem] !leading-none"
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
            </div>

            <nav aria-label="Medicines pagination" className="shrink-0">
              <ul className="ti-pagination pagination-sm mb-0 !py-0 flex-nowrap items-center">
                <li className="!flex items-center">
                  <button
                    type="button"
                    className="page-link !px-2 !py-1 !text-[0.7rem] !leading-none"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    ‹
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className="!flex items-center">
                    <button
                      type="button"
                      className={`page-link !px-2 !py-1 !text-[0.7rem] !leading-none min-w-[1.5rem] ${p === page ? "active" : ""}`}
                      onClick={() => setPage(p)}
                      aria-current={p === page ? "page" : undefined}
                    >
                      {p}
                    </button>
                  </li>
                ))}
                <li className="!flex items-center">
                  <button
                    type="button"
                    className="page-link !px-2 !py-1 !text-[0.7rem] !leading-none"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                  >
                    ›
                  </button>
                </li>
              </ul>
            </nav>

            <span className="text-[0.65rem] text-textmuted dark:text-textmuted/90 whitespace-nowrap leading-none tabular-nums">
              {page}/{totalPages}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
