"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";

import { AIInsightsButton } from "@/components/AIInsightsButton";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { AssetSearch } from "@/components/AssetSearch";
import { BacktestResults } from "@/components/BacktestResults";
import { Button } from "@/components/Button";
import { CurrencySelector } from "@/components/CurrencySelector";
import { Input, Select } from "@/components/Input";
import { Panel } from "@/components/Panel";
import { StatusBanner } from "@/components/StatusBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSidebarCollapse } from "@/contexts/SidebarCollapseContext";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { buildAssetContext } from "@/lib/aiContext";
import { describeError } from "@/lib/errorMessages";
import { cn } from "@/lib/utils";
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
  const { isCollapsed } = useSidebarCollapse();
  const [symbol, setSymbol] = useState("AAPL");
  const [lookbackDays, setLookbackDays] = useState(180);
  const [initialCapital, setInitialCapital] = useState(10000);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [isAIOpen, setIsAIOpen] = useState(false);

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
      <header
        className={cn(
          "flex items-center justify-between border-b border-border bg-canvas px-4 py-3.5 sm:px-6 sm:py-4",
          isCollapsed && "lg:pl-28"
        )}
      >
        <h1 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Backtesting</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <CurrencySelector />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-6">
        <Panel eyebrow="Strategy Backtest" title="SMA 20/50 + MACD trend-following">
          <p className="mb-4 text-xs leading-relaxed text-ink-muted">
            Simulates going long when SMA-20 crosses above SMA-50 with positive MACD momentum, and moving to
            cash otherwise. Pick an asset, a window, and a starting balance.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runBacktest();
            }}
            className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
          >
            <div className="min-w-[220px] flex-1">
              <p className="mb-1.5 block text-xs font-medium text-ink-muted">Asset</p>
              <AssetSearch assetType={null} onSelect={(asset: AssetSearchResult) => setSymbol(asset.symbol)} />
              <p className="mt-1.5 text-xs text-ink-faint">
                Selected: <span className="font-mono font-medium text-ink-muted">{symbol}</span>
              </p>
            </div>

            <div>
              <label htmlFor="backtest-lookback" className="mb-1.5 block text-xs font-medium text-ink-muted">
                Lookback period
              </label>
              <Select
                id="backtest-lookback"
                value={lookbackDays}
                onChange={(e) => setLookbackDays(Number(e.target.value))}
                className="md:w-auto"
              >
                {LOOKBACK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label htmlFor="backtest-capital" className="mb-1.5 block text-xs font-medium text-ink-muted">
                Initial capital ($)
              </label>
              <Input
                id="backtest-capital"
                type="number"
                min={100}
                inputMode="numeric"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                className="font-mono md:w-36"
              />
            </div>

            <Button type="submit" variant="primary" size="lg" loading={isLoading}>
              {!isLoading && <PlayCircle size={16} aria-hidden />}
              {isLoading ? "Running..." : "Run Backtest"}
            </Button>
          </form>
        </Panel>

        {error && <StatusBanner {...describeError(error)} />}

        <BacktestResults result={result} theme={theme} isLoading={isLoading} />
      </main>

      <AIInsightsButton onClick={() => setIsAIOpen(true)} />
      <AIInsightsPanel
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        asset={symbol}
        buildContext={() =>
          buildAssetContext({
            asset: symbol,
            assetName: null,
            quote: null,
            marketStatus: null,
            indicators: null,
            prediction: null,
            risk: null,
            backtest: result,
          })
        }
      />
    </>
  );
}
