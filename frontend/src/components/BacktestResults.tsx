"use client";

import dynamic from "next/dynamic";
import { BarChart3, Loader2 } from "lucide-react";

import { Panel } from "@/components/Panel";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { cn, formatPercent, formatPrice } from "@/lib/utils";
import type { BacktestResult } from "@/types";

const EquityCurveChart = dynamic(() => import("@/charts/EquityCurveChart").then((m) => m.EquityCurveChart), {
  ssr: false,
  loading: () => <div aria-hidden className="h-full w-full animate-pulse rounded-sm bg-surface-raised border border-border" />,
});

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" | "default" }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-3 sm:p-4">
      <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink-faint">{label}</p>
      <p
        className={cn(
          "numeric mt-1 font-mono text-base font-bold sm:text-lg",
          tone === "bull" && "text-bull",
          tone === "bear" && "text-bear",
          (!tone || tone === "default") && "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}

interface BacktestResultsProps {
  result: BacktestResult | null;
  theme: "dark" | "light";
  isLoading?: boolean;
}

export function BacktestResults({ result, theme, isLoading }: BacktestResultsProps) {
  if (isLoading) {
    return (
      <Panel eyebrow="Backtest" title="Running simulation...">
        <div className="flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border px-4 py-10 text-center bg-surface">
          <Loader2 size={22} className="animate-spin text-brand" aria-hidden />
          <p className="font-mono text-xs font-bold uppercase text-ink-muted">Simulating trades over the selected window</p>
          <p className="max-w-sm font-mono text-[9px] uppercase tracking-wide text-ink-faint">
            Please wait. Results will appear here automatically.
          </p>
        </div>
      </Panel>
    );
  }

  if (!result) {
    return (
      <Panel eyebrow="Backtest" title="No results yet">
        <div className="flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border px-4 py-10 text-center bg-surface">
          <BarChart3 size={22} className="text-ink-faint" aria-hidden />
          <p className="font-mono text-xs font-bold uppercase text-ink-muted">Run your first backtest</p>
          <p className="max-w-sm font-mono text-[9px] uppercase tracking-wide text-ink-faint">
            Pick an asset and a lookback window above, then run the strategy.
          </p>
        </div>
      </Panel>
    );
  }

  const isProfitable = result.total_return_pct >= 0;
  const { currency, convert } = useCurrencyContext();
  const nativeCurrency = result.currency;
  const isConverted = nativeCurrency !== currency;

  const convertedEquityCurve = result.equity_curve.map((p) => ({
    ...p,
    equity: convert(p.equity, nativeCurrency) ?? p.equity,
  }));

  return (
    <div className="flex flex-col gap-4">
      {isConverted && (
        <p className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">
          Converted from {nativeCurrency} to {currency} at FX rate.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Total Return"
          value={formatPercent(result.total_return_pct)}
          tone={isProfitable ? "bull" : "bear"}
        />
        <StatTile label="Final Equity" value={formatPrice(convert(result.final_equity, nativeCurrency), currency)} />
        <StatTile label="Win Rate" value={`${result.win_rate_pct.toFixed(1)}%`} />
        <StatTile label="Max Drawdown" value={`${result.max_drawdown_pct.toFixed(1)}%`} tone="bear" />
      </div>

      <Panel eyebrow="Equity Curve" title={`${result.symbol} · ${result.total_trades} trades`}>
        <div className="h-56 sm:h-64">
          <EquityCurveChart points={convertedEquityCurve} theme={theme} currency={currency} />
        </div>
      </Panel>

      <Panel eyebrow="Trade Log" title={`${result.trades.length} closed trades`}>
        <div className="-mx-1 max-h-72 overflow-auto px-1">
          <table className="w-full min-w-[520px] text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-raised border-b border-border text-ink-faint">
              <tr>
                <th scope="col" className="py-2.5 px-3 font-mono text-[9px] uppercase font-bold tracking-wider">Entry</th>
                <th scope="col" className="py-2.5 px-3 font-mono text-[9px] uppercase font-bold tracking-wider">Exit</th>
                <th scope="col" className="py-2.5 px-3 text-right font-mono text-[9px] uppercase font-bold tracking-wider">Entry Price</th>
                <th scope="col" className="py-2.5 px-3 text-right font-mono text-[9px] uppercase font-bold tracking-wider">Exit Price</th>
                <th scope="col" className="py-2.5 px-3 text-right font-mono text-[9px] uppercase font-bold tracking-wider">Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-surface">
              {result.trades.map((trade, i) => (
                <tr key={i} className="transition-colors hover:bg-surface-raised/80 border-b border-border/20">
                  <td className="py-2 px-3 font-mono text-xs text-ink-muted">{new Date(trade.entry_time * 1000).toLocaleDateString()}</td>
                  <td className="py-2 px-3 font-mono text-xs text-ink-muted">{new Date(trade.exit_time * 1000).toLocaleDateString()}</td>
                  <td className="numeric py-2 px-3 text-right font-mono text-xs text-ink">
                    {formatPrice(convert(trade.entry_price, nativeCurrency), currency)}
                  </td>
                  <td className="numeric py-2 px-3 text-right font-mono text-xs text-ink">
                    {formatPrice(convert(trade.exit_price, nativeCurrency), currency)}
                  </td>
                  <td
                    className={cn(
                      "numeric py-2 px-3 text-right font-mono text-xs font-semibold",
                      trade.return_pct >= 0 ? "text-bull" : "text-bear"
                    )}
                  >
                    {formatPercent(trade.return_pct)}
                  </td>
                </tr>
              ))}
              {result.trades.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center font-mono text-xs text-ink-faint">
                    No trades were triggered. Try a longer period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
