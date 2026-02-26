"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { StandardEmptyState } from "./StandardEmptyState";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { api } from "~/trpc/react";

type MissingDoc = {
  id: string;
  information: string | null;
  roadblocks: string | null;
  nextFollowUp: string | null;
  followUpStatus: "Completed" | "Pending Response" | "Not Completed" | null;
};

interface MissingDocsManagerProps {
  relatedType: "provider" | "facility";
  relatedId: string;
  docs: MissingDoc[] | undefined;
  isLoading: boolean;
  onChanged: () => Promise<void> | void;
}

const defaultForm = {
  information: "",
  roadblocks: "",
  nextFollowUp: "",
};

export function MissingDocsManager({
  relatedType,
  relatedId,
  docs,
  isLoading,
  onChanged,
}: MissingDocsManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "completed" | "all"
  >("active");
  const [sortOrder, setSortOrder] = useState<"soonest" | "latest">("soonest");

  const createMutation = api.commLogs.createMissingDoc.useMutation();
  const updateMutation = api.commLogs.updateMissingDoc.useMutation();
  const isMutating = createMutation.isPending || updateMutation.isPending;

  const filteredDocs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const rows = [...(docs ?? [])]
      .filter((doc) => {
        if (statusFilter === "all") return true;
        const isCompleted =
          doc.followUpStatus === "Completed";
        return statusFilter === "completed" ? isCompleted : !isCompleted;
      })
      .filter((doc) => {
        if (!query) return true;
        return [doc.information, doc.roadblocks, doc.followUpStatus]
          .filter((v): v is string => Boolean(v))
          .some((v) => v.toLowerCase().includes(query));
      });

    rows.sort((a, b) => {
      const valueA = a.nextFollowUp ?? "9999-12-31";
      const valueB = b.nextFollowUp ?? "9999-12-31";
      return sortOrder === "soonest"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    });

    return rows;
  }, [docs, searchQuery, sortOrder, statusFilter]);

  const resetEditor = () => {
    setIsEditing(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const beginCreate = () => {
    setIsEditing(true);
    setEditingId(null);
    setForm(defaultForm);
  };

  const beginEdit = (doc: MissingDoc) => {
    setIsEditing(true);
    setEditingId(doc.id);
    setForm({
      information: doc.information ?? "",
      roadblocks: doc.roadblocks ?? "",
      nextFollowUp: doc.nextFollowUp ?? "",
    });
  };

  const save = async () => {
    if (!form.information.trim()) return;

    const payload = {
      information: form.information,
      roadblocks: form.roadblocks || undefined,
      nextFollowUp: form.nextFollowUp || undefined,
      followUpStatus: "Not Completed" as const,
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMutation.mutateAsync({ relatedType, relatedId, ...payload });
    }

    await onChanged();
    resetEditor();
  };

  return (
    <div>
      <div className="border-border bg-card sticky top-0 z-10 border-b px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 min-w-60 flex-1"
            placeholder="Search missing docs..."
          />
          <div className="ml-auto flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-9">
                  <SlidersHorizontal className="size-4" /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Missing Docs Filters</SheetTitle>
                  <SheetDescription>
                    Narrow down missing documentation records.
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 px-4 py-4">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(
                          e.target.value as "active" | "completed" | "all",
                        )
                      }
                      className="w-full rounded border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-300"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Archived</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Sort</label>
                    <select
                      value={sortOrder}
                      onChange={(e) =>
                        setSortOrder(e.target.value as "soonest" | "latest")
                      }
                      className="w-full rounded border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-300"
                    >
                      <option value="soonest">Next Follow-up (Soonest)</option>
                      <option value="latest">Next Follow-up (Latest)</option>
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setStatusFilter("active");
                      setSortOrder("soonest");
                      setSearchQuery("");
                    }}
                  >
                    Reset filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <Button size="sm" className="h-9" onClick={beginCreate}>
              + Add Missing Doc
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-6 py-4">
        {isEditing && (
          <div className="mb-4 grid gap-3 rounded-lg border border-zinc-700 bg-zinc-900/40 p-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Required Item</label>
              <Input
                placeholder="e.g. State License Copy"
                value={form.information}
                onChange={(e) =>
                  setForm((s) => ({ ...s, information: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">
                Next Follow-up Date
              </label>
              <Input
                type="date"
                value={form.nextFollowUp}
                onChange={(e) =>
                  setForm((s) => ({ ...s, nextFollowUp: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Record Status</label>
              <Input value="Not Completed" disabled />
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="text-xs text-zinc-400">Issue / Notes</label>
              <Textarea
                rows={3}
                placeholder="Describe what's missing and blockers"
                value={form.roadblocks}
                onChange={(e) =>
                  setForm((s) => ({ ...s, roadblocks: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2 md:col-span-3">
              <Button variant="outline" onClick={resetEditor}>
                Cancel
              </Button>
              <Button
                disabled={isMutating || !form.information.trim()}
                onClick={save}
              >
                {editingId ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="h-12 w-full animate-pulse rounded bg-zinc-800" />
        ) : filteredDocs.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-zinc-700 text-zinc-400">
                  <th className="px-4 py-3 text-left font-medium">
                    Required Item
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Issue / Notes
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Next Follow-up
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-3 font-medium text-zinc-200">
                      {doc.information}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 italic">
                      {doc.roadblocks ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {doc.followUpStatus ?? "Not Completed"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {doc.nextFollowUp
                        ? format(new Date(doc.nextFollowUp), "MMM d, yyyy")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => beginEdit(doc)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <StandardEmptyState message="No matching missing documentation found." />
        )}
      </div>
    </div>
  );
}
