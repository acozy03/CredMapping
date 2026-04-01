"use client";

import * as React from "react";
import {
  Activity,
  Mail,
  MapPin,
  Phone,
  Rocket,
  Stethoscope,
  User,
} from "lucide-react";
import {
  EditFacilityDialog,
  DeleteFacilityDialog,
} from "~/components/facilities/facility-actions";
import { Badge } from "~/components/ui/badge";
import { CollapsibleSection } from "~/components/ui/collapsible-section";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import {
  WorkflowDetailDrawer,
  type WorkflowRow,
  type IncidentRow,
} from "~/components/workflows/workflow-detail-drawer";
import { ActivityTimeline } from "~/components/audit-log/ActivityTimeline";

/* ─── types ─── */

export interface ContactRow {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean | null;
}

export interface PreliveRow {
  id: string;
  priority: string | null;
  goLiveDate: Date | string | null;
  credentialingDueDate: Date | string | null;
  boardMeetingDate: Date | string | null;
  tempsPossible: boolean | null;
  payorEnrollmentRequired: boolean | null;
  rolesNeeded: unknown;
  updatedAt: Date | string | null;
}

export interface CredentialRow {
  id: string;
  applicationRequired: boolean | null;
  decision: string | null;
  facilityType: string | null;
  formSize: string | null;
  notes: string | null;
  privileges: string | null;
  priority: string | null;
  providerDegree: string | null;
  providerFirstName: string | null;
  providerId: string | null;
  providerLastName: string | null;
  providerMiddleName: string | null;
  updatedAt: Date | string | null;
}

export interface NormalizedWorkflow {
  id: string;
  relatedId: string;
  workflowType: string;
  phaseName: string;
  status: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  updatedAt: string;
  agentName: string | null;
}

export interface FacilityData {
  id: string;
  name: string | null;
  state: string | null;
  proxy: string | null;
  status: "Active" | "Inactive" | "In Progress" | null;
  yearlyVolume: number | null;
  modalities: string[] | null;
  tatSla: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  email: string | null;
  address: string | null;
}

interface FacilityProfileClientProps {
  facility: FacilityData;
  facilityId: string;
  contactRows: ContactRow[];
  preliveRows: PreliveRow[];
  credentialRows: CredentialRow[];
  workflows: NormalizedWorkflow[];
  incidents: IncidentRow[];
}

/* ─── helpers ─── */

const formatDate = (value: Date | string | null) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const sanitizePhoneForHref = (value: string) => value.replace(/[^\d+]/g, "");

const getDueDateTone = (value: Date | string | null) => {
  if (!value) return "text-muted-foreground";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "text-muted-foreground";
  const days = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "text-red-600 dark:text-red-400";
  if (days <= 30) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
};

const formatProviderName = (provider: {
  degree: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
}) => {
  const fullName = [provider.firstName, provider.middleName, provider.lastName]
    .filter(Boolean)
    .join(" ");
  if (!fullName) return "Unnamed Provider";
  return provider.degree ? `${fullName}, ${provider.degree}` : fullName;
};

const parseRoles = (value: unknown): string[] => {
  if (Array.isArray(value))
    return value.filter((entry): entry is string => typeof entry === "string");
  if (typeof value === "string")
    return value.split(",").map((e) => e.trim()).filter(Boolean);
  return [];
};

const getDecisionTone = (decision: string | null) => {
  const d = decision?.toLowerCase() ?? "";
  if (d.includes("approved") || d.includes("active"))
    return "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return "border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-300";
};

const hasActiveWorkflows = (relatedId: string, workflows: NormalizedWorkflow[]) => {
  const related = workflows.filter((w) => w.relatedId === relatedId);
  if (related.length === 0) return false;
  return related.some((w) => {
    if (!w.dueDate) return true;
    return new Date(w.dueDate).getTime() >= Date.now();
  });
};

const getStatusTone = (status: string | null) => {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized === "inactive") {
    return "border-zinc-500/60 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300";
  }
  if (normalized === "in progress") {
    return "border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
  return "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
};

/* ─── component ─── */

export function FacilityProfileClient({
  facility,
  facilityId,
  contactRows,
  preliveRows,
  credentialRows,
  workflows,
  incidents,
}: FacilityProfileClientProps) {
  const [showOnlyActive, setShowOnlyActive] = React.useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerTitle, setDrawerTitle] = React.useState("");
  const [drawerDescription, setDrawerDescription] = React.useState<string | undefined>();
  const [drawerDetails, setDrawerDetails] = React.useState<{ label: string; value: React.ReactNode }[]>([]);
  const [drawerWorkflows, setDrawerWorkflows] = React.useState<WorkflowRow[]>([]);
  const [drawerIncidents, setDrawerIncidents] = React.useState<IncidentRow[]>([]);

  const openDrawer = (
    title: string,
    description: string | undefined,
    details: { label: string; value: React.ReactNode }[],
    relatedWorkflows: WorkflowRow[],
  ) => {
    setDrawerTitle(title);
    setDrawerDescription(description);
    setDrawerDetails(details);
    setDrawerWorkflows(relatedWorkflows);
    const wfIds = new Set(relatedWorkflows.map((w) => w.id));
    setDrawerIncidents(incidents.filter((inc) => wfIds.has(inc.workflowID)));
    setDrawerOpen(true);
  };

  const workflowsByRelated = React.useMemo(() => {
    const map = new Map<string, NormalizedWorkflow[]>();
    for (const w of workflows) {
      const current = map.get(w.relatedId) ?? [];
      current.push(w);
      map.set(w.relatedId, current);
    }
    return map;
  }, [workflows]);

  // Filtered lists
  const filteredPrelive = showOnlyActive
    ? preliveRows.filter((p) => hasActiveWorkflows(p.id, workflows))
    : preliveRows;

  const filteredCredentials = showOnlyActive
    ? credentialRows.filter((c) => hasActiveWorkflows(c.id, workflows))
    : credentialRows;

  return (
    <>
      {/* ── Facility Header ── */}
      <section className="rounded-xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {facility.name ?? "Unnamed Facility"}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                {facility.state && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> {facility.state}
                  </span>
                )}
                {facility.email && (
                  <a className="flex items-center gap-1 hover:underline" href={`mailto:${facility.email}`}>
                    <Mail className="size-3.5" /> {facility.email}
                  </a>
                )}
                {facility.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> {facility.address}
                  </span>
                )}
              </div>
              <span className="text-muted-foreground text-xs">Created {formatDate(facility.createdAt)}</span>
              <span className="text-muted-foreground text-xs">· Updated {formatDate(facility.updatedAt)}</span>
            </div>
            <Badge className={getStatusTone(facility.status)} variant="outline">
              {facility.status ?? "Unknown"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="active-toggle-f" className="text-xs text-muted-foreground cursor-pointer">
              Show only in-progress
            </Label>
            <Switch
              id="active-toggle-f"
              checked={showOnlyActive}
              onCheckedChange={setShowOnlyActive}
            />
            <EditFacilityDialog facility={facility} />
            <DeleteFacilityDialog
              facilityId={facility.id}
              facilityName={facility.name ?? "Unnamed"}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {facility.proxy && <span>Proxy: {facility.proxy}</span>}
          {facility.yearlyVolume !== null && (
            <span>Volume: {facility.yearlyVolume?.toLocaleString()}</span>
          )}
          {facility.tatSla && <span>TAT/SLA: {facility.tatSla}</span>}
          {facility.modalities && facility.modalities.length > 0 && (
            <span>Modalities: {facility.modalities.join(", ")}</span>
          )}
        </div>
      </section>

      {/* ── Facility contacts ── */}
      <CollapsibleSection
        badge={contactRows.length}
        maxHeight="20rem"
        title={
          <span className="flex items-center gap-2">
            <User className="size-4" /> Facility contacts
          </span>
        }
      >
        {contactRows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No contacts found for this facility.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="py-1 pr-3">Name</th>
                  <th className="py-1 pr-3">Title</th>
                  <th className="py-1 pr-3">Email</th>
                  <th className="py-1 pr-3">Phone</th>
                  <th className="py-1 pr-3">Primary</th>
                </tr>
              </thead>
              <tbody>
                {contactRows.map((contact) => (
                  <tr key={contact.id} className="border-t">
                    <td className="py-1 pr-3 font-medium">{contact.name}</td>
                    <td className="py-1 pr-3">{contact.title ?? "-"}</td>
                    <td className="py-1 pr-3">
                      {contact.email ? (
                        <a className="flex items-center gap-1 hover:underline" href={`mailto:${contact.email}`}>
                          <Mail className="size-3" /> {contact.email}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-1 pr-3">
                      {contact.phone ? (
                        <a
                          className="flex items-center gap-1 hover:underline"
                          href={`tel:${sanitizePhoneForHref(contact.phone)}`}
                        >
                          <Phone className="size-3" /> {contact.phone}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-1 pr-3">
                      {contact.isPrimary ? (
                        <Badge
                          className="border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          variant="outline"
                        >
                          Primary
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      {/* ── Pre-live pipeline ── */}
      <CollapsibleSection
        badge={filteredPrelive.length}
        maxHeight="24rem"
        title={
          <span className="flex items-center gap-2">
            <Rocket className="size-4" /> Pre-live pipeline
          </span>
        }
      >
        {filteredPrelive.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pre-live records found for this facility.</p>
        ) : (
          <div className="space-y-3">
            {filteredPrelive.map((prelive) => {
              const roles = parseRoles(prelive.rolesNeeded);
              const relatedWfs = (workflowsByRelated.get(prelive.id) ?? []) as WorkflowRow[];
              return (
                <div
                  key={prelive.id}
                  className="rounded-md border p-3 cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() =>
                    openDrawer(
                      `Pre-live Record`,
                      `Priority: ${prelive.priority ?? "-"}`,
                      [
                        { label: "Priority", value: prelive.priority ?? "-" },
                        { label: "Go-live date", value: formatDate(prelive.goLiveDate) },
                        { label: "Credentialing due", value: formatDate(prelive.credentialingDueDate) },
                        { label: "Board meeting", value: formatDate(prelive.boardMeetingDate) },
                        { label: "Temps possible", value: prelive.tempsPossible === null ? "-" : prelive.tempsPossible ? "Yes" : "No" },
                        { label: "Payor enrollment", value: prelive.payorEnrollmentRequired === null ? "-" : prelive.payorEnrollmentRequired ? "Required" : "Not required" },
                        ...(roles.length > 0 ? [{ label: "Roles needed", value: roles.join(", ") }] : []),
                      ],
                      relatedWfs,
                    )
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <p className="text-muted-foreground text-xs">Priority</p>
                      <p className="text-sm font-medium">{prelive.priority ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Go-live date</p>
                      <p className={`text-sm font-medium ${getDueDateTone(prelive.goLiveDate)}`}>
                        {formatDate(prelive.goLiveDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Credentialing due</p>
                      <p className={`text-sm font-medium ${getDueDateTone(prelive.credentialingDueDate)}`}>
                        {formatDate(prelive.credentialingDueDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Board meeting</p>
                      <p className="text-sm font-medium">{formatDate(prelive.boardMeetingDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Temps possible</p>
                      <p className="text-sm font-medium">
                        {prelive.tempsPossible === null ? "-" : prelive.tempsPossible ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Payor enrollment</p>
                      <p className="text-sm font-medium">
                        {prelive.payorEnrollmentRequired === null
                          ? "-"
                          : prelive.payorEnrollmentRequired
                            ? "Required"
                            : "Not required"}
                      </p>
                    </div>
                  </div>
                  {roles.length > 0 && (
                    <div className="mt-2">
                      <p className="text-muted-foreground text-xs">Roles needed</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {roles.map((role) => (
                          <Badge key={role} className="text-xs" variant="outline">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* ── PFC Section (simplified) ── */}
      <CollapsibleSection
        badge={filteredCredentials.length}
        maxHeight="32rem"
        title={
          <span className="flex items-center gap-2">
            <Stethoscope className="size-4" /> Provider credential sub-workflows
          </span>
        }
      >
        {filteredCredentials.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No provider credentials exist for this facility.
          </p>
        ) : (
          <div className="space-y-1">
            {filteredCredentials.map((credential) => {
              const relatedWfs = (workflowsByRelated.get(credential.id) ?? []) as WorkflowRow[];
              const providerName = formatProviderName({
                degree: credential.providerDegree,
                firstName: credential.providerFirstName,
                lastName: credential.providerLastName,
                middleName: credential.providerMiddleName,
              });
              const isApproved = (credential.decision ?? "").toLowerCase().includes("approved");

              return (
                <div
                  key={credential.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer transition-colors hover:bg-muted/40 ${
                    isApproved
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-blue-500/40 bg-blue-500/5"
                  }`}
                  onClick={() =>
                    openDrawer(
                      providerName,
                      credential.notes ?? undefined,
                      [
                        { label: "Priority", value: credential.priority ?? "-" },
                        {
                          label: "Decision",
                          value: (
                            <Badge className={getDecisionTone(credential.decision)} variant="outline">
                              {credential.decision ?? "-"}
                            </Badge>
                          ),
                        },
                        { label: "Privileges", value: credential.privileges ?? "-" },
                        { label: "Facility Type", value: credential.facilityType ?? "-" },
                        { label: "Form Size", value: credential.formSize ?? "-" },
                        { label: "App Required", value: credential.applicationRequired === null ? "-" : credential.applicationRequired ? "Yes" : "No" },
                        { label: "Updated", value: formatDate(credential.updatedAt) },
                      ],
                      relatedWfs,
                    )
                  }
                >
                  <span className="text-sm font-medium">{providerName}</span>
                  <Badge
                    className={`text-[11px] ${getDecisionTone(credential.decision)}`}
                    variant="outline"
                  >
                    {isApproved ? "Approved" : credential.decision ?? "In Progress"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* ── Activity Log ── */}
      <CollapsibleSection
        defaultOpen={false}
        title={
          <span className="flex items-center gap-2">
            <Activity className="size-5" /> Activity Log
          </span>
        }
      >
        <ActivityTimeline entityId={facilityId} entityType="facility" />
      </CollapsibleSection>

      {/* Shared drawer */}
      <WorkflowDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={drawerTitle}
        description={drawerDescription}
        details={drawerDetails}
        workflows={drawerWorkflows}
        incidents={drawerIncidents}
      />
    </>
  );
}
