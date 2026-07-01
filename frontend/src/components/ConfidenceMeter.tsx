import { cn } from "@/lib/utils";

interface ConfidenceMeterProps {
  confidence: number;
  size?: number;
}

export function ConfidenceMeter({ confidence, size = 100 }: ConfidenceMeterProps) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - confidence / 100);

  const colorClass = confidence >= 70 ? "text-brand" : confidence >= 45 ? "text-warn" : "text-ink-faint";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={7}
          className="fill-none stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("fill-none transition-all duration-700 ease-out", colorClass)}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-0.5">
        <span className="numeric font-mono text-xl font-semibold leading-none text-ink">{Math.round(confidence)}%</span>
        <span className="text-[8px] font-medium uppercase tracking-wide text-ink-faint">Confidence</span>
      </div>
    </div>
  );
}
