"use client";

import { useEffect, useState } from "react";
import { 
  Building2, 
  Globe, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Briefcase,
  ExternalLink 
} from "lucide-react";

import { Panel } from "@/components/Panel";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AssetFundamentals } from "@/types";

interface FundamentalsPanelProps {
  symbol: string;
  className?: string;
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

  // Formatters
  const fmtNum = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    const absVal = Math.abs(val);
    if (absVal >= 1e12) return (val / 1e12).toFixed(2) + "T";
    if (absVal >= 1e9) return (val / 1e9).toFixed(2) + "B";
    if (absVal >= 1e6) return (val / 1e6).toFixed(2) + "M";
    return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const fmtPercent = (val: number | null | undefined, isRawPercent = false): string => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    const mult = isRawPercent ? 1 : 100;
    return (val * mult).toFixed(2) + "%";
  };

  const fmtPE = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return val.toFixed(2) + "x";
  };

  const fmtDate = (val: string | null | undefined): string => {
    if (!val) return "—";
    try {
      const d = new Date(val);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return val;
    }
  };

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
              {data.employees && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-2xs text-ink-faint uppercase">Employees</span>
                  <span className="font-medium text-ink flex items-center gap-1.5">
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
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Trailing P/E</span>
                <span className="font-semibold text-ink">{fmtPE(data.trailing_pe)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Forward P/E</span>
                <span className="font-semibold text-ink">{fmtPE(data.forward_pe)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">PEG Ratio</span>
                <span className="font-semibold text-ink">{fmtPE(data.peg_ratio)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Trailing EPS</span>
                <span className="font-semibold text-ink">${fmtNum(data.trailing_eps)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Forward EPS</span>
                <span className="font-semibold text-ink">${fmtNum(data.forward_eps)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Beta (Volatility)</span>
                <span className="font-semibold text-ink">{data.beta ? data.beta.toFixed(2) : "—"}</span>
              </div>
            </div>
          </div>

          {/* Margins & Financial Performance */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-2xs font-bold uppercase tracking-wider text-brand border-b border-brand/20 pb-1.5">Margins & Financials</h4>
            <div className="flex flex-col gap-2.5 font-mono text-xs">
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Gross Margin</span>
                <span className="font-semibold text-ink">{fmtPercent(data.gross_margins)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Operating Margin</span>
                <span className="font-semibold text-ink">{fmtPercent(data.operating_margins)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Profit Margin</span>
                <span className="font-semibold text-ink">{fmtPercent(data.profit_margins)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Return on Equity</span>
                <span className="font-semibold text-ink">{fmtPercent(data.return_on_equity)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Return on Assets</span>
                <span className="font-semibold text-ink">{fmtPercent(data.return_on_assets)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Debt to Equity</span>
                <span className="font-semibold text-ink">{data.debt_to_equity ? (data.debt_to_equity / 100).toFixed(2) + "x" : "—"}</span>
              </div>
            </div>
          </div>

          {/* Trading & Balance Sheet Stats */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-2xs font-bold uppercase tracking-wider text-brand border-b border-brand/20 pb-1.5">Balance Sheet & Trading</h4>
            <div className="flex flex-col gap-2.5 font-mono text-xs">
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Market Cap</span>
                <span className="font-semibold text-ink flex items-center gap-1">
                  <DollarSign size={10} className="text-brand/70" />
                  {fmtNum(data.market_cap)}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Enterprise Value</span>
                <span className="font-semibold text-ink flex items-center gap-1">
                  <DollarSign size={10} className="text-brand/70" />
                  {fmtNum(data.enterprise_value)}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Total Revenue</span>
                <span className="font-semibold text-ink">{fmtNum(data.total_revenue)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">EBITDA</span>
                <span className="font-semibold text-ink">{fmtNum(data.ebitda)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Free Cash Flow</span>
                <span className="font-semibold text-ink">{fmtNum(data.free_cashflow)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Shares Short / Float</span>
                <span className="font-semibold text-ink">{fmtPercent(data.short_percent_of_float)}</span>
              </div>
            </div>
          </div>

          {/* Range & Analyst targets */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-2xs font-bold uppercase tracking-wider text-brand border-b border-brand/20 pb-1.5">Market Ranges & Targets</h4>
            <div className="flex flex-col gap-2.5 font-mono text-xs">
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">52-Week Range</span>
                <span className="font-semibold text-ink">
                  ${fmtNum(data.fifty_two_week_low)} - ${fmtNum(data.fifty_two_week_high)}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">50-Day Moving Avg</span>
                <span className="font-semibold text-ink">${fmtNum(data.fifty_day_average)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">200-Day Moving Avg</span>
                <span className="font-semibold text-ink">${fmtNum(data.two_hundred_day_average)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Mean Price Target</span>
                <span className="font-semibold text-brand font-bold">${fmtNum(data.price_target_mean)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Dividend Yield</span>
                <span className="font-semibold text-ink">{fmtPercent(data.dividend_yield, true)}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span className="text-ink-faint">Payout Ratio</span>
                <span className="font-semibold text-ink">{fmtPercent(data.payout_ratio)}</span>
              </div>
            </div>
          </div>

          {/* Earnings Calendar */}
          {(data.next_earnings_date || data.earnings_average) && (
            <div className="flex flex-col gap-3 md:col-span-2 xl:col-span-2">
              <h4 className="font-mono text-2xs font-bold uppercase tracking-wider text-brand border-b border-brand/20 pb-1.5">Earnings Calendar</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2.5 font-mono text-xs">
                  <div className="flex justify-between border-b border-border/40 pb-1">
                    <span className="text-ink-faint flex items-center gap-1.5">
                      <Calendar size={12} className="text-brand/70" />
                      Next Earnings Date
                    </span>
                    <span className="font-semibold text-ink">{fmtDate(data.next_earnings_date)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1">
                    <span className="text-ink-faint">EPS Estimate (Avg)</span>
                    <span className="font-semibold text-ink">{data.earnings_average ? `$${data.earnings_average.toFixed(2)}` : "—"}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1">
                    <span className="text-ink-faint">EPS Range (Low - High)</span>
                    <span className="font-semibold text-ink">
                      {data.earnings_low ? `$${data.earnings_low.toFixed(2)}` : "—"} - {data.earnings_high ? `$${data.earnings_high.toFixed(2)}` : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 font-mono text-xs">
                  <div className="flex justify-between border-b border-border/40 pb-1">
                    <span className="text-ink-faint flex items-center gap-1.5">
                      <TrendingUp size={12} className="text-brand/70" />
                      Revenue Estimate (Avg)
                    </span>
                    <span className="font-semibold text-ink">{fmtNum(data.revenue_average)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1">
                    <span className="text-ink-faint">Revenue Range (Low - High)</span>
                    <span className="font-semibold text-ink">
                      {data.revenue_low ? fmtNum(data.revenue_low) : "—"} - {data.revenue_high ? fmtNum(data.revenue_high) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
