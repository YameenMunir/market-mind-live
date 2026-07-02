"use client";

import { useEffect, useState } from "react";

import { AIInsightsButton } from "@/components/AIInsightsButton";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
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
import { Topbar } from "@/components/Topbar";
import { LiveCandlestickChart } from "@/charts/LiveCandlestickChart";
import { useChartPreferences } from "@/hooks/useChartPreferences";
import { useCandles } from "@/hooks/useMarketData";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { useTheme } from "@/hooks/useTheme";
import { buildAssetContext } from "@/lib/aiContext";
import { CANDLE_INTERVALS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AssetSearchResult, AssetType } from "@/types";

export default function DashboardPage() {
  const { theme } = useTheme();
  const { prefs } = useChartPreferences();

  const [symbol, setSymbol] = useState(prefs.defaultSymbol);
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [assetName, setAssetName] = useState<string | null>(null);
  const [interval, setInterval_] = useState("1d");
  const [showMA, setShowMA] = useState(prefs.showMovingAverages);
  const [showBB, setShowBB] = useState(prefs.showBollinger);
  const [isAIOpen, setIsAIOpen] = useState(false);

  useEffect(() => {
    setSymbol(prefs.defaultSymbol);
  }, [prefs.defaultSymbol]);

  const snapshot = useLiveSnapshot(symbol);
  const candles = useCandles(symbol, interval);
  const isLive = snapshot.connectionState === "live" || snapshot.connectionState === "polling";

  const handleSelectAsset = (asset: AssetSearchResult) => {
    setSymbol(asset.symbol);
    setAssetType(asset.asset_type);
    setAssetName(asset.name);
  };

  return (
    <>
      <Topbar
        assetType={assetType}
        onAssetTypeChange={setAssetType}
        onSelectAsset={handleSelectAsset}
        rightSlot={<ConnectionStatusPill state={snapshot.connectionState} />}
        title="Live Dashboard"
      />

      <main className="flex-1 space-y-5 overflow-y-auto p-6">
        {snapshot.errorMessage && <StatusBanner message={snapshot.errorMessage} tone="warning" icon="clock" />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PriceCard quote={snapshot.quote} symbol={symbol} isLive={snapshot.connectionState === "live"} />
          <MarketStatusCard
            status={snapshot.marketStatus}
            updatedAt={snapshot.marketStatusUpdatedAt}
            isLive={snapshot.connectionState === "live"}
          />
          <PredictionCard
            prediction={snapshot.prediction}
            isLoading={!snapshot.prediction}
            updatedAt={snapshot.predictionUpdatedAt}
            isLive={snapshot.connectionState === "live"}
          />
          <RiskCard risk={snapshot.risk} updatedAt={snapshot.riskUpdatedAt} isLive={snapshot.connectionState === "live"} />
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
                  livePrice={interval === "1d" ? snapshot.quote?.price ?? null : null}
                  supportLevels={snapshot.indicators?.support_resistance.support ?? []}
                  resistanceLevels={snapshot.indicators?.support_resistance.resistance ?? []}
                  prediction={snapshot.prediction}
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
            <IndicatorPanel
              indicators={snapshot.indicators}
              price={snapshot.quote?.price ?? null}
              updatedAt={snapshot.indicatorsUpdatedAt}
              isLive={snapshot.connectionState === "live"}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BeginnerSummary prediction={snapshot.prediction} />
          <ExplanationPanel prediction={snapshot.prediction} />
        </div>
      </main>

      <AIInsightsButton onClick={() => setIsAIOpen(true)} />
      <AIInsightsPanel
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        asset={symbol}
        buildContext={() =>
          buildAssetContext({
            asset: symbol,
            assetName,
            quote: snapshot.quote,
            marketStatus: snapshot.marketStatus,
            indicators: snapshot.indicators,
            prediction: snapshot.prediction,
            risk: snapshot.risk,
          })
        }
      />
    </>
  );
}
