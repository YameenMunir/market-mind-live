import { FORECAST_HORIZONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PricePredictorControlsProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  horizonDays: number;
  onHorizonChange: (value: number) => void;
  className?: string;
}

export function PricePredictorControls({
  enabled,
  onToggle,
  horizonDays,
  onHorizonChange,
  className,
}: PricePredictorControlsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-2", className)}>
      <label className="flex cursor-pointer select-none items-center gap-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:text-ink">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-brand"
        />
        Price Predictor
      </label>

      {enabled && (
        <>
          <div
            className="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-surface-raised p-1"
            role="group"
            aria-label="Forecast horizon"
          >
            {FORECAST_HORIZONS.map((h) => (
              <button
                key={h.value}
                onClick={() => onHorizonChange(h.value)}
                aria-pressed={horizonDays === h.value}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  horizonDays === h.value ? "bg-brand text-canvas shadow-sm" : "text-ink-muted hover:text-ink"
                )}
              >
                {h.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] italic leading-relaxed text-ink-faint">
            Predictions are estimates for educational purposes only and are not financial advice.
          </span>
        </>
      )}
    </div>
  );
}
