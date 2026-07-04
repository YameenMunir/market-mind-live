import { CHART_RANGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface TimeframeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimeframeSelector({ value, onChange, className }: TimeframeSelectorProps) {
  return (
    <div
      className={cn(
        // min-w-0 lets this shrink below its natural content width inside a flex
        // toolbar row - without it, a parent `flex-wrap` would push the whole
        // selector onto its own line instead of letting it scroll internally.
        "flex min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-surface-raised p-1",
        className
      )}
      role="group"
      aria-label="Chart time range"
    >
      {CHART_RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          aria-pressed={value === r.value}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            value === r.value ? "bg-brand text-canvas shadow-sm" : "text-ink-muted hover:text-ink"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
