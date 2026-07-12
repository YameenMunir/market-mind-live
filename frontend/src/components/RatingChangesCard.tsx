import { Clock, Minus, Plus, TrendingDown, TrendingUp, Users } from "lucide-react";

import { LastUpdated } from "@/components/LastUpdated";
import { Panel } from "@/components/Panel";
import { cn, timeAgo } from "@/lib/utils";
import type { ApiError, RatingChangeAction, RatingChangeFeed } from "@/types";

interface RatingChangesCardProps {
  changes: RatingChangeFeed | null;
  isLoading?: boolean;
  error?: ApiError | null;
}

const ACTION_META: Record<RatingChangeAction, { label: string; icon: typeof TrendingUp; color: string; badgeClass: string }> = {
  upgrade: { label: "Upgrade", icon: TrendingUp, color: "text-bull", badgeClass: "bg-bull/10" },
  downgrade: { label: "Downgrade", icon: TrendingDown, color: "text-bear", badgeClass: "bg-bear/10" },
  initiated: { label: "Initiated", icon: Plus, color: "text-ink-muted", badgeClass: "bg-surface-raised" },
  reiterated: { label: "Reiterated", icon: Minus, color: "text-ink-faint", badgeClass: "bg-surface-raised" },
  other: { label: "Updated", icon: Minus, color: "text-ink-faint", badgeClass: "bg-surface-raised" },
};

export function RatingChangesCard({ changes, isLoading, error }: RatingChangesCardProps) {
  const items = changes?.changes ?? [];

  return (
    <Panel eyebrow="Analyst Activity" title="Rating Changes" className="flex h-full flex-col">
      {!changes && error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border px-3 py-6 text-center">
          <Clock size={18} className="text-ink-faint" aria-hidden />
          <p className="text-xs font-mono font-bold uppercase text-ink-muted">
            {error.errorCode === "rate_limited" ? "Rate-Limited" : "Load Failed"}
          </p>
          <p className="font-mono text-2xs leading-relaxed text-ink-faint">
            {error.errorCode === "rate_limited"
              ? "The market data provider is busy. Automatic retry active."
              : error.message}
          </p>
        </div>
      ) : !changes && isLoading ? (
        <div aria-hidden className="animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5 border-b border-border/60 pb-3 last:border-0">
              <div className="h-3 w-2/3 rounded-sm bg-surface-raised" />
              <div className="h-3 w-1/2 rounded-sm bg-surface-raised" />
              <div className="h-2.5 w-20 rounded-sm bg-surface-raised" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border px-3 py-6 text-center">
          <Users size={18} className="text-ink-faint" aria-hidden />
          <p className="font-mono text-xs font-bold uppercase text-ink-muted">No Recent Activity</p>
          <p className="font-mono text-2xs leading-relaxed text-ink-faint">
            No analyst rating changes on record for this symbol.
          </p>
        </div>
      ) : (
        <ul className="-mx-1 max-h-80 space-y-3 overflow-y-auto px-1">
          {items.map((change, i) => {
            const meta = ACTION_META[change.action];
            const Icon = meta.icon;
            return (
              <li
                key={`${change.firm}-${change.graded_at}-${i}`}
                className={i < items.length - 1 ? "border-b border-border/60 pb-3" : ""}
              >
                <div className="flex items-start gap-2.5">
                  <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm", meta.badgeClass)}>
                    <Icon size={12} className={meta.color} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-ink">
                      {change.firm}
                      <span className={cn("font-mono text-2xs font-bold uppercase tracking-wider", meta.color)}>
                        {meta.label}
                      </span>
                    </p>
                    {(change.from_grade || change.to_grade) && (
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {change.from_grade && change.to_grade
                          ? `${change.from_grade} → ${change.to_grade}`
                          : change.to_grade ?? change.from_grade}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-2xs uppercase text-ink-faint">{timeAgo(change.graded_at)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {changes && (
        <div className="mt-auto pt-3">
          <div className="border-t border-border pt-3">
            <LastUpdated updatedAt={changes.as_of} isStale={changes.is_stale} />
          </div>
        </div>
      )}
    </Panel>
  );
}
