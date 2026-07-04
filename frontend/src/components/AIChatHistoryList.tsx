"use client";

import { useState } from "react";
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";

import { useNow } from "@/hooks/useNow";
import { cn, timeAgo } from "@/lib/utils";
import type { ChatSessionSummary } from "@/types";

const SIGNAL_META: Record<string, { label: string; className: string }> = {
  buy: { label: "Buy signal", className: "bg-bull/15 text-bull" },
  sell: { label: "Sell signal", className: "bg-bear/15 text-bear" },
  hold: { label: "Hold signal", className: "bg-warn/15 text-warn" },
};

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
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <MessageSquarePlus size={13} />
          New chat
        </button>
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
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-ink-muted transition-colors hover:text-ink"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onDelete(session.session_id);
                          setConfirmingId(null);
                        }}
                        className="rounded-md bg-bear px-2 py-1 text-[10px] font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={() => onSelect(session.session_id)} className="w-full text-left">
                      <div className="flex flex-wrap items-center gap-1.5 pr-6">
                        <span className="text-xs font-semibold text-ink">{session.asset}</span>
                        {signalMeta && (
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", signalMeta.className)}>
                            {signalMeta.label}
                          </span>
                        )}
                        {session.risk_level && (
                          <span className="rounded-full bg-surface-raised px-1.5 py-0.5 text-[9px] font-medium text-ink-faint">
                            {RISK_LABEL[session.risk_level]}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-[11px] text-ink-muted">{session.last_message_preview || "New conversation"}</p>
                      <p className="mt-0.5 text-[10px] text-ink-faint">{timeAgo(session.updated_at)}</p>
                    </button>
                    <button
                      onClick={() => setConfirmingId(session.session_id)}
                      aria-label="Delete conversation"
                      className="absolute right-2 top-2.5 flex h-6 w-6 items-center justify-center rounded text-ink-faint transition-colors hover:text-bear sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
