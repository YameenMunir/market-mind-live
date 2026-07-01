"use client";

import { useEffect, useState } from "react";

import { AssetTypeSelector } from "@/components/AssetTypeSelector";
import { BeginnerSummary } from "@/components/BeginnerSummary";
import { ConnectionStatusPill } from "@/components/ConnectionStatusPill";
import { ExplanationPanel } from "@/components/ExplanationPanel";
import { IndicatorPanel } from "@/components/IndicatorPanel";
import { MarketStatusCard } from "@/components/MarketStatusCard";
import { Panel } from "@/components/Panel";
import { PredictionCard } from "@/components/PredictionCard";
import { PriceCard } from "@/components/PriceCard";
import { RiskCard } from "@/components/RiskCard";
import { StatusBanner } from "@/components/StatusBanner";
import { Toggle } from "@/components/Toggle";
import { Topbar } from "@/components/Topbar";
import { LiveCandlestickChart } from "@/charts/LiveCandlestickChart";
import { useChartPreferences } from "@/hooks/useChartPreferences";
import { useIndicators, usePrediction, useRisk, useCandles } from "@/hooks/useMarketData";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import { useTheme } from "@/hooks/useTheme";
import { CANDLE_INTERVALS } from "@/lib/constants";
import { describeError } from "@/lib/errorMessages";
import { cn } from "@/lib/utils";
import type { AssetSearchResult, AssetType } from "@/types";

export default function DashboardPage() {
  const { theme } = useTheme();
  const { prefs, updatePrefs } = useChartPreferences();

  const [symbol, setSymbol] = useState(prefs.defaultSymbol);
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [interval, setInterval_] = useState("1d");
  const [showMA, setShowMA] = useState(prefs.showMovingAverages);
  const [showBB, setShowBB] = useState(prefs.showBollinger);

  useEffect(() => {
    setSymbol(prefs.defaultSymbol);
  }, [prefs.defaultSymbol]);

  const { quote, marketStatus, connectionState, errorMessage } = useLiveQuote(symbol);
  const candles = useCandles(symbol, interval);
  const indicators = useIndicators(symbol);
  const prediction = usePrediction(symbol);
  const risk = useRisk(symbol);

  const handleSelectAsset = (asset: AssetSearchResult) => {
    setSymbol(asset.symbol);
    setAssetType(asset.asset_type);
  };

  const activeError = prediction.error || indicators.error || candles.error;

  return (
    <>
      <Topbar
        assetType={assetType}
        onAssetTypeChange={setAssetType}
        onSelectAsset={handleSelectAsset}
        rightSlot={<ConnectionStatusPill state={connectionState} />}
        title="Live Dashboard"
      />

      <main className="flex-1 space-y-5 overflow-y-auto p-6">
        {errorMessage && <StatusBanner message={errorMessage} tone="warning" icon="clock" />}
        {activeError && <StatusBanner {...describeError(activeError)} />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PriceCard quote={quote} symbol={symbol} />
          <MarketStatusCard status={marketStatus} />
          <PredictionCard prediction={prediction.data} isLoading={prediction.isLoading} />
          <RiskCard risk={risk.data} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Panel
            className="xl:col-span-8"
            eyebrow="Live Chart"
            title={`${symbol} · ${CANDLE_INTERVALS.find((i) => i.value === interval)?.label}`}
            action={
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 rounded-lg bg-surface-raised p-1">
                  {CANDLE_INTERVALS.map((i) => (
                    <button
                      key={i.value}
                      onClick={() => setInterval_(i.value)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        interval === i.value ? "bg-brand text-canvas" : "text-ink-muted hover:text-ink"
                      )}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
            }
          >
            <div className="mb-3 flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                <input type="checkbox" checked={showMA} onChange={(e) => setShowMA(e.target.checked)} className="accent-brand" />
                Moving Averages
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                <input type="checkbox" checked={showBB} onChange={(e) => setShowBB(e.target.checked)} className="accent-brand" />
                Bollinger Bands
              </label>
              {candles.isLoading && !candles.data && (
                <StatusBanner message="Waiting for next candle..." tone="muted" icon="clock" className="ml-auto" />
              )}
            </div>
            <div className="h-[440px]">
              {candles.data && candles.data.candles.length > 0 ? (
                <LiveCandlestickChart
                  candles={candles.data.candles}
                  supportLevels={indicators.data?.support_resistance.support ?? []}
                  resistanceLevels={indicators.data?.support_resistance.resistance ?? []}
                  prediction={prediction.data}
                  theme={theme}
                  showMovingAverages={showMA}
                  showBollinger={showBB}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-ink-faint">
                  {candles.isLoading ? "Loading chart data..." : "No chart data available for this symbol."}
                </div>
              )}
            </div>
          </Panel>

          <div className="xl:col-span-4">
            <IndicatorPanel indicators={indicators.data} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BeginnerSummary prediction={prediction.data} />
          <ExplanationPanel prediction={prediction.data} />
        </div>
      </main>
    </>
  );
}
