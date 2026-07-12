"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LineChart, Maximize2 } from "lucide-react";

import { AIInsightsButton } from "@/components/AIInsightsButton";
import { AlertsBellButton } from "@/components/AlertsBellButton";
import { AnalystConsensusCard } from "@/components/AnalystConsensusCard";
import { AlertsPanel } from "@/components/AlertsPanel";
import { AlertToastStack } from "@/components/AlertToastStack";
import { AssetTypeSelector } from "@/components/AssetTypeSelector";
import { BeginnerSummary } from "@/components/BeginnerSummary";
import { Button } from "@/components/Button";
import { ChartOverlayToggles } from "@/components/ChartOverlayToggles";
import { ConnectionStatusPill } from "@/components/ConnectionStatusPill";
import { DashboardViewMenu } from "@/components/DashboardViewMenu";
import { ExplanationPanel } from "@/components/ExplanationPanel";
import { GeminiKeySetupModal } from "@/components/GeminiKeySetupModal";
import { IndicatorPanel } from "@/components/IndicatorPanel";
import { LastUpdated } from "@/components/LastUpdated";
import { MarketStatusCard } from "@/components/MarketStatusCard";
import { NewsFeedCard } from "@/components/NewsFeedCard";
import { OnboardingTour } from "@/components/OnboardingTour";
import { Panel } from "@/components/Panel";
import { PredictionCard } from "@/components/PredictionCard";
import { PriceCard } from "@/components/PriceCard";
import { PricePredictorControls } from "@/components/PricePredictorControls";
import { RatingChangesCard } from "@/components/RatingChangesCard";
import { RiskCard } from "@/components/RiskCard";
import { StatusBanner } from "@/components/StatusBanner";
import { TimeframeSelector } from "@/components/TimeframeSelector";
import { Topbar } from "@/components/Topbar";
import { LiveCandlestickChart } from "@/charts/LiveCandlestickChart";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useAnalystConsensus } from "@/hooks/useAnalystConsensus";
import { useChartPreferences } from "@/hooks/useChartPreferences";
import { useCurrencyConvertedChartData } from "@/hooks/useCurrencyConvertedChartData";
import { useFullscreenToggle } from "@/hooks/useFullscreenToggle";
import { useGeminiKey } from "@/hooks/useGeminiKey";
import { useGeminiKeyPrompt } from "@/hooks/useGeminiKeyPrompt";
import { useCandles } from "@/hooks/useMarketData";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { useNews } from "@/hooks/useNews";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { usePriceForecast } from "@/hooks/usePriceForecast";
import { useRatingChanges } from "@/hooks/useRatingChanges";
import { useTheme } from "@/hooks/useTheme";
import { useUserSettings } from "@/hooks/useUserSettings";
import { buildAssetContext } from "@/lib/aiContext";
import { CHART_RANGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AssetSearchResult, AssetType } from "@/types";

// Both are invisible until the user explicitly opens them (AI Insights button /
// expand-chart button) - deferring their code (and, for AI Insights, its own
// conversation/history subtree) into separate chunks keeps them off the dashboard's
// initial critical path. No loading fallback: each renders nothing while closed
// regardless, so there's nothing meaningful to show while the chunk loads either.
const AIInsightsPanel = dynamic(() => import("@/components/AIInsightsPanel").then((m) => m.AIInsightsPanel), {
  ssr: false,
});
const FullscreenChartModal = dynamic(
  () => import("@/components/FullscreenChartModal").then((m) => m.FullscreenChartModal),
  { ssr: false }
);

export default function DashboardPage() {
  const { theme } = useTheme();
  const { prefs, updatePrefs } = useChartPreferences();

  const [symbol, setSymbol] = useState(prefs.defaultSymbol);
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [assetName, setAssetName] = useState<string | null>(null);
  const [range, setRange] = useState("1d");
  const [showMA, setShowMA] = useState(prefs.showMovingAverages);
  const [showBB, setShowBB] = useState(prefs.showBollinger);
  const [showPricePredictor, setShowPricePredictor] = useState(prefs.showPricePredictor);
  const [horizonDays, setHorizonDays] = useState(prefs.predictionHorizonDays);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, enter: enterFullscreen, exit: exitFullscreen } = useFullscreenToggle(dashboardRef);
  const onboardingTour = useOnboardingTour();
  const geminiKey = useGeminiKey();
  const geminiKeyPrompt = useGeminiKeyPrompt(geminiKey.status.has_key, geminiKey.isLoading);
  const { experienceMode, setExperienceMode } = useUserSettings();
  const isAdvanced = experienceMode === "advanced";

  useEffect(() => {
    setSymbol(prefs.defaultSymbol);
  }, [prefs.defaultSymbol]);

  const handleTogglePricePredictor = (value: boolean) => {
    setShowPricePredictor(value);
    updatePrefs({ showPricePredictor: value });
  };
  const handleHorizonChange = (value: number) => {
    setHorizonDays(value);
    updatePrefs({ predictionHorizonDays: value });
  };

  const snapshot = useLiveSnapshot(symbol);
  const candles = useCandles(symbol, range);
  const forecast = usePriceForecast(symbol, horizonDays, showPricePredictor);
  const alertsState = useAlerts(symbol);
  const analyst = useAnalystConsensus(symbol);
  const news = useNews(symbol);
  const ratingChanges = useRatingChanges(symbol);
  const isLive = snapshot.connectionState === "live" || snapshot.connectionState === "polling";
  const activeAlertCount = alertsState.alerts.filter((a) => a.status === "active" || a.status === "triggered").length;

  const { convert } = useCurrencyContext();
  const nativeCurrency = snapshot.quote?.currency ?? "USD";

  const { convertedCandles, convertedForecast, convertedSupport, convertedResistance } = useCurrencyConvertedChartData({
    candles: candles.data,
    forecast: forecast.data,
    supportLevels: snapshot.indicators?.support_resistance.support ?? [],
    resistanceLevels: snapshot.indicators?.support_resistance.resistance ?? [],
    nativeCurrency,
  });

  const handleSelectAsset = (asset: AssetSearchResult) => {
    setSymbol(asset.symbol);
    setAssetType(asset.asset_type);
    setAssetName(asset.name);
  };

  return (
    <div
      ref={dashboardRef}
      className={isFullscreen ? "fixed inset-0 z-[70] flex flex-col bg-canvas" : "contents"}
    >
      <Topbar
        assetType={assetType}
        onAssetTypeChange={setAssetType}
        onSelectAsset={handleSelectAsset}
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <ConnectionStatusPill state={snapshot.connectionState} />
            <AlertsBellButton onClick={() => setIsAlertsOpen(true)} activeCount={activeAlertCount} />
            <DashboardViewMenu
              isFullscreen={isFullscreen}
              onEnterFullscreen={enterFullscreen}
              onExitFullscreen={exitFullscreen}
              onRestartTour={onboardingTour.restart}
              experienceMode={experienceMode}
              onToggleExperienceMode={() => setExperienceMode(isAdvanced ? "simple" : "advanced")}
            />
          </div>
        }
        title="Live Dashboard"
      />

      <main className="flex-1 space-y-4 overflow-y-auto p-4 pb-20 sm:space-y-5 sm:p-6 lg:pb-6">
        {snapshot.errorMessage && <StatusBanner message={snapshot.errorMessage} tone="warning" icon="clock" />}

        <div
          data-tour="stat-cards"
          className={cn(
            "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4",
            isAdvanced ? "md:grid-cols-3 xl:grid-cols-5" : "md:grid-cols-2"
          )}
        >
          <PriceCard
            quote={snapshot.quote}
            symbol={symbol}
            isLive={snapshot.connectionState === "live"}
            isStale={snapshot.isStale}
          />
          {isAdvanced && (
            <MarketStatusCard
              status={snapshot.marketStatus}
              updatedAt={snapshot.marketStatusUpdatedAt}
              isLive={snapshot.connectionState === "live"}
              isStale={snapshot.isStale}
            />
          )}
          <PredictionCard
            prediction={snapshot.prediction}
            isLoading={!snapshot.prediction}
            updatedAt={snapshot.predictionUpdatedAt}
            isLive={snapshot.connectionState === "live"}
            isStale={snapshot.isStale}
            nativeCurrency={nativeCurrency}
          />
          {isAdvanced && (
            <>
              <AnalystConsensusCard consensus={analyst.data} isLoading={analyst.isLoading} error={analyst.error} symbol={symbol} />
              <RiskCard
                risk={snapshot.risk}
                updatedAt={snapshot.riskUpdatedAt}
                isLive={snapshot.connectionState === "live"}
                isStale={snapshot.isStale}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Panel
            className={isAdvanced ? "xl:col-span-8" : "xl:col-span-12"}
            dataTour="live-chart"
            eyebrow="Live Chart"
            title={`${symbol} · ${CHART_RANGES.find((r) => r.value === range)?.label}`}
            action={
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <TimeframeSelector value={range} onChange={setRange} className="flex-1 min-w-0" />
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setIsChartFullscreen(true)}
                  aria-label="Expand chart to full screen"
                  title="Expand chart"
                  className="shrink-0"
                >
                  <Maximize2 size={14} />
                </Button>
              </div>
            }
          >
            <div className="mb-3 flex flex-wrap items-center gap-5">
              <ChartOverlayToggles showMA={showMA} onToggleMA={setShowMA} showBB={showBB} onToggleBB={setShowBB} />
              <PricePredictorControls
                enabled={showPricePredictor}
                onToggle={handleTogglePricePredictor}
                horizonDays={horizonDays}
                onHorizonChange={handleHorizonChange}
              />
              <div className="ml-auto flex items-center gap-3">
                {candles.isLoading && !candles.data && (
                  <StatusBanner message="Waiting for next candle..." tone="muted" icon="clock" />
                )}
                {!candles.isLoading && candles.data && <LastUpdated updatedAt={candles.data.last_updated} />}
              </div>
            </div>
            {candles.error && (
              <StatusBanner message={candles.error.message} tone="warning" icon="warning" className="mb-3" />
            )}
            {showPricePredictor && forecast.isLoading && !forecast.data && (
              <StatusBanner message="Generating price forecast..." tone="muted" icon="loading" className="mb-3" />
            )}
            {showPricePredictor && forecast.error && (
              <StatusBanner message={forecast.error.message} tone="warning" icon="warning" className="mb-3" />
            )}
            <div className="h-[320px] sm:h-[400px] xl:h-[440px]">
              {convertedCandles && convertedCandles.candles.length > 0 ? (
                <LiveCandlestickChart
                  candles={convertedCandles.candles}
                  range={range}
                  livePrice={range === "1d" ? convert(snapshot.quote?.price ?? null, nativeCurrency) : null}
                  supportLevels={convertedSupport}
                  resistanceLevels={convertedResistance}
                  prediction={snapshot.prediction}
                  theme={theme}
                  showMovingAverages={showMA}
                  showBollinger={showBB}
                  forecast={convertedForecast}
                  showForecast={showPricePredictor}
                />
              ) : candles.isLoading ? (
                <div aria-hidden className="flex h-full animate-pulse flex-col justify-end gap-2 rounded-xl bg-surface-raised/50 p-4">
                  <div className="flex h-full items-end gap-1.5 sm:gap-2">
                    {[35, 55, 45, 70, 60, 80, 50, 65, 75, 58, 68, 85].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-surface-raised" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-center">
                  <LineChart size={22} className="text-ink-faint" aria-hidden />
                  <p className="text-sm font-medium text-ink-muted">No chart data for {symbol}</p>
                  <p className="max-w-xs px-4 text-xs leading-relaxed text-ink-faint">
                    Try a different timeframe, or search for another symbol above.
                  </p>
                </div>
              )}
            </div>
          </Panel>

          {isAdvanced && (
            <div data-tour="indicator-panel" className="xl:col-span-4">
              <IndicatorPanel
                indicators={snapshot.indicators}
                price={snapshot.quote?.price ?? null}
                updatedAt={snapshot.indicatorsUpdatedAt}
                isLive={snapshot.connectionState === "live"}
                isStale={snapshot.isStale}
                nativeCurrency={nativeCurrency}
              />
            </div>
          )}
        </div>

        <div data-tour="beginner-explanation" className={cn("grid grid-cols-1 gap-4", isAdvanced && "lg:grid-cols-2")}>
          <BeginnerSummary prediction={snapshot.prediction} />
          {isAdvanced && <ExplanationPanel prediction={snapshot.prediction} />}
        </div>

        <div className={cn("grid grid-cols-1 gap-4", isAdvanced && "lg:grid-cols-2")}>
          <NewsFeedCard news={news.data} isLoading={news.isLoading} error={news.error} />
          {isAdvanced && (
            <RatingChangesCard changes={ratingChanges.data} isLoading={ratingChanges.isLoading} error={ratingChanges.error} />
          )}
        </div>
      </main>

      <FullscreenChartModal
        isOpen={isChartFullscreen}
        onClose={() => setIsChartFullscreen(false)}
        symbol={symbol}
        assetName={assetName}
        chartControls={{
          range,
          onRangeChange: setRange,
          showMA,
          onToggleMA: setShowMA,
          showBB,
          onToggleBB: setShowBB,
          showPricePredictor,
          onTogglePricePredictor: handleTogglePricePredictor,
          horizonDays,
          onHorizonChange: handleHorizonChange,
        }}
        forecast={forecast.data}
        isLoadingForecast={forecast.isLoading}
        candles={candles.data ?? null}
        isLoadingCandles={candles.isLoading}
        candlesError={candles.error}
        quote={snapshot.quote}
        marketStatus={snapshot.marketStatus}
        supportLevels={snapshot.indicators?.support_resistance.support ?? []}
        resistanceLevels={snapshot.indicators?.support_resistance.resistance ?? []}
        prediction={snapshot.prediction}
        theme={theme}
      />

      <AlertToastStack alerts={alertsState.newlyTriggered} onDismiss={alertsState.dismissToast} />
      <AlertsPanel isOpen={isAlertsOpen} onClose={() => setIsAlertsOpen(false)} symbol={symbol} alertsState={alertsState} />

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
            news: news.data,
            ratingChanges: ratingChanges.data,
          })
        }
      />

      <OnboardingTour tour={onboardingTour} />
      <GeminiKeySetupModal isOpen={geminiKeyPrompt.isOpen} onClose={geminiKeyPrompt.close} />
    </div>
  );
}
