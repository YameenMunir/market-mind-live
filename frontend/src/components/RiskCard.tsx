import { LastUpdated } from "@/components/LastUpdated";
import { Panel } from "@/components/Panel";
import { cn } from "@/lib/utils";
import type { RiskAssessment } from "@/types";

interface RiskCardProps {
  risk: RiskAssessment | null;
  updatedAt?: string | null;
  isLive?: boolean;
  isStale?: boolean;
}

// A severity ramp, not a brand palette - `brand` is reserved for primary actions/
// live-state/focus (see DESIGN_SYSTEM.md), so "high" isn't the gold accent color
// stretched to mean something else. It shares `bear`'s hue with "extreme" (both are
// genuinely on the same red end of the scale) but at reduced weight for the meter
// fill, while the text stays full-strength bear for reliable contrast - severity is
// still unambiguous from the label text itself ("High Risk" vs "Extreme Risk"),
// which is also what keeps this from depending on color alone.
const RISK_META = {
  low: { label: "Low Risk", color: "bg-bull", text: "text-bull" },
  medium: { label: "Medium Risk", color: "bg-warn", text: "text-warn" },
  high: { label: "High Risk", color: "bg-bear/65", text: "text-bear" },
  extreme: { label: "Extreme Risk", color: "bg-bear", text: "text-bear" },
} as const;

export function RiskCard({ risk, updatedAt, isLive, isStale }: RiskCardProps) {
  const meta = risk ? RISK_META[risk.risk_level] : null;

  return (
    <Panel eyebrow="Risk Assessment" title={meta?.label ?? "--"} className="flex h-full flex-col">
      <div
        role="meter"
        aria-label="Risk score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={risk ? Math.round(risk.risk_score) : undefined}
        className={cn("h-3 w-full overflow-hidden rounded-sm border border-border bg-surface-raised my-1.5", !risk && "animate-pulse")}
      >
        <div
          className={cn("h-full transition-all duration-700", meta?.color ?? "bg-ink-faint")}
          style={{ width: `${risk?.risk_score ?? 0}%` }}
        />
      </div>
      {risk ? (
        <p className={cn("mt-1.5 font-mono text-2xs font-bold uppercase", meta?.text ?? "text-ink-muted")}>
          Score: {Math.round(risk.risk_score)} / 100
        </p>
      ) : (
        <div aria-hidden className="mt-2.5 h-3 w-28 animate-pulse rounded-sm bg-surface-raised" />
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-xs">
        <span className="text-2xs font-bold uppercase text-ink-faint">Annualized volatility</span>
        <span className="numeric font-semibold text-ink">
          {risk ? `${risk.volatility_annualized_pct.toFixed(1)}%` : "--"}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-xs">
        <span className="text-2xs font-bold uppercase text-ink-faint">Max drawdown</span>
        <span className="numeric font-semibold text-ink">
          {risk?.max_drawdown_pct !== null && risk?.max_drawdown_pct !== undefined
            ? `${risk.max_drawdown_pct.toFixed(1)}%`
            : "--"}
        </span>
      </div>

      {risk && risk.factors.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
          {risk.factors.map((factor, i) => (
            <li key={i} className="text-xs leading-relaxed text-ink-muted">
              &bull; {factor}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-3">
        <LastUpdated updatedAt={updatedAt ?? null} live={isLive} isStale={isStale} />
      </div>
    </Panel>
  );
}
