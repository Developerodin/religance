"use client";

import { useCrm } from "@/shared/crm/store/crm-context";
import LeadScoreBadge from "@/shared/crm/lead-discovery/lead-score-badge";
import LeadStageBadge from "@/shared/crm/active-leads/lead-stage-badge";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { Fragment } from "react";
import { leadDiscoverySourceHref } from "@/shared/crm/active-leads/lead-source-utils";

export default function VerificationQueuePage() {
  const { leads, verifyLead } = useCrm();
  const queue = leads.filter((l) => l.stage === "Saved");

  return (
    <Fragment>
      <Seo title="Verification Queue" />
      <div className="box custom-box">
        <div className="box-header">
          <h5 className="box-title mb-0 before:!hidden">
            Manual verification queue
          </h5>
          <span className="badge bg-warning/10 text-warning">
            {queue.length} pending
          </span>
        </div>
        <p className="text-[0.8125rem] text-textmuted px-4 pt-2 mb-0">
          Leads created from discovery start at <strong>Saved</strong>. Verify
          before outreach moves them to <strong>Verified</strong>.
        </p>
        <div className="table-responsive mt-3">
          <table className="table ti-custom-table mb-0 text-[0.8125rem]">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Company</th>
                <th>Salt / Medicine</th>
                <th>Stage</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-textmuted py-8">
                    Queue empty — all leads verified or none at Saved stage.
                  </td>
                </tr>
              ) : (
                queue.map((lead) => (
                  <tr key={lead.id}>
                    <td className="font-semibold max-w-[200px] truncate">
                      {lead.title}
                    </td>
                    <td>{lead.companyName}</td>
                    <td>
                      {lead.matchedSalt}
                      <span className="text-textmuted block text-[0.75rem]">
                        {lead.matchedMedicine}
                      </span>
                    </td>
                    <td>
                      <LeadStageBadge stage={lead.stage} compact />
                    </td>
                    <td>
                      <LeadScoreBadge score={lead.leadScore} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="ti-btn ti-btn-sm ti-btn-success"
                          onClick={() => verifyLead(lead.id)}
                        >
                          Verify
                        </button>
                        <Link
                          href={`/active-leads?lead=${lead.id}`}
                          className="ti-btn ti-btn-sm ti-btn-light"
                        >
                          Review
                        </Link>
                        <Link
                          href={leadDiscoverySourceHref(lead)}
                          className="ti-btn ti-btn-sm ti-btn-light"
                        >
                          Source
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Fragment>
  );
}
