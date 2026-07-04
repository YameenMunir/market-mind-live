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

const RISK_META = {
  low: { label: "Low Risk", color: "bg-bull", text: "text-bull" },
  medium: { label: "Medium Risk", color: "bg-warn", text: "text-warn" },
  high: { label: "High Risk", color: "bg-brand", text: "text-brand" },
  extreme: { label: "Extreme Risk", color: "bg-bear", text: "text-bear" },
} as const;

export function RiskCard({ risk, updatedAt, isLive, isStale }: RiskCardProps) {
  const meta = risk ? RISK_META[risk.risk_level] : null;

  return (
    <Panel eyebrow="Risk Assessment" title={meta?.label ?? "--"}>
      <div
        role="meter"
        aria-label="Risk score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={risk ? Math.round(risk.risk_score) : undefined}
        className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-raised", !risk && "animate-pulse")}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-700", meta?.color ?? "bg-ink-faint")}
          style={{ width: `${risk?.risk_score ?? 0}%` }}
        />
      </div>
      {risk ? (
        <p className={cn("mt-2 numeric text-xs font-medium", meta?.text ?? "text-ink-muted")}>
          Risk score {Math.round(risk.risk_score)} / 100
        </p>
      ) : (
        <div aria-hidden className="mt-2.5 h-3 w-28 animate-pulse rounded bg-surface-raised" />
      )}

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-ink-faint">Annualized volatility</span>
        <span className="numeric font-medium text-ink">
          {risk ? `${risk.volatility_annualized_pct.toFixed(1)}%` : "--"}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-ink-faint">Max drawdown</span>
        <span className="numeric font-medium text-ink">
          {risk?.max_drawdown_pct !== null && risk?.max_drawdown_pct !== undefined
            ? `${risk.max_drawdown_pct.toFixed(1)}%`
            : "--"}
        </span>
      </div>

      {risk && risk.factors.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
          {risk.factors.map((factor, i) => (
            <li key={i} className="text-[11px] leading-relaxed text-ink-muted">
              {factor}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <LastUpdated updatedAt={updatedAt ?? null} live={isLive} isStale={isStale} />
      </div>
    </Panel>
  );
}
