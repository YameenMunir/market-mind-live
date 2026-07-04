import { BarChart3 } from "lucide-react";

import { Panel } from "@/components/Panel";
import { EquityCurveChart } from "@/charts/EquityCurveChart";
import { cn, formatPercent, formatPrice } from "@/lib/utils";
import type { BacktestResult } from "@/types";

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" | "default" }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-3.5 sm:p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">{label}</p>
      <p
        className={cn(
          "numeric mt-1.5 font-mono text-lg font-semibold sm:text-xl",
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

export function BacktestResults({ result, theme }: { result: BacktestResult | null; theme: "dark" | "light" }) {
  if (!result) {
    return (
      <Panel eyebrow="Backtest" title="No results yet">
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <BarChart3 size={22} className="text-ink-faint" aria-hidden />
          <p className="text-sm font-medium text-ink-muted">Run your first backtest</p>
          <p className="max-w-sm text-xs leading-relaxed text-ink-faint">
            Pick an asset and a lookback window above, then run the strategy to see its equity curve, win
            rate, and full trade log here.
          </p>
        </div>
      </Panel>
    );
  }

  const isProfitable = result.total_return_pct >= 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Total Return"
          value={formatPercent(result.total_return_pct)}
          tone={isProfitable ? "bull" : "bear"}
        />
        <StatTile label="Final Equity" value={formatPrice(result.final_equity)} />
        <StatTile label="Win Rate" value={`${result.win_rate_pct.toFixed(1)}%`} />
        <StatTile label="Max Drawdown" value={`${result.max_drawdown_pct.toFixed(1)}%`} tone="bear" />
      </div>

      <Panel eyebrow="Equity Curve" title={`${result.symbol} · ${result.total_trades} trades`}>
        <div className="h-56 sm:h-64">
          <EquityCurveChart points={result.equity_curve} theme={theme} />
        </div>
      </Panel>

      <Panel eyebrow="Trade Log" title={`${result.trades.length} closed trades`}>
        <div className="-mx-1 max-h-72 overflow-auto px-1">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-surface text-ink-faint">
              <tr>
                <th scope="col" className="pb-2 pr-3 font-medium">Entry</th>
                <th scope="col" className="pb-2 pr-3 font-medium">Exit</th>
                <th scope="col" className="pb-2 pr-3 text-right font-medium">Entry Price</th>
                <th scope="col" className="pb-2 pr-3 text-right font-medium">Exit Price</th>
                <th scope="col" className="pb-2 text-right font-medium">Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.trades.map((trade, i) => (
                <tr key={i} className="transition-colors hover:bg-surface-raised/50">
                  <td className="py-2.5 pr-3 text-ink-muted">{new Date(trade.entry_time * 1000).toLocaleDateString()}</td>
                  <td className="py-2.5 pr-3 text-ink-muted">{new Date(trade.exit_time * 1000).toLocaleDateString()}</td>
                  <td className="numeric py-2.5 pr-3 text-right text-ink">{formatPrice(trade.entry_price)}</td>
                  <td className="numeric py-2.5 pr-3 text-right text-ink">{formatPrice(trade.exit_price)}</td>
                  <td
                    className={cn(
                      "numeric py-2.5 text-right font-medium",
                      trade.return_pct >= 0 ? "text-bull" : "text-bear"
                    )}
                  >
                    {formatPercent(trade.return_pct)}
                  </td>
                </tr>
              ))}
              {result.trades.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-faint">
                    No trades were triggered during this window - try a longer lookback period.
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
