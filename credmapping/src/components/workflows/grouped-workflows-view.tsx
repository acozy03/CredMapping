"use client";

import {
  AlertTriangle,
  Building2,
  Search,
  User,
  UserPlus,
  Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge } from "~/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollIndicatorContainer } from "~/components/ui/scroll-indicator-container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  compareWorkflowPhaseOrder,
  formatDate,
  isOverdue,
  WORKFLOW_TYPE_LABELS,
  type WorkflowSortMode,
} from "~/components/workflows/workflow-utils";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type WorkflowListRow = RouterOutputs["workflows"]["list"][number];

type GroupByMode = "provider" | "facility";

type WorkflowGroup = {
  key: string;
  label: string;
  subtitle: string;
  totalInDb: number;
  isIncomplete: boolean;
  rows: WorkflowListRow[];
};

type RelatedWorkflowGroup = {
  key: string;
  relatedId: string;
  workflowType: string;
  label: string;
  subtitle: string;
  rows: WorkflowListRow[];
};

type GroupedWorkflowsViewProps = {
  rows: WorkflowListRow[];
  sortBy: WorkflowSortMode;
  hasMoreGroups: boolean;
  isLoadingMoreGroups: boolean;
  onLoadMoreGroups: () => void;
  onOpenWorkflow: (id: string) => void;
  onClaimWorkflow: (id: string) => void;
  onManagePhases: (input: {
    workflowId: string;
    workflowType:
      | "pfc"
      | "state_licenses"
      | "prelive_pipeline"
      | "provider_vesta_privileges";
    relatedId: string;
    contextLabel: string;
  }) => void;
  renderRelatedWorkflowActions?: (input: {
    relatedWorkflow: RelatedWorkflowGroup;
  }) => ReactNode;
  claimPending: boolean;
};

type ManagePhasesWorkflowType =
  | "pfc"
  | "state_licenses"
  | "prelive_pipeline"
  | "provider_vesta_privileges";

function getWorkflowTypeLabel(workflowType: string) {
  return WORKFLOW_TYPE_LABELS[workflowType] ?? workflowType;
}

function isManagePhasesWorkflowType(
  workflowType: string,
): workflowType is ManagePhasesWorkflowType {
  return [
    "pfc",
    "state_licenses",
    "prelive_pipeline",
    "provider_vesta_privileges",
  ].includes(workflowType);
}

function getRelatedWorkflowLabel(row: WorkflowListRow) {
  const typeLabel = getWorkflowTypeLabel(String(row.workflowType));

  if (row.workflowType === "pfc") {
    const facility = row.facilityName ?? "Unknown Facility";
    return `${facility} ${typeLabel}`;
  }

  if (row.workflowType === "state_licenses") {
    return (
      row.contextLabel ||
      `${row.providerName ?? "Unknown Provider"} ${typeLabel}`
    );
  }

  if (row.workflowType === "prelive_pipeline") {
    return row.facilityName ?? `${typeLabel} Workflow`;
  }

  if (row.workflowType === "provider_vesta_privileges") {
    return row.providerName ?? `${typeLabel} Workflow`;
  }

  return row.contextLabel || `${typeLabel} Workflow`;
}

function getRelatedWorkflowSubtitle(group: RelatedWorkflowGroup) {
  const workflowWord = group.rows.length === 1 ? "phase" : "phases";
  return `${group.rows.length} ${workflowWord}`;
}

function getRelatedWorkflowSortTimestamp(
  group: RelatedWorkflowGroup,
  sortBy: WorkflowSortMode,
) {
  const isStartedSort =
    sortBy === "date_started_asc" || sortBy === "date_started_desc";
  const isAscendingSort =
    sortBy === "date_started_asc" || sortBy === "date_assigned_asc";

  return group.rows.reduce(
    (candidateTimestamp, row) => {
      const value = isStartedSort ? row.startDate : row.createdAt;
      const timestamp = value ? new Date(value).getTime() : 0;
      const normalizedTimestamp = Number.isNaN(timestamp) ? 0 : timestamp;

      return isAscendingSort
        ? Math.min(candidateTimestamp, normalizedTimestamp)
        : Math.max(candidateTimestamp, normalizedTimestamp);
    },
    isAscendingSort ? Number.POSITIVE_INFINITY : 0,
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "Pending").toLowerCase();
  if (s === "completed" || s === "done" || s === "approved") {
    return (
      <Badge className="border-emerald-500/25 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        {status}
      </Badge>
    );
  }
  if (
    s.includes("progress") ||
    s.includes("processing") ||
    s.includes("review")
  ) {
    return (
      <Badge className="border-blue-500/25 bg-blue-500/15 text-blue-600 dark:text-blue-400">
        {status}
      </Badge>
    );
  }
  if (s === "blocked" || s === "denied" || s === "rejected") {
    return (
      <Badge className="border-red-500/25 bg-red-500/15 text-red-600 dark:text-red-400">
        {status}
      </Badge>
    );
  }

  return <Badge variant="secondary">{status ?? "Pending"}</Badge>;
}

function GroupedWorkflowsSidebar({
  groups,
  selectedGroup,
  onSelect,
  search,
  onSearchChange,
  hasMoreGroups,
  isLoadingMoreGroups,
  onLoadMoreGroups,
}: {
  groups: WorkflowGroup[];
  selectedGroup: string | null;
  onSelect: (key: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  hasMoreGroups: boolean;
  isLoadingMoreGroups: boolean;
  onLoadMoreGroups: () => void;
}) {
  return (
    <div className="bg-card flex h-[calc(83vh)] flex-col overflow-hidden rounded-lg border">
      <div className="border-b p-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search groups..."
            className="h-9 pl-8"
          />
        </div>
      </div>
      <ScrollIndicatorContainer className="min-h-0 flex-1">
        <div className="space-y-2 p-2">
          {groups.length === 0 ? (
            <div className="text-muted-foreground p-4 text-sm">
              No groups match your search.
            </div>
          ) : (
            <div className="space-y-1">
              {groups.map((group) => (
               <button
                type="button"
                key={group.key}
                onClick={() => onSelect(group.key)}
                className={cn(
                  "hover:bg-muted/60 w-full rounded-md border px-3 py-2 text-left transition-colors",
                  selectedGroup === group.key
                    ? "border-primary/40 bg-primary/10"
                    : "border-transparent",
                )}
              >
                <p className="truncate text-sm font-medium">{group.label}</p>
                <div className="flex items-center gap-1.5">
                  <p className={cn(
                    "truncate text-xs",
                    group.isIncomplete ? "text-muted-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {group.subtitle}
                  </p>
                  {group.isIncomplete && (
                    <AlertTriangle className="size-3 text-muted-foreground shrink-0" />
                  )}
                </div>
              </button>
              ))}
            </div>
          )}
          {hasMoreGroups && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onLoadMoreGroups}
              disabled={isLoadingMoreGroups}
            >
              {isLoadingMoreGroups ? "Loading groups..." : "Load more groups"}
            </Button>
          )}
        </div>
      </ScrollIndicatorContainer>
    </div>
  );
}

function GroupedWorkflowsDetailPane({
  group,
  rows,
  onOpenWorkflow,
  onClaimWorkflow,
  onManagePhases,
  renderRelatedWorkflowActions,
  claimPending,
  detailSearch,
  onDetailSearchChange,
  groupBy,
  sortBy,
}: {
  group: WorkflowGroup | null;
  rows: WorkflowListRow[];
  onOpenWorkflow: (id: string) => void;
  onClaimWorkflow: (id: string) => void;
  onManagePhases: GroupedWorkflowsViewProps["onManagePhases"];
  renderRelatedWorkflowActions?: GroupedWorkflowsViewProps["renderRelatedWorkflowActions"];
  claimPending: boolean;
  detailSearch: string;
  onDetailSearchChange: (value: string) => void;
  groupBy: GroupByMode;
  sortBy: WorkflowSortMode;
}) {
  const relatedWorkflowGroups = useMemo<RelatedWorkflowGroup[]>(() => {
    const map = new Map<string, RelatedWorkflowGroup>();

    for (const row of rows) {
      const relatedKey = `${row.workflowType}:${row.relatedId}`;
      const existing = map.get(relatedKey);

      if (existing) {
        existing.rows.push(row);
        continue;
      }

      map.set(relatedKey, {
        key: relatedKey,
        relatedId: String(row.relatedId),
        workflowType: String(row.workflowType),
        label: getRelatedWorkflowLabel(row),
        subtitle: "",
        rows: [row],
      });
    }

    return Array.from(map.values())
      .map((relatedGroup) => ({
        ...relatedGroup,
        subtitle: getRelatedWorkflowSubtitle(relatedGroup),
        rows: [...relatedGroup.rows].sort(compareWorkflowPhaseOrder),
      }))
      .sort((a, b) => {
        const aTimestamp = getRelatedWorkflowSortTimestamp(a, sortBy);
        const bTimestamp = getRelatedWorkflowSortTimestamp(b, sortBy);

        if (sortBy === "date_started_asc" || sortBy === "date_assigned_asc") {
          if (aTimestamp !== bTimestamp) return aTimestamp - bTimestamp;
        } else if (aTimestamp !== bTimestamp) {
          return bTimestamp - aTimestamp;
        }

        return a.label.localeCompare(b.label);
      });
  }, [rows, sortBy]);

  const [openRelatedKeys, setOpenRelatedKeys] = useState<string[]>([]);

  useEffect(() => {
    setOpenRelatedKeys((currentOpenKeys) => {
      const availableKeys = new Set(
        relatedWorkflowGroups.map((relatedGroup) => relatedGroup.key),
      );
      const preservedOpenKeys = currentOpenKeys.filter((key) =>
        availableKeys.has(key),
      );

      const knownKeys = new Set(currentOpenKeys);
      const newlyAvailableKeys = relatedWorkflowGroups
        .map((relatedGroup) => relatedGroup.key)
        .filter((key) => !knownKeys.has(key));

      return [...preservedOpenKeys, ...newlyAvailableKeys];
    });
  }, [relatedWorkflowGroups]);

  return (
    <div className="bg-card h-[calc(83vh)] overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between gap-3 border-b p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {group?.label ?? "Select a group"}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {group?.subtitle ??
              "Choose a provider or facility to view workflows."}
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={detailSearch}
            onChange={(e) => onDetailSearchChange(e.target.value)}
            placeholder="Search rows..."
            className="h-9 pl-8"
          />
        </div>
      </div>

      <div className="h-[calc(83vh-62px)] overflow-auto">
        {!group ? (
          <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-sm">
            Select a group from the left to browse workflows.
          </div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-sm">
            No workflow rows in this group match the current search.
          </div>
        ) : (
          <div className="space-y-2 p-2">
            <Accordion
              type="multiple"
              className="w-full space-y-2"
              value={openRelatedKeys}
              onValueChange={setOpenRelatedKeys}
            >
              {relatedWorkflowGroups.map((relatedGroup) => (
                <AccordionItem
                  key={relatedGroup.key}
                  value={relatedGroup.key}
                  className="bg-muted/20 rounded-md border last:border-b px-3"
                >
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium">
                        {relatedGroup.label}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {relatedGroup.subtitle}
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="mb-2 flex justify-end">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const representativeRow = relatedGroup.rows[0];
                            if (!representativeRow) return;
                            const workflowType = String(
                              representativeRow.workflowType,
                            );
                            if (!isManagePhasesWorkflowType(workflowType))
                              return;
                            const contextLabel =
                              String(
                                representativeRow.contextLabel ?? "",
                              ).trim() || relatedGroup.label;

                            onManagePhases({
                              workflowId: String(representativeRow.id),
                              workflowType,
                              relatedId: String(relatedGroup.relatedId),
                              contextLabel,
                            });
                          }}
                        >
                          Manage Phases
                        </Button>
                        {renderRelatedWorkflowActions?.({
                          relatedWorkflow: relatedGroup,
                        })}
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Phase</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>
                            {groupBy === "provider" ? "Facility" : "Provider"}
                          </TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead>Start</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {relatedGroup.rows.map((row) => {
                          const rowIsOverdue = isOverdue(
                            row.dueDate,
                            row.status,
                          );

                          return (
                            <TableRow
                              key={row.id}
                              className="hover:bg-muted/60 cursor-pointer"
                              onClick={() => onOpenWorkflow(String(row.id))}
                            >
                              <TableCell className="font-medium">
                                <span className="inline-flex items-center gap-1.5">
                                  {String(row.phaseName)}
                                  {Number(row.incidentCount ?? 0) > 0 && (
                                    <Badge className="h-5 gap-1 border-orange-500/25 bg-orange-500/15 px-1.5 py-0 text-[10px] text-orange-600">
                                      <AlertTriangle className="size-2.5" />
                                      {row.incidentCount}
                                    </Badge>
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">
                                {getWorkflowTypeLabel(String(row.workflowType))}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={row.status} />
                              </TableCell>
                              <TableCell>
                                {groupBy === "provider"
                                  ? (row.facilityName ?? "—")
                                  : (row.providerName ?? "—")}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {row.assignedName ? (
                                  <span className="inline-flex items-center gap-1">
                                    <User className="size-3" />
                                    {row.assignedName}
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 gap-1 px-1.5 text-xs text-blue-600 hover:text-blue-700"
                                    disabled={claimPending}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onClaimWorkflow(String(row.id));
                                    }}
                                  >
                                    <UserPlus className="size-3" /> Claim
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {formatDate(
                                  row.startDate
                                    ? String(row.startDate)
                                    : undefined,
                                )}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "text-xs",
                                  rowIsOverdue
                                    ? "font-medium text-red-500"
                                    : "text-muted-foreground",
                                )}
                              >
                                {formatDate(
                                  row.dueDate ? String(row.dueDate) : undefined,
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {formatDate(
                                  row.updatedAt
                                    ? String(row.updatedAt)
                                    : undefined,
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
}

export function GroupedWorkflowsView({
  rows,
  sortBy,
  hasMoreGroups,
  isLoadingMoreGroups,
  onLoadMoreGroups,
  onOpenWorkflow,
  onClaimWorkflow,
  onManagePhases,
  renderRelatedWorkflowActions,
  claimPending,
}: GroupedWorkflowsViewProps) {
  const [groupBy, setGroupBy] = useState<GroupByMode>("provider");
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [detailSearch, setDetailSearch] = useState("");

  const groups = useMemo<WorkflowGroup[]>(() => {
    const map = new Map<string, WorkflowGroup>();

    for (const row of rows) {
      const providerFallback = {
        key: "provider:unassigned",
        label: "No provider",
        subtitle: "Workflows without a provider relationship",
      };
      const facilityFallback = {
        key: "facility:unassigned",
        label: "No facility",
        subtitle: "Workflows without a facility relationship",
      };

      const groupMeta =
        groupBy === "provider"
          ? row.providerId
            ? {
                key: `provider:${row.providerId}`,
                label: row.providerName ?? "Unknown Provider",
                subtitle: "Provider group",
              }
            : providerFallback
          : row.facilityId
            ? {
                key: `facility:${row.facilityId}`,
                label: row.facilityName ?? "Unknown Facility",
                subtitle: "Facility group",
              }
            : facilityFallback;

      const totalInDb = row.totalGroupsForOwner ?? 0;

      const existing = map.get(groupMeta.key);
      if (existing) {
        existing.rows.push(row);
      } else {
        map.set(groupMeta.key, {
          key: groupMeta.key,
          label: groupMeta.label,
          subtitle: groupMeta.subtitle,
          rows: [row],
          totalInDb,
          isIncomplete: totalInDb > 1,
        });
      }
    }

    return Array.from(map.values()).map((group) => {
        const loadedCount = new Set(group.rows.map(r => `${r.workflowType}:${r.relatedId}`)).size;
        const isIncomplete = group.totalInDb > loadedCount;

        return {
          ...group,
          subtitle: isIncomplete 
            ? `${loadedCount} of ${group.totalInDb} workflows loaded` 
            : `${loadedCount} workflow${loadedCount === 1 ? "" : "s"}`,
          isIncomplete,
        };
      }).sort((a, b) => a.label.localeCompare(b.label));
    }, [groupBy, rows]);
  const visibleGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((group) =>
      `${group.label} ${group.subtitle}`.toLowerCase().includes(q),
    );
  }, [groupSearch, groups]);

  useEffect(() => {
    if (!visibleGroups.length) {
      setSelectedGroupKey(null);
      return;
    }

    const hasSelection = visibleGroups.some(
      (group) => group.key === selectedGroupKey,
    );
    if (!hasSelection) {
      setSelectedGroupKey(visibleGroups[0]?.key ?? null);
    }
  }, [selectedGroupKey, visibleGroups]);

  useEffect(() => {
    setDetailSearch("");
  }, [groupBy, selectedGroupKey]);

  const selectedGroup = useMemo(
    () => visibleGroups.find((group) => group.key === selectedGroupKey) ?? null,
    [selectedGroupKey, visibleGroups],
  );

  const selectedRows = useMemo(() => {
    if (!selectedGroup) return [];

    const q = detailSearch.trim().toLowerCase();
    const rowsInGroup = q
      ? selectedGroup.rows.filter((row) => {
          const searchBlob = [
            row.phaseName,
            row.workflowType,
            row.status,
            row.assignedName,
            row.providerName,
            row.facilityName,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchBlob.includes(q);
        })
      : selectedGroup.rows;

    return rowsInGroup;
  }, [detailSearch, selectedGroup]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select
          value={groupBy}
          onValueChange={(value) => setGroupBy(value as GroupByMode)}
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="provider">Group by Provider</SelectItem>
            <SelectItem value="facility">Group by Facility</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="h-8 gap-1 px-2">
          {groupBy === "provider" ? (
            <User className="size-3" />
          ) : (
            <Building2 className="size-3" />
          )}
          {groups.length} group{groups.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {groups.length === 0 ? (
        <div className="bg-muted/20 flex h-64 flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
          <Workflow className="text-muted-foreground/50 size-10" />
          <h3 className="mt-4 text-lg font-semibold">
            No grouped workflows found
          </h3>
          <p className="text-muted-foreground mt-2 max-w-xs text-sm">
            No groups found for the current filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          <GroupedWorkflowsSidebar
            groups={visibleGroups}
            selectedGroup={selectedGroupKey}
            onSelect={setSelectedGroupKey}
            search={groupSearch}
            onSearchChange={setGroupSearch}
            hasMoreGroups={hasMoreGroups}
            isLoadingMoreGroups={isLoadingMoreGroups}
            onLoadMoreGroups={onLoadMoreGroups}
          />
          <GroupedWorkflowsDetailPane
            group={selectedGroup}
            rows={selectedRows}
            onOpenWorkflow={onOpenWorkflow}
            onClaimWorkflow={onClaimWorkflow}
            onManagePhases={onManagePhases}
            renderRelatedWorkflowActions={renderRelatedWorkflowActions}
            claimPending={claimPending}
            detailSearch={detailSearch}
            onDetailSearchChange={setDetailSearch}
            groupBy={groupBy}
            sortBy={sortBy}
          />
        </div>
      )}
    </div>
  );
}
