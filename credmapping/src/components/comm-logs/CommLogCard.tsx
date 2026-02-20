"use client";

import { format } from "date-fns";
import { Mail, Phone, Package, FileText, Link as LinkIcon, Users } from "lucide-react";

interface CommLogCardProps {
  id: string;
  commType: string | null;
  subject: string | null;
  notes: string | null;
  status: string | null;
  createdAt: Date | string | null;
  nextFollowupAt: Date | string | null;
  agentName: string | null;
}

const commTypeIcons: Record<string, React.ReactNode> = {
  Email: <Mail className="w-5 h-5" />,
  Phone: <Phone className="w-5 h-5" />,
  "Phone Call": <Phone className="w-5 h-5" />,
  Dropbox: <Package className="w-5 h-5" />,
  Document: <FileText className="w-5 h-5" />,
  Modio: <LinkIcon className="w-5 h-5" />,
  Meeting: <Users className="w-5 h-5" />,
};

const statusColors: Record<string, string> = {
  pending_response: "bg-yellow-500/15 text-yellow-400",
  fu_completed: "bg-green-500/15 text-green-400",
  received: "bg-blue-500/15 text-blue-400",
  closed: "bg-zinc-500/15 text-zinc-400",
};

export function CommLogCard({ 
  commType, 
  subject, 
  notes, 
  status, 
  createdAt,
  nextFollowupAt,
  agentName 
}: CommLogCardProps) {
  const icon = commTypeIcons[commType ?? ""] ?? <FileText className="w-5 h-5" />;
  const statusColor = statusColors[status ?? ""] ?? "bg-zinc-700 text-zinc-400";
  
  return (
    <div className="p-4 bg-[#1e2022] rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors">
      <div className="flex items-start gap-3">
        <div className="text-zinc-400 flex-shrink-0 mt-1">{icon}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h4 className="font-medium text-white truncate">{subject ?? "Untitled"}</h4>
              <p className="text-sm text-zinc-400 mt-1">
                {format(new Date(createdAt ?? new Date()), "MMM d, yyyy HH:mm")}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${statusColor}`}>
              {status?.replace(/_/g, " ") ?? "Unknown"}
            </span>
          </div>

          {notes && (
            <p className="text-sm text-zinc-300 mt-2 line-clamp-2">{notes}</p>
          )}

          <div className="flex items-center justify-between mt-3 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              {agentName && (
                <span className="px-2 py-1 rounded bg-zinc-800">
                  {agentName}
                </span>
              )}
              {nextFollowupAt && (
                <span className="px-2 py-1 rounded bg-zinc-800">
                  Follow-up: {format(new Date(nextFollowupAt), "MMM d")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
