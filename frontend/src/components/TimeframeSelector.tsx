import { CANDLE_INTERVALS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface TimeframeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimeframeSelector({ value, onChange, className }: TimeframeSelectorProps) {
  return (
    <div className={cn("flex items-center gap-1 rounded-lg bg-surface-raised p-1", className)}>
      {CANDLE_INTERVALS.map((i) => (
        <button
          key={i.value}
          onClick={() => onChange(i.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === i.value ? "bg-brand text-canvas" : "text-ink-muted hover:text-ink"
          )}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
