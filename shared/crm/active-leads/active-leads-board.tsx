"use client";

import { ActiveLeadDetailDrawer } from "@/shared/crm/active-leads/active-lead-detail-drawer";
import {
  companyInitials,
  countLeadsByStage,
  filterLeadsForBoard,
  hasActiveLeadFilters,
  leadEditHref,
  leadNewHref,
} from "@/shared/crm/active-leads/active-leads-utils";
import { FollowUpDateCell } from "@/shared/crm/active-leads/follow-up-date-cell";
import LeadStageBadge from "@/shared/crm/active-leads/lead-stage-badge";
import { BottomSheet } from "@/shared/crm/ui/bottom-sheet";
import { SendEmailModal } from "@/shared/crm/send-email/send-email-modal";
import type { SendEmailTarget } from "@/shared/crm/send-email/send-email-types";
import { sendEmailTargetFromLead } from "@/shared/crm/send-email/send-email-types";
import { useCrm } from "@/shared/crm/store/crm-context";
import { ConfirmDeleteOverlay } from "@/shared/crm/ui/confirm-delete-overlay";
import {
  isTerminalStage,
  LEAD_STAGES,
} from "@/shared/crm/active-leads/lead-stages";
import type { CrmLead, LeadStage } from "@/shared/crm/store/types";
import LeadScoreBadge from "@/shared/crm/lead-discovery/lead-score-badge";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 15, 25] as const;

type PipelineFilter = "all" | "active" | "closed";

const STAT_CARDS = [
  {
    key: "total",
    label: "Total leads",
    icon: "ri-folder-chart-line",
    tone: "primary",
  },
  {
    key: "active",
    label: "In pipeline",
    icon: "ri-pulse-line",
    tone: "success",
  },
  {
    key: "closed",
    label: "Closed",
    icon: "ri-archive-line",
    tone: "secondary",
  },
  {
    key: "dueSoon",
    label: "Follow-up due",
    icon: "ri-alarm-warning-line",
    tone: "warning",
  },
] as const;

const PIPELINE_TABS = [
  { id: "all" as const, label: "All", icon: "ri-list-check" },
  { id: "active" as const, label: "Pipeline", icon: "ri-git-branch-line" },
  { id: "closed" as const, label: "Closed", icon: "ri-checkbox-circle-line" },
];

export default function ActiveLeadsBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    leads,
    samples,
    quotations,
    contacts,
    hydrated,
    pendingComposeLeadId,
    setPendingComposeLeadId,
    deleteLead,
  } = useCrm();
  const [pendingDelete, setPendingDelete] = useState<CrmLead | null>(null);
  const [delSamples, setDelSamples] = useState(true);
  const [delQuotations, setDelQuotations] = useState(true);
  const [delContact, setDelContact] = useState(false);

  const linkedSamples = pendingDelete
    ? samples.filter((s) => s.leadId === pendingDelete.id)
    : [];
  const linkedQuotations = pendingDelete
    ? quotations.filter((q) => q.leadId === pendingDelete.id)
    : [];
  const linkedContact = pendingDelete?.contactId
    ? contacts.find((c) => c.id === pendingDelete.contactId) ?? null
    : null;

  const askDelete = (lead: CrmLead) => {
    setDelSamples(true);
    setDelQuotations(true);
    setDelContact(false);
    setPendingDelete(lead);
  };
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<LeadStage | "">("");
  const [saltFilter, setSaltFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [pipelineFilter, setPipelineFilter] =
    useState<PipelineFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [sendTarget, setSendTarget] = useState<SendEmailTarget | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const companyFilter = searchParams.get("company") ?? "";

  const assignees = useMemo(
    () => [...new Set(leads.map((l) => l.assignedTo))].sort(),
    [leads]
  );
  const salts = useMemo(
    () => [...new Set(leads.map((l) => l.matchedSalt))].sort(),
    [leads]
  );

  const filterOpts = useMemo(
    () => ({
      search,
      stageFilter,
      saltFilter,
      assigneeFilter,
      pipelineFilter,
    }),
    [search, stageFilter, saltFilter, assigneeFilter, pipelineFilter]
  );

  const baseLeads = useMemo(
    () =>
      companyFilter
        ? leads.filter((l) => l.companyId === companyFilter)
        : leads,
    [leads, companyFilter]
  );

  const filteredLeads = useMemo(
    () => filterLeadsForBoard(baseLeads, filterOpts),
    [baseLeads, filterOpts]
  );

  const leadsForStageCounts = useMemo(
    () =>
      filterLeadsForBoard(baseLeads, {
        ...filterOpts,
        stageFilter: "",
      }),
    [baseLeads, filterOpts]
  );

  const stageCounts = useMemo(
    () => countLeadsByStage(leadsForStageCounts),
    [leadsForStageCounts]
  );

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const filtersActive = hasActiveLeadFilters(filterOpts);
  // Only the three fields that live inside the mobile sheet.
  const sheetFilterCount = [stageFilter, saltFilter, assigneeFilter].filter(
    Boolean
  ).length;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, stageFilter, saltFilter, assigneeFilter, pipelineFilter, pageSize]);

  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, page, pageSize]);

  const stats = useMemo(() => {
    const active = leads.filter((l) => !isTerminalStage(l.stage)).length;
    const closed = leads.length - active;
    const today = new Date().toISOString().slice(0, 10);
    const inThree = new Date();
    inThree.setDate(inThree.getDate() + 3);
    const soon = inThree.toISOString().slice(0, 10);
    const dueSoon = leads.filter(
      (l) =>
        l.followUpDate !== "—" &&
        !isTerminalStage(l.stage) &&
        l.followUpDate >= today &&
        l.followUpDate <= soon
    ).length;
    return { total: leads.length, active, closed, dueSoon };
  }, [leads]);

  useEffect(() => {
    if (!selectedLead) return;
    const fresh = leads.find((l) => l.id === selectedLead.id);
    if (fresh) setSelectedLead(fresh);
  }, [leads, selectedLead?.id]);

  useEffect(() => {
    if (!hydrated) return;
    const leadId = searchParams.get("lead");
    const composeId = searchParams.get("compose") ?? pendingComposeLeadId;
    if (leadId) {
      const lead = leads.find((l) => l.id === leadId);
      if (lead) setSelectedLead(lead);
    }
    if (composeId) {
      const lead = leads.find((l) => l.id === composeId);
      if (lead) {
        setSendTarget(sendEmailTargetFromLead(lead));
        setPendingComposeLeadId(null);
      }
    }
  }, [
    hydrated,
    searchParams,
    leads,
    pendingComposeLeadId,
    setPendingComposeLeadId,
  ]);

  const clearFilters = () => {
    setSearch("");
    setStageFilter("");
    setSaltFilter("");
    setAssigneeFilter("");
    setPipelineFilter("all");
  };

  const openLeadDrawer = (lead: CrmLead) => setSelectedLead(lead);

  const openLeadForm = (lead: CrmLead) => {
    router.push(leadEditHref(lead.id, { from: "active-leads" }));
  };

  if (!hydrated) {
    return (
      <div className="text-center py-12 text-textmuted text-[0.875rem]">
        Loading leads…
      </div>
    );
  }

  return (
    <div className="active-leads-page">
      <div className="active-leads-page-header mb-4">
        <div>
          <h2 className="text-[1.125rem] font-semibold text-defaulttextcolor mb-1">
            Active Leads
          </h2>
          <p className="text-[0.8125rem] text-textmuted mb-0 max-w-xl">
            Track saved opportunities from discovery through outreach, samples,
            and closure.
          </p>
        </div>
        <button
          type="button"
          className="ti-btn ti-btn-primary shrink-0 inline-flex items-center justify-center gap-1 whitespace-nowrap !w-full sm:!w-auto !h-auto !py-2 !px-3 !text-[0.8125rem] !min-h-[2.75rem] sm:!min-h-0"
          onClick={() => router.push(leadNewHref({ from: "active-leads" }))}
        >
          <i className="ri-add-line me-1"></i>
          New lead
        </button>
      </div>

      <div className="active-leads-stats mb-4">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className={`active-leads-stat-item tone-${card.tone}`}>
            <span className={`active-leads-stat-icon tone-${card.tone}`}>
              <i className={card.icon}></i>
            </span>
            <div>
              <p className="active-leads-stat-label">{card.label}</p>
              <p className="active-leads-stat-value">
                {stats[card.key as keyof typeof stats]}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="box custom-box active-leads-main !mb-0">
        <div className="active-leads-toolbar">
          {/* Phone + tablet: tabs, search, Filters sheet. Desktop keeps inline filters. */}
          <div className="xl:hidden">
            <div
              className="active-leads-segmented is-fluid"
              role="group"
              aria-label="Pipeline view"
            >
              {PIPELINE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={pipelineFilter === tab.id ? "is-active" : ""}
                  onClick={() => setPipelineFilter(tab.id)}
                >
                  <i className={`${tab.icon} me-1`}></i>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <div className="relative flex-1 min-w-0">
                <i
                  className="ri-search-line absolute start-3 top-1/2 -translate-y-1/2 text-textmuted pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  className="form-control !ps-9 !min-h-[2.75rem] !text-[0.8125rem]"
                  placeholder="Search leads, company…"
                  aria-label="Search active leads"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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

            <div className="flex items-center justify-between gap-2 mt-2 text-[0.75rem] text-textmuted">
              <span>
                Showing{" "}
                <strong className="text-defaulttextcolor">
                  {filteredLeads.length}
                </strong>{" "}
                of {leads.length}
              </span>
              {filtersActive && (
                <button
                  type="button"
                  className="text-primary font-medium"
                  onClick={clearFilters}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Desktop toolbar (xl+) — unchanged. Wrapper carries the breakpoint. */}
          <div className="hidden xl:block">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="active-leads-segmented" role="group" aria-label="Pipeline view">
              {PIPELINE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={pipelineFilter === tab.id ? "is-active" : ""}
                  onClick={() => setPipelineFilter(tab.id)}
                >
                  <i className={`${tab.icon} me-1`}></i>
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-[0.8125rem] text-textmuted">
              Showing{" "}
              <strong className="text-defaulttextcolor">
                {filteredLeads.length}
              </strong>{" "}
              of {leads.length}
            </span>
          </div>

          <div className="grid grid-cols-12 gap-2 mb-3">
            <div className="xxl:col-span-4 lg:col-span-5 col-span-12">
              <label className="active-leads-filter-label">Search</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text !px-2.5 bg-white dark:bg-bodybg border-defaultborder dark:border-defaultborder/10">
                  <i className="ri-search-line text-textmuted"></i>
                </span>
                <input
                  type="search"
                  className="form-control !py-2 !text-[0.8125rem]"
                  placeholder="Lead, company, contact, salt…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search active leads"
                />
              </div>
            </div>
            <div className="xxl:col-span-2 lg:col-span-2 col-span-6">
              <label className="active-leads-filter-label">Stage</label>
              <select
                className="form-select form-select-sm !text-[0.8125rem] !py-2"
                value={stageFilter}
                onChange={(e) =>
                  setStageFilter(e.target.value as LeadStage | "")
                }
                aria-label="Filter by stage"
              >
                <option value="">All stages</option>
                {LEAD_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
            <div className="xxl:col-span-2 lg:col-span-2 col-span-6">
              <label className="active-leads-filter-label">Salt</label>
              <select
                className="form-select form-select-sm !text-[0.8125rem] !py-2"
                value={saltFilter}
                onChange={(e) => setSaltFilter(e.target.value)}
                aria-label="Filter by salt"
              >
                <option value="">All salts</option>
                {salts.map((salt) => (
                  <option key={salt} value={salt}>
                    {salt}
                  </option>
                ))}
              </select>
            </div>
            <div className="xxl:col-span-2 lg:col-span-2 col-span-6">
              <label className="active-leads-filter-label">Assignee</label>
              <select
                className="form-select form-select-sm !text-[0.8125rem] !py-2"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                aria-label="Filter by assignee"
              >
                <option value="">All assignees</option>
                {assignees.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="xxl:col-span-2 lg:col-span-1 col-span-6">
              <label className="active-leads-filter-label active-leads-filter-label--action">
                Filters
              </label>
              {filtersActive ? (
                <button
                  type="button"
                  className="active-leads-filter-clear"
                  onClick={clearFilters}
                  aria-label="Clear all filters"
                >
                  <i className="ri-filter-off-line" aria-hidden="true"></i>
                  Clear
                </button>
              ) : (
                <div className="active-leads-filter-clear-spacer" aria-hidden="true" />
              )}
            </div>
          </div>

          <div className="active-leads-stage-chips" role="group" aria-label="Quick filter by stage">
            <button
              type="button"
              className={`active-leads-stage-chip ${stageFilter === "" ? "is-active" : ""}`}
              onClick={() => setStageFilter("")}
            >
              All stages
              <span className="chip-count">{leadsForStageCounts.length}</span>
            </button>
            {LEAD_STAGES.filter((s) => (stageCounts[s] ?? 0) > 0).map((stage) => (
              <button
                key={stage}
                type="button"
                className={`active-leads-stage-chip ${stageFilter === stage ? "is-active" : ""}`}
                onClick={() =>
                  setStageFilter(stageFilter === stage ? "" : stage)
                }
              >
                {stage}
                <span className="chip-count">{stageCounts[stage]}</span>
              </button>
            ))}
          </div>
          </div>
        </div>

        {/* Phone + tablet cards only. Desktop table is xl+ — never both. */}
        <div className="xl:hidden active-leads-cards">
          {paginatedLeads.length === 0 ? (
            <div className="active-leads-empty">
              <span className="avatar avatar-xl bg-primary/10 text-primary mb-3">
                <i className="ri-inbox-line text-2xl"></i>
              </span>
              <p className="font-medium text-defaulttextcolor mb-1">
                No leads match your filters
              </p>
              <p className="text-[0.8125rem] text-textmuted mb-3">
                Try adjusting search, stage, or pipeline view.
              </p>
              {filtersActive && (
                <button
                  type="button"
                  className="ti-btn ti-btn-primary active-leads-empty-cta"
                  onClick={clearFilters}
                >
                  <i className="ri-filter-off-line me-1" aria-hidden="true"></i>
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            paginatedLeads.map((lead) => (
              <button
                key={lead.id}
                type="button"
                className="active-leads-card"
                onClick={() => openLeadDrawer(lead)}
                aria-label={`Open ${lead.title}`}
              >
                <div className="active-leads-card-head">
                  <span className="active-leads-company-avatar">
                    {companyInitials(lead.companyName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="active-leads-card-title">{lead.title}</p>
                    <p className="active-leads-card-company">
                      <i className="ri-building-2-line shrink-0" aria-hidden="true"></i>
                      {lead.companyName}
                    </p>
                    <p className="active-leads-card-location">{lead.location}</p>
                  </div>
                  <i
                    className="ri-arrow-right-s-line active-leads-card-chevron"
                    aria-hidden="true"
                  ></i>
                </div>

                <div className="active-leads-card-grid">
                  <div>
                    <span className="active-leads-card-label">Contact</span>
                    <p className="active-leads-card-strong">{lead.contactName}</p>
                    <p className="active-leads-card-muted">{lead.contactRole}</p>
                    <p className="active-leads-card-assignee">
                      <i className="ri-user-line" aria-hidden="true"></i>
                      {lead.assignedTo}
                    </p>
                  </div>
                  <div>
                    <span className="active-leads-card-label">Product</span>
                    <p className="active-leads-card-strong">{lead.matchedSalt}</p>
                    <p className="active-leads-card-muted">
                      {lead.matchedMedicine}
                    </p>
                    <p className="active-leads-card-muted">{lead.dosageForm}</p>
                  </div>
                </div>

                <div className="active-leads-card-foot">
                  <span className="inline-flex items-center gap-2">
                    <LeadStageBadge stage={lead.stage} compact />
                    <LeadScoreBadge score={lead.leadScore} />
                  </span>
                  <span className="text-[0.75rem]">
                    <FollowUpDateCell followUpDate={lead.followUpDate} />
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="hidden xl:block">
        <div className="table-responsive active-leads-table">
          <table className="table table-hover ti-custom-table min-w-full mb-0 text-[0.8125rem]">
            <thead className="ti-custom-table-head">
              <tr>
                <th scope="col" className="!w-12"></th>
                <th scope="col">Lead & company</th>
                <th scope="col">Contact</th>
                <th scope="col">Product match</th>
                <th scope="col">Stage</th>
                <th scope="col">Score</th>
                <th scope="col">Follow-up</th>
                <th scope="col" className="!w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="!p-0 !border-0">
                    <div className="active-leads-empty">
                      <span className="avatar avatar-xl bg-primary/10 text-primary mb-3">
                        <i className="ri-inbox-line text-2xl"></i>
                      </span>
                      <p className="font-medium text-defaulttextcolor mb-1">
                        No leads match your filters
                      </p>
                      <p className="text-[0.8125rem] text-textmuted mb-3">
                        Try adjusting search, stage, or pipeline view.
                      </p>
                      {filtersActive && (
                        <button
                          type="button"
                          className="ti-btn ti-btn-primary active-leads-empty-cta"
                          onClick={clearFilters}
                        >
                          <i className="ri-filter-off-line me-1" aria-hidden="true"></i>
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const isSelected = selectedLead?.id === lead.id;
                  return (
                    <tr
                      key={lead.id}
                      className={`active-leads-row ${isSelected ? "is-selected" : ""}`}
                    >
                      <td className="!ps-3">
                        <span
                          className="active-leads-company-avatar"
                          title={lead.companyName}
                        >
                          {companyInitials(lead.companyName)}
                        </span>
                      </td>
                      <td
                        className="cursor-pointer"
                        role="button"
                        tabIndex={0}
                        aria-label={`Quick view ${lead.title}`}
                        onClick={() => openLeadDrawer(lead)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openLeadDrawer(lead);
                          }
                        }}
                      >
                        <div className="font-semibold text-defaulttextcolor leading-snug mb-0.5 max-w-[240px] truncate">
                          {lead.title}
                        </div>
                        <div className="flex items-center gap-1 text-[0.75rem] text-textmuted min-w-0">
                          <i className="ri-building-2-line shrink-0"></i>
                          <span className="truncate">{lead.companyName}</span>
                        </div>
                        <span className="text-[0.7rem] text-textmuted/80 truncate block max-w-[220px]">
                          {lead.location}
                        </span>
                      </td>
                      <td>
                        <div className="font-medium text-defaulttextcolor">
                          {lead.contactName}
                        </div>
                        <div className="text-[0.75rem] text-textmuted">
                          {lead.contactRole}
                        </div>
                        <div className="text-[0.7rem] text-primary/90 mt-0.5 flex items-center gap-1">
                          <i className="ri-user-line"></i>
                          {lead.assignedTo}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-defaulttextcolor font-normal text-[0.7rem] mb-1">
                          {lead.matchedSalt}
                        </span>
                        <div className="text-[0.75rem] text-textmuted truncate max-w-[180px]">
                          {lead.matchedMedicine}
                        </div>
                        <div className="text-[0.7rem] text-textmuted/80">
                          {lead.dosageForm}
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <LeadStageBadge stage={lead.stage} compact />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <LeadScoreBadge score={lead.leadScore} />
                      </td>
                      <td>
                        <FollowUpDateCell followUpDate={lead.followUpDate} />
                      </td>
                      <td className="!pe-3 text-end" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            className="ti-btn ti-btn-sm ti-btn-icon ti-btn-light"
                            aria-label={`Edit ${lead.title}`}
                            title="Edit lead"
                            onClick={() => openLeadForm(lead)}
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                          <button
                            type="button"
                            className="ti-btn ti-btn-sm ti-btn-icon ti-btn-light text-danger"
                            aria-label={`Delete ${lead.title}`}
                            title="Delete lead"
                            onClick={() => askDelete(lead)}
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                          <button
                            type="button"
                            className="ti-btn ti-btn-sm ti-btn-icon ti-btn-light active-leads-row-chevron-btn"
                            aria-label="Quick view"
                            onClick={() => openLeadDrawer(lead)}
                          >
                            <i className="ri-arrow-right-s-line text-lg text-textmuted active-leads-row-chevron"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </div>

        <div className="box-footer active-leads-footer !px-3 !py-2.5 border-t border-defaultborder dark:border-defaultborder/10">
          {/* Phone + tablet pager: two big targets, no numbered list to cram in. */}
          <div className="xl:hidden active-leads-pager-mobile">
            <button
              type="button"
              className="ti-btn ti-btn-light !mb-0 !min-h-[2.75rem]"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <i className="ri-arrow-left-s-line" aria-hidden="true"></i>
              Prev
            </button>
            <span className="text-[0.75rem] text-textmuted tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="ti-btn ti-btn-light !mb-0 !min-h-[2.75rem]"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <i className="ri-arrow-right-s-line" aria-hidden="true"></i>
            </button>
          </div>

          <div className="hidden xl:block">
          <div className="lead-discovery-panel-footer min-h-[2rem]">
            <div className="flex items-center gap-2 justify-start min-w-0">
              <label className="flex items-center gap-1 mb-0 whitespace-nowrap shrink-0">
                <span className="text-[0.65rem] text-textmuted leading-none">
                  Show
                </span>
                <select
                  className="form-select form-select-sm !py-1 !ps-2 !pe-6 !text-[0.7rem] !w-[3.25rem] !min-h-[1.625rem] !leading-none"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  aria-label="Leads per page"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <nav aria-label="Active leads pagination" className="shrink-0">
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
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
                  )
                )}
                <li className="!flex items-center">
                  <button
                    type="button"
                    className="page-link !px-2 !py-1 !text-[0.7rem] !leading-none"
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

            <span className="text-[0.65rem] text-textmuted whitespace-nowrap tabular-nums">
              {page}/{totalPages}
            </span>
          </div>
          </div>
        </div>
      </div>

      {filtersOpen && (
        <BottomSheet title="Filters" onClose={() => setFiltersOpen(false)}>
          <div className="box-body space-y-3">
            <div>
              <label
                className="active-leads-filter-label"
                htmlFor="al-sheet-stage"
              >
                Stage
              </label>
              <select
                id="al-sheet-stage"
                className="form-select !min-h-[2.75rem] !text-[0.8125rem]"
                value={stageFilter}
                onChange={(e) =>
                  setStageFilter(e.target.value as LeadStage | "")
                }
              >
                <option value="">All stages</option>
                {LEAD_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="active-leads-filter-label"
                htmlFor="al-sheet-salt"
              >
                Salt
              </label>
              <select
                id="al-sheet-salt"
                className="form-select !min-h-[2.75rem] !text-[0.8125rem]"
                value={saltFilter}
                onChange={(e) => setSaltFilter(e.target.value)}
              >
                <option value="">All salts</option>
                {salts.map((salt) => (
                  <option key={salt} value={salt}>
                    {salt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="active-leads-filter-label"
                htmlFor="al-sheet-assignee"
              >
                Assignee
              </label>
              <select
                id="al-sheet-assignee"
                className="form-select !min-h-[2.75rem] !text-[0.8125rem]"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              >
                <option value="">All assignees</option>
                {assignees.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="ti-btn ti-btn-light flex-1 !mb-0 !min-h-[2.75rem]"
                onClick={() => {
                  setStageFilter("");
                  setSaltFilter("");
                  setAssigneeFilter("");
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary flex-1 !mb-0 !min-h-[2.75rem]"
                onClick={() => setFiltersOpen(false)}
              >
                Show {filteredLeads.length} lead
                {filteredLeads.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      <ActiveLeadDetailDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onSendEmail={(l) => setSendTarget(sendEmailTargetFromLead(l))}
        onDelete={(l) => {
          setSelectedLead(null);
          askDelete(l);
        }}
      />

      <SendEmailModal
        target={sendTarget}
        onClose={() => setSendTarget(null)}
      />

      <ConfirmDeleteOverlay
        open={pendingDelete !== null}
        title="Delete lead?"
        entityName={pendingDelete?.title ?? ""}
        description="This action cannot be undone. Deals tied to this lead are removed with it."
        onConfirm={() => {
          if (pendingDelete) {
            deleteLead(pendingDelete.id, {
              samples: linkedSamples.length > 0 && delSamples,
              quotations: linkedQuotations.length > 0 && delQuotations,
              contact: linkedContact !== null && delContact,
            });
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      >
        {(linkedSamples.length > 0 || linkedQuotations.length > 0 || linkedContact) && (
          <div className="text-start w-full space-y-2">
            <p className="text-[0.75rem] text-textmuted mb-1">
              This lead also has connected records — choose what to remove:
            </p>
            {linkedSamples.length > 0 && (
              <label className="flex items-center gap-2 text-[0.8125rem] cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="form-check-input !mt-0"
                  checked={delSamples}
                  onChange={(e) => setDelSamples(e.target.checked)}
                />
                <span>
                  Also delete{" "}
                  <strong>
                    {linkedSamples.length} sample
                    {linkedSamples.length > 1 ? "s" : ""}
                  </strong>
                </span>
              </label>
            )}
            {linkedQuotations.length > 0 && (
              <label className="flex items-center gap-2 text-[0.8125rem] cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="form-check-input !mt-0"
                  checked={delQuotations}
                  onChange={(e) => setDelQuotations(e.target.checked)}
                />
                <span>
                  Also delete{" "}
                  <strong>
                    {linkedQuotations.length} quotation
                    {linkedQuotations.length > 1 ? "s" : ""}
                  </strong>
                </span>
              </label>
            )}
            {linkedContact && (
              <label className="flex items-center gap-2 text-[0.8125rem] cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="form-check-input !mt-0"
                  checked={delContact}
                  onChange={(e) => setDelContact(e.target.checked)}
                />
                <span>
                  Also delete contact <strong>{linkedContact.name}</strong>
                </span>
              </label>
            )}
          </div>
        )}
      </ConfirmDeleteOverlay>
    </div>
  );
}
