"use client";

import { useState } from "react";
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { useNow } from "@/hooks/useNow";
import { SIGNAL_META } from "@/lib/signalMeta";
import { cn, timeAgo } from "@/lib/utils";
import type { ChatSessionSummary } from "@/types";

const RISK_LABEL: Record<string, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  extreme: "Extreme risk",
};

interface AIChatHistoryListProps {
  sessions: ChatSessionSummary[];
  isLoading: boolean;
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onNewChat: () => void;
  className?: string;
}

export function AIChatHistoryList({
  sessions,
  isLoading,
  activeSessionId,
  onSelect,
  onDelete,
  onNewChat,
  className,
}: AIChatHistoryListProps) {
  useNow(60_000); // keep "X ago" timestamps fresh without refetching
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-between border-b border-border p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Chat History</p>
        <Button variant="secondary" size="sm" onClick={onNewChat}>
          <MessageSquarePlus size={13} />
          New chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex items-center gap-2 p-3 text-xs text-ink-faint">
            <Loader2 size={13} className="animate-spin" />
            Loading history...
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <p className="p-3 text-xs leading-relaxed text-ink-faint">
            No previous conversations yet - anything you ask the assistant will show up here.
          </p>
        )}

        {!isLoading &&
          sessions.map((session) => {
            const signalMeta = session.signal ? SIGNAL_META[session.signal] : null;
            const isActive = session.session_id === activeSessionId;
            return (
              <div
                key={session.session_id}
                className={cn(
                  "group relative mb-1.5 rounded-lg border p-2.5 transition-colors",
                  isActive ? "border-brand/40 bg-brand/5" : "border-transparent hover:bg-surface-raised"
                )}
              >
                {confirmingId === session.session_id ? (
                  <div className="flex items-center justify-between gap-2 py-0.5">
                    <p className="text-[11px] font-medium text-ink">Delete this chat?</p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setConfirmingId(null)}
                        className="h-auto px-2 py-1 text-[10px]"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          onDelete(session.session_id);
                          setConfirmingId(null);
                        }}
                        className="h-auto border-none bg-bear px-2 py-1 text-[10px] text-white hover:bg-bear/90"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={() => onSelect(session.session_id)} className="w-full text-left">
                      <div className="flex flex-wrap items-center gap-1.5 pr-6">
                        <span className="text-xs font-semibold text-ink">{session.asset}</span>
                        {signalMeta && (
                          <Badge size="sm" tone={signalMeta.tone}>
                            {signalMeta.label}
                          </Badge>
                        )}
                        {session.risk_level && (
                          <Badge size="sm" className="font-medium">
                            {RISK_LABEL[session.risk_level]}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 truncate text-[11px] text-ink-muted">{session.last_message_preview || "New conversation"}</p>
                      <p className="mt-0.5 text-[10px] text-ink-faint">{timeAgo(session.updated_at)}</p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setConfirmingId(session.session_id)}
                      aria-label="Delete conversation"
                      className="absolute right-2 top-2.5 h-6 w-6 text-ink-faint hover:bg-transparent hover:text-bear sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
