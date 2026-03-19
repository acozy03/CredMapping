export type WorkflowSortMode =
  | "date_assigned_desc"
  | "date_assigned_asc"
  | "date_started_desc"
  | "date_started_asc";

export const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  pfc: "PFC",
  state_licenses: "State Licenses",
  prelive_pipeline: "Pre-Live Pipeline",
  provider_vesta_privileges: "Vesta Privileges",
};

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
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
