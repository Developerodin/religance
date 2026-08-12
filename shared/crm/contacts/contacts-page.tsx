"use client";

import { companyInitials } from "@/shared/crm/active-leads/active-leads-utils";
import { ActiveLeadDetailDrawer } from "@/shared/crm/active-leads/active-lead-detail-drawer";
import { ContactDetailDrawer } from "@/shared/crm/contacts/contact-detail-drawer";
import {
  enrichContacts,
  filterEnrichedContacts,
  formatContactDate,
  hasContactFilters,
  resolveSendEmailTarget,
  sortEnrichedContacts,
  type ContactSort,
  type EnrichedContact,
} from "@/shared/crm/contacts/contacts-utils";
import { InboxAvatar } from "@/shared/crm/inbox/inbox-avatar";
import { SendEmailModal } from "@/shared/crm/send-email/send-email-modal";
import type { SendEmailTarget } from "@/shared/crm/send-email/send-email-types";
import { sendEmailTargetFromLead } from "@/shared/crm/send-email/send-email-types";
import { useCrm } from "@/shared/crm/store/crm-context";
import type { CrmLead } from "@/shared/crm/store/types";
import { ConfirmDeleteOverlay } from "@/shared/crm/ui/confirm-delete-overlay";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 12;

const STAT_CARDS = [
  { key: "total", label: "Saved contacts", icon: "ri-contacts-book-line", tone: "primary" },
  { key: "withLeads", label: "With leads", icon: "ri-link", tone: "success" },
  { key: "companies", label: "Companies", icon: "ri-building-2-line", tone: "secondary" },
  { key: "activeLeads", label: "Active links", icon: "ri-pulse-line", tone: "warning" },
] as const;

export default function ContactsPage() {
  const { contacts, companies, leads, hydrated, deleteContact } = useCrm();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [sort, setSort] = useState<ContactSort>("name");
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<EnrichedContact | null>(null);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [sendTarget, setSendTarget] = useState<SendEmailTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EnrichedContact | null>(
    null
  );

  const enriched = useMemo(
    () => enrichContacts(contacts, companies, leads),
    [contacts, companies, leads]
  );

  const companyOptions = useMemo(() => {
    const ids = new Set(contacts.map((c) => c.companyId));
    return companies
      .filter((c) => ids.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, companies]);

  const filtered = useMemo(() => {
    const rows = filterEnrichedContacts(enriched, search, companyFilter);
    return sortEnrichedContacts(rows, sort);
  }, [enriched, search, companyFilter, sort]);

  const stats = useMemo(() => {
    const companyIds = new Set(contacts.map((c) => c.companyId));
    const withLeads = enriched.filter((r) => r.leadCount > 0).length;
    const activeLeads = enriched.reduce((n, r) => n + r.activeLeadCount, 0);
    return {
      total: contacts.length,
      withLeads,
      companies: companyIds.size,
      activeLeads,
    };
  }, [contacts, enriched]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const filtersActive = hasContactFilters(search, companyFilter);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, companyFilter, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    if (!selectedRow) return;
    const fresh = enriched.find((r) => r.contact.id === selectedRow.contact.id);
    if (fresh) setSelectedRow(fresh);
  }, [enriched, selectedRow?.contact.id]);

  const clearFilters = () => {
    setSearch("");
    setCompanyFilter("");
  };

  const openRow = (row: EnrichedContact) => setSelectedRow(row);

  const requestDelete = (row: EnrichedContact) => setPendingDelete(row);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteContact(pendingDelete.contact.id);
    if (selectedRow?.contact.id === pendingDelete.contact.id) {
      setSelectedRow(null);
    }
    setPendingDelete(null);
  };

  const cancelDelete = () => setPendingDelete(null);

  if (!hydrated) {
    return (
      <div className="saved-contacts-page">
        <div className="saved-contacts-loading">Loading contacts…</div>
      </div>
    );
  }

  return (
    <Fragment>
      <Seo title="Saved Contact" />
      <div className="saved-contacts-page">
        <div className="box custom-box saved-contacts-shell !mb-0">
          <div className="saved-contacts-hero">
            <div className="saved-contacts-hero-text">
              <h2 className="saved-contacts-title">Saved Contact</h2>
              <p className="saved-contacts-subtitle mb-0">
                Contacts saved from discovery, linked to companies and pipeline
                leads.
              </p>
            </div>
            <Link
              href="/lead-discovery"
              className="ti-btn ti-btn-primary ti-btn-sm saved-contacts-cta"
            >
              <i className="ri-compass-3-line me-1"></i>
              Lead Discovery
            </Link>
          </div>

          <div className="saved-contacts-stats" role="group" aria-label="Summary">
            {STAT_CARDS.map((card) => (
              <div
                key={card.key}
                className={`saved-contacts-stat-item tone-${card.tone}`}
              >
                <span className={`saved-contacts-stat-icon tone-${card.tone}`}>
                  <i className={card.icon}></i>
                </span>
                <div>
                  <p className="saved-contacts-stat-label">{card.label}</p>
                  <p className="saved-contacts-stat-value">
                    {stats[card.key as keyof typeof stats]}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="saved-contacts-toolbar">
            <div className="saved-contacts-toolbar-top">
              <span className="saved-contacts-count">
                <strong>{filtered.length}</strong>
                <span className="text-textmuted">
                  {" "}
                  of {contacts.length} contacts
                </span>
              </span>
              {filtersActive && (
                <button
                  type="button"
                  className="ti-btn ti-btn-sm ti-btn-light"
                  onClick={clearFilters}
                >
                  <i className="ri-filter-off-line me-1"></i>
                  Clear filters
                </button>
              )}
            </div>
            <div className="saved-contacts-filters">
              <div className="saved-contacts-filter saved-contacts-filter--search">
                <label className="saved-contacts-filter-label">Search</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text saved-contacts-input-addon">
                    <i className="ri-search-line"></i>
                  </span>
                  <input
                    type="search"
                    className="form-control saved-contacts-input"
                    placeholder="Name, email, role, company…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search contacts"
                  />
                </div>
              </div>
              <div className="saved-contacts-filter">
                <label className="saved-contacts-filter-label">Company</label>
                <select
                  className="form-select form-select-sm saved-contacts-input"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  aria-label="Filter by company"
                >
                  <option value="">All companies</option>
                  {companyOptions.map((co) => (
                    <option key={co.id} value={co.id}>
                      {co.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="saved-contacts-filter saved-contacts-filter--sort">
                <label className="saved-contacts-filter-label">Sort</label>
                <select
                  className="form-select form-select-sm saved-contacts-input"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as ContactSort)}
                  aria-label="Sort contacts"
                >
                  <option value="name">Name A–Z</option>
                  <option value="company">Company</option>
                  <option value="newest">Newest first</option>
                </select>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="saved-contacts-empty">
              <span className="saved-contacts-empty-icon">
                <i className="ri-user-add-line"></i>
              </span>
              <p className="saved-contacts-empty-title">
                {contacts.length === 0
                  ? "No saved contacts yet"
                  : "No contacts match your filters"}
              </p>
              <p className="saved-contacts-empty-desc">
                {contacts.length === 0
                  ? "Save people from Lead Discovery to build your outreach list."
                  : "Try a different search or company filter."}
              </p>
              {contacts.length === 0 ? (
                <Link
                  href="/lead-discovery"
                  className="ti-btn ti-btn-primary saved-contacts-empty-cta"
                >
                  <i className="ri-compass-3-line me-1"></i>
                  Go to Lead Discovery
                </Link>
              ) : (
                <button
                  type="button"
                  className="ti-btn ti-btn-primary saved-contacts-empty-cta"
                  onClick={clearFilters}
                >
                  <i className="ri-filter-off-line me-1"></i>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive saved-contacts-table-wrap">
                <table className="table table-hover ti-custom-table saved-contacts-table mb-0">
                  <thead>
                    <tr>
                      <th scope="col" className="saved-contacts-th-avatar"></th>
                      <th scope="col">Contact</th>
                      <th scope="col">Company</th>
                      <th scope="col">Leads</th>
                      <th scope="col">Saved</th>
                      <th scope="col" className="text-end">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((row) => {
                      const { contact, company } = row;
                      const isSelected =
                        selectedRow?.contact.id === contact.id;
                      return (
                        <tr
                          key={contact.id}
                          className={`saved-contacts-row ${isSelected ? "is-selected" : ""}`}
                          onClick={() => openRow(row)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openRow(row);
                            }
                          }}
                        >
                          <td className="saved-contacts-td-avatar">
                            <InboxAvatar name={contact.name} size="sm" />
                          </td>
                          <td>
                            <p className="saved-contacts-name mb-0">
                              {contact.name}
                            </p>
                            <p className="saved-contacts-meta mb-0">
                              {contact.role}
                            </p>
                            <a
                              href={`mailto:${contact.email}`}
                              className="saved-contacts-email"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {contact.email}
                            </a>
                          </td>
                          <td>
                            {company ? (
                              <div className="saved-contacts-company-block">
                                <span
                                  className="saved-contacts-co-badge"
                                  title={company.name}
                                >
                                  {companyInitials(company.name)}
                                </span>
                                <div className="min-w-0">
                                  <p className="saved-contacts-co-name mb-0">
                                    {company.name}
                                  </p>
                                  <p className="saved-contacts-meta mb-0">
                                    {company.location}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="saved-contacts-meta">—</span>
                            )}
                          </td>
                          <td>
                            {row.leadCount > 0 ? (
                              <Link
                                href={`/active-leads?company=${contact.companyId}`}
                                className="badge saved-contacts-lead-badge"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {row.leadCount} lead
                                {row.leadCount !== 1 ? "s" : ""}
                                {row.activeLeadCount > 0
                                  ? ` · ${row.activeLeadCount} active`
                                  : ""}
                              </Link>
                            ) : (
                              <span className="saved-contacts-meta">—</span>
                            )}
                          </td>
                          <td className="saved-contacts-date">
                            {formatContactDate(contact.createdAt)}
                          </td>
                          <td className="text-end">
                            <div
                              className="saved-contacts-row-actions"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link
                                href={
                                  contact.email
                                    ? `/inbox?compose=${encodeURIComponent(contact.email)}`
                                    : "/inbox"
                                }
                                className="saved-contacts-icon-btn"
                                title="Email"
                                aria-label={`Email ${contact.name}`}
                              >
                                <i className="ri-mail-line"></i>
                              </Link>
                              <button
                                type="button"
                                className="saved-contacts-icon-btn"
                                title="Details"
                                aria-label={`View ${contact.name}`}
                                onClick={() => openRow(row)}
                              >
                                <i className="ri-arrow-right-s-line"></i>
                              </button>
                              <button
                                type="button"
                                className="saved-contacts-icon-btn saved-contacts-icon-btn--danger"
                                title="Delete"
                                aria-label={`Delete ${contact.name}`}
                                onClick={() => requestDelete(row)}
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="saved-contacts-footer">
                  <nav aria-label="Contacts pagination">
                    <ul className="ti-pagination mb-0">
                      <li>
                        <button
                          type="button"
                          className="page-link"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          aria-label="Previous"
                        >
                          ‹
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <li key={p}>
                            <button
                              type="button"
                              className={`page-link ${p === page ? "active" : ""}`}
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </button>
                          </li>
                        )
                      )}
                      <li>
                        <button
                          type="button"
                          className="page-link"
                          disabled={page >= totalPages}
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          aria-label="Next"
                        >
                          ›
                        </button>
                      </li>
                    </ul>
                  </nav>
                  <span className="saved-contacts-page-indicator">
                    Page {page} of {totalPages}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ContactDetailDrawer
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
        onDelete={(row) => requestDelete(row)}
        onSendEmail={(row) => setSendTarget(resolveSendEmailTarget(row))}
        onSelectLead={(lead) => {
          setSelectedRow(null);
          setSelectedLead(lead);
        }}
      />

      <ActiveLeadDetailDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onSendEmail={(l) => setSendTarget(sendEmailTargetFromLead(l))}
      />

      <SendEmailModal
        target={sendTarget}
        onClose={() => setSendTarget(null)}
      />

      <ConfirmDeleteOverlay
        open={pendingDelete != null}
        entityName={
          pendingDelete?.contact.name?.trim() ||
          pendingDelete?.contact.email ||
          "this contact"
        }
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </Fragment>
  );
}
