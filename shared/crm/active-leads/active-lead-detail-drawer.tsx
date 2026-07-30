"use client";

import { companyInitials, leadEditHref } from "@/shared/crm/active-leads/active-leads-utils";
import { FollowUpDateCell } from "@/shared/crm/active-leads/follow-up-date-cell";
import { LeadDetailsDisplay } from "@/shared/crm/active-leads/lead-details-display";
import { LeadNotesPanel } from "@/shared/crm/active-leads/lead-notes-panel";
import { LeadStageProgress } from "@/shared/crm/active-leads/lead-stage-progress";
import LeadStageBadge from "@/shared/crm/active-leads/lead-stage-badge";
import { useCrm } from "@/shared/crm/store/crm-context";
import type { CrmEmail, CrmLead, CrmTimelineEvent } from "@/shared/crm/store/types";
import {
  emailPreviewSnippet,
  formatCrmDate,
  formatCrmDateTime,
} from "@/shared/crm/inbox/inbox-utils";
import LeadScoreBadge from "@/shared/crm/lead-discovery/lead-score-badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import SimpleBar from "simplebar-react";

type TabId = "overview" | "timeline" | "emails" | "notes";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "ri-layout-grid-line" },
  { id: "timeline", label: "Timeline", icon: "ri-time-line" },
  { id: "emails", label: "Emails", icon: "ri-mail-line" },
  { id: "notes", label: "Notes", icon: "ri-sticky-note-line" },
];

const TIMELINE_ICONS: Record<string, string> = {
  stage: "ri-flag-line",
  email: "ri-mail-send-line",
  note: "ri-sticky-note-line",
  call: "ri-phone-line",
  verification: "ri-shield-check-line",
  deal: "ri-hand-coin-line",
};

type ActiveLeadDetailDrawerProps = {
  lead: CrmLead | null;
  onClose: () => void;
  onSendEmail: (lead: CrmLead) => void;
};

function resolveTimelineEmailId(
  entry: CrmTimelineEvent,
  emails: CrmEmail[]
): string | null {
  if (entry.emailId) {
    const byId = emails.find((e) => e.id === entry.emailId);
    if (byId) return byId.id;
    const byMessageId = emails.find((e) => e.messageId === entry.emailId);
    if (byMessageId) return byMessageId.id;
  }
  const subject = entry.description.trim();
  if (!subject) return null;
  const bySubject = emails.find((e) => e.subject === subject);
  return bySubject?.id ?? null;
}

function InfoCard({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="active-leads-info-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="active-leads-info-card-icon">
          <i className={icon}></i>
        </span>
        <h6 className="text-[0.75rem] font-semibold text-textmuted uppercase tracking-wide mb-0">
          {label}
        </h6>
      </div>
      {children}
    </div>
  );
}

export function ActiveLeadDetailDrawer({
  lead,
  onClose,
  onSendEmail,
}: ActiveLeadDetailDrawerProps) {
  const {
    getLeadEmails,
    getLeadTimeline,
    getLeadNotes,
    getCompany,
    getContact,
    medicines,
    deals,
  } = useCrm();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const open = lead !== null;

  useEffect(() => {
    if (open) {
      setActiveTab("overview");
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!lead) return null;

  const timeline = getLeadTimeline(lead.id);
  const emails = getLeadEmails(lead.id);
  const leadNotes = getLeadNotes(lead.id);
  const leadDeals = deals.filter((d) => d.leadId === lead.id);
  const company = getCompany(lead.companyId);
  const contact = lead.contactId ? getContact(lead.contactId) : undefined;

  const openEmailInInbox = (emailId: string) => {
    router.push(`/inbox?email=${encodeURIComponent(emailId)}`);
  };

  const handleTimelineClick = (entry: CrmTimelineEvent) => {
    if (entry.type !== "email") return;
    const emailId = resolveTimelineEmailId(entry, emails);
    if (emailId) {
      openEmailInInbox(emailId);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-[140] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="active-lead-title"
        className={`ti-offcanvas ti-offcanvas-right active-leads-drawer z-[150] ${
          open ? "open" : ""
        }`}
      >
        <div className="active-leads-drawer-header-block active-leads-drawer-hero">
          <button
            type="button"
            className="active-leads-drawer-close"
            onClick={onClose}
            aria-label="Close lead profile"
          >
            <i className="ri-close-line"></i>
          </button>
          <div className="flex items-start gap-3 pe-8">
            <span className="active-leads-drawer-avatar">
              {companyInitials(lead.companyName)}
            </span>
            <div className="min-w-0 flex-1">
              <h5
                id="active-lead-title"
                className="text-[1.0625rem] font-semibold text-defaulttextcolor leading-snug mb-1"
              >
                {lead.title}
              </h5>
              <p className="text-[0.8125rem] text-textmuted mb-2 flex items-center gap-1">
                <i className="ri-building-2-line"></i>
                {lead.companyName}
              </p>
              <p className="text-[0.75rem] text-textmuted mb-2">
                Quick view — edit on full page.
              </p>
              <Link
                href={leadEditHref(lead.id, { from: "active-leads" })}
                className="text-[0.75rem] text-primary inline-flex items-center gap-1 mb-2"
              >
                <i className="ri-external-link-line"></i>
                Open full page
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <LeadStageBadge stage={lead.stage} />
                <LeadScoreBadge score={lead.leadScore} />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-defaultborder/60 dark:border-white/10">
            <LeadStageProgress stage={lead.stage} />
          </div>
        </div>

        <div className="active-leads-drawer-header-block active-leads-drawer-stage-bar border-b border-defaultborder dark:border-defaultborder/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <LeadStageBadge stage={lead.stage} />
            <LeadScoreBadge score={lead.leadScore} />
          </div>
        </div>

        <div className="active-leads-drawer-header-block active-leads-drawer-meta px-4 py-2.5 border-b border-defaultborder dark:border-defaultborder/10 grid grid-cols-2 gap-3 text-[0.8125rem]">
          <div>
            <span className="text-textmuted block text-[0.7rem]">Assigned</span>
            <strong className="font-medium">{lead.assignedTo}</strong>
          </div>
          <div>
            <span className="text-textmuted block text-[0.7rem]">Follow-up</span>
            <FollowUpDateCell followUpDate={lead.followUpDate} />
          </div>
        </div>

        <div className="active-leads-drawer-header-block active-leads-drawer-tabs border-b border-defaultborder dark:border-defaultborder/10">
          <div className="active-leads-drawer-tabs-inner" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`active-leads-drawer-tab ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`${tab.icon} me-1`}></i>
                {tab.label}
                {tab.id === "emails" && emails.length > 0 && (
                  <span className="ms-1 badge bg-primary/15 text-primary text-[0.6rem]">
                    {emails.length}
                  </span>
                )}
                {tab.id === "notes" && leadNotes.length > 0 && (
                  <span className="ms-1 badge bg-primary/15 text-primary text-[0.6rem]">
                    {leadNotes.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <SimpleBar className="active-leads-drawer-scroll flex-1 min-h-0">
          <div className="active-leads-drawer-body">
          {activeTab === "overview" && (
            <div className="py-4" role="tabpanel">
              <LeadDetailsDisplay
                lead={lead}
                company={company}
                contact={contact}
                medicines={medicines}
                showMeta
                showCompanyLink
              />

              {leadDeals.length > 0 && (
                <InfoCard icon="ri-hand-coin-line" label="Deals" >
                  {leadDeals.map((d) => (
                    <div key={d.id} className="text-[0.875rem] mb-1">
                      <strong>{d.title}</strong> — {d.value} ({d.stage})
                    </div>
                  ))}
                </InfoCard>
              )}
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="py-4" role="tabpanel">
              <ul className="list-none mb-0 active-leads-timeline">
                {timeline.map((entry) => {
                  const isEmailEvent = entry.type === "email";
                  const linkedEmailId = isEmailEvent
                    ? resolveTimelineEmailId(entry, emails)
                    : null;
                  const isClickable = Boolean(linkedEmailId);

                  return (
                  <li
                    key={entry.id}
                    className={`active-leads-timeline-item${isClickable ? " is-clickable" : ""}`}
                    role={isClickable ? "button" : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    title={isClickable ? "Open in Inbox" : undefined}
                    onClick={
                      isClickable ? () => handleTimelineClick(entry) : undefined
                    }
                    onKeyDown={
                      isClickable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleTimelineClick(entry);
                            }
                          }
                        : undefined
                    }
                  >
                    <span className="active-leads-timeline-icon">
                      <i
                        className={
                          TIMELINE_ICONS[entry.type] ?? "ri-circle-line"
                        }
                      ></i>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-[0.875rem]">
                          {entry.title}
                        </span>
                        <span className="text-[0.7rem] text-textmuted shrink-0">
                          {formatCrmDate(entry.date)}
                        </span>
                      </div>
                      <p className="text-[0.8125rem] text-textmuted mb-0">
                        {entry.description}
                      </p>
                      {isClickable && (
                        <span className="active-leads-timeline-link-hint">
                          <i className="ri-inbox-line me-1"></i>
                          View in Inbox
                        </span>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
            </div>
          )}

          {activeTab === "emails" && (
            <div className="py-4 space-y-3" role="tabpanel">
              {!lead.contactEmail ? (
                <div className="text-center py-6">
                  <p className="text-[0.875rem] text-textmuted mb-2">
                    No email added for this contact.
                  </p>
                  <Link
                    href={leadEditHref(lead.id, {
                      from: "active-leads",
                      focus: "contact-email",
                    })}
                    className="ti-btn ti-btn-primary active-leads-drawer-btn"
                  >
                    Add email
                  </Link>
                </div>
              ) : emails.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[0.875rem] text-textmuted mb-2">
                    No emails yet. Send outreach to start the thread.
                  </p>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary active-leads-drawer-btn"
                    onClick={() => onSendEmail(lead)}
                  >
                    Send email
                  </button>
                </div>
              ) : (
                emails.map((email) => (
                  <Link
                    key={email.id}
                    href={`/inbox?email=${encodeURIComponent(email.id)}`}
                    className="active-leads-email-card block no-underline text-inherit"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`badge text-[0.65rem] ${
                          email.direction === "inbound"
                            ? "bg-info/10 text-info"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {email.direction === "inbound" ? "Received" : "Sent"}
                      </span>
                      <span className="text-[0.75rem] text-textmuted">
                        {formatCrmDateTime(email.sentAt)}
                      </span>
                    </div>
                    <div className="font-medium text-[0.875rem] mb-1">
                      {email.subject}
                    </div>
                    <p className="text-[0.8125rem] text-textmuted mb-0 line-clamp-2">
                      {emailPreviewSnippet(email)}
                    </p>
                  </Link>
                ))
              )}
              <Link href="/inbox" className="text-[0.75rem] text-primary">
                Open Inbox →
              </Link>
            </div>
          )}

          {activeTab === "notes" && <LeadNotesPanel lead={lead} />}
          </div>
        </SimpleBar>

        <div className="ti-offcanvas-footer active-leads-drawer-footer !shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          {lead.contactEmail && (
            <button
              type="button"
              className="ti-btn ti-btn-primary"
              onClick={() => onSendEmail(lead)}
            >
              <i className="ri-mail-send-line me-1"></i>
              Send email
            </button>
          )}
          <Link
            href={leadEditHref(lead.id, { from: "active-leads" })}
            className="ti-btn ti-btn-light"
          >
            Open full page
          </Link>
          <button type="button" className="ti-btn ti-btn-light" onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    </>
  );
}
