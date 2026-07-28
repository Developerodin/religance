import { getUserDisplayName } from "@/shared/auth/auth-client";
import type { CrmFollowUp } from "@/shared/crm/store/types";

export const FOLLOW_UP_MODES = [
  "",
  "Call",
  "Email",
  "WhatsApp",
  "Meeting",
  "Site visit",
  "Other",
] as const;

export const FOLLOW_UP_OUTCOMES = [
  "",
  "Positive",
  "Neutral",
  "No response",
  "Follow-up needed",
  "Closed",
] as const;

export type FollowUpFormModel = {
  entryDate: string;
  mode: string;
  outcome: string;
  summary: string;
  infoShared: string;
  nextStep: string;
  nextFollowUp: string;
};

export type FollowUpInput = Omit<
  CrmFollowUp,
  "id" | "leadId" | "contactedBy" | "createdAt"
>;

export function emptyFollowUpForm(): FollowUpFormModel {
  return {
    entryDate: "",
    mode: "",
    outcome: "",
    summary: "",
    infoShared: "",
    nextStep: "",
    nextFollowUp: "",
  };
}

export function buildFollowUpInput(form: FollowUpFormModel): FollowUpInput {
  const entryDate =
    form.entryDate.trim() ||
    new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
  return {
    entryDate,
    mode: form.mode.trim(),
    outcome: form.outcome.trim(),
    summary: form.summary.trim(),
    infoShared: form.infoShared.trim(),
    nextStep: form.nextStep.trim(),
    nextFollowUp: form.nextFollowUp.trim(),
  };
}

export function followUpToForm(row: CrmFollowUp): FollowUpFormModel {
  return {
    entryDate: row.entryDate,
    mode: row.mode,
    outcome: row.outcome,
    summary: row.summary,
    infoShared: row.infoShared,
    nextStep: row.nextStep,
    nextFollowUp: row.nextFollowUp,
  };
}

export function inputToFollowUpForm(input: FollowUpInput): FollowUpFormModel {
  return {
    entryDate: input.entryDate,
    mode: input.mode,
    outcome: input.outcome,
    summary: input.summary,
    infoShared: input.infoShared,
    nextStep: input.nextStep,
    nextFollowUp: input.nextFollowUp,
  };
}

export function formatFollowUpContactedBy(): string {
  return getUserDisplayName() || "—";
}
