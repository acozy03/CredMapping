import { asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";

import { FacilityProfileClient } from "~/components/facilities/facility-profile-client";
import { requireRequestAuthContext } from "~/server/auth/request-context";
import { withUserDb } from "~/server/db";
import {
  agents,
  facilities,
  facilityContacts,
  facilityPreliveInfo,
  incidentLogs,
  providerFacilityCredentials,
  providers,
  workflowPhases,
} from "~/server/db/schema";

const formatDate = (value: Date | string | null) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const asDateInput = (value: Date | string | null) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

export default async function FacilityProfilePage({
  params,
}: {
  params: Promise<{ facilityId: string }>;
}) {
  const { facilityId } = await params;
  const { user } = await requireRequestAuthContext();

  const { contactRows, credentialRows, facility, incidentRows, preliveRows, workflowRows } =
    await withUserDb({
      user,
      run: async (db) => {
        const [facilityRow, contactRows, preliveRows, credentialRows] = await Promise.all([
          db.select().from(facilities).where(eq(facilities.id, facilityId)).limit(1),
          db
            .select()
            .from(facilityContacts)
            .where(eq(facilityContacts.facilityId, facilityId))
            .orderBy(desc(facilityContacts.isPrimary), facilityContacts.name),
          db
            .select()
            .from(facilityPreliveInfo)
            .where(eq(facilityPreliveInfo.facilityId, facilityId))
            .orderBy(desc(facilityPreliveInfo.updatedAt)),
          db
            .select({
              applicationRequired: providerFacilityCredentials.applicationRequired,
              decision: providerFacilityCredentials.decision,
              facilityType: providerFacilityCredentials.facilityType,
              formSize: providerFacilityCredentials.formSize,
              id: providerFacilityCredentials.id,
              notes: providerFacilityCredentials.notes,
              privileges: providerFacilityCredentials.privileges,
              priority: providerFacilityCredentials.priority,
              providerDegree: providers.degree,
              providerFirstName: providers.firstName,
              providerId: providerFacilityCredentials.providerId,
              providerLastName: providers.lastName,
              providerMiddleName: providers.middleName,
              updatedAt: providerFacilityCredentials.updatedAt,
            })
            .from(providerFacilityCredentials)
            .leftJoin(providers, eq(providerFacilityCredentials.providerId, providers.id))
            .where(eq(providerFacilityCredentials.facilityId, facilityId))
            .orderBy(desc(providerFacilityCredentials.updatedAt)),
        ]);

        const credentialIds = credentialRows.map((row) => row.id);
        const preliveIds = preliveRows.map((row) => row.id);
        const allRelatedIds = [...credentialIds, ...preliveIds];
        const workflowRows =
          allRelatedIds.length === 0
            ? []
            : await db
                .select({
                  agentFirstName: agents.firstName,
                  agentLastName: agents.lastName,
                  completedAt: workflowPhases.completedAt,
                  dueDate: workflowPhases.dueDate,
                  id: workflowPhases.id,
                  phaseName: workflowPhases.phaseName,
                  relatedId: workflowPhases.relatedId,
                  startDate: workflowPhases.startDate,
                  status: workflowPhases.status,
                  updatedAt: workflowPhases.updatedAt,
                  workflowType: workflowPhases.workflowType,
                })
                .from(workflowPhases)
                .leftJoin(agents, eq(workflowPhases.agentAssigned, agents.id))
                .where(
                  inArray(workflowPhases.relatedId, allRelatedIds),
                )
                .orderBy(asc(workflowPhases.phaseName), desc(workflowPhases.updatedAt));

        const workflowIds = workflowRows.map((w) => w.id);
        const incidentRows =
          workflowIds.length === 0
            ? []
            : await db
                .select({
                  id: incidentLogs.id,
                  workflowID: incidentLogs.workflowID,
                  dateIdentified: incidentLogs.dateIdentified,
                  resolutionDate: incidentLogs.resolutionDate,
                  subcategory: incidentLogs.subcategory,
                  critical: incidentLogs.critical,
                  incidentDescription: incidentLogs.incidentDescription,
                  finalResolution: incidentLogs.finalResolution,
                  discussed: incidentLogs.discussed,
                  reporterFirstName: agents.firstName,
                  reporterLastName: agents.lastName,
                })
                .from(incidentLogs)
                .leftJoin(agents, eq(incidentLogs.whoReported, agents.id))
                .where(inArray(incidentLogs.workflowID, workflowIds))
                .orderBy(desc(incidentLogs.dateIdentified));

        return {
          contactRows,
          credentialRows,
          facility: facilityRow[0] ?? null,
          incidentRows,
          preliveRows,
          workflowRows,
        };
      },
    });

  if (!facility) notFound();

  const normalizedWorkflowRows = workflowRows.map((row) => ({
    agentName:
      row.agentFirstName || row.agentLastName
        ? `${row.agentFirstName ?? ""} ${row.agentLastName ?? ""}`.trim()
        : null,
    completedAt: asDateInput(row.completedAt),
    dueDate: asDateInput(row.dueDate),
    id: row.id,
    phaseName: row.phaseName,
    relatedId: row.relatedId,
    startDate: asDateInput(row.startDate),
    status: row.status,
    updatedAt: formatDate(row.updatedAt),
    workflowType: row.workflowType,
  }));

  return (
    <div className="space-y-4 pb-4">
      <FacilityProfileClient
        facility={facility}
        facilityId={facilityId}
        contactRows={contactRows}
        preliveRows={preliveRows}
        credentialRows={credentialRows}
        workflows={normalizedWorkflowRows}
        incidents={incidentRows.map((r) => ({
          id: r.id,
          workflowID: r.workflowID,
          dateIdentified: r.dateIdentified,
          resolutionDate: r.resolutionDate,
          subcategory: r.subcategory,
          critical: r.critical,
          incidentDescription: r.incidentDescription,
          finalResolution: r.finalResolution,
          discussed: r.discussed,
          reporterName:
            r.reporterFirstName || r.reporterLastName
              ? `${r.reporterFirstName ?? ""} ${r.reporterLastName ?? ""}`.trim()
              : null,
        }))}
      />
    </div>
  );
}
