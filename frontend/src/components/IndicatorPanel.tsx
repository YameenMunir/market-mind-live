import { Panel } from "@/components/Panel";
import { cn } from "@/lib/utils";
import type { IndicatorSet } from "@/types";

interface IndicatorPanelProps {
  indicators: IndicatorSet | null;
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" | "warn" }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-ink-muted">{label}</span>
      <span
        className={cn(
          "numeric font-mono text-sm font-medium",
          tone === "bull" && "text-bull",
          tone === "bear" && "text-bear",
          tone === "warn" && "text-warn",
          !tone && "text-ink"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function IndicatorPanel({ indicators }: IndicatorPanelProps) {
  const rsi = indicators?.rsi_14;
  const rsiTone = rsi === null || rsi === undefined ? undefined : rsi >= 70 ? "bear" : rsi <= 30 ? "bull" : undefined;
  const macdTone =
    indicators?.macd.histogram === null || indicators?.macd.histogram === undefined
      ? undefined
      : indicators.macd.histogram >= 0
      ? "bull"
      : "bear";

  const fmt = (v: number | null | undefined, digits = 2) => (v === null || v === undefined ? "--" : v.toFixed(digits));

  return (
    <Panel eyebrow="Technical Indicators" title="Signal Breakdown">
      <div className="divide-y divide-border">
        <Row label="RSI (14)" value={fmt(rsi, 1)} tone={rsiTone} />
        <Row label="SMA 20" value={fmt(indicators?.moving_averages.sma_20)} />
        <Row label="SMA 50" value={fmt(indicators?.moving_averages.sma_50)} />
        <Row label="SMA 200" value={fmt(indicators?.moving_averages.sma_200)} />
        <Row label="EMA 12 / 26" value={`${fmt(indicators?.moving_averages.ema_12)} / ${fmt(indicators?.moving_averages.ema_26)}`} />
        <Row label="MACD Histogram" value={fmt(indicators?.macd.histogram, 3)} tone={macdTone} />
        <Row
          label="Bollinger Bands"
          value={`${fmt(indicators?.bollinger_bands.lower)} - ${fmt(indicators?.bollinger_bands.upper)}`}
        />
        <Row label="ATR (14)" value={fmt(indicators?.atr_14, 3)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">Support</p>
          <div className="mt-1.5 flex flex-col gap-1">
            {indicators?.support_resistance.support.length ? (
              indicators.support_resistance.support.map((v) => (
                <span key={v} className="numeric font-mono text-xs text-bull">
                  {v.toFixed(2)}
                </span>
              ))
            ) : (
              <span className="text-xs text-ink-faint">--</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">Resistance</p>
          <div className="mt-1.5 flex flex-col gap-1">
            {indicators?.support_resistance.resistance.length ? (
              indicators.support_resistance.resistance.map((v) => (
                <span key={v} className="numeric font-mono text-xs text-bear">
                  {v.toFixed(2)}
                </span>
              ))
            ) : (
              <span className="text-xs text-ink-faint">--</span>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
