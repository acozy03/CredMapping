import { z } from "zod";
import { desc, eq, ilike, or } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { resolveAgentId, writeAuditLog } from "~/server/api/audit";
import {
  agents,
  credentialingRequests,
  facilities,
  providers,
} from "~/server/db/schema";

export const credentialingRequestsRouter = createTRPCRouter({
  /** List all credentialing requests with optional search */
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(100),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = input.search
        ? or(
            ilike(credentialingRequests.relatedName, `%${input.search}%`),
            ilike(credentialingRequests.additionalNotes, `%${input.search}%`),
            ilike(credentialingRequests.requesterName, `%${input.search}%`),
          )
        : undefined;

      const rows = await ctx.db
        .select({
          id: credentialingRequests.id,
          requestType: credentialingRequests.requestType,
          providerId: credentialingRequests.providerId,
          providerFirstName: providers.firstName,
          providerLastName: providers.lastName,
          providerDegree: providers.degree,
          relatedId: credentialingRequests.relatedId,
          relatedName: credentialingRequests.relatedName,
          reasonForRequest: credentialingRequests.reasonForRequest,
          priorityLevel: credentialingRequests.priorityLevel,
          requestedDueDate: credentialingRequests.requestedDueDate,
          additionalNotes: credentialingRequests.additionalNotes,
          status: credentialingRequests.status,
          requesterName: credentialingRequests.requesterName,
          agentId: credentialingRequests.agentId,
          agentFirstName: agents.firstName,
          agentLastName: agents.lastName,
          createdAt: credentialingRequests.createdAt,
          updatedAt: credentialingRequests.updatedAt,
        })
        .from(credentialingRequests)
        .leftJoin(providers, eq(credentialingRequests.providerId, providers.id))
        .leftJoin(agents, eq(credentialingRequests.agentId, agents.id))
        .where(conditions)
        .orderBy(desc(credentialingRequests.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  /** Create credentialing requests (one per facility or one per state) */
  createBatch: protectedProcedure
    .input(
      z.object({
        requestType: z.enum(["facility", "license"]),
        providerId: z.string().uuid(),
        facilities: z.array(z.object({ id: z.string().uuid(), name: z.string() })).optional(),
        licenseStates: z.array(z.string().trim().min(1)).optional(),
        requesterName: z.string().trim().optional(),
        reasonForRequest: z.enum(["Remove from Facility", "Add to Facility", "Obtain License for Provider"]),
        priorityLevel: z.enum(["STAT", "HIGH", "MEDIUM", "LOW"]),
        requestedDueDate: z.string().optional(),
        additionalNotes: z.string().trim().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = await resolveAgentId(ctx.db, ctx.user.id);

      const base = {
        requesterName: input.requesterName ?? null,
        reasonForRequest: input.reasonForRequest,
        priorityLevel: input.priorityLevel,
        requestedDueDate: input.requestedDueDate ?? null,
        additionalNotes: input.additionalNotes ?? null,
      } as const;

      const rows: (typeof credentialingRequests.$inferInsert)[] = [];

      if (input.requestType === "facility" && input.facilities?.length) {
        for (const f of input.facilities) {
          rows.push({
            ...base,
            requestType: "facility",
            providerId: input.providerId,
            relatedId: f.id,
            relatedName: f.name,
          });
        }
      } else if (input.requestType === "license" && input.licenseStates?.length) {
        for (const state of input.licenseStates) {
          rows.push({
            ...base,
            requestType: "license",
            providerId: input.providerId,
            relatedId: input.providerId,
            relatedName: state,
          });
        }
      }

      if (rows.length === 0) {
        throw new Error("At least one facility or license state is required.");
      }

      const inserted = await ctx.db.transaction(async (tx) => {
        const insertedRecords = await tx
          .insert(credentialingRequests)
          .values(rows)
          .returning();

        for (const record of insertedRecords) {
          await writeAuditLog(tx, {
            tableName: "credentialing_requests",
            recordId: record.id,
            action: "create",
            actorId: actor?.id ?? null,
            actorEmail: actor?.email ?? null,
            newData: record as unknown as Record<string, unknown>,
          });
        }

        return insertedRecords;
      });

      return inserted;
    }),

  /** Update an existing credentialing request */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["Received", "In Progress", "Completed"]).optional(),
        priorityLevel: z.enum(["STAT", "HIGH", "MEDIUM", "LOW"]).optional(),
        requestedDueDate: z.string().optional().nullable(),
        additionalNotes: z.string().trim().optional().nullable(),
        agentId: z.string().uuid().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const hasUpdate = updates.status !== undefined ||
        updates.priorityLevel !== undefined ||
        updates.requestedDueDate !== undefined ||
        updates.additionalNotes !== undefined ||
        updates.agentId !== undefined;

      if (!hasUpdate) {
        throw new Error("At least one field must be provided to update.");
      }

      const [existing] = await ctx.db
        .select()
        .from(credentialingRequests)
        .where(eq(credentialingRequests.id, id))
        .limit(1);

      if (!existing) {
        throw new Error("Credentialing request not found");
      }

      const actor = await resolveAgentId(ctx.db, ctx.user.id);

      const valuesToSet: Record<string, unknown> = {};
      if (updates.status !== undefined) valuesToSet.status = updates.status;
      if (updates.priorityLevel !== undefined) valuesToSet.priorityLevel = updates.priorityLevel;
      if (updates.requestedDueDate !== undefined) valuesToSet.requestedDueDate = updates.requestedDueDate;
      if (updates.additionalNotes !== undefined) valuesToSet.additionalNotes = updates.additionalNotes;
      if (updates.agentId !== undefined) valuesToSet.agentId = updates.agentId;

      const [updated] = await ctx.db
        .update(credentialingRequests)
        .set(valuesToSet)
        .where(eq(credentialingRequests.id, id))
        .returning();

      if (updated) {
        await writeAuditLog(ctx.db, {
          tableName: "credentialing_requests",
          recordId: updated.id,
          action: "update",
          actorId: actor?.id ?? null,
          actorEmail: actor?.email ?? null,
          oldData: existing as unknown as Record<string, unknown>,
          newData: updated as unknown as Record<string, unknown>,
        });
      }

      return updated;
    }),

  /** Search facilities by name (for autocomplete) */
  searchFacilities: protectedProcedure
    .input(z.object({ query: z.string().trim().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({ id: facilities.id, name: facilities.name, state: facilities.state })
        .from(facilities)
        .where(or(
          ilike(facilities.name, `%${input.query}%`),
          ilike(facilities.state, `%${input.query}%`),
        ))
        .limit(20);
    }),

  /** Search providers by name (for autocomplete) */
  searchProviders: protectedProcedure
    .input(z.object({ query: z.string().trim().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: providers.id,
          firstName: providers.firstName,
          lastName: providers.lastName,
          degree: providers.degree,
        })
        .from(providers)
        .where(or(
          ilike(providers.firstName, `%${input.query}%`),
          ilike(providers.lastName, `%${input.query}%`),
        ))
        .limit(20);
    }),

  /** List all agents (for assigning) */
  listAgents: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: agents.id,
        firstName: agents.firstName,
        lastName: agents.lastName,
      })
      .from(agents)
      .orderBy(agents.firstName);
  }),

  /** Search agents by name (for autocomplete assignment) */
  searchAgents: protectedProcedure
    .input(z.object({ query: z.string().trim().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: agents.id,
          firstName: agents.firstName,
          lastName: agents.lastName,
        })
        .from(agents)
        .where(or(
          ilike(agents.firstName, `%${input.query}%`),
          ilike(agents.lastName, `%${input.query}%`),
        ))
        .limit(10);
    }),
});