"use client";

import type { ReactNode } from "react";

type LeadFormSectionShellProps = {
  title: string;
  children: ReactNode;
  badge?: string;
};

export function LeadFormSectionShell({
  title,
  children,
  badge,
}: LeadFormSectionShellProps) {
  return (
    <div className="box custom-box !mb-4">
      <div className="box-header border-b border-defaultborder dark:border-defaultborder/10 flex items-center justify-between gap-2 min-w-0">
        <h6 className="box-title mb-0 before:!hidden truncate">{title}</h6>
        {badge && (
          <span className="badge bg-secondary/10 text-secondary text-[0.7rem] shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div className="box-body">{children}</div>
    </div>
  );
}

function LeadFormEmptyTable({ message }: { message: string }) {
  return (
    <p className="text-[0.8125rem] text-textmuted dark:text-textmuted/90 mb-0 py-3 px-1">
      {message}
    </p>
  );
}

/** Icon + label Edit/Delete pair for lead-form and CRM table rows. */
export function LeadFormRowActions({
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
  editAriaLabel,
  deleteAriaLabel,
}: {
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  deleteLabel?: string;
  editAriaLabel?: string;
  deleteAriaLabel?: string;
}) {
  return (
    <div className="lead-form-row-actions inline-flex items-center justify-end gap-2 whitespace-nowrap">
      <button
        type="button"
        className="ti-btn ti-btn-light !min-h-[2.75rem] !mb-0"
        onClick={onEdit}
        aria-label={editAriaLabel ?? editLabel}
      >
        <i className="ri-edit-line" aria-hidden="true" />
        {editLabel}
      </button>
      <button
        type="button"
        className="ti-btn ti-btn-outline-danger !min-h-[2.75rem] !mb-0"
        onClick={onDelete}
        aria-label={deleteAriaLabel ?? deleteLabel}
      >
        <i className="ri-delete-bin-line" aria-hidden="true" />
        {deleteLabel}
      </button>
    </div>
  );
}

export function LeadFormDataTable({
  columns,
  rows,
  emptyMessage,
  actionsColumn = false,
}: {
  columns: string[];
  rows: ReactNode[][];
  emptyMessage: string;
  /** Pin the last column (Edit/Delete) visible during horizontal scroll. */
  actionsColumn?: boolean;
}) {
  if (rows.length === 0) {
    return <LeadFormEmptyTable message={emptyMessage} />;
  }
  const lastIdx = columns.length - 1;
  const beforeActionsIdx = lastIdx - 1;
  const wrapClass = actionsColumn
    ? "table-responsive lead-form-table-wrap lead-form-table-wrap--actions"
    : "table-responsive lead-form-table-wrap";
  const cellClass = (idx: number) => {
    if (!actionsColumn) return "align-middle";
    if (idx === lastIdx) return "align-middle lead-form-table-actions";
    if (idx === beforeActionsIdx) return "align-middle lead-form-table-before-actions";
    return "align-middle";
  };
  const headerClass = (idx: number) => {
    const base = "text-[0.6875rem] uppercase tracking-wide whitespace-nowrap";
    if (actionsColumn && idx === lastIdx) return `${base} lead-form-table-actions`;
    if (actionsColumn && idx === beforeActionsIdx) return `${base} lead-form-table-before-actions`;
    return base;
  };
  return (
    <div className={wrapClass}>
      <table className="table ti-custom-table min-w-full mb-0 text-[0.75rem]">
        <thead className="ti-custom-table-head">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} scope="col" className={headerClass(idx)}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIdx) => (
            <tr key={rowIdx}>
              {cells.map((cell, cellIdx) => (
                <td key={cellIdx} className={cellClass(cellIdx)}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
