"use client";

import { useCrm } from "@/shared/crm/store/crm-context";
import type { SaltMasterItem } from "@/shared/crm/lead-discovery/salts";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 15;
const PAGE_SIZE_OPTIONS = [10, 15, 18] as const;

type SaltsTablePanelProps = {
  checkedSaltIds: string[];
  onCheckedChange: (ids: string[]) => void;
  onSelectionChange?: () => void;
};

export default function SaltsTablePanel({
  checkedSaltIds,
  onCheckedChange,
  onSelectionChange,
}: SaltsTablePanelProps) {
  const { salts } = useCrm();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const filteredSalts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [...salts];
    return salts.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.includes(q)
    );
  }, [search, salts]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSalts.length / pageSize)
  );

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

  const pageSaltIds = paginatedSalts.map((s) => s.id);
  const allPageChecked =
    pageSaltIds.length > 0 &&
    pageSaltIds.every((id) => checkedSaltIds.includes(id));
  const somePageChecked =
    !allPageChecked && pageSaltIds.some((id) => checkedSaltIds.includes(id));

  const toggleSalt = (saltId: string) => {
    const next = checkedSaltIds.includes(saltId)
      ? checkedSaltIds.filter((id) => id !== saltId)
      : [...checkedSaltIds, saltId];
    onCheckedChange(next);
    onSelectionChange?.();
  };

  const togglePageAll = () => {
    if (allPageChecked) {
      onCheckedChange(
        checkedSaltIds.filter((id) => !pageSaltIds.includes(id))
      );
    } else {
      const merged = new Set([...checkedSaltIds, ...pageSaltIds]);
      onCheckedChange([...merged]);
    }
    onSelectionChange?.();
  };

  return (
    <div className="lead-discovery-salts flex flex-col h-auto min-h-0 xl:h-full xl:min-h-[calc(100vh-10rem)] min-w-0 overflow-x-hidden">
      <div className="box-header flex-col items-stretch gap-2 !block !px-2.5 !py-2 border-b border-defaultborder dark:border-defaultborder/10">
        <div className="flex items-center justify-between gap-1">
          <div className="box-title mb-0 text-[0.875rem] before:!hidden">Salts</div>
          <span className="badge bg-light text-defaulttextcolor font-normal text-[0.65rem]">
            {checkedSaltIds.length}
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
            aria-label="Search salts"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto">
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
                  aria-label="Select all on this page"
                />
              </th>
              <th scope="col" className="!px-2 !py-2 min-w-0">
                Salt name
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedSalts.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  className="text-center text-textmuted !py-4 !px-2 text-[0.75rem]"
                >
                  No salts match your search
                </td>
              </tr>
            ) : (
              paginatedSalts.map((salt: SaltMasterItem) => {
                const checked = checkedSaltIds.includes(salt.id);
                return (
                  <tr
                    key={salt.id}
                    className={`cursor-pointer ${checked ? "table-active" : ""}`}
                    onClick={() => toggleSalt(salt.id)}
                  >
                    <td className="!px-1 !py-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={checked}
                        onChange={() => toggleSalt(salt.id)}
                        aria-label={`Select ${salt.name}`}
                      />
                    </td>
                    <td
                      className="!px-2 !py-1.5 font-medium min-w-0 max-w-0 truncate"
                      title={salt.name}
                    >
                      {salt.name}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
                aria-label="Salts per page"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <nav aria-label="Salts pagination" className="shrink-0">
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
    </div>
  );
}
