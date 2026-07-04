import { Activity, Moon, Sunrise, Sunset } from "lucide-react";

import { LastUpdated } from "@/components/LastUpdated";
import { Panel } from "@/components/Panel";
import { cn } from "@/lib/utils";
import type { MarketStatus } from "@/types";

interface MarketStatusCardProps {
  status: MarketStatus | null;
  updatedAt?: string | null;
  isLive?: boolean;
  isStale?: boolean;
}

const SESSION_META = {
  open: { label: "Market Open", icon: Activity, dot: "bg-bull" },
  closed: { label: "Market Closed", icon: Moon, dot: "bg-ink-faint" },
  pre_market: { label: "Pre-Market", icon: Sunrise, dot: "bg-warn" },
  after_hours: { label: "After Hours", icon: Sunset, dot: "bg-warn" },
} as const;

export function MarketStatusCard({ status, updatedAt, isLive, isStale }: MarketStatusCardProps) {
  const meta = status ? SESSION_META[status.session] : null;
  const Icon = meta?.icon ?? Activity;

  return (
    <Panel eyebrow="Market Status" title={status?.symbol ?? "--"} className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised")}>
          <Icon size={18} className="text-ink-muted" />
        </div>
        {status ? (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta?.dot ?? "bg-ink-faint")} />
              <p className="text-sm font-semibold text-ink">{meta?.label ?? "Unknown"}</p>
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">{status.message}</p>
          </div>
        ) : (
          <div aria-hidden className="flex-1 animate-pulse">
            <div className="h-4 w-28 rounded bg-surface-raised" />
            <div className="mt-2 h-3 w-40 max-w-full rounded bg-surface-raised" />
          </div>
        )}
      </div>

      {status?.asset_type && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-3 text-xs">
          <span className="text-ink-faint">Asset class</span>
          <span className="font-medium capitalize text-ink">{status.asset_type}</span>
        </div>
      )}

      <div className="mt-auto">
        <LastUpdated updatedAt={updatedAt ?? null} live={isLive} isStale={isStale} />
      </div>
    </Panel>
  );
}
