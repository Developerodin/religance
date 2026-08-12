"use client";

import {
  findLeadForDiscoveredCompany,
  getCompaniesForCheckedMedicines,
  getCompaniesFromLeads,
  getMedicinesForCheckedSalts,
  resolveMedicineIdForDiscoveredCompany,
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
import {
  companyInitials,
  leadEditHref,
  leadNewHref,
} from "@/shared/crm/active-leads/active-leads-utils";
import { resolvePrefillSaltId } from "@/shared/crm/store/lead-form-utils";
import { BottomSheet } from "@/shared/crm/ui/bottom-sheet";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const PANEL_SCROLL_MAX = "calc(100vh - 11rem)";

type MobileStep = "salts" | "medicines" | "results";

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
  const [mobileStep, setMobileStep] = useState<MobileStep>("salts");
  const [mobileBootstrapped, setMobileBootstrapped] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  // One-shot: deep links land on the deepest valid mobile step.
  useEffect(() => {
    if (mobileBootstrapped || !urlSelectionApplied) return;
    if (checkedSaltIds.length && checkedMedicineIds.length) {
      setMobileStep("results");
    } else if (checkedSaltIds.length) {
      setMobileStep("medicines");
    }
    setMobileBootstrapped(true);
  }, [
    mobileBootstrapped,
    urlSelectionApplied,
    checkedSaltIds.length,
    checkedMedicineIds.length,
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

  const handleSaveLead = (company: DiscoveredCompany) => {
    const medicineId = resolveMedicineIdForDiscoveredCompany(
      company,
      allMedicines,
      activeMedicine?.id ?? null
    );
    const medicineForPrefill =
      (medicineId
        ? allMedicines.find((m) => m.id === medicineId)
        : undefined) ?? activeMedicine ?? undefined;
    const saltId =
      resolvePrefillSaltId(activeSaltId, medicineForPrefill) || null;
    const existingLead = findLeadForDiscoveredCompany(leads, company, {
      medicineId,
      matchedMedicine: company.matchedMedicine,
    });

    if (existingLead) {
      router.push(
        leadEditHref(existingLead.id, {
          from: "discovery",
          saltId,
          medicineId,
        })
      );
      return;
    }

    const contactName = company.contactPersons?.find((n) => n && n !== "—");
    router.push(
      leadNewHref({
        from: "discovery",
        medicineId,
        saltId,
        companyName: company.companyName,
        companyType: company.companyType,
        location: company.location,
        country: company.location,
        contactName,
        contactRole: company.designations?.[0],
        contactEmail: company.emails?.[0],
        contactPhone: company.phoneNumbers?.[0],
      })
    );
  };

  const clearResultFilters = () => {
    setResultFilters(EMPTY_LEAD_DISCOVERY_FILTERS);
  };

  const handleMobileBack = () => {
    if (mobileStep === "results") setMobileStep("medicines");
    else if (mobileStep === "medicines") setMobileStep("salts");
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
  const sheetFilterCount = [
    resultFilters.companyType,
    resultFilters.location,
    resultFilters.salt,
    resultFilters.medicine,
  ].filter(Boolean).length;
  const noSaltSelected = checkedSaltIds.length === 0;
  const noMedicineSelected = checkedMedicineIds.length === 0;

  const mobileTitle =
    mobileStep === "salts"
      ? "Salts"
      : mobileStep === "medicines"
        ? "Medicines"
        : "Results";

  const resultsEmptyMessage = buyersError
    ? `Could not load buyers: ${buyersError}`
    : catalogueBuyers.length === 0
      ? "No buyer data loaded. Import Excel or check backend access."
      : catalogueCompanies.length === 0
        ? "No buyers found for the selected salt(s) and medicine(s). Link medicines to salts in Settings, or import matching buyer rows."
        : filtersActive
          ? "No buyers match the current filters. Try clearing filters or broadening your search."
          : "No buyers found for this selection.";

  const renderResultsBody = (variant: "table" | "cards") => {
    if (noSaltSelected) {
      return (
        <EmptyPanel
          icon="ri-flask-line"
          message="Select one or more salts on the left to filter medicines and buyers"
        />
      );
    }
    if (noMedicineSelected) {
      return (
        <EmptyPanel
          icon="ri-capsule-line"
          message="Select one or more medicines to view matching buyers"
        />
      );
    }
    if (buyersLoading) {
      return (
        <EmptyPanel
          icon="ri-loader-4-line"
          message="Loading buyers from catalogue…"
        />
      );
    }
    if (filteredCompanies.length === 0) {
      return <EmptyPanel icon="ri-search-line" message={resultsEmptyMessage} />;
    }

    if (variant === "cards") {
      return (
        <div className="lead-discovery-mobile-cards">
          {displayCompanies.map((company) => {
            const contact =
              company.contactPersons?.find((n) => n && n !== "—") ?? "—";
            const existingLead = findLeadForDiscoveredCompany(leads, company, {
              medicineId: resolveMedicineIdForDiscoveredCompany(
                company,
                allMedicines,
                activeMedicine?.id ?? null
              ),
              matchedMedicine: company.matchedMedicine,
            });
            return (
              <div key={company.id} className="lead-discovery-mobile-card">
                <button
                  type="button"
                  className="lead-discovery-mobile-card-main"
                  onClick={() => setProfileCompany(company)}
                  aria-label={`Open ${company.companyName}`}
                >
                  <div className="lead-discovery-mobile-card-head">
                    <span className="lead-discovery-mobile-avatar">
                      {companyInitials(company.companyName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="lead-discovery-mobile-card-title">
                        {company.companyName}
                      </p>
                      <p className="lead-discovery-mobile-card-sub">
                        {formatBuyerSubtitle(company)}
                      </p>
                      {company.sourceProof === "Created lead" && (
                        <span className="badge bg-primary/10 text-primary text-[0.65rem] mt-1 inline-block">
                          Created lead
                        </span>
                      )}
                    </div>
                    <LeadScoreBadge score={company.leadScore} />
                  </div>
                  <div className="lead-discovery-mobile-card-grid">
                    <div>
                      <span className="lead-discovery-mobile-card-label">
                        Contact
                      </span>
                      <p className="lead-discovery-mobile-card-strong">
                        {contact}
                      </p>
                      <p className="lead-discovery-mobile-card-muted">
                        {company.designations?.[0] || company.companyType}
                      </p>
                    </div>
                    <div>
                      <span className="lead-discovery-mobile-card-label">
                        Product
                      </span>
                      <p className="lead-discovery-mobile-card-strong">
                        {company.matchedSalt}
                      </p>
                      <p className="lead-discovery-mobile-card-muted">
                        {company.matchedMedicine}
                      </p>
                    </div>
                  </div>
                </button>
                <div className="lead-discovery-mobile-card-foot">
                  <button
                    type="button"
                    className="ti-btn ti-btn-sm ti-btn-primary !mb-0 !min-h-[2.75rem] !px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveLead(company);
                    }}
                  >
                    <i
                      className={`${existingLead ? "ri-edit-line" : "ri-user-add-line"} me-1`}
                      aria-hidden="true"
                    />
                    {existingLead ? "Edit Lead" : "Save Lead"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
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
              const isSelected = profileCompany?.id === company.id;
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
    );
  };

  return (
    <>
      {/* Desktop: unchanged 3-pane workspace */}
      <div className="lead-discovery-board hidden md:grid grid-cols-12 gap-0 border border-defaultborder dark:border-defaultborder/10 rounded-md bg-white dark:bg-bodybg">
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
          <div className="box custom-box !mb-0 border-0 !shadow-none !rounded-none h-full flex flex-col min-h-[calc(100vh-10rem)] min-w-0 xxl:!rounded-se-md xl:!rounded-b-md">
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

            <div className="box-body !p-0 flex-1 min-h-0 min-w-0">
              <div
                className="lead-discovery-results-panel"
                style={{ maxHeight: PANEL_SCROLL_MAX }}
              >
                {renderResultsBody("table")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: progressive Salts → Medicines → Results */}
      <div className="lead-discovery-mobile md:hidden border border-defaultborder dark:border-defaultborder/10 rounded-md bg-white dark:bg-bodybg overflow-hidden">
        <div className="lead-discovery-mobile-header">
          {mobileStep !== "salts" ? (
            <button
              type="button"
              className="ti-btn ti-btn-light !mb-0 !min-h-[2.75rem] !min-w-[2.75rem] !p-0 inline-flex items-center justify-center"
              onClick={handleMobileBack}
              aria-label={
                mobileStep === "results"
                  ? "Back to medicines"
                  : "Back to salts"
              }
            >
              <i className="ri-arrow-left-line text-lg" aria-hidden="true" />
            </button>
          ) : (
            <span className="w-11 shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1 text-center">
            <div className="box-title mb-0 text-[0.9375rem] before:!hidden">
              {mobileTitle}
            </div>
            {mobileStep === "results" &&
              !noSaltSelected &&
              !noMedicineSelected && (
                <p className="mb-0 text-[0.75rem] text-textmuted truncate">
                  {filteredCompanies.length} buyers · {checkedSaltIds.length}{" "}
                  salt{checkedSaltIds.length === 1 ? "" : "s"}
                </p>
              )}
          </div>
          <button
            type="button"
            className="ti-btn ti-btn-primary !mb-0 !min-h-[2.75rem] !min-w-[2.75rem] !p-0 inline-flex items-center justify-center"
            onClick={handleNewLead}
            aria-label="New Lead"
          >
            <i className="ri-add-line text-lg" aria-hidden="true" />
          </button>
        </div>

        {mobileStep === "salts" && (
          <div className="lead-discovery-mobile-step">
            <div className="lead-discovery-mobile-panel">
              <SaltsTablePanel
                checkedSaltIds={checkedSaltIds}
                onCheckedChange={setCheckedSaltIds}
              />
            </div>
            <div className="lead-discovery-mobile-cta">
              <span className="text-[0.8125rem] text-defaulttextcolor font-medium tabular-nums">
                {checkedSaltIds.length} salt
                {checkedSaltIds.length === 1 ? "" : "s"} selected
              </span>
              <button
                type="button"
                className="ti-btn ti-btn-primary !mb-0 !min-h-[2.75rem] !px-3 !text-[0.8125rem] disabled:opacity-40"
                disabled={noSaltSelected}
                onClick={() => setMobileStep("medicines")}
              >
                View medicines
                <i className="ri-arrow-right-line ms-1" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {mobileStep === "medicines" && (
          <div className="lead-discovery-mobile-step">
            <div className="lead-discovery-mobile-panel">
              <MedicinesTablePanel
                checkedSaltIds={checkedSaltIds}
                checkedMedicineIds={checkedMedicineIds}
                onCheckedChange={setCheckedMedicineIds}
                activeMedicineId={activeMedicineId}
                onActiveMedicineChange={handleActiveMedicineChange}
                onSelectionChange={handleMedicineSelectionChange}
              />
            </div>
            <div className="lead-discovery-mobile-cta">
              <span className="text-[0.8125rem] text-defaulttextcolor font-medium tabular-nums">
                {checkedMedicineIds.length} medicine
                {checkedMedicineIds.length === 1 ? "" : "s"} selected
              </span>
              <button
                type="button"
                className="ti-btn ti-btn-primary !mb-0 !min-h-[2.75rem] !px-3 !text-[0.8125rem] disabled:opacity-40"
                disabled={noMedicineSelected}
                onClick={() => setMobileStep("results")}
              >
                View results
                <i className="ri-arrow-right-line ms-1" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {mobileStep === "results" && (
          <div className="lead-discovery-mobile-step">
            {!noSaltSelected && !noMedicineSelected && (
              <div className="lead-discovery-mobile-toolbar">
                <div className="relative flex-1 min-w-0">
                  <i
                    className="ri-search-line absolute start-3 top-1/2 -translate-y-1/2 text-textmuted pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    className="form-control !ps-9 !min-h-[2.75rem] !text-[0.8125rem]"
                    placeholder="Search buyers…"
                    aria-label="Search buyers"
                    value={resultFilters.search}
                    onChange={(e) =>
                      setResultFilters((f) => ({
                        ...f,
                        search: e.target.value,
                      }))
                    }
                  />
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-light shrink-0 !mb-0 !min-h-[2.75rem] !text-[0.8125rem]"
                  onClick={() => setFiltersOpen(true)}
                >
                  <i className="ri-equalizer-line me-1" aria-hidden="true" />
                  Filters
                  {sheetFilterCount > 0 && (
                    <span className="badge bg-primary text-white ms-1">
                      {sheetFilterCount}
                    </span>
                  )}
                </button>
              </div>
            )}
            {resultsStatus && (
              <div className="px-3 pb-2 text-[0.75rem]">{resultsStatus}</div>
            )}
            <div className="lead-discovery-mobile-results">
              {renderResultsBody("cards")}
            </div>
          </div>
        )}
      </div>

      {filtersOpen && (
        <BottomSheet title="Filters" onClose={() => setFiltersOpen(false)}>
          <div className="box-body space-y-3">
            <div>
              <label
                className="form-label text-[0.7rem] mb-1"
                htmlFor="ld-sheet-type"
              >
                Company type
              </label>
              <select
                id="ld-sheet-type"
                className="form-select !min-h-[2.75rem] !text-[0.8125rem]"
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
            <div>
              <label
                className="form-label text-[0.7rem] mb-1"
                htmlFor="ld-sheet-location"
              >
                Location
              </label>
              <select
                id="ld-sheet-location"
                className="form-select !min-h-[2.75rem] !text-[0.8125rem]"
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
            <div>
              <label
                className="form-label text-[0.7rem] mb-1"
                htmlFor="ld-sheet-salt"
              >
                Salt
              </label>
              <select
                id="ld-sheet-salt"
                className="form-select !min-h-[2.75rem] !text-[0.8125rem]"
                value={resultFilters.salt}
                onChange={(e) =>
                  setResultFilters((f) => ({
                    ...f,
                    salt: e.target.value,
                  }))
                }
              >
                <option value="">All salts</option>
                {filterOptions.salts.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="form-label text-[0.7rem] mb-1"
                htmlFor="ld-sheet-medicine"
              >
                Medicine
              </label>
              <select
                id="ld-sheet-medicine"
                className="form-select !min-h-[2.75rem] !text-[0.8125rem]"
                value={resultFilters.medicine}
                onChange={(e) =>
                  setResultFilters((f) => ({
                    ...f,
                    medicine: e.target.value,
                  }))
                }
              >
                <option value="">All medicines</option>
                {filterOptions.medicines.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="ti-btn ti-btn-light flex-1 !mb-0 !min-h-[2.75rem]"
                onClick={() =>
                  setResultFilters((f) => ({
                    ...EMPTY_LEAD_DISCOVERY_FILTERS,
                    search: f.search,
                  }))
                }
              >
                Reset
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary flex-1 !mb-0 !min-h-[2.75rem]"
                onClick={() => setFiltersOpen(false)}
              >
                Show {filteredCompanies.length} buyer
                {filteredCompanies.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      <CompanyProfileDrawer
        company={profileCompany}
        onClose={() => setProfileCompany(null)}
        prefillMedicineId={activeMedicine?.id ?? null}
        prefillSaltId={activeSaltId}
      />
    </>
  );
}
