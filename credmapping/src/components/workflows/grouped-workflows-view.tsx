"use client";

import { Building2, Search, User, UserPlus, Workflow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type WorkflowListRow = RouterOutputs["workflows"]["list"][number];

type GroupByMode = "provider" | "facility";

type WorkflowGroup = {
  key: string;
  label: string;
  subtitle: string;
  rows: WorkflowListRow[];
};

type WorkflowSortMode =
  | "date_assigned_desc"
  | "date_assigned_asc"
  | "date_started_desc"
  | "date_started_asc";

type GroupedWorkflowsViewProps = {
  rows: WorkflowListRow[];
  sortBy: WorkflowSortMode;
  onOpenWorkflow: (id: string) => void;
  onClaimWorkflow: (id: string) => void;
  claimPending: boolean;
};

const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  pfc: "Facility Credentials",
  state_licenses: "State Licenses",
  prelive_pipeline: "Pre-Live Pipeline",
  provider_vesta_privileges: "Vesta Privileges",
};

function getWorkflowTypeLabel(workflowType: string) {
  return WORKFLOW_TYPE_LABELS[workflowType] ?? workflowType;
}

function sortRows(rows: WorkflowListRow[], sortBy: WorkflowSortMode) {
  const getTimestamp = (value: string | Date | null | undefined) =>
    value ? new Date(value).getTime() : 0;

  return [...rows].sort((a, b) => {
    const aStarted = getTimestamp(a.startDate);
    const bStarted = getTimestamp(b.startDate);
    const aAssigned = getTimestamp(a.createdAt);
    const bAssigned = getTimestamp(b.createdAt);

    if (sortBy === "date_started_asc") return aStarted - bStarted;
    if (sortBy === "date_started_desc") return bStarted - aStarted;
    if (sortBy === "date_assigned_asc") return aAssigned - bAssigned;
    return bAssigned - aAssigned;
  });
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
}: {
  groups: WorkflowGroup[];
  selectedGroup: string | null;
  onSelect: (key: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
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
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
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
                <p className="text-muted-foreground truncate text-xs">
                  {group.subtitle}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupedWorkflowsDetailPane({
  group,
  rows,
  onOpenWorkflow,
  onClaimWorkflow,
  claimPending,
  detailSearch,
  onDetailSearchChange,
}: {
  group: WorkflowGroup | null;
  rows: WorkflowListRow[];
  onOpenWorkflow: (id: string) => void;
  onClaimWorkflow: (id: string) => void;
  claimPending: boolean;
  detailSearch: string;
  onDetailSearchChange: (value: string) => void;
}) {
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phase</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isOverdue =
                  !!row.dueDate &&
                  new Date(String(row.dueDate)) < new Date() &&
                  !(row.status ?? "").toLowerCase().includes("complet");

                return (
                  <TableRow
                    key={row.id}
                    className="hover:bg-muted/60 cursor-pointer"
                    onClick={() => onOpenWorkflow(String(row.id))}
                  >
                    <TableCell className="font-medium">
                      {String(row.phaseName)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {getWorkflowTypeLabel(String(row.workflowType))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
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
                        row.startDate ? String(row.startDate) : undefined,
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-xs",
                        isOverdue
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
                        row.updatedAt ? String(row.updatedAt) : undefined,
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

export function GroupedWorkflowsView({
  rows,
  sortBy,
  onOpenWorkflow,
  onClaimWorkflow,
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

      const existing = map.get(groupMeta.key);
      if (existing) {
        existing.rows.push(row);
      } else {
        map.set(groupMeta.key, {
          key: groupMeta.key,
          label: groupMeta.label,
          subtitle: groupMeta.subtitle,
          rows: [row],
        });
      }
    }

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        subtitle: `${group.rows.length} workflow${group.rows.length === 1 ? "" : "s"}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
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

    return sortRows(rowsInGroup, sortBy);
  }, [detailSearch, selectedGroup, sortBy]);

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
          />
          <GroupedWorkflowsDetailPane
            group={selectedGroup}
            rows={selectedRows}
            onOpenWorkflow={onOpenWorkflow}
            onClaimWorkflow={onClaimWorkflow}
            claimPending={claimPending}
            detailSearch={detailSearch}
            onDetailSearchChange={setDetailSearch}
          />
        </div>
      )}
    </div>
  );
}
