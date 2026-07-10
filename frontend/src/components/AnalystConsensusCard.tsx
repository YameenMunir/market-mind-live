import { Clock, Minus, TrendingDown, TrendingUp, Users } from "lucide-react";

import { LastUpdated } from "@/components/LastUpdated";
import { Panel } from "@/components/Panel";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { cn, formatPrice } from "@/lib/utils";
import type { AnalystConsensus, AnalystRating, ApiError } from "@/types";

interface AnalystConsensusCardProps {
  consensus: AnalystConsensus | null;
  isLoading?: boolean;
  error?: ApiError | null;
  symbol: string;
}

const RATING_META: Record<AnalystRating, { label: string; icon: typeof TrendingUp; color: string }> = {
  strong_buy: { label: "Strong Buy", icon: TrendingUp, color: "text-bull" },
  buy: { label: "Buy", icon: TrendingUp, color: "text-bull" },
  hold: { label: "Hold", icon: Minus, color: "text-warn" },
  sell: { label: "Sell", icon: TrendingDown, color: "text-bear" },
  strong_sell: { label: "Strong Sell", icon: TrendingDown, color: "text-bear" },
  not_covered: { label: "Not Covered", icon: Minus, color: "text-ink-faint" },
};

export function AnalystConsensusCard({ consensus, isLoading, error, symbol }: AnalystConsensusCardProps) {
  const { currency, convert } = useCurrencyContext();
  const meta = consensus ? RATING_META[consensus.rating] : null;
  const Icon = meta?.icon ?? Minus;
  const nativeCurrency = consensus?.currency ?? "USD";

  const isNotCovered = consensus?.rating === "not_covered";
  const bullish = consensus ? consensus.strong_buy + consensus.buy : 0;
  const neutral = consensus?.hold ?? 0;
  const bearish = consensus ? consensus.sell + consensus.strong_sell : 0;
  const total = bullish + neutral + bearish;

  return (
    <Panel
      eyebrow="Analyst Consensus"
      title={meta ? meta.label : isLoading ? "Loading..." : "--"}
      className="flex h-full flex-col"
    >
      {!consensus && error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border px-3 py-6 text-center">
          <Clock size={18} className="text-ink-faint" aria-hidden />
          <p className="text-xs font-mono font-bold uppercase text-ink-muted">
            {error.errorCode === "rate_limited" ? "Rate-Limited" : "Load Failed"}
          </p>
          <p className="font-mono text-[10px] leading-relaxed text-ink-faint">
            {error.errorCode === "rate_limited"
              ? "The market data provider is busy. Automatic retry active."
              : error.message}
          </p>
        </div>
      ) : !consensus && isLoading ? (
        <div aria-hidden className="animate-pulse">
          <div className="h-5 w-24 rounded-sm bg-surface-raised" />
          <div className="mt-3 h-3 w-full rounded-sm bg-surface-raised" />
          <div className="mt-3 h-3 w-32 rounded-sm bg-surface-raised" />
        </div>
      ) : isNotCovered ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border px-3 py-6 text-center">
          <Users size={18} className="text-ink-faint" aria-hidden />
          <p className="font-mono text-xs font-bold uppercase text-ink-muted">No Analyst Coverage</p>
          <p className="font-mono text-[10px] leading-relaxed text-ink-faint">
            Not covered by equity analysts.
          </p>
        </div>
      ) : (
        consensus && (
          <>
            <div className={cn("inline-flex items-center gap-2 rounded-sm border px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider", meta?.color === "text-bull" ? "border-bull/20 bg-bull/5 text-bull" : meta?.color === "text-bear" ? "border-bear/20 bg-bear/5 text-bear" : "border-border bg-surface-raised text-ink-muted")}>
              <Icon size={14} className="shrink-0" aria-hidden />
              <span className="truncate">{meta?.label}</span>
            </div>
            <p className="mt-2 font-mono text-[10px] text-ink-faint uppercase">
              Based on {consensus.total_analysts} analyst{consensus.total_analysts === 1 ? "" : "s"}
            </p>

            {total > 0 && (
              <div
                role="img"
                aria-label={`${bullish} buy, ${neutral} hold, ${bearish} sell ratings`}
                className="mt-3 flex h-3 w-full overflow-hidden rounded-sm border border-border bg-surface-raised"
              >
                {bullish > 0 && <div className="h-full bg-bull" style={{ width: `${(bullish / total) * 100}%` }} />}
                {neutral > 0 && <div className="h-full bg-warn" style={{ width: `${(neutral / total) * 100}%` }} />}
                {bearish > 0 && <div className="h-full bg-bear" style={{ width: `${(bearish / total) * 100}%` }} />}
              </div>
            )}

            {consensus.price_target_mean != null && (
              <div className="mt-4 border-t border-border pt-3 font-mono text-xs">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-[10px] uppercase font-bold text-ink-faint">Target (mean)</span>
                  <span className="numeric font-semibold text-ink">
                    {formatPrice(convert(consensus.price_target_mean, nativeCurrency), currency)}
                  </span>
                </div>
                {consensus.price_target_low != null && consensus.price_target_high != null && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-[10px] uppercase font-bold text-ink-faint">Target Range</span>
                    <span className="numeric font-semibold text-ink">
                      {formatPrice(convert(consensus.price_target_low, nativeCurrency), currency)} &ndash;{" "}
                      {formatPrice(convert(consensus.price_target_high, nativeCurrency), currency)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )
      )}

      {consensus && !isNotCovered && (
        <div className="mt-auto pt-3">
          <div className="border-t border-border pt-3">
            <LastUpdated updatedAt={consensus.as_of} isStale={consensus.is_stale} />
          </div>
        </div>
      )}
    </Panel>
  );
}
