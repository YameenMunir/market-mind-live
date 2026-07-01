"use client";

import { useState } from "react";
import { Loader2, PlayCircle } from "lucide-react";

import { AssetSearch } from "@/components/AssetSearch";
import { BacktestResults } from "@/components/BacktestResults";
import { Panel } from "@/components/Panel";
import { StatusBanner } from "@/components/StatusBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { describeError } from "@/lib/errorMessages";
import type { AssetSearchResult, BacktestResult } from "@/types";
import { ApiError } from "@/types";

const LOOKBACK_OPTIONS = [
  { label: "1 Month", value: 30 },
  { label: "3 Months", value: 90 },
  { label: "6 Months", value: 180 },
  { label: "1 Year", value: 365 },
  { label: "2 Years", value: 730 },
];

export default function BacktestingPage() {
  const { theme } = useTheme();
  const [symbol, setSymbol] = useState("AAPL");
  const [lookbackDays, setLookbackDays] = useState(180);
  const [initialCapital, setInitialCapital] = useState(10000);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const runBacktest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.runBacktest({ symbol, lookback_days: lookbackDays, initial_capital: initialCapital });
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({ error_code: "internal_error", message: "Backtest failed." }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-canvas px-6 py-4">
        <h1 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Backtesting</h1>
        <ThemeToggle />
      </header>

      <main className="flex-1 space-y-5 overflow-y-auto p-6">
        <Panel eyebrow="Strategy Backtest" title="SMA 20/50 + MACD trend-following">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Asset</label>
              <AssetSearch assetType={null} onSelect={(asset: AssetSearchResult) => setSymbol(asset.symbol)} />
              <p className="mt-1.5 font-mono text-xs text-ink-faint">Selected: {symbol}</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Lookback period</label>
              <select
                value={lookbackDays}
                onChange={(e) => setLookbackDays(Number(e.target.value))}
                className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-ink focus:border-brand/60 focus:outline-none"
              >
                {LOOKBACK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Initial capital</label>
              <input
                type="number"
                min={100}
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                className="w-32 rounded-lg border border-border bg-surface-raised px-3 py-2 font-mono text-sm text-ink focus:border-brand/60 focus:outline-none"
              />
            </div>

            <button
              onClick={runBacktest}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
              Run Backtest
            </button>
          </div>
        </Panel>

        {error && <StatusBanner {...describeError(error)} />}

        <BacktestResults result={result} theme={theme} />
      </main>
    </>
  );
}
