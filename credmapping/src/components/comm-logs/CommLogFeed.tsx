"use client";

import { CommLogCard } from "./CommLogCard";

interface CommLog {
  id: string;
  commType: string | null;
  subject: string | null;
  notes: string | null;
  status: string | null;
  createdAt: Date | string | null;
  nextFollowupAt: Date | string | null;
  agentName: string | null;
}

interface CommLogFeedProps {
  logs: CommLog[];
  isLoading?: boolean;
  onNewLog?: () => void;
}

export function CommLogFeed({ logs, isLoading = false, onNewLog }: CommLogFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-[#1e2022] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400 mb-4">No communication logs yet</p>
        {onNewLog && (
          <button
            onClick={onNewLog}
            className="inline-block px-4 py-2 bg-[#c8a84b] text-black font-medium rounded hover:bg-[#dab855] transition-colors"
          >
            + Create First Log
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <CommLogCard
          key={log.id}
          id={log.id}
          commType={log.commType}
          subject={log.subject}
          notes={log.notes}
          status={log.status}
          createdAt={log.createdAt}
          nextFollowupAt={log.nextFollowupAt}
          agentName={log.agentName}
        />
      ))}
    </div>
  );
}
