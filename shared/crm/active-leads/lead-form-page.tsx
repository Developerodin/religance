"use client";

import { DuplicateLeadDialog } from "@/shared/crm/active-leads/duplicate-lead-dialog";
import { LeadFormSuccessOverlay } from "@/shared/crm/active-leads/lead-form-success-overlay";
import { SaltMedicineFields } from "@/shared/crm/active-leads/salt-medicine-fields";
import { FollowUpsSection } from "@/shared/crm/active-leads/lead-form-sections/follow-ups-section";
import { QuotationsSection } from "@/shared/crm/active-leads/lead-form-sections/quotations-section";
import { SamplesSection } from "@/shared/crm/active-leads/lead-form-sections/samples-section";
import type { SampleInput } from "@/shared/crm/samples/sample-form";
import type { QuotationInput } from "@/shared/crm/quotations/quotation-form";
import type { FollowUpInput } from "@/shared/crm/follow-ups/follow-up-form";
import { leadEditHref, type LeadFormSource } from "@/shared/crm/active-leads/active-leads-utils";
import {
  LEAD_PRIORITIES,
  LEAD_SEGMENTS,
  LEAD_SOURCES,
  MARKET_TIERS,
  QUAL_SCORE_MAX,
} from "@/shared/crm/active-leads/lead-form-constants";
import { LEAD_STAGES } from "@/shared/crm/active-leads/lead-stages";
import { useCrm } from "@/shared/crm/store/crm-context";
import {
  findCompanyByNormalizedName,
  findDuplicateLead,
  resolveEffectiveLeadTitle,
  resolveEffectiveSaltId,
  resolvePrefillSaltId,
  validateSaltMedicinePair,
} from "@/shared/crm/store/lead-form-utils";
import {
  fetchTeamAssignees,
  getUserDisplayName,
} from "@/shared/auth/auth-client";
import {
  FALLBACK_TEAM_ASSIGNEES,
  type CrmLead,
  type LeadStage,
} from "@/shared/crm/store/types";
import { followUpInDays } from "@/shared/crm/store/workflow";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";

type LeadFormPageProps = {
  mode: "create" | "edit";
};

type FieldErrors = Record<string, string>;

function LeadFormLoading() {
  return (
    <div className="text-center py-16 text-textmuted text-[0.875rem]">
      <span
        className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"
        role="status"
        aria-label="Loading"
      />
      <p className="mb-0">Loading lead…</p>
    </div>
  );
}

export default function LeadFormPage({ mode }: LeadFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId =
    mode === "edit" ? (searchParams.get("id") ?? "").trim() : "";

  const {
    leads,
    companies,
    salts,
    medicines,
    hydrated,
    crmSynced,
    masterDataSynced,
    createLeadWithCompany,
    updateLeadWithCompany,
    addSample,
    addQuotation,
    addFollowUp,
    getCompany,
    getContact,
  } = useCrm();

  // Samples recorded before the lead exists; flushed into the store on create.
  const [pendingSamples, setPendingSamples] = useState<SampleInput[]>([]);
  const [pendingQuotations, setPendingQuotations] = useState<QuotationInput[]>([]);
  const [pendingFollowUps, setPendingFollowUps] = useState<FollowUpInput[]>([]);

  const lead = useMemo(
    () => (mode === "edit" ? leads.find((l) => l.id === leadId) : undefined),
    [mode, leads, leadId]
  );

  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [certification, setCertification] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactDepartment, setContactDepartment] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [saltId, setSaltId] = useState("");
  const [medicineId, setMedicineId] = useState("");
  const [medicineIds, setMedicineIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<LeadStage>("Saved");
  const [assignedTo, setAssignedTo] = useState<string>(() => getUserDisplayName());
  const [marketTier, setMarketTier] = useState("");
  const [segment, setSegment] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [priority, setPriority] = useState("");
  const [qualScore, setQualScore] = useState(0);
  const [potentialQty, setPotentialQty] = useState("");
  const [estAnnualValue, setEstAnnualValue] = useState("");
  const [lastContactDate, setLastContactDate] = useState("");
  const [followUpDate, setFollowUpDate] = useState(followUpInDays(7));
  const [nextAction, setNextAction] = useState("");
  const [docsShared, setDocsShared] = useState("");
  const [lastDiscussionSummary, setLastDiscussionSummary] = useState("");
  const [notes, setNotes] = useState("");

  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saltMedicineError, setSaltMedicineError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydratedForm, setHydratedForm] = useState(mode === "create");
  const [duplicateLead, setDuplicateLead] = useState<CrmLead | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);
  const [saveSuccessLeadId, setSaveSuccessLeadId] = useState<string | null>(
    null
  );
  const [submitHint, setSubmitHint] = useState<string | null>(null);
  const [teamAssignees, setTeamAssignees] = useState<string[]>([]);

  const syncPrimaryMedicine = (id: string) => {
    setMedicineId(id);
    if (!id) return;
    setMedicineIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const toggleMedicineInterest = (id: string) => {
    setMedicineIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const formatDisplayDate = (iso: string | undefined) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formSource: LeadFormSource =
    searchParams.get("from") === "discovery" ? "discovery" : "active-leads";

  const returnSaltId = searchParams.get("saltId") ?? undefined;
  const returnMedicineId = searchParams.get("medicineId") ?? undefined;

  const selectedMedicine = useMemo(
    () => medicines.find((m) => m.id === medicineId),
    [medicines, medicineId]
  );
  const selectedSalt = useMemo(
    () => salts.find((s) => s.id === saltId),
    [salts, saltId]
  );

  const assigneeOptions = useMemo(() => {
    const base =
      teamAssignees.length > 0 ? teamAssignees : [...FALLBACK_TEAM_ASSIGNEES];
    const names = new Set<string>([...base, getUserDisplayName(), assignedTo]);
    return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [teamAssignees, assignedTo]);

  useEffect(() => {
    let cancelled = false;
    void fetchTeamAssignees().then((names) => {
      if (!cancelled) setTeamAssignees(names);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const markDirty = () => {
    if (!dirty) setDirty(true);
    setSubmitHint(null);
  };

  const clearFieldError = (key: string) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (key === "saltMedicine") setSaltMedicineError(null);
  };

  const readyToSave = hydrated && masterDataSynced && crmSynced;

  useEffect(() => {
    if (mode !== "create" || hydratedForm) return;
    const medId = searchParams.get("medicineId") ?? "";
    const saltParam = searchParams.get("saltId");
    const med = medicines.find((m) => m.id === medId);
    setMedicineId(medId);
    if (medId) setMedicineIds([medId]);
    setSaltId(resolvePrefillSaltId(saltParam, med));

    const cn = searchParams.get("companyName");
    if (cn) setCompanyName(cn);
    const ctype = searchParams.get("companyType");
    if (ctype) setCompanyType(ctype);
    const loc = searchParams.get("location");
    if (loc) setLocation(loc);
    const countryParam = searchParams.get("country");
    if (countryParam) setCountry(countryParam);

    const cName = searchParams.get("contactName");
    if (cName) setContactName(cName);
    const cRole = searchParams.get("contactRole");
    if (cRole) setContactRole(cRole);
    const cEmail = searchParams.get("contactEmail");
    if (cEmail) setContactEmail(cEmail);
    const cPhone = searchParams.get("contactPhone");
    if (cPhone) setContactPhone(cPhone);

    setHydratedForm(true);
  }, [mode, searchParams, medicines, hydratedForm]);

  useEffect(() => {
    if (mode !== "edit" || !lead || hydratedForm) return;
    const company = getCompany(lead.companyId);
    const contact = lead.contactId ? getContact(lead.contactId) : undefined;

    setCompanyName(company?.name ?? lead.companyName);
    setCompanyType(company?.companyType ?? "");
    setCity(company?.city ?? "");
    setCountry(company?.country ?? "");
    setGstin(company?.gstin ?? "");
    setPan(company?.pan ?? "");
    setLocation(company?.location ?? lead.location);
    setWebsite(company?.website ?? "");
    setCertification(company?.certification ?? "");

    setContactName(contact?.name ?? lead.contactName);
    const roleParts = (contact?.role ?? lead.contactRole).split(" · ");
    setContactRole(roleParts[0] ?? "");
    setContactDepartment(roleParts[1] ?? "");
    setContactEmail(contact?.email ?? lead.contactEmail);
    setContactPhone(contact?.phone ?? "");

    setSaltId(lead.saltId ?? "");
    setMedicineId(lead.medicineId ?? "");
    setMedicineIds(
      lead.medicineIds?.length
        ? lead.medicineIds
        : lead.medicineId
          ? [lead.medicineId]
          : []
    );
    setTitle(lead.title);
    setStage(lead.stage);
    setAssignedTo(lead.assignedTo);
    setMarketTier(lead.marketTier ?? "");
    setSegment(lead.segment ?? "");
    setLeadSource(lead.leadSource ?? "");
    setPriority(lead.priority ?? "");
    setQualScore(lead.qualScore ?? 0);
    setPotentialQty(lead.potentialQty ?? "");
    setEstAnnualValue(lead.estAnnualValue ?? "");
    setLastContactDate(lead.lastContactDate ?? "");
    setFollowUpDate(lead.followUpDate);
    setNextAction(lead.nextAction ?? "");
    setDocsShared(lead.docsShared ?? "");
    setLastDiscussionSummary(lead.lastDiscussionSummary ?? "");
    setNotes(lead.notes);
    setTitleTouched(true);
    setHydratedForm(true);
    setDirty(false);
  }, [mode, lead, getCompany, getContact, hydratedForm]);

  useEffect(() => {
    if (titleTouched || !companyName.trim() || !selectedMedicine) return;
    const autoTitle = `${selectedMedicine.name} — ${companyName.trim()}`;
    setTitle(autoTitle);
    clearFieldError("title");
  }, [companyName, selectedMedicine, titleTouched]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const fillFromExistingCompany = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    if (!company) return;
    setCompanyName(company.name);
    setCompanyType(company.companyType);
    setCity(company.city ?? "");
    setCountry(company.country ?? "");
    setGstin(company.gstin ?? "");
    setPan(company.pan ?? "");
    setLocation(company.location);
    setWebsite(company.website);
    setCertification(company.certification);
    markDirty();
  };

  const scrollToField = (fieldId: string) => {
    document.getElementById(fieldId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const validate = (): boolean => {
    const effectiveSaltId = resolveEffectiveSaltId(saltId, medicineId, medicines);
    const effectiveTitle = resolveEffectiveLeadTitle(
      title,
      titleTouched,
      companyName,
      selectedMedicine
    );

    const next: FieldErrors = {};
    if (!companyName.trim()) next.companyName = "Company name is required.";
    if (!effectiveTitle) next.title = "Lead title is required.";
    if (contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      next.contactEmail = "Enter a valid email address.";
    }
    const pairErr = validateSaltMedicinePair(
      effectiveSaltId,
      medicineId,
      salts,
      medicines
    );
    setSaltMedicineError(pairErr);
    if (pairErr) next.saltMedicine = pairErr;
    setErrors(next);
    const valid = Object.keys(next).length === 0;
    if (!valid) {
      const firstKey = Object.keys(next)[0];
      const fieldId =
        firstKey === "companyName"
          ? "company-name"
          : firstKey === "title"
            ? "lead-title"
            : firstKey === "saltMedicine"
              ? "lead-medicine"
              : firstKey === "contactEmail"
                ? "contact-email"
                : undefined;
      if (fieldId) scrollToField(fieldId);
      setSubmitHint(
        next.saltMedicine ??
          next.companyName ??
          next.title ??
          next.contactEmail ??
          "Fix the highlighted fields above."
      );
    } else {
      setSubmitHint(null);
    }
    return valid;
  };

  const buildInput = () => {
    const effectiveSaltId = resolveEffectiveSaltId(saltId, medicineId, medicines);
    const effectiveTitle = resolveEffectiveLeadTitle(
      title,
      titleTouched,
      companyName,
      selectedMedicine
    );
    const effectiveSalt =
      salts.find((s) => s.id === effectiveSaltId) ?? selectedSalt;
    const interestIds =
      medicineIds.length > 0
        ? medicineIds
        : medicineId
          ? [medicineId]
          : [];

    return {
    company: {
      name: companyName.trim(),
      companyType: companyType.trim(),
      city: city.trim(),
      country: country.trim(),
      gstin: gstin.trim(),
      pan: pan.trim(),
      location: location.trim(),
      website: website.trim(),
      certification: certification.trim(),
    },
    contact:
      contactName.trim() || contactEmail.trim()
        ? {
            name: contactName.trim(),
            role: [contactRole.trim(), contactDepartment.trim()]
              .filter(Boolean)
              .join(" · "),
            email: contactEmail.trim(),
            phone: contactPhone.trim() || undefined,
          }
        : null,
    lead: {
      saltId: effectiveSaltId,
      medicineId,
      medicineIds: interestIds,
      matchedSalt: effectiveSalt?.name ?? selectedSalt?.name ?? "",
      matchedMedicine: selectedMedicine?.name ?? "",
      dosageForm: selectedMedicine?.dosageForm ?? "API",
      title: effectiveTitle,
      stage,
      assignedTo,
      marketTier: marketTier.trim(),
      segment: segment.trim(),
      leadSource: leadSource.trim(),
      priority: priority.trim(),
      qualScore: Math.min(QUAL_SCORE_MAX, Math.max(0, qualScore)),
      potentialQty: potentialQty.trim(),
      estAnnualValue: estAnnualValue.trim(),
      lastContactDate: lastContactDate.trim(),
      followUpDate,
      nextAction: nextAction.trim(),
      docsShared: docsShared.trim(),
      lastDiscussionSummary: lastDiscussionSummary.trim(),
      notes: notes.trim(),
      location: location.trim(),
    },
  };
  };

  const resolveCompanyId = () => {
    if (mode === "edit" && lead) return lead.companyId;
    const existing = findCompanyByNormalizedName(companies, companyName.trim());
    return existing?.id ?? "";
  };

  const checkDuplicate = (excludeLeadId?: string) => {
    const companyId = resolveCompanyId();
    if (!companyId && mode === "create") {
      const existing = findCompanyByNormalizedName(companies, companyName.trim());
      if (!existing) return undefined;
      return findDuplicateLead(
        leads,
        existing.id,
        medicineId,
        selectedMedicine?.name ?? "",
        excludeLeadId
      );
    }
    if (!companyId) return undefined;
    return findDuplicateLead(
      leads,
      companyId,
      medicineId,
      selectedMedicine?.name ?? "",
      excludeLeadId
    );
  };

  const performSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSubmitHint(null);
    try {
      const input = buildInput();
      if (mode === "create") {
        const result = createLeadWithCompany(input);
        // Flush buffered samples now that the lead (and its company/owner) exists.
        pendingSamples.forEach((s) => addSample(result.leadId, s));
        setPendingSamples([]);
        pendingQuotations.forEach((q) => addQuotation(result.leadId, q));
        setPendingQuotations([]);
        pendingFollowUps.forEach((f) => addFollowUp(result.leadId, f));
        setPendingFollowUps([]);
        setDirty(false);
        setSaveSuccessLeadId(result.leadId);
      } else if (lead) {
        updateLeadWithCompany(lead.id, input);
        setDirty(false);
        setSaveSuccessLeadId(lead.id);
      }
    } catch {
      setSaveError("Could not save lead. Check your connection and try again.");
    } finally {
      setSaving(false);
      setDuplicateLead(null);
    }
  };

  const handleSubmit = () => {
    if (!readyToSave) {
      setSubmitHint("Still syncing your CRM data — try again in a moment.");
      return;
    }
    if (catalogueEmpty) {
      setSubmitHint(
        "Add salts and medicines in Settings before creating a lead."
      );
      return;
    }
    if (!validate()) return;
    if (mode === "edit" && !dirty) return;

    const effectiveSaltId = resolveEffectiveSaltId(saltId, medicineId, medicines);
    const effectiveTitle = resolveEffectiveLeadTitle(
      title,
      titleTouched,
      companyName,
      selectedMedicine
    );
    if (effectiveSaltId !== saltId) setSaltId(effectiveSaltId);
    if (effectiveTitle && effectiveTitle !== title) setTitle(effectiveTitle);

    const dup = checkDuplicate(mode === "edit" ? lead?.id : undefined);
    if (dup) {
      setDuplicateLead(dup);
      return;
    }
    void performSave();
  };

  if (mode === "edit" && !hydrated) {
    return (
      <Fragment>
        <Seo title="Edit lead" />
        <LeadFormLoading />
      </Fragment>
    );
  }

  if (mode === "edit" && hydrated && !lead) {
    return (
      <Fragment>
        <Seo title="Lead not found" />
        <div className="w-full py-8">
          <div className="alert alert-warning text-[0.8125rem] mb-3" role="alert">
            This lead could not be found. It may have been deleted or is still
            syncing.
          </div>
          <Link href="/active-leads" className="ti-btn ti-btn-primary">
            Back to Active Leads
          </Link>
        </div>
      </Fragment>
    );
  }

  if (!hydratedForm) {
    return (
      <Fragment>
        <Seo title={mode === "create" ? "New lead" : "Edit lead"} />
        <LeadFormLoading />
      </Fragment>
    );
  }

  const pageTitle = mode === "create" ? "New lead" : "Edit lead";
  const catalogueEmpty = medicines.length === 0 || salts.length === 0;

  return (
    <Fragment>
      <Seo title={pageTitle} />
      <div className="lead-form-page flex flex-col min-h-0">
        <Pageheader
          currentpage={pageTitle}
          activepage="Active Leads"
          mainpage={pageTitle}
        />

        <div className="lead-form-page__body flex-1 min-h-0 overflow-y-auto pb-24">
          {saveError && (
            <div className="alert alert-danger text-[0.8125rem] mb-3" role="alert">
              {saveError}
            </div>
          )}

          {catalogueEmpty && (
            <div className="alert alert-warning text-[0.8125rem] mb-3" role="alert">
              Salts and medicines catalogue is empty. Add catalogue items in Settings
              before creating a lead.
            </div>
          )}

          {!readyToSave && (
            <div className="alert alert-info text-[0.8125rem] mb-3" role="status">
              Loading CRM data… save will be available in a moment.
            </div>
          )}

          <div className="w-full min-w-0">
            <div className="box custom-box mb-4">
              <div className="box-header border-b border-defaultborder dark:border-defaultborder/10">
                <h6 className="box-title mb-0 before:!hidden">Lead details</h6>
              </div>
              <div className="box-body space-y-4">
                {mode === "edit" && lead && (
                  <div className="lead-form-subgroup">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-12 md:col-span-4">
                        <label className="form-label text-[0.75rem]">Lead ID</label>
                        <input
                          className="form-control bg-light dark:bg-black/20"
                          value={lead.id}
                          readOnly
                          aria-readonly
                        />
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <label className="form-label text-[0.75rem]">Date added</label>
                        <input
                          className="form-control bg-light dark:bg-black/20"
                          value={formatDisplayDate(lead.createdAt)}
                          readOnly
                          aria-readonly
                        />
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <label className="form-label text-[0.75rem]">Owner</label>
                        <select
                          className="form-select"
                          value={assignedTo}
                          onChange={(e) => {
                            setAssignedTo(e.target.value);
                            markDirty();
                          }}
                        >
                          {assigneeOptions.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="lead-form-subgroup">
                  <h6 className="text-[0.75rem] font-semibold text-textmuted uppercase tracking-wide mb-3">
                    Company &amp; contact
                  </h6>
                  <div className="grid grid-cols-12 gap-3">
                    {companies.length > 0 && mode === "create" && (
                      <div className="col-span-12">
                        <label className="form-label text-[0.75rem]">
                          Fill from existing
                        </label>
                        <select
                          className="form-select"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) fillFromExistingCompany(e.target.value);
                          }}
                        >
                          <option value="">Select company…</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]" htmlFor="company-name">
                        Company name *
                      </label>
                      <input
                        id="company-name"
                        className="form-control"
                        value={companyName}
                        aria-invalid={Boolean(errors.companyName)}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          clearFieldError("companyName");
                          markDirty();
                        }}
                      />
                      {errors.companyName && (
                        <p className="text-[0.75rem] text-danger mt-1 mb-0">
                          {errors.companyName}
                        </p>
                      )}
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">Contact person</label>
                      <input
                        className="form-control"
                        value={contactName}
                        onChange={(e) => {
                          setContactName(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">Designation</label>
                      <input
                        className="form-control"
                        value={contactRole}
                        onChange={(e) => {
                          setContactRole(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">Phone / WhatsApp</label>
                      <input
                        className="form-control"
                        value={contactPhone}
                        onChange={(e) => {
                          setContactPhone(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">Email</label>
                      <input
                        id="contact-email"
                        type="email"
                        className="form-control"
                        value={contactEmail}
                        aria-invalid={Boolean(errors.contactEmail)}
                        onChange={(e) => {
                          setContactEmail(e.target.value);
                          clearFieldError("contactEmail");
                          markDirty();
                        }}
                      />
                      {errors.contactEmail && (
                        <p className="text-[0.75rem] text-danger mt-1 mb-0">
                          {errors.contactEmail}
                        </p>
                      )}
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">City</label>
                      <input
                        className="form-control"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">Country</label>
                      <input
                        className="form-control"
                        value={country}
                        onChange={(e) => {
                          setCountry(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                    {mode === "create" && (
                      <div className="col-span-12 md:col-span-4">
                        <label className="form-label text-[0.75rem]">Owner</label>
                        <select
                          className="form-select"
                          value={assignedTo}
                          onChange={(e) => {
                            setAssignedTo(e.target.value);
                            markDirty();
                          }}
                        >
                          {assigneeOptions.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="col-span-12 md:col-span-4 hidden">
                      <label className="form-label text-[0.75rem]">Department</label>
                      <input
                        className="form-control"
                        value={contactDepartment}
                        onChange={(e) => {
                          setContactDepartment(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="lead-form-subgroup">
                  <h6 className="text-[0.75rem] font-semibold text-textmuted uppercase tracking-wide mb-3">
                    Tax
                  </h6>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">GSTIN</label>
                      <input
                        className="form-control"
                        value={gstin}
                        onChange={(e) => {
                          setGstin(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">PAN</label>
                      <input
                        className="form-control"
                        value={pan}
                        onChange={(e) => {
                          setPan(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="lead-form-subgroup">
                  <h6 className="text-[0.75rem] font-semibold text-textmuted uppercase tracking-wide mb-3">
                    Classification
                  </h6>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">Market tier</label>
                      <select
                        className="form-select"
                        value={marketTier}
                        onChange={(e) => {
                          setMarketTier(e.target.value);
                          markDirty();
                        }}
                      >
                        {MARKET_TIERS.map((t) => (
                          <option key={t || "empty"} value={t}>
                            {t || "—"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">Segment</label>
                      <select
                        className="form-select"
                        value={segment}
                        onChange={(e) => {
                          setSegment(e.target.value);
                          markDirty();
                        }}
                      >
                        {LEAD_SEGMENTS.map((s) => (
                          <option key={s || "empty"} value={s}>
                            {s || "—"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">Lead source</label>
                      <select
                        className="form-select"
                        value={leadSource}
                        onChange={(e) => {
                          setLeadSource(e.target.value);
                          markDirty();
                        }}
                      >
                        {LEAD_SOURCES.map((s) => (
                          <option key={s || "empty"} value={s}>
                            {s || "—"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="lead-form-subgroup">
                  <h6 className="text-[0.75rem] font-semibold text-textmuted uppercase tracking-wide mb-3">
                    Products
                  </h6>
                  <SaltMedicineFields
                    saltId={saltId}
                    medicineId={medicineId}
                    error={saltMedicineError ?? errors.saltMedicine}
                    disabled={catalogueEmpty}
                    onSaltChange={(id) => {
                      setSaltId(id);
                      clearFieldError("saltMedicine");
                      markDirty();
                    }}
                    onMedicineChange={(id) => {
                      syncPrimaryMedicine(id);
                      clearFieldError("saltMedicine");
                      markDirty();
                    }}
                  />
                  <div className="mt-3">
                    <label className="form-label text-[0.75rem] mb-2">
                      Product(s) of interest
                    </label>
                    {catalogueEmpty ? (
                      <p className="text-[0.75rem] text-textmuted mb-0">
                        Add medicines in Settings to select products.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {medicines.map((m) => {
                          const checked = medicineIds.includes(m.id);
                          return (
                            <label
                              key={m.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[0.8125rem] cursor-pointer transition-colors ${
                                checked
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-defaultborder dark:border-defaultborder/20 text-defaulttextcolor hover:border-primary/40"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={() => {
                                  toggleMedicineInterest(m.id);
                                  markDirty();
                                }}
                              />
                              {m.name}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lead-form-subgroup">
                  <h6 className="text-[0.75rem] font-semibold text-textmuted uppercase tracking-wide mb-3">
                    Pipeline &amp; metrics
                  </h6>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12">
                      <label className="form-label text-[0.75rem]">Lead title *</label>
                      <input
                        id="lead-title"
                        className="form-control"
                        value={title}
                        aria-invalid={Boolean(errors.title)}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          setTitleTouched(true);
                          clearFieldError("title");
                          markDirty();
                        }}
                      />
                      {errors.title && (
                        <p className="text-[0.75rem] text-danger mt-1 mb-0">
                          {errors.title}
                        </p>
                      )}
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">Pipeline stage</label>
                      <select
                        className="form-select"
                        value={stage}
                        onChange={(e) => {
                          setStage(e.target.value as LeadStage);
                          markDirty();
                        }}
                      >
                        {LEAD_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">Priority</label>
                      <select
                        className="form-select"
                        value={priority}
                        onChange={(e) => {
                          setPriority(e.target.value);
                          markDirty();
                        }}
                      >
                        {LEAD_PRIORITIES.map((p) => (
                          <option key={p || "empty"} value={p}>
                            {p || "—"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]" htmlFor="qual-score">
                        Qual. score (0–{QUAL_SCORE_MAX})
                      </label>
                      <input
                        id="qual-score"
                        type="number"
                        min={0}
                        max={QUAL_SCORE_MAX}
                        className="form-control"
                        value={qualScore}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          const next = Number.isFinite(raw)
                            ? Math.min(QUAL_SCORE_MAX, Math.max(0, raw))
                            : 0;
                          setQualScore(next);
                          markDirty();
                        }}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">Potential qty (kg/yr)</label>
                      <input
                        className="form-control"
                        placeholder="e.g. 500"
                        value={potentialQty}
                        onChange={(e) => {
                          setPotentialQty(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">
                        Est. annual value (INR Lakh)
                      </label>
                      <input
                        className="form-control"
                        placeholder="e.g. 12.5"
                        value={estAnnualValue}
                        onChange={(e) => {
                          setEstAnnualValue(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">Last contact date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={lastContactDate}
                        onChange={(e) => {
                          setLastContactDate(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[0.75rem]">Next follow-up date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={followUpDate}
                        onChange={(e) => {
                          setFollowUpDate(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-8">
                      <label className="form-label text-[0.75rem]">Next action planned</label>
                      <input
                        className="form-control"
                        value={nextAction}
                        onChange={(e) => {
                          setNextAction(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="lead-form-subgroup">
                  <h6 className="text-[0.75rem] font-semibold text-textmuted uppercase tracking-wide mb-3">
                    Notes
                  </h6>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12">
                      <label className="form-label text-[0.75rem]">
                        Docs / info shared so far
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={docsShared}
                        onChange={(e) => {
                          setDocsShared(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                    <div className="col-span-12">
                      <label className="form-label text-[0.75rem]">Last discussion summary</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={lastDiscussionSummary}
                        onChange={(e) => {
                          setLastDiscussionSummary(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                    <div className="col-span-12">
                      <label className="form-label text-[0.75rem]">Remarks</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={notes}
                        onChange={(e) => {
                          setNotes(e.target.value);
                          markDirty();
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <FollowUpsSection
              leadId={mode === "edit" ? leadId : ""}
              pendingFollowUps={pendingFollowUps}
              setPendingFollowUps={setPendingFollowUps}
            />
            <SamplesSection
              leadId={mode === "edit" ? leadId : ""}
              pendingSamples={pendingSamples}
              setPendingSamples={setPendingSamples}
              defaultProductId={mode === "edit" ? lead?.medicineId : medicineId}
            />
            <QuotationsSection
              leadId={mode === "edit" ? leadId : ""}
              pendingQuotations={pendingQuotations}
              setPendingQuotations={setPendingQuotations}
              defaultProductId={mode === "edit" ? lead?.medicineId : medicineId}
            />
          </div>
        </div>

        <div className="lead-form-page__footer sticky bottom-0 z-20 border-t border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg px-4 py-3 flex flex-col sm:flex-row gap-2 sm:justify-end sm:items-center">
          {submitHint && (
            <p
              className="text-[0.75rem] text-danger mb-0 sm:me-auto order-first sm:order-none w-full sm:w-auto"
              role="alert"
            >
              {submitHint}
            </p>
          )}
          <Link
            href="/active-leads"
            className="ti-btn ti-btn-light !min-h-[2.75rem] order-2 sm:order-1"
          >
            Cancel
          </Link>
          <button
            type="button"
            className="ti-btn ti-btn-primary !min-h-[2.75rem] order-1 sm:order-2"
            disabled={
              saving ||
              !readyToSave ||
              catalogueEmpty ||
              (mode === "edit" && !dirty)
            }
            aria-busy={saving}
            title={
              !readyToSave
                ? "CRM data is still loading"
                : mode === "edit" && !dirty
                  ? "No changes to save"
                  : undefined
            }
            onClick={handleSubmit}
          >
            {saving ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin me-1" />
                Saving…
              </>
            ) : mode === "create" ? (
              "Create lead"
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </div>

      <DuplicateLeadDialog
        open={duplicateLead !== null}
        existingLead={duplicateLead}
        companyName={companyName.trim()}
        matchedMedicine={selectedMedicine?.name ?? ""}
        onEditExisting={() => {
          if (duplicateLead) {
            router.push(
              leadEditHref(duplicateLead.id, {
                from: formSource,
                saltId: returnSaltId,
                medicineId: returnMedicineId,
              })
            );
          }
          setDuplicateLead(null);
        }}
        onCreateDuplicate={() => void performSave()}
        onCancel={() => setDuplicateLead(null)}
      />

      {saveSuccessLeadId && (
        <LeadFormSuccessOverlay
          open
          mode={mode}
          leadId={saveSuccessLeadId}
          companyName={companyName.trim()}
          medicineName={selectedMedicine?.name}
          source={formSource}
          saltId={returnSaltId ?? (saltId || undefined)}
          medicineId={returnMedicineId ?? (medicineId || undefined)}
          onDismiss={() => setSaveSuccessLeadId(null)}
        />
      )}
    </Fragment>
  );
}
