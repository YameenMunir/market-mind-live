"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Building2,
  Globe,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  Briefcase,
  ExternalLink,
} from "lucide-react";

import { LastUpdated } from "@/components/LastUpdated";
import { Panel } from "@/components/Panel";
import { api } from "@/lib/api";
import { cn, formatCompactNumber, formatPercent } from "@/lib/utils";
import type { AssetFundamentals } from "@/types";

interface FundamentalsPanelProps {
  symbol: string;
  className?: string;
}

// A ratio/multiple ("24.51x") has no shared equivalent in lib/utils.ts (it's specific
// to this panel), but still routes through the same null/NaN guard as the shared
// formatters instead of a bare truthy check - `debt_to_equity: 0` (a debt-free
// company) is a real value, not missing data, and a `val ? ... : "--"` check would
// have wrongly hidden it.
function fmtMultiple(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "--";
  return val.toFixed(2) + "x";
}

// Fundamentals-specific: most percent fields here are stored as decimals (0.23 ==
// 23%), a couple (e.g. dividend_yield) already arrive as a raw percent - `isRawPercent`
// picks which. Delegates the actual null/NaN safety and formatting to lib/utils.ts's
// formatPercent rather than re-deriving it, and suppresses its "+" sign (right for a
// price change, not for "Gross Margin: +23.00%").
function fmtFundamentalsPercent(val: number | null | undefined, isRawPercent = false): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "--";
  return formatPercent(isRawPercent ? val : val * 100, false);
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return "--";
  try {
    return new Date(val).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return val;
  }
}

/** One label/value row - the shared shape ~20 stats across this panel were each
 * hand-rolling slightly differently (see the removed duplication). Numbers get
 * `.numeric` (tabular figures) so a column of them stays visually aligned. */
function StatRow({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1">
      <span className="flex items-center gap-1.5 text-ink-faint">
        {icon}
        {label}
      </span>
      <span className="numeric font-semibold text-ink">{value}</span>
    </div>
  );
}

export function FundamentalsPanel({ symbol, className }: FundamentalsPanelProps) {
  const [data, setData] = useState<AssetFundamentals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    api.getFundamentals(symbol)
      .then((res) => {
        if (active) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Error fetching fundamentals:", err);
          setError("Fundamentals data not available.");
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [symbol]);

  if (isLoading) {
    return (
      <Panel eyebrow="Fundamentals" title="Valuation & Profile" className={className}>
        <div className="flex h-48 animate-pulse flex-col justify-between gap-4 rounded bg-surface-raised/40 p-4">
          <div className="h-6 w-1/3 rounded bg-surface-raised" />
          <div className="h-16 w-full rounded bg-surface-raised" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="h-10 rounded bg-surface-raised" />
            <div className="h-10 rounded bg-surface-raised" />
            <div className="h-10 rounded bg-surface-raised" />
            <div className="h-10 rounded bg-surface-raised" />
          </div>
        </div>
      </Panel>
    );
  }

  if (error || !data) {
    return null; // Gracefully hide when fundamentals are not available (e.g. indices or missing symbols)
  }

  const showProfile = Boolean(data.sector || data.industry || data.employees || data.description);

  return (
    <Panel
      eyebrow="Company Profile & Fundamentals"
      title={`${symbol} Valuation Summary`}
      className={cn("w-full transition-all duration-300", className)}
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Profile Card */}
        {showProfile && (
          <div className="flex-1 lg:max-w-md border-b lg:border-b-0 lg:border-r border-border/60 pb-6 lg:pb-0 lg:pr-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 text-ink-muted">
              {data.sector && (
                <span className="flex items-center gap-1.5 rounded-sm border border-border/80 bg-surface px-2.5 py-1 font-mono text-2xs font-bold uppercase tracking-wider text-ink-faint">
                  <Briefcase size={12} className="text-brand" />
                  {data.sector}
                </span>
              )}
              {data.industry && (
                <span className="flex items-center gap-1.5 rounded-sm border border-border/80 bg-surface px-2.5 py-1 font-mono text-2xs font-bold uppercase tracking-wider text-ink-faint">
                  <Building2 size={12} className="text-brand" />
                  {data.industry}
                </span>
              )}
            </div>

            {data.description && (
              <div className="flex flex-col gap-2">
                <h4 className="font-mono text-2xs font-bold uppercase tracking-wider text-ink-faint">Business Profile</h4>
                <p className="text-xs leading-relaxed text-ink-muted line-clamp-6 hover:line-clamp-none transition-all duration-300 cursor-pointer">
                  {data.description}
                </p>
              </div>
            )}

            <div className="mt-auto grid grid-cols-2 gap-4 border-t border-border/40 pt-4 text-xs font-mono">
              {data.employees !== null && data.employees !== undefined && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-2xs text-ink-faint uppercase">Employees</span>
                  <span className="numeric font-medium text-ink flex items-center gap-1.5">
                    <Users size={12} className="text-brand/70" />
                    {data.employees.toLocaleString()}
                  </span>
                </div>
              )}
              {data.website && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-2xs text-ink-faint uppercase">Corporate Site</span>
                  <a
                    href={data.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:underline flex items-center gap-1"
                  >
                    <Globe size={12} className="text-brand/70" />
                    Visit Website
                    <ExternalLink size={10} className="ml-0.5 shrink-0" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fundamentals Stats Grid */}
        <div className="flex-[2] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Valuation Stats */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-2xs font-bold uppercase tracking-wider text-brand border-b border-brand/20 pb-1.5">Valuation Metrics</h4>
            <div className="flex flex-col gap-2.5 font-mono text-xs">
              <StatRow label="Trailing P/E" value={fmtMultiple(data.trailing_pe)} />
              <StatRow label="Forward P/E" value={fmtMultiple(data.forward_pe)} />
              <StatRow label="PEG Ratio" value={fmtMultiple(data.peg_ratio)} />
              <StatRow label="Trailing EPS" value={`$${formatCompactNumber(data.trailing_eps)}`} />
              <StatRow label="Forward EPS" value={`$${formatCompactNumber(data.forward_eps)}`} />
              <StatRow label="Beta (Volatility)" value={data.beta !== null && data.beta !== undefined ? data.beta.toFixed(2) : "--"} />
            </div>
          </div>

          {/* Margins & Financial Performance */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-2xs font-bold uppercase tracking-wider text-brand border-b border-brand/20 pb-1.5">Margins & Financials</h4>
            <div className="flex flex-col gap-2.5 font-mono text-xs">
              <StatRow label="Gross Margin" value={fmtFundamentalsPercent(data.gross_margins)} />
              <StatRow label="Operating Margin" value={fmtFundamentalsPercent(data.operating_margins)} />
              <StatRow label="Profit Margin" value={fmtFundamentalsPercent(data.profit_margins)} />
              <StatRow label="Return on Equity" value={fmtFundamentalsPercent(data.return_on_equity)} />
              <StatRow label="Return on Assets" value={fmtFundamentalsPercent(data.return_on_assets)} />
              <StatRow
                label="Debt to Equity"
                value={data.debt_to_equity !== null && data.debt_to_equity !== undefined ? fmtMultiple(data.debt_to_equity / 100) : "--"}
              />
            </div>
          </div>

          {/* Trading & Balance Sheet Stats */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-2xs font-bold uppercase tracking-wider text-brand border-b border-brand/20 pb-1.5">Balance Sheet & Trading</h4>
            <div className="flex flex-col gap-2.5 font-mono text-xs">
              <StatRow label="Market Cap" icon={<DollarSign size={10} className="text-brand/70" />} value={formatCompactNumber(data.market_cap)} />
              <StatRow label="Enterprise Value" icon={<DollarSign size={10} className="text-brand/70" />} value={formatCompactNumber(data.enterprise_value)} />
              <StatRow label="Total Revenue" value={formatCompactNumber(data.total_revenue)} />
              <StatRow label="EBITDA" value={formatCompactNumber(data.ebitda)} />
              <StatRow label="Free Cash Flow" value={formatCompactNumber(data.free_cashflow)} />
              <StatRow label="Shares Short / Float" value={fmtFundamentalsPercent(data.short_percent_of_float)} />
            </div>
          </div>

          {/* Range & Analyst targets */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-2xs font-bold uppercase tracking-wider text-brand border-b border-brand/20 pb-1.5">Market Ranges & Targets</h4>
            <div className="flex flex-col gap-2.5 font-mono text-xs">
              <StatRow
                label="52-Week Range"
                value={`$${formatCompactNumber(data.fifty_two_week_low)} - $${formatCompactNumber(data.fifty_two_week_high)}`}
              />
              <StatRow label="50-Day Moving Avg" value={`$${formatCompactNumber(data.fifty_day_average)}`} />
              <StatRow label="200-Day Moving Avg" value={`$${formatCompactNumber(data.two_hundred_day_average)}`} />
              <StatRow
                label="Mean Price Target"
                value={<span className="text-brand">${formatCompactNumber(data.price_target_mean)}</span>}
              />
              <StatRow label="Dividend Yield" value={fmtFundamentalsPercent(data.dividend_yield, true)} />
              <StatRow label="Payout Ratio" value={fmtFundamentalsPercent(data.payout_ratio)} />
            </div>
          </div>

          {/* Earnings Calendar */}
          {(data.next_earnings_date || data.earnings_average) && (
            <div className="flex flex-col gap-3 md:col-span-2 xl:col-span-2">
              <h4 className="font-mono text-2xs font-bold uppercase tracking-wider text-brand border-b border-brand/20 pb-1.5">Earnings Calendar</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2.5 font-mono text-xs">
                  <StatRow
                    label="Next Earnings Date"
                    icon={<Calendar size={12} className="text-brand/70" />}
                    value={fmtDate(data.next_earnings_date)}
                  />
                  <StatRow
                    label="EPS Estimate (Avg)"
                    value={data.earnings_average !== null && data.earnings_average !== undefined ? `$${data.earnings_average.toFixed(2)}` : "--"}
                  />
                  <StatRow
                    label="EPS Range (Low - High)"
                    value={
                      <>
                        {data.earnings_low !== null && data.earnings_low !== undefined ? `$${data.earnings_low.toFixed(2)}` : "--"}
                        {" - "}
                        {data.earnings_high !== null && data.earnings_high !== undefined ? `$${data.earnings_high.toFixed(2)}` : "--"}
                      </>
                    }
                  />
                </div>

                <div className="flex flex-col gap-2.5 font-mono text-xs">
                  <StatRow
                    label="Revenue Estimate (Avg)"
                    icon={<TrendingUp size={12} className="text-brand/70" />}
                    value={formatCompactNumber(data.revenue_average)}
                  />
                  <StatRow
                    label="Revenue Range (Low - High)"
                    value={`${formatCompactNumber(data.revenue_low)} - ${formatCompactNumber(data.revenue_high)}`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <LastUpdated updatedAt={data.as_of} isStale={data.is_stale} />
      </div>
    </Panel>
  );
}
