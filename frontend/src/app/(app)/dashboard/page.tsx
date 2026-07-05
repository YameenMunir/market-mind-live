"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Maximize2 } from "lucide-react";

import { AIInsightsButton } from "@/components/AIInsightsButton";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
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
import { FullscreenChartModal } from "@/components/FullscreenChartModal";
import { IndicatorPanel } from "@/components/IndicatorPanel";
import { MarketStatusCard } from "@/components/MarketStatusCard";
import { OnboardingTour } from "@/components/OnboardingTour";
import { Panel } from "@/components/Panel";
import { PredictionCard } from "@/components/PredictionCard";
import { PriceCard } from "@/components/PriceCard";
import { PricePredictorControls } from "@/components/PricePredictorControls";
import { RiskCard } from "@/components/RiskCard";
import { StatusBanner } from "@/components/StatusBanner";
import { TimeframeSelector } from "@/components/TimeframeSelector";
import { Topbar } from "@/components/Topbar";
import { LiveCandlestickChart } from "@/charts/LiveCandlestickChart";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useAnalystConsensus } from "@/hooks/useAnalystConsensus";
import { useChartPreferences } from "@/hooks/useChartPreferences";
import { useFullscreenToggle } from "@/hooks/useFullscreenToggle";
import { useCandles } from "@/hooks/useMarketData";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { usePriceForecast } from "@/hooks/usePriceForecast";
import { useTheme } from "@/hooks/useTheme";
import { buildAssetContext } from "@/lib/aiContext";
import { CHART_RANGES } from "@/lib/constants";
import type { AssetSearchResult, AssetType, PriceForecast } from "@/types";

export default function DashboardPage() {
  const { theme } = useTheme();
  const { prefs, updatePrefs } = useChartPreferences();

  const [symbol, setSymbol] = useState(prefs.defaultSymbol);
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [assetName, setAssetName] = useState<string | null>(null);
  const [interval, setInterval_] = useState("1d");
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
  const candles = useCandles(symbol, interval);
  const forecast = usePriceForecast(symbol, horizonDays, showPricePredictor);
  const alertsState = useAlerts(symbol);
  const analyst = useAnalystConsensus(symbol);
  const isLive = snapshot.connectionState === "live" || snapshot.connectionState === "polling";
  const activeAlertCount = alertsState.alerts.filter((a) => a.status === "active" || a.status === "triggered").length;

  const { currency, convert } = useCurrencyContext();
  const nativeCurrency = snapshot.quote?.currency ?? "USD";

  const convertedCandles = useMemo(() => {
    if (!candles.data) return null;
    if (nativeCurrency === currency) return candles.data;
    return {
      ...candles.data,
      candles: candles.data.candles.map((c) => ({
        ...c,
        open: convert(c.open, nativeCurrency) ?? c.open,
        high: convert(c.high, nativeCurrency) ?? c.high,
        low: convert(c.low, nativeCurrency) ?? c.low,
        close: convert(c.close, nativeCurrency) ?? c.close,
      })),
    };
  }, [candles.data, currency, nativeCurrency, convert]);

  const convertedSupport = (snapshot.indicators?.support_resistance.support ?? []).map(
    (v) => convert(v, nativeCurrency) ?? v
  );
  const convertedResistance = (snapshot.indicators?.support_resistance.resistance ?? []).map(
    (v) => convert(v, nativeCurrency) ?? v
  );

  const convertedForecast: PriceForecast | null = useMemo(() => {
    if (!forecast.data) return null;
    if (nativeCurrency === currency) return forecast.data;
    return {
      ...forecast.data,
      last_actual_price: convert(forecast.data.last_actual_price, nativeCurrency) ?? forecast.data.last_actual_price,
      points: forecast.data.points.map((p) => ({
        ...p,
        predicted_price: convert(p.predicted_price, nativeCurrency) ?? p.predicted_price,
        lower_bound: convert(p.lower_bound, nativeCurrency) ?? p.lower_bound,
        upper_bound: convert(p.upper_bound, nativeCurrency) ?? p.upper_bound,
      })),
    };
  }, [forecast.data, currency, nativeCurrency, convert]);

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
            />
          </div>
        }
        title="Live Dashboard"
      />

      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-6">
        {snapshot.errorMessage && <StatusBanner message={snapshot.errorMessage} tone="warning" icon="clock" />}

        <div data-tour="stat-cards" className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <PriceCard
            quote={snapshot.quote}
            symbol={symbol}
            isLive={snapshot.connectionState === "live"}
            isStale={snapshot.isStale}
          />
          <MarketStatusCard
            status={snapshot.marketStatus}
            updatedAt={snapshot.marketStatusUpdatedAt}
            isLive={snapshot.connectionState === "live"}
            isStale={snapshot.isStale}
          />
          <PredictionCard
            prediction={snapshot.prediction}
            isLoading={!snapshot.prediction}
            updatedAt={snapshot.predictionUpdatedAt}
            isLive={snapshot.connectionState === "live"}
            isStale={snapshot.isStale}
            nativeCurrency={nativeCurrency}
          />
          <AnalystConsensusCard consensus={analyst.data} isLoading={analyst.isLoading} symbol={symbol} />
          <RiskCard
            risk={snapshot.risk}
            updatedAt={snapshot.riskUpdatedAt}
            isLive={snapshot.connectionState === "live"}
            isStale={snapshot.isStale}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Panel
            className="xl:col-span-8"
            dataTour="live-chart"
            eyebrow="Live Chart"
            title={`${symbol} · ${CHART_RANGES.find((r) => r.value === interval)?.label}`}
            action={
              <div className="flex flex-wrap items-center gap-3">
                <TimeframeSelector value={interval} onChange={setInterval_} />
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setIsChartFullscreen(true)}
                  aria-label="Expand chart to full screen"
                  title="Expand chart"
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
              {candles.isLoading && !candles.data && (
                <StatusBanner message="Waiting for next candle..." tone="muted" icon="clock" className="ml-auto" />
              )}
            </div>
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
                  livePrice={interval === "1d" ? convert(snapshot.quote?.price ?? null, nativeCurrency) : null}
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
        </div>

        <div data-tour="beginner-explanation" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BeginnerSummary prediction={snapshot.prediction} />
          <ExplanationPanel prediction={snapshot.prediction} />
        </div>
      </main>

      <FullscreenChartModal
        isOpen={isChartFullscreen}
        onClose={() => setIsChartFullscreen(false)}
        symbol={symbol}
        assetName={assetName}
        interval={interval}
        onIntervalChange={setInterval_}
        showMA={showMA}
        onToggleMA={setShowMA}
        showBB={showBB}
        onToggleBB={setShowBB}
        showPricePredictor={showPricePredictor}
        onTogglePricePredictor={handleTogglePricePredictor}
        horizonDays={horizonDays}
        onHorizonChange={handleHorizonChange}
        forecast={forecast.data}
        isLoadingForecast={forecast.isLoading}
        candles={candles.data ?? null}
        isLoadingCandles={candles.isLoading}
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
          })
        }
      />

      <OnboardingTour tour={onboardingTour} />
    </div>
  );
}
