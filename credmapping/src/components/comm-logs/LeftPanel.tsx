"use client";

import { useMemo } from "react";
import { FollowUpBadge } from "./FollowUpBadge";

interface ListItem {
  id: string;
  name: string;
  subText?: string;
  badge?: string;
  nextFollowupAt: Date | string | null;
  status?: string | null;
}

interface LeftPanelProps {
  mode: "provider" | "facility";
  onModeChange: (mode: "provider" | "facility") => void;
  items: ListItem[];
  selectedItemId?: string;
  onSelectItem: (id: string) => void;
  isLoading?: boolean;
  filter?: string;
  onFilterChange?: (filter: string) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
}

const providerFilters = ["All", "Past Due", "Due Today", "Pending", "Completed"];
const facilityFilters = ["All", "CRED", "NON-CRED", "Past Due", "Pending"];

export function LeftPanel({
  mode,
  onModeChange,
  items,
  selectedItemId,
  onSelectItem,
  isLoading = false,
  filter = "All",
  onFilterChange,
  search = "",
  onSearchChange,
}: LeftPanelProps) {
  const filters = mode === "provider" ? providerFilters : facilityFilters;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.subText?.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [items, search]);

  return (
    <div className="w-[290px] flex flex-col h-screen bg-[#181a1b] border-r border-zinc-700">
      {/* Header */}
      <div className="p-4 border-b border-zinc-700">
        {/* Toggle buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onModeChange("provider")}
            className={`flex-1 px-3 py-2 rounded font-medium text-sm transition-colors ${
              mode === "provider"
                ? "bg-[#c8a84b] text-black"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            Providers
          </button>
          <button
            onClick={() => onModeChange("facility")}
            className={`flex-1 px-3 py-2 rounded font-medium text-sm transition-colors ${
              mode === "facility"
                ? "bg-[#c8a84b] text-black"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            Facilities
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder={`Search ${mode}s...`}
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:border-[#c8a84b]"
        />
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-zinc-700 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange?.(f)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              filter === f
                ? "bg-[#c8a84b] text-black"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-zinc-800 rounded animate-pulse"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-4 text-center text-zinc-400 text-sm">
            No {mode}s found
          </div>
        ) : (
          <div className="p-2">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  selectedItemId === item.id
                    ? "bg-[#c8a84b]/20 border border-[#c8a84b]"
                    : "hover:bg-zinc-700 border border-zinc-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-white truncate">
                        {item.name}
                      </h4>
                      {item.status && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 whitespace-nowrap ${
                            item.status === "Active"
                              ? "bg-green-500/15 text-green-400"
                              : item.status === "Inactive"
                                ? "bg-zinc-700 text-zinc-400"
                                : item.status === "Pending"
                                  ? "bg-yellow-500/15 text-yellow-400"
                                  : ""
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                    {item.subText && (
                      <p className="text-xs text-zinc-400 truncate">
                        {item.subText}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <FollowUpBadge
                      nextFollowupAt={item.nextFollowupAt}
                      status={item.status}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
