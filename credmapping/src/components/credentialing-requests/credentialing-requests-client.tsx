"use client";

import { useCallback, useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  ClipboardList,
  Loader2,
  Plus,
  Search,
  UserCheck,
  X,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
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
import { Dialog, DialogClose, DialogTrigger } from "~/components/ui/dialog";
import {
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "~/components/ui/app-modal";
import { DatePicker } from "~/components/ui/date-picker";

/* ─── Constants ──────────────────────────────────────────────── */

const REASONS = ["Remove from Facility", "Add to Facility", "Obtain License for Provider"] as const;
const PRIORITIES = ["STAT", "HIGH", "MEDIUM", "LOW"] as const;
const STATUSES = ["Received", "In Progress", "Completed"] as const;
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
] as const;

type RequestType = "facility" | "license";
type Reason = (typeof REASONS)[number];
type Priority = (typeof PRIORITIES)[number];
type Status = (typeof STATUSES)[number];

const PRIORITY_COLOR: Record<Priority, string> = {
  STAT: "bg-red-500 text-white",
  HIGH: "bg-amber-500 text-white",
  MEDIUM: "bg-yellow-400 text-black",
  LOW: "bg-green-500 text-white",
};

const STATUS_COLOR: Record<Status, string> = {
  Received: "bg-blue-500 text-white",
  "In Progress": "bg-amber-500 text-white",
  Completed: "bg-green-600 text-white",
};

/* ─── Form State ─────────────────────────────────────────────── */

type NewRequestForm = {
  requestType: RequestType;
  providerId: string;
  selectedFacilities: Array<{ id: string; name: string }>;
  licenseStates: string[];
  requesterName: string;
  reasonForRequest: Reason | "";
  priorityLevel: Priority | "";
  requestedDueDate: string;
  additionalNotes: string;
};

const initialForm: NewRequestForm = {
  requestType: "facility",
  providerId: "",
  selectedFacilities: [],
  licenseStates: [],
  requesterName: "",
  reasonForRequest: "",
  priorityLevel: "",
  requestedDueDate: "",
  additionalNotes: "",
};

/* ─── Helper ─────────────────────────────────────────────────── */

const buildProviderLabel = (p: {
  firstName: string | null;
  lastName: string | null;
  degree: string | null;
}) => {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "Unnamed";
  return p.degree ? `${name}, ${p.degree}` : name;
};

const formatDate = (val: string | Date | null | undefined) => {
  if (!val) return "—";
  const d = typeof val === "string" ? new Date(val) : val;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

/* ─── Component ──────────────────────────────────────────────── */

export default function CredentialingRequestsClient() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewRequestForm>({ ...initialForm });

  // Autocomplete search state
  const [providerSearch, setProviderSearch] = useState("");
  const [providerLabel, setProviderLabel] = useState("");
  const [facilitySearch, setFacilitySearch] = useState("");
  const [agentSearches, setAgentSearches] = useState<Record<string, string>>({});

  // Queries
  const { data: requests, isLoading, refetch } = api.credentialingRequests.list.useQuery({ search });

  const { data: agentsList } = api.credentialingRequests.listAgents.useQuery();

  const { data: providerResults } = api.credentialingRequests.searchProviders.useQuery(
    { query: providerSearch },
    { enabled: providerSearch.length >= 1 },
  );

  const { data: facilityResults } = api.credentialingRequests.searchFacilities.useQuery(
    { query: facilitySearch },
    { enabled: facilitySearch.length >= 1 },
  );

  // Mutation
  const createBatchMutation = api.credentialingRequests.createBatch.useMutation({
    onSuccess: (data) => {
      const count = Array.isArray(data) ? data.length : 1;
      toast.success(`${count} credentialing request${count > 1 ? "s" : ""} created successfully.`);
      setDialogOpen(false);
      setForm({ ...initialForm });
      setProviderSearch("");
      setProviderLabel("");
      setFacilitySearch("");
      void refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateMutation = api.credentialingRequests.update.useMutation({
    onSuccess: () => {
      toast.success("Request updated.");
      void refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateField = useCallback(<K extends keyof NewRequestForm>(key: K, value: NewRequestForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!form.providerId) {
      toast.error("Please select a provider.");
      return;
    }
    if (form.requestType === "facility" && form.selectedFacilities.length === 0) {
      toast.error("Please select at least one facility.");
      return;
    }
    if (form.requestType === "license" && form.licenseStates.length === 0) {
      toast.error("Please add at least one license state.");
      return;
    }
    if (!form.reasonForRequest) {
      toast.error("Please select a reason for request.");
      return;
    }
    if (!form.priorityLevel) {
      toast.error("Please select a priority level.");
      return;
    }

    createBatchMutation.mutate({
      requestType: form.requestType,
      providerId: form.providerId,
      facilities: form.requestType === "facility" ? form.selectedFacilities : undefined,
      licenseStates: form.requestType === "license" ? form.licenseStates : undefined,
      requesterName: form.requesterName || undefined,
      reasonForRequest: form.reasonForRequest,
      priorityLevel: form.priorityLevel,
      requestedDueDate: form.requestedDueDate || undefined,
      additionalNotes: form.additionalNotes || undefined,
    });
  }, [form, createBatchMutation]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Credentialing Requests</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-64 pl-9"
              placeholder="Search requests…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setForm({ ...initialForm });
                setProviderSearch("");
                setProviderLabel("");
                setFacilitySearch("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>

            <ModalContent className="sm:max-w-xl">
              <ModalHeader>
                <ModalTitle>New Credentialing Request</ModalTitle>
              </ModalHeader>

              <div className="space-y-4 py-2">
                {/* Request Type */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Application Type</label>
                  <Select
                    value={form.requestType}
                    onValueChange={(val) => {
                      updateField("requestType", val as RequestType);
                      updateField("selectedFacilities", []);
                      updateField("licenseStates", []);
                      setFacilitySearch("");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facility">Facility Application</SelectItem>
                      <SelectItem value="license">License Application</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Provider Search */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Provider</label>
                  {form.providerId ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm">
                        {providerLabel}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => {
                          updateField("providerId", "");
                          setProviderSearch("");
                          setProviderLabel("");
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        placeholder="Search provider by name…"
                        value={providerSearch}
                        onChange={(e) => setProviderSearch(e.target.value)}
                      />
                      {providerSearch.length >= 1 && providerResults && providerResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                          <ul className="max-h-48 overflow-auto p-1">
                            {providerResults.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent"
                                  onClick={() => {
                                    updateField("providerId", p.id);
                                    setProviderLabel(buildProviderLabel(p));
                                    setProviderSearch("");
                                  }}
                                >
                                  {buildProviderLabel(p)}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Facility Search (only for facility type) — multi-select */}
                {form.requestType === "facility" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Facilities</label>
                    {form.selectedFacilities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pb-1">
                        {form.selectedFacilities.map((f) => (
                          <Badge key={f.id} variant="secondary" className="gap-1 text-sm">
                            {f.name}
                            <button
                              type="button"
                              aria-label={`Remove ${f.name}`}
                              className="ml-0.5 rounded-full hover:bg-muted"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  selectedFacilities: prev.selectedFacilities.filter((x) => x.id !== f.id),
                                }))
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="relative">
                      <Input
                        placeholder="Search facility by name…"
                        value={facilitySearch}
                        onChange={(e) => setFacilitySearch(e.target.value)}
                      />
                      {facilitySearch.length >= 1 && facilityResults && facilityResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                          <ul className="max-h-48 overflow-auto p-1">
                            {facilityResults
                              .filter((f) => !form.selectedFacilities.some((s) => s.id === f.id))
                              .map((f) => (
                                <li key={f.id}>
                                  <button
                                    type="button"
                                    className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent"
                                    onClick={() => {
                                      setForm((prev) => ({
                                        ...prev,
                                        selectedFacilities: [
                                          ...prev.selectedFacilities,
                                          { id: f.id, name: f.name ?? "Unnamed" },
                                        ],
                                      }));
                                      setFacilitySearch("");
                                    }}
                                  >
                                    {f.name ?? "Unnamed"}{f.state ? ` (${f.state})` : ""}
                                  </button>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {form.selectedFacilities.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        {form.selectedFacilities.length} facilities selected — one request will be created per facility.
                      </p>
                    )}
                  </div>
                )}

                {/* License States (only for license type) — multi-select */}
                {form.requestType === "license" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">License States</label>
                    {form.licenseStates.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pb-1">
                        {form.licenseStates.map((state) => (
                          <Badge key={state} variant="secondary" className="gap-1 text-sm">
                            {state}
                            <button
                              type="button"
                              aria-label={`Remove ${state}`}
                              className="ml-0.5 rounded-full hover:bg-muted"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  licenseStates: prev.licenseStates.filter((s) => s !== state),
                                }))
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Select
                      value=""
                      onValueChange={(val) => {
                        if (val && !form.licenseStates.includes(val)) {
                          setForm((prev) => ({
                            ...prev,
                            licenseStates: [...prev.licenseStates, val],
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a state…" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.filter((s) => !form.licenseStates.includes(s)).map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.licenseStates.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        {form.licenseStates.length} states added — one request will be created per state.
                      </p>
                    )}
                  </div>
                )}

                {/* Reason for Request */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Requester Name</label>
                  <Input
                    placeholder="Enter requester name"
                    value={form.requesterName}
                    onChange={(e) => updateField("requesterName", e.target.value)}
                  />
                </div>

                {/* Reason for Request */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Reason for Request</label>
                  <Select
                    value={form.reasonForRequest}
                    onValueChange={(val) => updateField("reasonForRequest", val as Reason)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {REASONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Level */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Priority Level</label>
                  <Select
                    value={form.priorityLevel}
                    onValueChange={(val) => updateField("priorityLevel", val as Priority)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Requested Due Date */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Requested Due Date (estimated)</label>
                  <DatePicker
                    value={form.requestedDueDate}
                    onChange={(val) => updateField("requestedDueDate", val)}
                    placeholder="Pick a due date"
                  />
                </div>

                {/* Additional Notes */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Additional Notes (optional)</label>
                  <Textarea
                    className="min-h-20"
                    placeholder="Any additional information or explanations…"
                    value={form.additionalNotes}
                    onChange={(e) => updateField("additionalNotes", e.target.value)}
                  />
                </div>
              </div>

              <ModalFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  disabled={createBatchMutation.isPending}
                  onClick={handleSubmit}
                >
                  {createBatchMutation.isPending ? "Submitting…" : "Submit Request"}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <ClipboardList className="h-12 w-12 opacity-40" />
            <p className="text-lg">No credentialing requests yet</p>
            <p className="text-sm">Click &quot;New Request&quot; to create one.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Facility / State</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Agent</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((row) => {
                const providerLabel = row.providerFirstName || row.providerLastName
                  ? buildProviderLabel({
                      firstName: row.providerFirstName,
                      lastName: row.providerLastName,
                      degree: row.providerDegree,
                    })
                  : "—";

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {row.requestType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{providerLabel}</TableCell>
                    <TableCell>{row.relatedName ?? "—"}</TableCell>
                    <TableCell className="text-sm">{row.requesterName ?? "—"}</TableCell>
                    <TableCell className="text-sm">{row.reasonForRequest}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${PRIORITY_COLOR[row.priorityLevel] ?? ""}`}>
                        {row.priorityLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(row.requestedDueDate)}</TableCell>
                    <TableCell>
                      <Select
                        value={row.status}
                        onValueChange={(val) => {
                          updateMutation.mutate({
                            id: row.id,
                            status: val as Status,
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0 shadow-none">
                          <Badge className={`text-xs ${STATUS_COLOR[row.status] ?? ""}`}>
                            {row.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.agentId ?? "unassigned"}
                        onValueChange={(val) => {
                          updateMutation.mutate({
                            id: row.id,
                            agentId: val === "unassigned" ? null : val,
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 w-auto min-w-30 border-0 bg-transparent p-0 shadow-none">
                          {row.agentFirstName ? (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <UserCheck className="h-3 w-3" />
                              {row.agentFirstName} {row.agentLastName}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unassigned</span>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-1">
                            <Input
                              placeholder="Search agent…"
                              className="mb-1 h-7 text-xs"
                              value={agentSearches[row.id] ?? ""}
                              onChange={(e) => setAgentSearches((prev) => ({ ...prev, [row.id]: e.target.value }))}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {agentsList
                            ?.filter((agent) => {
                              const q = (agentSearches[row.id] ?? "").toLowerCase();
                              if (!q) return true;
                              return (
                                agent.firstName.toLowerCase().includes(q) ||
                                agent.lastName.toLowerCase().includes(q)
                              );
                            })
                            .map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.firstName} {agent.lastName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                      {row.additionalNotes ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(row.createdAt)}
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