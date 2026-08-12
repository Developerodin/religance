"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  LeadsSourceDonut,
  MetricSparkline,
  PipelineOverviewChart,
  ProfitEarnedChart,
  RevenueAnalyticsChart,
  TargetRadialChart,
  WinRateRadialChart,
} from "@/shared/crm/reports/reports-charts";
import { buildReportsSnapshot } from "@/shared/crm/reports/reports-utils";
import type {
  ActivityItem,
  MetricCardData,
  ReportsSnapshot,
  RecentContactRow,
  RecentOutreachItem,
  SalesStatCard,
  TopDealRow,
} from "@/shared/crm/reports/reports-utils";
import {
  fetchReportsLiveData,
  type ReportsGraph,
} from "@/shared/crm/reports/reports-api";
import type { CrmEmail } from "@/shared/crm/store/types";
import { isAuthed } from "@/shared/auth/auth-client";
import Seo from "@/shared/layout-components/seo/seo";

const ICON_BG_CLASS: Record<MetricCardData["iconBg"], string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
};

const AVATAR_TEXT_CLASS: Record<TopDealRow["avatarClass"], string> = {
  primary: "text-primary bg-primary/10",
  secondary: "text-secondary bg-secondary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  info: "text-info bg-info/10",
};

const OUTREACH_ICON_BG: Record<RecentOutreachItem["iconBg"], string> = {
  primary: "bg-primary",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-danger",
  success: "bg-success",
  pinkmain: "bg-pinkmain",
};

const ACTIVITY_DOT: Record<ActivityItem["tone"], string> = {
  primary: "",
  success: "featured-success",
  danger: "featured-danger",
  warning: "featured-danger",
};

const SALT_LEGEND_COLORS = [
  "text-primary",
  "text-secondary",
  "text-danger",
  "text-info",
  "text-orange",
  "text-warning",
];

const COL_STRETCH = "flex flex-col h-full";
const BOX_STRETCH = "box h-full flex flex-col";
const LIVE_REFRESH_MS = 30000;

type ReportsLiveStatus = "idle" | "loading" | "refreshing" | "error";

const EMPTY_GRAPH: ReportsGraph = {
  companies: [],
  contacts: [],
  leads: [],
  deals: [],
  timeline: [],
};

function BoxMenu() {
  return (
    <div className="hs-dropdown ti-dropdown">
      <Link
        aria-label="anchor"
        href="#!"
        scroll={false}
        className="flex items-center justify-center w-[1.75rem] h-[1.75rem] !text-[0.8rem] !py-1 !px-2 rounded-sm bg-light border-light shadow-none !font-medium"
        aria-expanded="false"
      >
        <i className="fe fe-more-vertical text-[0.8rem]"></i>
      </Link>
      <ul className="hs-dropdown-menu ti-dropdown-menu hidden">
        <li>
          <Link
            className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
            href="/active-leads"
          >
            Open pipeline
          </Link>
        </li>
        <li>
          <Link
            className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
            href="/inbox"
          >
            Inbox
          </Link>
        </li>
      </ul>
    </div>
  );
}

function SalesStatCardItem({ stat }: { stat: SalesStatCard }) {
  return (
    <div
      className={`col-span-12 sm:col-span-6 xl:col-span-3 min-w-0 ${COL_STRETCH}`}
    >
      <div className={BOX_STRETCH}>
        <div className="box-body">
          <div className="grid grid-cols-12">
            <div className="col-span-6 pe-0">
              <p className="mb-2">
                <span className="text-[1rem]">{stat.title}</span>
              </p>
              <p className="mb-2 text-[0.75rem]">
                <span className="text-[1.5625rem] font-semibold leading-none vertical-bottom mb-0">
                  {stat.value}
                </span>
                <span className="block text-[0.625rem] font-semibold text-[#8c9097] dark:text-white/50">
                  {stat.period}
                </span>
              </p>
              <Link
                href={stat.href}
                className="text-[0.75rem] mb-0 text-primary"
              >
                View details
                <i className="ti ti-chevron-right ms-1 inline-flex"></i>
              </Link>
            </div>
            <div className="col-span-6">
              <p
                className={`badge ltr:float-right rtl:float-left inline-flex ${
                  stat.changePositive
                    ? "bg-success/10 !text-success"
                    : "bg-danger/10 !text-danger"
                }`}
              >
                <i
                  className={`ti ti-caret-${stat.changePositive ? "up" : "down"} me-1`}
                ></i>
                {stat.change >= 0 ? "+" : ""}
                {stat.change}%
              </p>
              <p className="main-card-icon mb-0 text-end">
                <i className={`${stat.icon} text-[2rem] text-primary`}></i>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricKpiCard({
  card,
  chartId,
}: {
  card: MetricCardData;
  chartId: string;
}) {
  const changePositive = card.change >= 0;

  return (
    <div
      className={`col-span-12 xxl:col-span-6 xl:col-span-6 min-w-0 ${COL_STRETCH}`}
    >
      <div className={`${BOX_STRETCH} overflow-hidden`}>
        <div className="box-body">
          <div className="flex flex-col sm:flex-row sm:items-top gap-3 sm:gap-0 sm:justify-between">
            <div className="shrink-0">
              <span
                className={`!text-[0.8rem] !w-[2.5rem] !h-[2.5rem] !leading-[2.5rem] !rounded-full inline-flex items-center justify-center ${ICON_BG_CLASS[card.iconBg]}`}
              >
                <i className={`${card.icon} text-[1rem] text-white`}></i>
              </span>
            </div>
            <div className="flex-grow sm:ms-4 min-w-0">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="min-w-0">
                  <p className="text-[#8c9097] dark:text-white/50 text-[0.813rem] mb-0">
                    {card.label}
                  </p>
                  <h4 className="font-semibold text-[1.5rem] !mb-2 truncate">
                    {card.value}
                  </h4>
                </div>
                <div className="shrink-0 hidden sm:block">
                  <MetricSparkline card={card} chartId={chartId} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div>
                  <Link
                    className={`${card.linkClass} text-[0.813rem]`}
                    href="/active-leads"
                  >
                    View All
                    <i className="ti ti-arrow-narrow-right ms-2 font-semibold inline-block"></i>
                  </Link>
                </div>
                <div className="text-end">
                  <p
                    className={`mb-0 text-[0.813rem] font-semibold ${
                      changePositive ? "text-success" : "text-danger"
                    }`}
                  >
                    {changePositive ? "+" : ""}
                    {card.change}%
                  </p>
                  <p className="text-[#8c9097] dark:text-white/50 opacity-[0.7] text-[0.6875rem]">
                    {card.changeLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopDealRowItem({
  deal,
  isLast,
}: {
  deal: TopDealRow;
  isLast?: boolean;
}) {
  return (
    <li className={isLast ? "" : "mb-[0.9rem]"}>
      <div className="flex items-start flex-wrap">
        <div className="me-2">
          <span
            className={`inline-flex items-center justify-center !w-[1.75rem] !h-[1.75rem] leading-[1.75rem] text-[0.65rem] rounded-full font-semibold ${AVATAR_TEXT_CLASS[deal.avatarClass]}`}
          >
            {deal.initials}
          </span>
        </div>
        <div className="flex-grow">
          <p className="font-semibold mb-[1.4px] text-[0.813rem]">
            {deal.name}
          </p>
          <p className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">
            {deal.email}
          </p>
        </div>
        <div className="font-semibold text-[0.9375rem]">{deal.amount}</div>
      </div>
    </li>
  );
}

function ContactRowItem({ contact }: { contact: RecentContactRow }) {
  return (
    <li className="list-group-item !py-3 !border-0">
      <Link href="/contacts" className="!border-0">
        <div className="flex items-start">
          <span
            className={`avatar avatar-md me-4 my-auto inline-flex items-center justify-center rounded-full font-semibold ${AVATAR_TEXT_CLASS[contact.avatarClass]}`}
          >
            {contact.initials}
          </span>
          <div className="mt-0">
            <p className="mb-1 font-semibold">{contact.name}</p>
            <p className="mb-0 text-[0.6875rem] text-success">
              {contact.subtitle}
            </p>
          </div>
          <span className="ms-auto text-[0.75rem]">
            <span className="ltr:float-right rtl:float-left text-[#8c9097] dark:text-white/50 font-semibold">
              {contact.time}
            </span>
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function ReportsPage() {
  const [taskTab, setTaskTab] = useState<"active" | "completed">("active");
  const [billingTab, setBillingTab] = useState<"stages" | "assignees">(
    "stages"
  );
  const [liveStatus, setLiveStatus] = useState<ReportsLiveStatus>("idle");
  const [liveError, setLiveError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [liveGraph, setLiveGraph] = useState<ReportsGraph>(EMPTY_GRAPH);
  const [liveEmails, setLiveEmails] = useState<CrmEmail[]>([]);
  const [ready, setReady] = useState(false);

  const loadLiveGraph = useCallback(async (background = false) => {
    if (!isAuthed()) {
      setLiveStatus("error");
      setLiveError("Sign in to load live reports from the backend.");
      setReady(true);
      return;
    }

    setLiveStatus(background ? "refreshing" : "loading");
    if (!background) setLiveError(null);

    const result = await fetchReportsLiveData();
    if (!result.live) {
      setLiveStatus("error");
      setLiveError(result.error);
      setReady(true);
      return;
    }

    setLiveGraph(result.data.graph);
    setLiveEmails(result.data.emails);
    setLiveError(null);
    setLastSyncedAt(new Date().toISOString());
    setLiveStatus("idle");
    setReady(true);
  }, []);

  useEffect(() => {
    void loadLiveGraph(false);
  }, [loadLiveGraph]);

  useEffect(() => {
    if (!ready || !isAuthed()) return;
    const interval = window.setInterval(() => {
      void loadLiveGraph(true);
    }, LIVE_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [ready, loadLiveGraph]);

  const report: ReportsSnapshot = useMemo(
    () =>
      buildReportsSnapshot(
        liveGraph.leads,
        liveGraph.companies,
        liveGraph.contacts,
        liveEmails,
        liveGraph.deals,
        liveGraph.timeline
      ),
    [liveEmails, liveGraph]
  );

  if (!ready && liveStatus === "loading") {
    return (
      <div className="p-8 text-center text-textmuted">Loading analytics…</div>
    );
  }

  const sparkIds = [
    "crm-total-customers",
    "crm-total-companies",
    "crm-conversion-ratio",
    "crm-total-deals",
  ];

  const activeTasks = report.followUpTasks.filter((t) => !t.completed);
  const completedTasks = report.followUpTasks.filter((t) => t.completed);
  const visibleTasks = taskTab === "active" ? activeTasks : completedTasks;
  const hasLiveRecords =
    liveGraph.leads.length > 0 ||
    liveGraph.contacts.length > 0 ||
    liveGraph.deals.length > 0 ||
    liveEmails.length > 0;

  return (
    <Fragment>
      <Seo title="Reports" />
      <div className="box custom-box mb-6">
        <div className="box-body !py-3 !px-4 flex flex-wrap items-center gap-2">
          <h6 className="mb-0 me-auto">Reports</h6>
          {(liveStatus === "loading" || liveStatus === "refreshing") && (
            <span className="badge bg-info/10 text-info" aria-live="polite">
              Syncing live data...
            </span>
          )}
          {liveStatus === "idle" && (
            <span className="badge bg-success/10 text-success">Live data</span>
          )}
          {liveStatus === "error" && (
            <span className="badge bg-danger/10 text-danger">
              Live sync issue
            </span>
          )}
          {lastSyncedAt ? (
            <span className="text-[0.75rem] text-textmuted">
              Updated {new Date(lastSyncedAt).toLocaleTimeString()}
            </span>
          ) : null}
          <button
            type="button"
            className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem] !w-auto !h-auto !mb-0"
            onClick={() => void loadLiveGraph(false)}
            disabled={liveStatus === "loading" || liveStatus === "refreshing"}
            aria-label="Refresh reports data from backend"
          >
            Refresh
          </button>
        </div>
        {liveError ? (
          <div className="alert alert-warning mx-4 mb-3 py-2" role="alert">
            Could not fetch latest reports from backend: {liveError}. Showing the
            latest available data.
          </div>
        ) : null}
        {liveStatus === "idle" && !hasLiveRecords ? (
          <div className="alert alert-info mx-4 mb-3 py-2" role="status">
            No CRM activity yet. Add leads from Discovery or Active Leads and
            connect Outlook in Inbox — reports update automatically from the
            backend.
          </div>
        ) : null}
      </div>

      {/* Row 1 — Sales-style KPI cards */}
      <div className="grid grid-cols-12 gap-x-6 gap-y-6 items-stretch mb-6">
        {report.salesStats.map((stat) => (
          <SalesStatCardItem key={stat.id} stat={stat} />
        ))}
      </div>

      {/* Row 2 — Recent outreach, pipeline overview, activities */}
      <div className="grid grid-cols-12 gap-x-6 gap-y-6 items-stretch mb-6">
        <div
          className={`xxl:col-span-3 xl:col-span-12 col-span-12 order-2 xl:order-1 min-w-0 ${COL_STRETCH}`}
        >
          <div className={`${BOX_STRETCH} recent-transactions-card overflow-hidden`}>
            <div className="box-header justify-between">
              <div className="box-title">Recent Outreach</div>
              <BoxMenu />
            </div>
            <div className="card-body !p-0 flex-1">
              <div className="list-group">
                {report.recentOutreach.length === 0 ? (
                  <div className="list-group-item !border-0 text-[0.8125rem] text-textmuted p-4">
                    No email activity yet.
                  </div>
                ) : (
                  report.recentOutreach.map((item) => (
                    <Link
                      key={item.id}
                      href="/inbox"
                      scroll={false}
                      className="!border-0"
                    >
                      <div className="list-group-item !border-0">
                        <div className="flex items-start">
                          <span
                            className={`tansaction-icon ${OUTREACH_ICON_BG[item.iconBg]}`}
                          >
                            <i className="ri-mail-line text-white text-[1rem]"></i>
                          </span>
                          <div className="w-full">
                            <div className="flex items-start justify-between">
                              <div className="mt-0">
                                <p className="mb-0 font-semibold">
                                  {item.title}
                                </p>
                                <span className="mb-0 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                                  {item.subtitle}
                                </span>
                              </div>
                              <span className="ms-auto">
                                <span
                                  className={`text-end block ${
                                    item.amountPositive
                                      ? "text-success"
                                      : "text-[#8c9097] dark:text-white/50"
                                  }`}
                                >
                                  {item.amount}
                                </span>
                                <span className="text-end text-[#8c9097] dark:text-white/50 block text-[0.75rem]">
                                  {item.date}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          className={`lg:col-span-6 sm:col-span-12 md:col-span-6 xxl:col-span-6 xl:col-span-8 col-span-12 order-1 xl:order-2 min-w-0 ${COL_STRETCH}`}
        >
          <div className={BOX_STRETCH}>
            <div className="box-header justify-between">
              <div className="box-title">Pipeline Overview</div>
              <BoxMenu />
            </div>
            <div className="box-body flex-1 flex flex-col min-h-0 overflow-x-auto">
              <PipelineOverviewChart report={report} />
            </div>
          </div>
        </div>

        <div
          className={`lg:col-span-6 sm:col-span-12 md:col-span-6 xxl:col-span-3 xl:col-span-4 col-span-12 order-3 min-w-0 ${COL_STRETCH}`}
        >
          <div className={BOX_STRETCH}>
            <div className="box-header justify-between">
              <div className="box-title">Activities</div>
              <Link
                href="/active-leads"
                className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50"
              >
                View All
              </Link>
            </div>
            <div className="box-body mt-0 latest-timeline flex-1">
              <ul className="timeline-main mb-0 list-unstyled">
                {report.activities.length === 0 ? (
                  <li className="text-[0.8125rem] text-textmuted">
                    No timeline events yet.
                  </li>
                ) : (
                  report.activities.map((activity) => (
                    <Fragment key={activity.id}>
                      <li>
                        <div
                          className={`featured_icon1 ${ACTIVITY_DOT[activity.tone]}`.trim()}
                        ></div>
                      </li>
                      <li className="mt-0 activity">
                        <div className="text-[0.75rem]">
                          <p className="mb-0">
                            <span className="font-semibold text-primary">
                              {activity.highlight}
                            </span>
                            <span className="ms-2 text-[0.75rem]">
                              {activity.text}
                            </span>
                          </p>
                          <small className="text-[#8c9097] dark:text-white/50 mt-0 mb-0 text-[0.625rem]">
                            {activity.time}
                          </small>
                        </div>
                      </li>
                    </Fragment>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 — CRM target + sparkline KPIs + revenue */}
      <div className="grid grid-cols-12 gap-x-6 gap-y-6 items-stretch mb-6">
        <div className="xxl:col-span-9 xl:col-span-12 col-span-12 h-full min-w-0">
          <div className="grid grid-cols-12 gap-x-6 gap-y-6 items-stretch h-full">
            <div
              className={`xxl:col-span-4 xl:col-span-4 col-span-12 gap-6 ${COL_STRETCH}`}
            >
              <div className="box crm-highlight-card shrink-0">
                <div className="box-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[1.125rem] text-white mb-2">
                        Pipeline target
                      </div>
                      <span className="block text-[0.75rem] text-white">
                        <span className="opacity-[0.7] text-nowrap me-1 rtl:ms-1">
                          Verified &amp; beyond:
                        </span>
                        <span className="font-semibold text-warning">
                          {report.targetPercent}%
                        </span>
                        <span className="opacity-[0.7]">
                          {" "}
                          of all leads in your CRM
                        </span>
                        .
                      </span>
                      <span className="block font-semibold mt-[0.125rem]">
                        <Link
                          className="text-white text-[0.813rem]"
                          href="/active-leads"
                        >
                          <u>Review pipeline</u>
                        </Link>
                      </span>
                    </div>
                    <TargetRadialChart percent={report.targetPercent} />
                  </div>
                </div>
              </div>

              <div className={`${BOX_STRETCH} flex-1 min-h-0`}>
                <div className="box-header flex justify-between">
                  <div className="box-title">Top Deals</div>
                  <BoxMenu />
                </div>
                <div className="box-body flex-1">
                  <ul className="list-none crm-top-deals mb-0">
                    {report.topDeals.length === 0 ? (
                      <li className="text-[0.8125rem] text-textmuted">
                        No deals yet — promote leads from Active Leads.
                      </li>
                    ) : (
                      report.topDeals.map((deal, i) => (
                        <TopDealRowItem
                          key={deal.id}
                          deal={deal}
                          isLast={i === report.topDeals.length - 1}
                        />
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div
              className={`xxl:col-span-8 xl:col-span-8 col-span-12 gap-6 ${COL_STRETCH}`}
            >
              <div className="grid grid-cols-12 gap-x-6 gap-y-6 items-stretch shrink-0">
                {report.metricCards.map((card, i) => (
                  <MetricKpiCard
                    key={card.id}
                    card={card}
                    chartId={sparkIds[i] ?? `crm-metric-${card.id}`}
                  />
                ))}
              </div>
              <div className={`${BOX_STRETCH} flex-1 min-h-0`}>
                <div className="box-header !gap-0 !m-0 justify-between">
                  <div className="box-title">Outreach Activity</div>
                  <Link
                    href="/active-leads"
                    className="text-[0.75rem] text-[#8c9097] dark:text-white/50"
                  >
                    View All
                  </Link>
                </div>
                <div className="box-body !py-5 flex-1 flex flex-col min-h-0 overflow-x-auto">
                  <RevenueAnalyticsChart report={report} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`xxl:col-span-3 xl:col-span-12 col-span-12 gap-6 min-w-0 ${COL_STRETCH}`}
        >
          <div className={`${BOX_STRETCH} flex-1 min-h-0`}>
                <div className="box-header justify-between">
                  <div className="box-title">Leads By Source</div>
                  <BoxMenu />
                </div>
                <div className="box-body overflow-hidden flex-1">
                  <LeadsSourceDonut report={report} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-dashed dark:border-defaultborder/10">
                  {report.leadsBySource.items.map((item, i) => (
                    <div key={item.label} className="col !p-0">
                      <div
                        className={`p-[0.95rem] text-center border-e border-dashed dark:border-defaultborder/10 last:border-e-0 ${
                          i === 0 ? "!ps-4" : ""
                        } ${i === report.leadsBySource.items.length - 1 ? "!pe-4 border-e-0" : ""}`}
                      >
                        <span
                          className={`text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-1 crm-lead-legend ${item.legendClass} inline-block`}
                        >
                          {item.label}
                        </span>
                        <div>
                          <span className="text-[1rem] font-semibold">
                            {item.count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
          </div>

          <div className={`${BOX_STRETCH} flex-1 min-h-0`}>
                <div className="box-header justify-between">
                  <div className="box-title">Deals Status</div>
                  <Link
                    href="/active-leads"
                    className="text-[0.75rem] text-[#8c9097] dark:text-white/50"
                  >
                    View All
                  </Link>
                </div>
                <div className="box-body flex-1">
                  <div className="flex items-center mb-[0.8rem] flex-wrap gap-2">
                    <h4 className="font-bold mb-0 text-[1.5rem] tabular-nums">
                      {report.dealsStatus.total.toLocaleString()}
                    </h4>
                    <div className="ms-0 sm:ms-2">
                      <span
                        className={`py-[0.18rem] px-[0.45rem] rounded-sm !font-medium !text-[0.75em] tabular-nums ${
                          report.dealsStatus.weekChange.startsWith("-")
                            ? "text-danger bg-danger/10"
                            : "text-success bg-success/10"
                        }`}
                      >
                        {report.dealsStatus.weekChange}
                        <i
                          className={`ri-arrow-${report.dealsStatus.weekChange.startsWith("-") ? "down" : "up"}-s-fill align-middle ms-1`}
                        ></i>
                      </span>
                      <span className="text-[#8c9097] dark:text-white/50 text-[0.813rem] ms-1">
                        win rate
                      </span>
                    </div>
                  </div>
                  <div
                    className={`flex w-full h-[0.3125rem] mb-6 rounded-full overflow-hidden ${
                      report.dealsStatus.total === 0
                        ? "bg-[#8c9097]/15 dark:bg-white/10"
                        : ""
                    }`}
                  >
                    {report.dealsStatus.total > 0 &&
                      report.dealsStatus.segments.map((seg, i) => (
                        <div
                          key={i}
                          className={`flex flex-col justify-center overflow-hidden ${seg.segmentClass} ${
                            i === 0
                              ? "rounded-s-[0.625rem]"
                              : i === report.dealsStatus.segments.length - 1
                                ? "rounded-e-[0.625rem]"
                                : "rounded-none"
                          }`}
                          style={{ width: `${seg.pct}%` }}
                        />
                      ))}
                  </div>
                  <ul className="list-none mb-0 pt-2 crm-deals-status">
                    {report.dealsStatus.items.map((item) => (
                      <li key={item.label} className={item.statusClass}>
                        <div className="flex items-center text-[0.813rem] justify-between">
                          <div>{item.label}</div>
                          <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50 tabular-nums">
                            {item.count} deals
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
        </div>
      </div>

      {/* Row 4 — Follow-ups + weekly activity + profit */}
      <div className="grid grid-cols-12 gap-x-6 gap-y-6 items-stretch mb-6">
        <div className={`xxl:col-span-6 xl:col-span-12 col-span-12 ${COL_STRETCH}`}>
          <div className={BOX_STRETCH}>
            <div className="box-header !block sm:!flex">
              <div className="box-title">Follow-up Tasks</div>
              <div className="tab-menu-heading border-0 p-0 ms-auto sm:mt-0 my-2">
                <div className="tabs-menu-task me-3">
                  <nav aria-label="Tabs" role="tablist">
                    <button
                      type="button"
                      onClick={() => setTaskTab("active")}
                      className={`cursor-pointer px-4 py-2 flex-grow text-[0.75rem] font-medium text-center rounded-md hover:text-secondary ${
                        taskTab === "active"
                          ? "bg-secondary/10 text-secondary"
                          : "text-defaulttextcolor"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskTab("completed")}
                      className={`cursor-pointer px-4 py-2 text-[0.75rem] flex-grow font-medium text-center rounded-md hover:text-secondary ${
                        taskTab === "completed"
                          ? "bg-secondary/10 text-secondary"
                          : "text-defaulttextcolor"
                      }`}
                    >
                      Completed
                    </button>
                  </nav>
                </div>
              </div>
              <div className="sm:mt-0 mt-2">
                <Link
                  href="/active-leads"
                  className="btn btn-sm btn-light"
                >
                  <i className="ti ti-plus me-1 font-semibold align-middle inline-block"></i>
                  View pipeline
                </Link>
              </div>
            </div>
            <div className="box-body !p-0 flex-1">
              <div className="table-responsive">
                <table className="table table-hover min-w-full whitespace-normal md:whitespace-nowrap">
                  <thead>
                    <tr>
                      <th scope="col" className="text-start">
                        Lead / task
                      </th>
                      <th scope="col" className="text-start">
                        Last activity
                      </th>
                      <th scope="col" className="text-start">
                        Follow-up
                      </th>
                      <th scope="col" className="text-start">
                        Assigned to
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTasks.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-[0.8125rem] text-textmuted p-4"
                        >
                          No {taskTab} follow-ups.
                        </td>
                      </tr>
                    ) : (
                      visibleTasks.slice(0, 6).map((task) => (
                        <tr
                          key={task.id}
                          className="border-t border-inherit border-solid hover:bg-gray-100 dark:hover:bg-light dark:border-defaultborder/10"
                        >
                          <td>
                            <Link
                              href={`/active-leads?lead=${task.leadId}`}
                              className="text-defaulttextcolor"
                            >
                              {task.detail}
                            </Link>
                          </td>
                          <td className="text-[#8c9097] dark:text-white/50">
                            {task.assignedDate}
                          </td>
                          <td>
                            <span
                              className={`badge ${task.targetBadgeClass}`}
                            >
                              {task.target}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`avatar avatar-xs inline-flex items-center justify-center rounded-full font-semibold ${AVATAR_TEXT_CLASS.primary}`}
                            >
                              {task.assigneeInitials}
                            </span>
                            <span className="ms-2 text-[0.75rem]">
                              {task.assignee}
                            </span>
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

        <div className={`xxl:col-span-6 xl:col-span-12 col-span-12 ${COL_STRETCH}`}>
          <div className={BOX_STRETCH}>
            <div className="box-header justify-between">
              <div className="box-title">Weekly Activity</div>
              <BoxMenu />
            </div>
            <div className="box-body !py-0 !ps-0 flex-1 flex flex-col justify-center min-h-[320px]">
              <ProfitEarnedChart report={report} height={320} />
            </div>
          </div>
        </div>
      </div>

      {/* Row 5 — Contacts, pipeline breakdown, win rate, top salts */}
      <div className="grid grid-cols-12 gap-x-6 gap-y-6 items-stretch mb-6">
        <div className={`xxl:col-span-3 xl:col-span-6 col-span-12 ${COL_STRETCH}`}>
          <div className={BOX_STRETCH}>
            <div className="box-header justify-between">
              <div className="box-title">Recent Contacts</div>
              <BoxMenu />
            </div>
            <div className="box-body !p-0 customers flex-1">
              <ul className="list-group my-1">
                {report.recentContacts.length === 0 ? (
                  <li className="list-group-item !py-3 !border-0 text-[0.8125rem] text-textmuted">
                    No contacts saved yet.
                  </li>
                ) : (
                  report.recentContacts.map((contact) => (
                    <ContactRowItem key={contact.id} contact={contact} />
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className={`xxl:col-span-3 xl:col-span-6 col-span-12 ${COL_STRETCH}`}>
          <div className={BOX_STRETCH}>
            <div className="box-header">
              <div className="box-title">Pipeline Breakdown</div>
              <div className="tab-menu-heading !border-0 !p-0 ms-auto">
                <div className="tabs-menu-billing my-1">
                  <nav aria-label="Tabs" role="tablist">
                    <button
                      type="button"
                      onClick={() => setBillingTab("stages")}
                      className={`py-[0.35rem] px-4 flex-grow text-[0.75rem] font-medium text-center rounded-md hover:text-success ${
                        billingTab === "stages"
                          ? "bg-success/10 text-success"
                          : "text-defaulttextcolor"
                      }`}
                    >
                      Stages
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingTab("assignees")}
                      className={`py-[0.35rem] px-4 text-[0.75rem] flex-grow font-medium text-center rounded-md hover:text-success ${
                        billingTab === "assignees"
                          ? "bg-success/10 text-success"
                          : "text-defaulttextcolor"
                      }`}
                    >
                      Assignees
                    </button>
                  </nav>
                </div>
              </div>
            </div>
            <div className="box-body !p-0 flex-1">
              {billingTab === "stages" ? (
                <ul className="list-group border-0 py-2 my-2">
                  {report.stageBreakdown.map((row) => (
                    <li
                      key={row.stage}
                      className="list-group-item items-start !border-0 mb-2"
                    >
                      <div className="flex w-full justify-between items-center">
                        <span className={`badge ${row.badgeClass}`}>
                          {row.stage}
                        </span>
                        <span className="font-semibold text-[0.875rem]">
                          {row.count} leads
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="list-group border-0 py-2">
                  {report.assigneeBreakdown.map((row) => (
                    <li
                      key={row.name}
                      className="list-group-item flex-col items-start !border-0 mb-1"
                    >
                      <div className="flex w-full justify-between">
                        <p className="mb-0 font-semibold">{row.name}</p>
                        <p className="mb-0 font-semibold text-success text-[0.875rem]">
                          {row.active} active
                        </p>
                      </div>
                      <div className="flex w-full justify-between">
                        <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                          {row.total} total leads
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className={`xxl:col-span-3 xl:col-span-6 col-span-12 ${COL_STRETCH}`}>
          <div className={BOX_STRETCH}>
            <div className="box-header justify-between">
              <div className="box-title">Win Rate</div>
              <BoxMenu />
            </div>
            <div className="box-body !p-0 !px-1 flex-1 flex flex-col">
              <WinRateRadialChart percent={report.winRate} />
              <div className="grid grid-cols-12 pt-3">
                <div className="xl:col-span-12 col-span-12 border-b dark:border-defaultborder/10 pb-5 text-center flex flex-wrap justify-center">
                  <span className="font-semibold ms-2 text-primary px-4">
                    {report.replyRate}% reply rate on outreach
                  </span>
                </div>
                <div className="xl:col-span-6 col-span-6 border-e dark:border-defaultborder/10 p-4 text-center">
                  <p className="mb-1">Active Leads</p>
                  <h5 className="mb-1 font-semibold">
                    {report.salesStats[0]?.value ?? "0"}
                  </h5>
                  <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">
                    In pipeline
                  </p>
                </div>
                <div className="xl:col-span-6 col-span-6 p-4 text-center">
                  <p className="mb-1">Won Deals</p>
                  <h5 className="mb-1 font-semibold">
                    {report.salesStats[3]?.value ?? "0"}
                  </h5>
                  <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">
                    Closed won
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`xxl:col-span-3 xl:col-span-6 col-span-12 ${COL_STRETCH}`}>
          <div className={BOX_STRETCH}>
            <div className="box-header justify-between">
              <div className="box-title">Top API Salts</div>
              <BoxMenu />
            </div>
            <div className="box-body flex-1">
              <ul className="mb-0 !rounded-[0.375rem]">
                {report.topSalts.length === 0 ? (
                  <li className="text-[0.8125rem] text-textmuted">
                    No salt matches yet.
                  </li>
                ) : (
                  report.topSalts.map((salt, i) => (
                    <li key={salt.name} className="list-group-item">
                      <div className="flex items-center">
                        <div className="me-2">
                          <span className="avatar avatar-sm bg-light !text-defaulttextcolor font-semibold !mb-0">
                            {i + 1}
                          </span>
                        </div>
                        <div className="flex-grow">
                          <p className="mb-0 font-semibold">{salt.name}</p>
                          <div className="progress progress-xs mt-1">
                            <div
                              className="progress-bar bg-primary"
                              style={{ width: `${salt.pct}%` }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <span className="text-success">{salt.count}</span>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-4 pt-3 border-t dark:border-defaultborder/10">
                <p className="text-[0.75rem] font-semibold mb-2">
                  By pipeline stage
                </p>
                <ul className="list-none p-0 my-auto">
                  {report.leadsBySource.items.map((item, i) => (
                    <li key={item.label} className="mb-3">
                      <span className="text-[0.75rem]">
                        <i
                          className={`ri-checkbox-blank-circle-fill align-middle me-2 inline-block ${SALT_LEGEND_COLORS[i % SALT_LEGEND_COLORS.length]}`}
                        ></i>
                        {item.label}
                      </span>
                      <span className="font-semibold ltr:float-right rtl:float-left">
                        {item.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 6 — Active pipeline table */}
      <div className="grid grid-cols-12 gap-x-6">
        <div className="col-span-12">
          <div className="box">
            <div className="box-header justify-between">
              <div className="box-title">Active Pipeline</div>
              <Link
                href="/active-leads"
                className="ti-btn ti-btn-sm ti-btn-primary btn-wave"
              >
                Open Active Leads
              </Link>
            </div>
            <div className="box-body !p-0">
              <div className="table-responsive">
                <table className="table table-hover min-w-full whitespace-normal md:whitespace-nowrap ti-custom-table-hover">
                  <thead>
                    <tr className="border-b border-defaultborder dark:border-defaultborder/10">
                      <th scope="col">Company</th>
                      <th scope="col">Contact</th>
                      <th scope="col">API Salt</th>
                      <th scope="col">Stage</th>
                      <th scope="col">Score</th>
                      <th scope="col">Assignee</th>
                      <th scope="col">Last activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.pipelineRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-[0.8125rem] text-textmuted p-4"
                        >
                          No active leads in pipeline.
                        </td>
                      </tr>
                    ) : (
                      report.pipelineRows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-defaultborder dark:border-defaultborder/10"
                        >
                          <td>
                            <Link
                              href={`/active-leads?lead=${row.leadId}`}
                              className="font-semibold"
                            >
                              {row.company}
                            </Link>
                          </td>
                          <td>{row.contact}</td>
                          <td>{row.salt}</td>
                          <td>
                            <span className={`badge ${row.stageBadgeClass}`}>
                              {row.stage}
                            </span>
                          </td>
                          <td>{row.score}</td>
                          <td>
                            <span
                              className={`avatar avatar-xs inline-flex items-center justify-center rounded-full font-semibold me-2 ${AVATAR_TEXT_CLASS.info}`}
                            >
                              {row.assigneeInitials}
                            </span>
                            {row.assignee}
                          </td>
                          <td className="text-[#8c9097] dark:text-white/50">
                            {row.date}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="box-footer">
              <div className="sm:flex items-center">
                <div className="dark:text-defaulttextcolor/70">
                  Showing {report.pipelineRows.length} active leads
                </div>
                <div className="ms-auto">
                  <Link
                    href="/active-leads"
                    className="text-primary text-[0.8125rem] font-medium"
                  >
                    View full pipeline
                    <i className="ri-arrow-right-line ms-1 align-middle"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
