"use client";

import {
  getCompaniesForCheckedMedicines,
  getCompaniesFromLeads,
  getMedicinesForCheckedSalts,
  type DiscoveryMedicine,
} from "@/shared/crm/lead-discovery/discovery-catalog";
import { formatBuyerSubtitle } from "@/shared/crm/lead-discovery/discovery-excel";
import { listBackendMasterData } from "@/shared/crm/store/outlook-api";
import type { BackendBuyerMaster } from "@/shared/crm/store/outlook-api";
import { isAuthed } from "@/shared/auth/auth-client";
import { CompanyProfileDrawer } from "@/shared/crm/lead-discovery/company-profile-drawer";
import LeadScoreBadge from "@/shared/crm/lead-discovery/lead-score-badge";
import MedicinesTablePanel from "@/shared/crm/lead-discovery/medicines-table-panel";
import SaltsTablePanel from "@/shared/crm/lead-discovery/salts-table-panel";
import {
  EMPTY_LEAD_DISCOVERY_FILTERS,
  type DiscoveredCompany,
  type LeadDiscoveryFilters,
} from "@/shared/crm/lead-discovery/types";
import {
  collectFilterOptions,
  filterDiscoveredCompanies,
  hasActiveFilters,
  sortDiscoveredCompanies,
  type ResultsSortColumn,
  type ResultsSortDirection,
} from "@/shared/crm/lead-discovery/utils";
import { useCrm } from "@/shared/crm/store/crm-context";
import { leadNewHref } from "@/shared/crm/active-leads/active-leads-utils";
import { resolvePrefillSaltId } from "@/shared/crm/store/lead-form-utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const PANEL_SCROLL_MAX = "calc(100vh - 11rem)";

function SortableColumnHeader({
  column,
  label,
  align = "start",
  sortColumn,
  sortDirection,
  onSort,
}: {
  column: ResultsSortColumn;
  label: string;
  align?: "start" | "end";
  sortColumn: ResultsSortColumn | null;
  sortDirection: ResultsSortDirection | null;
  onSort: (column: ResultsSortColumn) => void;
}) {
  const isActive = sortColumn === column && sortDirection !== null;
  const ariaSort =
    isActive && sortDirection === "asc"
      ? "ascending"
      : isActive && sortDirection === "desc"
        ? "descending"
        : "none";
  const iconClass =
    isActive && sortDirection === "asc"
      ? "ri-arrow-up-s-line"
      : isActive && sortDirection === "desc"
        ? "ri-arrow-down-s-line"
        : "ri-arrow-up-down-line";

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={align === "end" ? "!text-end" : "!text-start"}
    >
      <button
        type="button"
        className={`lead-discovery-sort-header${
          isActive ? " lead-discovery-sort-header--active" : ""
        }${align === "end" ? " lead-discovery-sort-header--end" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onSort(column);
        }}
      >
        <span className="lead-discovery-sort-label">{label}</span>
        <span className="lead-discovery-sort-icon" aria-hidden="true">
          <i className={iconClass}></i>
        </span>
      </button>
    </th>
  );
}

function EmptyPanel({
  icon,
  message,
}: {
  icon: string;
  message: string;
}) {
  return (
    <div className="text-center py-8 px-4">
      <span className="avatar avatar-lg bg-primary/10 text-primary mb-3 inline-flex justify-center items-center">
        <i className={`${icon} text-2xl`}></i>
      </span>
      <p className="text-textmuted dark:text-textmuted/90 mb-0 text-[0.8125rem]">
        {message}
      </p>
    </div>
  );
}

export default function LeadDiscoveryBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    salts,
    medicines: allMedicines,
    leads,
    companies,
    masterDataSynced,
    masterDataRevision,
    refreshMasterData,
  } = useCrm();
  const [catalogueBuyers, setCatalogueBuyers] = useState<BackendBuyerMaster[]>([]);
  const [buyersLoading, setBuyersLoading] = useState(true);
  const [buyersError, setBuyersError] = useState<string | null>(null);
  const [checkedSaltIds, setCheckedSaltIds] = useState<string[]>([]);
  const [checkedMedicineIds, setCheckedMedicineIds] = useState<string[]>([]);
  const [activeMedicineId, setActiveMedicineId] = useState<string | null>(null);
  const [resultFilters, setResultFilters] = useState<LeadDiscoveryFilters>(
    EMPTY_LEAD_DISCOVERY_FILTERS
  );
  const [profileCompany, setProfileCompany] =
    useState<DiscoveredCompany | null>(null);
  const [sortColumn, setSortColumn] = useState<ResultsSortColumn | null>(null);
  const [sortDirection, setSortDirection] =
    useState<ResultsSortDirection | null>(null);
  const [urlSelectionApplied, setUrlSelectionApplied] = useState(false);

  const medicines = useMemo(
    () => getMedicinesForCheckedSalts(checkedSaltIds, allMedicines),
    [checkedSaltIds, allMedicines]
  );

  const activeMedicine = useMemo(
    () => medicines.find((m) => m.id === activeMedicineId) ?? null,
    [medicines, activeMedicineId]
  );

  const loadBuyers = useCallback(async () => {
    if (!isAuthed()) {
      setCatalogueBuyers([]);
      setBuyersError("Sign in to load buyers.");
      setBuyersLoading(false);
      return;
    }

    setBuyersLoading(true);
    setBuyersError(null);
    const res = await listBackendMasterData(true);
    if (res.live) {
      setCatalogueBuyers(res.data.buyers);
      setBuyersError(null);
    } else {
      setCatalogueBuyers([]);
      setBuyersError(res.error);
    }
    setBuyersLoading(false);
  }, []);

  useEffect(() => {
    if (!masterDataSynced) {
      void refreshMasterData();
    }
  }, [masterDataSynced, refreshMasterData]);

  useEffect(() => {
    void loadBuyers();
  }, [loadBuyers, masterDataRevision]);

  useEffect(() => {
    if (urlSelectionApplied || !masterDataSynced) return;
    const urlSaltId = searchParams.get("saltId");
    const urlMedicineId = searchParams.get("medicineId");
    if (!urlSaltId && !urlMedicineId) {
      setUrlSelectionApplied(true);
      return;
    }
    if (urlSaltId && salts.some((s) => s.id === urlSaltId)) {
      setCheckedSaltIds([urlSaltId]);
    }
    if (urlMedicineId && allMedicines.some((m) => m.id === urlMedicineId)) {
      setActiveMedicineId(urlMedicineId);
    }
    setUrlSelectionApplied(true);
  }, [
    urlSelectionApplied,
    masterDataSynced,
    searchParams,
    salts,
    allMedicines,
  ]);

  /** Keep medicine selection in sync when salts or catalogue medicines change. */
  useEffect(() => {
    if (!checkedSaltIds.length) {
      setCheckedMedicineIds([]);
      setActiveMedicineId(null);
      setProfileCompany(null);
      return;
    }

    const list = getMedicinesForCheckedSalts(checkedSaltIds, allMedicines);
    const allIds = list.map((m) => m.id);
    setCheckedMedicineIds((prev) => {
      const kept = prev.filter((id) => allIds.includes(id));
      const merged = new Set([...kept, ...allIds]);
      return [...merged];
    });
    setActiveMedicineId((prev) =>
      prev && allIds.includes(prev) ? prev : allIds[0] ?? null
    );
    setProfileCompany(null);
  }, [checkedSaltIds, allMedicines]);

  const catalogueCompanies = useMemo(
    () => {
      const catalogue = getCompaniesForCheckedMedicines(
        checkedSaltIds,
        checkedMedicineIds,
        allMedicines,
        salts,
        catalogueBuyers
      );
      // Merge in the user's own created leads. Lead rows override the catalogue
      // row with the same id so a saved lead surfaces instead of the raw buyer.
      const leadRows = getCompaniesFromLeads(checkedMedicineIds, leads, companies);
      const leadIds = new Set(leadRows.map((r) => r.id));
      const merged = [
        ...leadRows,
        ...catalogue.filter((c) => !leadIds.has(c.id)),
      ];
      return merged.sort((a, b) => b.leadScore - a.leadScore);
    },
    [
      checkedSaltIds,
      checkedMedicineIds,
      allMedicines,
      salts,
      catalogueBuyers,
      leads,
      companies,
    ]
  );

  const filterOptions = useMemo(
    () => collectFilterOptions(catalogueCompanies),
    [catalogueCompanies]
  );

  const filteredCompanies = useMemo(
    () => filterDiscoveredCompanies(catalogueCompanies, resultFilters),
    [catalogueCompanies, resultFilters]
  );

  const displayCompanies = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return filteredCompanies;
    }
    return sortDiscoveredCompanies(
      filteredCompanies,
      sortColumn,
      sortDirection
    );
  }, [filteredCompanies, sortColumn, sortDirection]);

  useEffect(() => {
    if (!masterDataSynced || buyersLoading) return;
    const discoveryCompanyId = searchParams.get("discoveryCompanyId");
    if (!discoveryCompanyId) return;
    const match = catalogueCompanies.find((c) => c.id === discoveryCompanyId);
    if (match) setProfileCompany(match);
  }, [
    masterDataSynced,
    buyersLoading,
    searchParams,
    catalogueCompanies,
  ]);

  const handleSortColumn = useCallback((column: ResultsSortColumn) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection("asc");
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }
    setSortColumn(null);
    setSortDirection(null);
  }, [sortColumn, sortDirection]);

  const handleMedicineSelectionChange = () => {
    setProfileCompany(null);
  };

  const handleActiveMedicineChange = (medicine: DiscoveryMedicine | null) => {
    setActiveMedicineId(medicine?.id ?? null);
    setProfileCompany(null);
  };

  const activeSaltId = useMemo(() => {
    if (!activeMedicine) return null;
    const fromChecked = activeMedicine.saltIds.find((id) =>
      checkedSaltIds.includes(id)
    );
    return fromChecked ?? activeMedicine.saltIds[0] ?? null;
  }, [activeMedicine, checkedSaltIds]);

  const handleNewLead = () => {
    if (!activeMedicine) {
      router.push(leadNewHref({ from: "discovery" }));
      return;
    }
    const saltId = resolvePrefillSaltId(activeSaltId, activeMedicine);
    router.push(
      leadNewHref({
        from: "discovery",
        medicineId: activeMedicine.id,
        saltId: saltId || null,
      })
    );
  };

  const clearResultFilters = () => {
    setResultFilters(EMPTY_LEAD_DISCOVERY_FILTERS);
  };

  const resultsStatus = buyersError ? (
    <span className="text-danger">{buyersError}</span>
  ) : buyersLoading ? (
    <span className="text-textmuted">Loading buyers…</span>
  ) : catalogueBuyers.length > 0 ? (
    <span className="text-success">
      Live · {catalogueBuyers.length} buyers from catalogue
      {salts.length > 0 ? ` · ${salts.length} salts` : ""}
    </span>
  ) : !masterDataSynced ? (
    <span className="text-textmuted">Syncing salts & medicines…</span>
  ) : null;

  const filtersActive = hasActiveFilters(resultFilters);
  const noSaltSelected = checkedSaltIds.length === 0;
  const noMedicineSelected = checkedMedicineIds.length === 0;

  return (
    <>
      <div className="lead-discovery-board grid grid-cols-12 gap-0 border border-defaultborder dark:border-defaultborder/10 rounded-md bg-white dark:bg-bodybg">
        <div className="xxl:col-span-2 xl:col-span-4 col-span-12 min-w-0 border-e border-defaultborder dark:border-defaultborder/10">
          <div className="mb-0 h-full min-w-0">
            <SaltsTablePanel
              checkedSaltIds={checkedSaltIds}
              onCheckedChange={setCheckedSaltIds}
            />
          </div>
        </div>

        <div className="xxl:col-span-2 xl:col-span-4 col-span-12 min-w-0 border-e border-defaultborder dark:border-defaultborder/10">
          <div className="mb-0 h-full min-w-0">
            <MedicinesTablePanel
              checkedSaltIds={checkedSaltIds}
              checkedMedicineIds={checkedMedicineIds}
              onCheckedChange={setCheckedMedicineIds}
              activeMedicineId={activeMedicineId}
              onActiveMedicineChange={handleActiveMedicineChange}
              onSelectionChange={handleMedicineSelectionChange}
            />
          </div>
        </div>

        <div className="xxl:col-span-8 xl:col-span-12 col-span-12 min-w-0">
          <div className="box custom-box mb-0 border-0 shadow-none rounded-none h-full flex flex-col min-h-[calc(100vh-10rem)] min-w-0 xxl:rounded-se-md xl:rounded-b-md">
            <div className="box-header border-b border-defaultborder dark:border-defaultborder/10 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="box-title mb-0">
                  Results
                  {!noSaltSelected && !noMedicineSelected && (
                    <span className="text-textmuted dark:text-textmuted/90 font-normal text-[0.8125rem] ms-1">
                      · {filteredCompanies.length}
                      {filtersActive && catalogueCompanies.length > 0
                        ? ` of ${catalogueCompanies.length}`
                        : ""}{" "}
                      buyers
                    </span>
                  )}
                </div>
                {resultsStatus && (
                  <div className="lead-discovery-results-status text-[0.75rem] min-w-0 truncate sm:whitespace-normal mt-1">
                    {resultsStatus}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="ti-btn ti-btn-primary shrink-0 inline-flex items-center justify-center gap-1 whitespace-nowrap !w-auto !h-auto !py-2 !px-3 !text-[0.8125rem] !min-h-[2.75rem]"
                onClick={handleNewLead}
              >
                <i className="ri-add-line me-1"></i>
                New Lead
              </button>
            </div>

            {!noSaltSelected && !noMedicineSelected && catalogueCompanies.length > 0 && (
              <div className="border-b border-defaultborder dark:border-defaultborder/10 px-3 py-2.5">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 md:col-span-3">
                    <label
                      className="form-label text-[0.7rem] mb-1"
                      htmlFor="discovery-search"
                    >
                      Search buyers
                    </label>
                    <input
                      id="discovery-search"
                      type="search"
                      className="form-control form-control-sm !min-h-[2.5rem]"
                      placeholder="Company, contact, CAS…"
                      value={resultFilters.search}
                      onChange={(e) =>
                        setResultFilters((f) => ({
                          ...f,
                          search: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-6 md:col-span-3">
                    <label
                      className="form-label text-[0.7rem] mb-1"
                      htmlFor="discovery-type"
                    >
                      Company type
                    </label>
                    <select
                      id="discovery-type"
                      className="form-select form-select-sm !min-h-[2.5rem]"
                      value={resultFilters.companyType}
                      onChange={(e) =>
                        setResultFilters((f) => ({
                          ...f,
                          companyType: e.target.value,
                        }))
                      }
                    >
                      <option value="">All types</option>
                      {filterOptions.companyTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-12 sm:col-span-6 md:col-span-3">
                    <label
                      className="form-label text-[0.7rem] mb-1"
                      htmlFor="discovery-location"
                    >
                      Location
                    </label>
                    <select
                      id="discovery-location"
                      className="form-select form-select-sm !min-h-[2.5rem]"
                      value={resultFilters.location}
                      onChange={(e) =>
                        setResultFilters((f) => ({
                          ...f,
                          location: e.target.value,
                        }))
                      }
                    >
                      <option value="">All locations</option>
                      {filterOptions.locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-3 flex items-end">
                    <button
                      type="button"
                      className="ti-btn ti-btn-sm ti-btn-light !min-h-[2.75rem] whitespace-nowrap inline-flex items-center justify-center !px-5 !font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={!filtersActive}
                      onClick={clearResultFilters}
                      aria-label="Clear filters"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="box-body p-0 flex-1 min-h-0 min-w-0">
              <div
                className="lead-discovery-results-panel"
                style={{ maxHeight: PANEL_SCROLL_MAX }}
              >
                {noSaltSelected ? (
                  <EmptyPanel
                    icon="ri-flask-line"
                    message="Select one or more salts on the left to filter medicines and buyers"
                  />
                ) : noMedicineSelected ? (
                  <EmptyPanel
                    icon="ri-capsule-line"
                    message="Select one or more medicines to view matching buyers"
                  />
                ) : buyersLoading ? (
                  <EmptyPanel
                    icon="ri-loader-4-line"
                    message="Loading buyers from catalogue…"
                  />
                ) : filteredCompanies.length === 0 ? (
                  <EmptyPanel
                    icon="ri-search-line"
                    message={
                      buyersError
                        ? `Could not load buyers: ${buyersError}`
                        : catalogueBuyers.length === 0
                          ? "No buyer data loaded. Import Excel or check backend access."
                          : catalogueCompanies.length === 0
                            ? "No buyers found for the selected salt(s) and medicine(s). Link medicines to salts in Settings, or import matching buyer rows."
                            : filtersActive
                              ? "No buyers match the current filters. Try clearing filters or broadening your search."
                              : "No buyers found for this selection."
                    }
                  />
                ) : (
                  <div className="table-responsive lead-discovery-results">
                    <table className="table table-hover ti-custom-table mb-0 w-full">
                      <thead className="ti-custom-table-head lead-discovery-col-header">
                        <tr>
                          <SortableColumnHeader
                            column="company"
                            label="Company"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={handleSortColumn}
                          />
                          <SortableColumnHeader
                            column="type"
                            label="Type"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={handleSortColumn}
                          />
                          <SortableColumnHeader
                            column="location"
                            label="Location"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={handleSortColumn}
                          />
                          <SortableColumnHeader
                            column="score"
                            label="Score"
                            align="end"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={handleSortColumn}
                          />
                        </tr>
                      </thead>
                      <tbody>
                        {displayCompanies.map((company: DiscoveredCompany) => {
                          const isSelected =
                            profileCompany?.id === company.id;
                          return (
                            <tr
                              key={company.id}
                              className={isSelected ? "table-active" : ""}
                            >
                              <td className="min-w-0">
                                <button
                                  type="button"
                                  className="font-semibold text-defaulttextcolor text-start hover:text-primary p-0 border-0 bg-transparent block max-w-full truncate"
                                  title={company.companyName}
                                  onClick={() => setProfileCompany(company)}
                                >
                                  {company.companyName}
                                </button>
                                {company.sourceProof === "Created lead" && (
                                  <span className="badge bg-primary/10 text-primary text-[0.65rem] ms-2 align-middle whitespace-nowrap">
                                    Created lead
                                  </span>
                                )}
                                <div
                                  className="text-[0.75rem] text-textmuted dark:text-textmuted/90 truncate"
                                  title={formatBuyerSubtitle(company)}
                                >
                                  {formatBuyerSubtitle(company)}
                                </div>
                              </td>
                              <td>
                                <span
                                  className="badge bg-light text-defaulttextcolor max-w-full truncate inline-block"
                                  title={company.companyType}
                                >
                                  {company.companyType}
                                </span>
                              </td>
                              <td
                                className="text-[0.8125rem] truncate"
                                title={company.location}
                              >
                                {company.location}
                              </td>
                              <td className="text-end whitespace-nowrap">
                                <LeadScoreBadge score={company.leadScore} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CompanyProfileDrawer
        company={profileCompany}
        onClose={() => setProfileCompany(null)}
        prefillMedicineId={activeMedicine?.id ?? null}
        prefillSaltId={activeSaltId}
      />
    </>
  );
}
