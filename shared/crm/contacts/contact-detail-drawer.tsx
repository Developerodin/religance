"use client";

import { companyInitials } from "@/shared/crm/active-leads/active-leads-utils";
import LeadStageBadge from "@/shared/crm/active-leads/lead-stage-badge";
import {
  formatContactDate,
  type EnrichedContact,
} from "@/shared/crm/contacts/contacts-utils";
import { InboxAvatar } from "@/shared/crm/inbox/inbox-avatar";
import type { CrmLead } from "@/shared/crm/store/types";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import SimpleBar from "simplebar-react";

type ContactDetailDrawerProps = {
  row: EnrichedContact | null;
  onClose: () => void;
  onDelete?: (row: EnrichedContact) => void;
  onSelectLead: (lead: CrmLead) => void;
  onSendEmail?: (row: EnrichedContact) => void;
};

function DrawerSection({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="saved-contacts-drawer-section">
      <div className="saved-contacts-drawer-section-head">
        <h6 className="saved-contacts-drawer-section-title">{title}</h6>
        {badge}
      </div>
      {children}
    </section>
  );
}

function DrawerField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="saved-contacts-drawer-field">
      <span className="saved-contacts-drawer-field-label">{label}</span>
      <div className="saved-contacts-drawer-field-value">{children}</div>
    </div>
  );
}

export function ContactDetailDrawer({
  row,
  onClose,
  onDelete,
  onSelectLead,
  onSendEmail,
}: ContactDetailDrawerProps) {
  const open = row !== null;

  useEffect(() => {
    if (open) {
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

  if (!row || typeof document === "undefined") return null;

  const { contact, company, leads } = row;

  return createPortal(
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
        aria-labelledby="saved-contact-drawer-title"
        className={`ti-offcanvas ti-offcanvas-right active-leads-drawer saved-contacts-drawer z-[150] ${
          open ? "open" : ""
        }`}
      >
        <header className="saved-contacts-drawer-hero">
          <button
            type="button"
            className="saved-contacts-drawer-close"
            onClick={onClose}
            aria-label="Close contact details"
          >
            <i className="ri-close-line"></i>
          </button>
          <div className="saved-contacts-drawer-identity">
            <InboxAvatar name={contact.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h3
                id="saved-contact-drawer-title"
                className="saved-contacts-drawer-name"
              >
                {contact.name}
              </h3>
              <p className="saved-contacts-drawer-role">{contact.role}</p>
              <p className="saved-contacts-drawer-meta">
                Saved {formatContactDate(contact.createdAt)}
              </p>
            </div>
          </div>
        </header>

        <div className="saved-contacts-drawer-actions">
          {onSendEmail ? (
            <button
              type="button"
              className="saved-contacts-drawer-action saved-contacts-drawer-action--primary"
              onClick={() => onSendEmail(row)}
            >
              <i className="ri-mail-send-line"></i>
              <span>Send email</span>
            </button>
          ) : (
            <a
              href={`mailto:${contact.email}`}
              className="saved-contacts-drawer-action saved-contacts-drawer-action--primary"
            >
              <i className="ri-mail-send-line"></i>
              <span>Send email</span>
            </a>
          )}
          <div className="saved-contacts-drawer-actions-secondary">
            {contact.phone ? (
              <a
                href={`tel:${contact.phone}`}
                className="saved-contacts-drawer-action"
              >
                <i className="ri-phone-line"></i>
                <span>Call</span>
              </a>
            ) : null}
            {row.leadCount > 0 ? (
              <Link
                href={`/active-leads?company=${contact.companyId}`}
                className="saved-contacts-drawer-action"
                onClick={onClose}
              >
                <i className="ri-focus-3-line"></i>
                <span>View leads</span>
              </Link>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                className="saved-contacts-drawer-action saved-contacts-drawer-action--danger"
                onClick={() => onDelete(row)}
              >
                <i className="ri-delete-bin-line"></i>
                <span>Delete contact</span>
              </button>
            ) : null}
          </div>
        </div>

        <SimpleBar className="active-leads-drawer-scroll flex-1 min-h-0">
          <div className="saved-contacts-drawer-body">
            <DrawerSection title="Contact">
              <div className="saved-contacts-drawer-fields">
                <DrawerField label="Email">
                  <a
                    href={`mailto:${contact.email}`}
                    className="saved-contacts-drawer-link"
                  >
                    {contact.email}
                  </a>
                </DrawerField>
                {contact.phone ? (
                  <DrawerField label="Phone">
                    <a
                      href={`tel:${contact.phone}`}
                      className="saved-contacts-drawer-link"
                    >
                      {contact.phone}
                    </a>
                  </DrawerField>
                ) : null}
                <DrawerField label="Role">
                  <span>{contact.role}</span>
                </DrawerField>
              </div>
            </DrawerSection>

            {company ? (
              <DrawerSection title="Company">
                <div className="saved-contacts-drawer-company-head">
                  <span className="saved-contacts-drawer-co-badge">
                    {companyInitials(company.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="saved-contacts-drawer-co-name">{company.name}</p>
                    <p className="saved-contacts-drawer-co-loc">{company.location}</p>
                  </div>
                </div>
                <div className="saved-contacts-drawer-fields">
                  <DrawerField label="Type">
                    <span>{company.companyType}</span>
                  </DrawerField>
                  <DrawerField label="Certification">
                    <span>{company.certification}</span>
                  </DrawerField>
                  {company.website ? (
                    <DrawerField label="Website">
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="saved-contacts-drawer-link"
                      >
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    </DrawerField>
                  ) : null}
                </div>
              </DrawerSection>
            ) : null}

            <DrawerSection
              title="Linked leads"
              badge={
                <span className="saved-contacts-drawer-count-badge">
                  {row.leadCount}
                </span>
              }
            >
              {leads.length === 0 ? (
                <p className="saved-contacts-drawer-empty-text">
                  No leads linked to this contact yet.
                </p>
              ) : (
                <ul className="saved-contacts-drawer-leads">
                  {leads.map((lead) => (
                    <li key={lead.id}>
                      <button
                        type="button"
                        className="saved-contacts-drawer-lead"
                        onClick={() => onSelectLead(lead)}
                      >
                        <div className="saved-contacts-drawer-lead-main">
                          <p className="saved-contacts-drawer-lead-title">
                            {lead.title}
                          </p>
                          <p className="saved-contacts-drawer-lead-sub">
                            {lead.matchedSalt} · {lead.matchedMedicine}
                          </p>
                          <div className="saved-contacts-drawer-lead-stage">
                            <LeadStageBadge stage={lead.stage} />
                          </div>
                        </div>
                        <i
                          className="ri-arrow-right-s-line saved-contacts-drawer-lead-arrow"
                          aria-hidden
                        ></i>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </DrawerSection>
          </div>
        </SimpleBar>
      </aside>
    </>,
    document.body
  );
}
