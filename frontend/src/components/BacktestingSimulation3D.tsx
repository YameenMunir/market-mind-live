"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

type StrategyType = "gold" | "reversion" | "breakout";

interface StratPoint {
  t: number;
  strategy: number;
  benchmark: number;
}

const SCENARIOS: Record<StrategyType, {
  name: string;
  color: string;
  points: StratPoint[];
  buyIdx: number;
  sellIdx: number;
  buyLabel: string;
  sellLabel: string;
}> = {
  gold: {
    name: "Golden Cross (EMA)",
    color: "#10b981",
    points: [
      { t: 0, strategy: 100, benchmark: 100 },
      { t: 1, strategy: 112, benchmark: 105 },
      { t: 2, strategy: 105, benchmark: 102 },
      { t: 3, strategy: 125, benchmark: 108 },
      { t: 4, strategy: 142, benchmark: 114 },
      { t: 5, strategy: 135, benchmark: 110 },
      { t: 6, strategy: 165, benchmark: 118 },
      { t: 7, strategy: 180, benchmark: 122 }
    ],
    buyIdx: 3,
    sellIdx: 5,
    buyLabel: "Buy: EMA 20 crossed EMA 50 @ $125",
    sellLabel: "Sell: EMA 20 crossed below EMA 50 @ $135"
  },
  reversion: {
    name: "Mean Reversion",
    color: "var(--color-brand, #f59e0b)",
    points: [
      { t: 0, strategy: 100, benchmark: 100 },
      { t: 1, strategy: 92, benchmark: 105 },
      { t: 2, strategy: 115, benchmark: 102 },
      { t: 3, strategy: 110, benchmark: 108 },
      { t: 4, strategy: 132, benchmark: 114 },
      { t: 5, strategy: 122, benchmark: 110 },
      { t: 6, strategy: 138, benchmark: 118 },
      { t: 7, strategy: 148, benchmark: 122 }
    ],
    buyIdx: 1,
    sellIdx: 4,
    buyLabel: "Buy: Price below Bollinger Band boundary @ $92",
    sellLabel: "Sell: Price reverted to standard mean @ $132"
  },
  breakout: {
    name: "Volatility Breakout",
    color: "#f43f5e",
    points: [
      { t: 0, strategy: 100, benchmark: 100 },
      { t: 1, strategy: 118, benchmark: 105 },
      { t: 2, strategy: 88, benchmark: 102 },
      { t: 3, strategy: 142, benchmark: 108 },
      { t: 4, strategy: 165, benchmark: 114 },
      { t: 5, strategy: 132, benchmark: 110 },
      { t: 6, strategy: 185, benchmark: 118 },
      { t: 7, strategy: 212, benchmark: 122 }
    ],
    buyIdx: 2,
    sellIdx: 6,
    buyLabel: "Buy: Price broke above ATR range @ $88",
    sellLabel: "Sell: Trend stopped below 20-day high @ $185"
  }
};

export function BacktestingSimulation3D({ className }: { className?: string }) {
  const [containerRef, isVisible] = useIntersectionObserver({ threshold: 0.1 });
  const [strategy, setStrategy] = useState<StrategyType>("gold");
  const [hoveredFlag, setHoveredFlag] = useState<"buy" | "sell" | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  const origin = { x: 45, y: 90 };
  const cos30 = 0.866;
  const sin30 = 0.5;

  const currentStrat = SCENARIOS[strategy];
  const { points: data, buyIdx, sellIdx, buyLabel, sellLabel } = currentStrat;

  // Helper to project point coordinates
  const getCoords = (idx: number, val: number, isBenchmark: boolean) => {
    const stepX = 18;
    const tx = idx * stepX;
    const ty = (val - 80) * 0.7;
    const zOffset = isBenchmark ? -10 : 10;
    
    const x = origin.x + tx * cos30 + zOffset * -0.866;
    const y = origin.y + tx * sin30 + zOffset * 0.5 - ty;
    return { x, y };
  };

  const getFloorCoords = (idx: number, isBenchmark: boolean) => {
    const stepX = 18;
    const tx = idx * stepX;
    const zOffset = isBenchmark ? -10 : 10;
    
    const x = origin.x + tx * cos30 + zOffset * -0.866;
    const y = origin.y + tx * sin30 + zOffset * 0.5;
    return { x, y };
  };

  // Build path strings
  const strategyPath = data.map((d, i) => `${getCoords(i, d.strategy, false).x},${getCoords(i, d.strategy, false).y}`).join(" L ");
  const benchmarkPath = data.map((d, i) => `${getCoords(i, d.benchmark, true).x},${getCoords(i, d.benchmark, true).y}`).join(" L ");

  const strategyCurtain = [
    `${getFloorCoords(0, false).x},${getFloorCoords(0, false).y}`,
    ...data.map((d, i) => `${getCoords(i, d.strategy, false).x},${getCoords(i, d.strategy, false).y}`),
    `${getFloorCoords(data.length - 1, false).x},${getFloorCoords(data.length - 1, false).y}`
  ].join(" ");

  // Transaction coordinates
  const buyPt = getCoords(buyIdx, data[buyIdx].strategy, false);
  const sellPt = getCoords(sellIdx, data[sellIdx].strategy, false);

  const getTooltipText = () => {
    if (hoveredFlag === "buy") return buyLabel;
    if (hoveredFlag === "sell") return sellLabel;
    return "Interactive timeline flags";
  };

  return (
    <div 
      ref={containerRef}
      className={cn("w-full space-y-4 select-none", className)}
    >
      {/* Strategy Toggles */}
      <div className="flex rounded-sm border border-border bg-surface/50 p-0.5 font-mono text-xs font-bold uppercase tracking-wider w-fit mx-auto">
        {(["gold", "reversion", "breakout"] as StrategyType[]).map(sc => (
          <button
            key={sc}
            onClick={() => setStrategy(sc)}
            className={cn(
              "px-2.5 py-1 rounded-sm transition-all",
              strategy === sc 
                ? "bg-surface-raised text-ink border border-border/80" 
                : "text-ink-muted hover:text-ink"
            )}
          >
            {sc === "gold" ? "Golden Cross" : sc === "reversion" ? "Mean Reversion" : "Breakout"}
          </button>
        ))}
      </div>

      <div className="relative rounded-sm border border-border bg-surface p-4 shadow-xl">
        
        {/* Flag explanation popover */}
        <div className="absolute top-2 left-2 z-10 font-mono text-xs text-ink-muted max-w-[200px] bg-surface-raised/95 border border-border px-2 py-1 rounded-sm">
          <span className="font-bold text-ink uppercase">Hover indicators:</span> {getTooltipText()}
        </div>

        <svg
          viewBox="0 0 240 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto overflow-visible filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
        >
          <defs>
            {/* Dynamic Strategy colors */}
            <linearGradient id="strat-curtain-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={currentStrat.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={currentStrat.color} stopOpacity="0" />
            </linearGradient>

            <filter id="strat-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Bounding axis lines */}
          <line
            x1={getFloorCoords(0, true).x}
            y1={getFloorCoords(0, true).y}
            x2={getFloorCoords(data.length - 1, true).x}
            y2={getFloorCoords(data.length - 1, true).y}
            stroke="currentColor"
            strokeOpacity="0.08"
          />
          <line
            x1={getFloorCoords(0, false).x}
            y1={getFloorCoords(0, false).y}
            x2={getFloorCoords(data.length - 1, false).x}
            y2={getFloorCoords(data.length - 1, false).y}
            stroke="currentColor"
            strokeOpacity="0.08"
          />

          {/* Parallel floor coordinate markers */}
          {data.map((_, i) => (
            <line
              key={i}
              x1={getFloorCoords(i, true).x}
              y1={getFloorCoords(i, true).y}
              x2={getFloorCoords(i, false).x}
              y2={getFloorCoords(i, false).y}
              stroke="currentColor"
              strokeOpacity="0.05"
              strokeWidth="0.8"
            />
          ))}

          {/* Benchmark line path */}
          <path
            d={`M ${benchmarkPath}`}
            stroke="var(--color-ink-muted, #94a3b8)"
            strokeWidth="1.2"
            strokeOpacity="0.3"
            strokeDasharray="2 2"
          />

          {/* Strategy area curtain */}
          <polygon points={strategyCurtain} fill="url(#strat-curtain-grad)" />

          {/* Strategy path */}
          <path
            d={`M ${strategyPath}`}
            stroke={currentStrat.color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#strat-glow)"
            className={cn(!prefersReducedMotion && isVisible && "animate-draw-backtest")}
            style={{
              strokeDasharray: 220,
              strokeDashoffset: prefersReducedMotion ? 0 : 220
            }}
          />

          {/* Final Dots */}
          <circle
            cx={getCoords(data.length - 1, data[data.length - 1].benchmark, true).x}
            cy={getCoords(data.length - 1, data[data.length - 1].benchmark, true).y}
            r="2"
            fill="var(--color-ink-muted, #94a3b8)"
            fillOpacity="0.5"
          />

          <circle
            cx={getCoords(data.length - 1, data[data.length - 1].strategy, false).x}
            cy={getCoords(data.length - 1, data[data.length - 1].strategy, false).y}
            r="3"
            fill={currentStrat.color}
          />

          {/* ================= TRANSACTION: BUY FLAG (B) ================= */}
          <g 
            transform={`translate(${buyPt.x}, ${buyPt.y - 14})`}
            className="cursor-pointer transition-transform hover:scale-110"
            onMouseEnter={() => setHoveredFlag("buy")}
            onMouseLeave={() => setHoveredFlag(null)}
            tabIndex={0}
            onFocus={() => setHoveredFlag("buy")}
            onBlur={() => setHoveredFlag(null)}
          >
            <line x1="0" y1="14" x2="0" y2="0" stroke="#10b981" strokeWidth="1.2" />
            <rect x="0" y="0" width="12" height="10" fill="#10b981" rx="1.5" />
            <text x="3.5" y="8" fill="#020617" fontSize="7.5" fontWeight="bold" fontFamily="monospace">B</text>
          </g>

          {/* ================= TRANSACTION: SELL FLAG (S) ================= */}
          <g 
            transform={`translate(${sellPt.x}, ${sellPt.y - 14})`}
            className="cursor-pointer transition-transform hover:scale-110"
            onMouseEnter={() => setHoveredFlag("sell")}
            onMouseLeave={() => setHoveredFlag(null)}
            tabIndex={0}
            onFocus={() => setHoveredFlag("sell")}
            onBlur={() => setHoveredFlag(null)}
          >
            <line x1="0" y1="14" x2="0" y2="0" stroke="#ef4444" strokeWidth="1.2" />
            <rect x="0" y="0" width="12" height="10" fill="#ef4444" rx="1.5" />
            <text x="3.5" y="8" fill="#f8fafc" fontSize="7.5" fontWeight="bold" fontFamily="monospace">S</text>
          </g>
        </svg>

        <p className="mt-2 text-center text-xs uppercase tracking-wider text-ink-faint">
          Illustrative performance &middot; Strategy vs benchmark
        </p>
      </div>

      <style jsx global>{`
        @keyframes drawBacktest {
          to { strokeDashoffset: 0; }
        }
        .animate-draw-backtest {
          animation: drawBacktest 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>
    </div>
  );
}
