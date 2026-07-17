import { SegmentedControl } from "@/components/SegmentedControl";
import { CHART_RANGES } from "@/lib/constants";

interface TimeframeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimeframeSelector({ value, onChange, className }: TimeframeSelectorProps) {
  return (
    <SegmentedControl
      variant="track"
      value={value}
      onChange={onChange}
      ariaLabel="Chart time range"
      // min-w-0 (from the track variant's own container styles) lets this shrink
      // below its natural content width inside a flex toolbar row - without it, a
      // parent `flex-wrap` would push the whole selector onto its own line instead
      // of letting it scroll internally.
      className={className}
      options={CHART_RANGES.map((r) => ({ value: r.value, content: r.label }))}
    />
  );
}
