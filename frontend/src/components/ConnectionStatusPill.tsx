import { cn } from "@/lib/utils";
import type { ConnectionState } from "@/hooks/useLiveQuote";

const LABELS: Record<ConnectionState, string> = {
  connecting: "Connecting to live market data...",
  live: "Live",
  polling: "Live (polling)",
  reconnecting: "Reconnecting...",
  error: "Connection issue",
};

const DOT_STYLES: Record<ConnectionState, string> = {
  connecting: "bg-warn animate-pulse-soft",
  live: "bg-bull",
  polling: "bg-brand",
  reconnecting: "bg-warn animate-pulse-soft",
  error: "bg-bear",
};

export function ConnectionStatusPill({ state }: { state: ConnectionState }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink-muted">
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[state])} />
      {LABELS[state]}
    </div>
  );
}
