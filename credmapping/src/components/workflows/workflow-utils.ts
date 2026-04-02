import { incidentCategoryEnum } from "~/server/db/schema";

export type WorkflowSortMode =
  | "date_assigned_desc"
  | "date_assigned_asc"
  | "date_started_desc"
  | "date_started_asc";

export type IncidentCategory = (typeof incidentCategoryEnum.enumValues)[number];

export const INCIDENT_CATEGORIES = incidentCategoryEnum.enumValues;

export const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  pfc: "PFC",
  state_licenses: "State Licenses",
  prelive_pipeline: "Pre-Live Pipeline",
  provider_vesta_privileges: "Vesta Privileges",
};

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isCompletedStatus(status: string | null | undefined): boolean {
  const normalized = (status ?? "").toLowerCase();
  return (
    normalized.includes("complet") ||
    normalized === "done" ||
    normalized === "approved"
  );
}

export function toStartOfDay(value: string | Date): Date {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isOverdue(
  dueDate: string | Date | null | undefined,
  status: string | null | undefined,
): boolean {
  if (!dueDate || isCompletedStatus(status)) return false;

  const due = toStartOfDay(dueDate);
  if (Number.isNaN(due.getTime())) return false;

  return due < toStartOfDay(new Date());
}

type WorkflowPhaseLike = {
  phaseNumber?: number | null;
  createdAt?: string | Date | null;
  phaseName?: string | null;
};

export function compareWorkflowPhaseOrder(
  a: WorkflowPhaseLike,
  b: WorkflowPhaseLike,
): number {
  const aPhaseNumber = a.phaseNumber ?? null;
  const bPhaseNumber = b.phaseNumber ?? null;

  if (aPhaseNumber === null && bPhaseNumber !== null) return -1;
  if (aPhaseNumber !== null && bPhaseNumber === null) return 1;

  if (aPhaseNumber !== null && bPhaseNumber !== null && aPhaseNumber !== bPhaseNumber) {
    return aPhaseNumber - bPhaseNumber;
  }

  const aCreatedAt = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  const normalizedACreatedAt = Number.isNaN(aCreatedAt) ? 0 : aCreatedAt;
  const normalizedBCreatedAt = Number.isNaN(bCreatedAt) ? 0 : bCreatedAt;

  if (normalizedACreatedAt !== normalizedBCreatedAt) {
    return normalizedACreatedAt - normalizedBCreatedAt;
  }

  return (a.phaseName ?? "").localeCompare(b.phaseName ?? "");
}
