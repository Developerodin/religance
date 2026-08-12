"use client";

import type { CompanyProfileDetail } from "@/shared/crm/lead-discovery/company-profile-types";
import { useCrm } from "@/shared/crm/store/crm-context";
import type { SaveToContactOption } from "@/shared/crm/store/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

const OPTIONS: {
  id: SaveToContactOption;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "company_only",
    title: "Save company only",
    description: "Add to Company Master without a contact or lead.",
    icon: "ri-building-2-line",
  },
  {
    id: "company_and_contact",
    title: "Save company + contact",
    description: "Store the company and primary contact person.",
    icon: "ri-user-add-line",
  },
  {
    id: "create_lead",
    title: "Save and create active lead",
    description: "Creates contact records and a lead at Saved stage (verification queue).",
    icon: "ri-focus-3-line",
  },
  {
    id: "create_lead_and_email",
    title: "Save and start email outreach",
    description: "Creates lead, then opens compose on Active Leads.",
    icon: "ri-mail-send-line",
  },
];

type SaveToContactModalProps = {
  profile: CompanyProfileDetail | null;
  onClose: () => void;
};

export function SaveToContactModal({
  profile,
  onClose,
}: SaveToContactModalProps) {
  const router = useRouter();
  const { saveFromDiscovery, findCompanyByDiscoveryId } = useCrm();
  const [contactIndex, setContactIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (!profile) return null;

  const existing = findCompanyByDiscoveryId(profile.id);

  const handleSave = async (option: SaveToContactOption) => {
    setBusy(true);
    const result = saveFromDiscovery({ profile, option, contactIndex });
    setBusy(false);

    if (option === "company_only") {
      setDone("Company saved to CRM.");
      setTimeout(() => onClose(), 1200);
    } else if (option === "company_and_contact") {
      setDone("Company and contact saved.");
      setTimeout(() => onClose(), 1200);
    } else if (result.leadId) {
      setDone("Active lead created.");
      if (result.openCompose) {
        onClose();
        router.push(`/active-leads?compose=${result.leadId}`);
        return;
      }
      onClose();
      router.push(`/active-leads?lead=${result.leadId}`);
      return;
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[160]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-to-contact-title"
        className="fixed inset-0 z-[170] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="box custom-box !mb-0 w-full max-w-lg max-h-[90dvh] overflow-y-auto pointer-events-auto !shadow-lg">
          <div className="box-header border-b border-defaultborder dark:border-defaultborder/10">
            <h6 id="save-to-contact-title" className="box-title mb-0 before:!hidden">
              Save to Contact
            </h6>
            <button
              type="button"
              className="ti-btn ti-btn-sm ti-btn-icon ti-btn-light"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
          <div className="box-body">
            <p className="text-[0.8125rem] text-textmuted mb-3">
              <strong>{profile.companyName}</strong>
              {existing && (
                <span className="badge bg-warning/10 text-warning ms-2">
                  Already in CRM — will update
                </span>
              )}
            </p>

            {profile.contacts.length > 1 && (
              <div className="mb-3">
                <label className="form-label text-[0.75rem]">Primary contact</label>
                <select
                  className="form-select form-select-sm"
                  value={contactIndex}
                  onChange={(e) => setContactIndex(Number(e.target.value))}
                >
                  {profile.contacts.map((c, i) => (
                    <option key={i} value={i}>
                      {c.name} — {c.role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <ul className="list-none mb-0 space-y-2 p-0">
              {OPTIONS.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    disabled={busy}
                    className="w-full text-start border border-defaultborder dark:border-defaultborder/10 rounded-md p-3 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-60"
                    onClick={() => handleSave(opt.id)}
                  >
                    <div className="flex gap-3">
                      <span className="avatar avatar-sm bg-primary/10 text-primary shrink-0">
                        <i className={opt.icon}></i>
                      </span>
                      <div>
                        <div className="font-semibold text-[0.875rem]">
                          {opt.title}
                        </div>
                        <p className="text-[0.75rem] text-textmuted mb-0">
                          {opt.description}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {done && (
              <div className="alert alert-success text-[0.8125rem] mt-3 mb-0">
                {done}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
