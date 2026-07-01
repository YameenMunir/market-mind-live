import { Activity, Moon, Sunrise, Sunset } from "lucide-react";

import { Panel } from "@/components/Panel";
import { cn } from "@/lib/utils";
import type { MarketStatus } from "@/types";

interface MarketStatusCardProps {
  status: MarketStatus | null;
}

const SESSION_META = {
  open: { label: "Market Open", icon: Activity, dot: "bg-bull" },
  closed: { label: "Market Closed", icon: Moon, dot: "bg-ink-faint" },
  pre_market: { label: "Pre-Market", icon: Sunrise, dot: "bg-warn" },
  after_hours: { label: "After Hours", icon: Sunset, dot: "bg-warn" },
} as const;

export function MarketStatusCard({ status }: MarketStatusCardProps) {
  const meta = status ? SESSION_META[status.session] : null;
  const Icon = meta?.icon ?? Activity;

  return (
    <Panel eyebrow="Market Status" title={status?.symbol ?? "--"}>
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-surface-raised")}>
          <Icon size={18} className="text-ink-muted" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("h-1.5 w-1.5 rounded-full", meta?.dot ?? "bg-ink-faint")} />
            <p className="text-sm font-semibold text-ink">{meta?.label ?? "Unknown"}</p>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">{status?.message ?? "Awaiting market data..."}</p>
        </div>
      </div>

      {status?.asset_type && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="text-ink-faint">Asset class</span>
          <span className="font-medium capitalize text-ink">{status.asset_type}</span>
        </div>
      )}
    </Panel>
  );
}
