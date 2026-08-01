"use client";

import { useState, MouseEvent, useEffect, useMemo, useRef } from "react";
import { cn, formatCompactNumber } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import type { Candle } from "@/types";

// The 3D view renders a small fixed number of bars; a real candle series for a long
// range can be hundreds of points, so it's evenly sampled down to this many.
const MAX_POINTS = 12;

/** Evenly samples a candle series down to at most `MAX_POINTS`, always keeping the
 * most recent candle so the right-hand edge of the chart is the latest real bar. */
function toDataPoints(candles: Candle[]): DataPoint[] {
  if (candles.length === 0) return [];
  const step = Math.max(1, Math.ceil(candles.length / MAX_POINTS));
  const sampled = candles.filter((_, i) => i % step === 0);
  const last = candles[candles.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled.map((c) => ({
    price: c.close,
    open: c.open,
    close: c.close,
    high: c.high,
    low: c.low,
    volume: c.volume ?? 0,
  }));
}

type Timeframe = "1D" | "1W" | "1M" | "1Y";
type ViewType = "line" | "candles" | "volume";
type MarketState = "bull" | "bear" | "neutral";

interface DataPoint {
  price: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}


export function StockGraph3D({
  className,
  minimal = false,
  timeframe: propTimeframe,
  onTimeframeChange,
  candles,
}: {
  className?: string;
  minimal?: boolean;
  timeframe?: string;
  onTimeframeChange?: (t: string) => void;
  /** Real candle series for the symbol currently on screen. This component used to
   * render a hardcoded demo dataset for every symbol regardless of what was
   * selected, which showed fabricated prices under the real symbol's panel title. */
  candles: Candle[];
}) {
  const [containerRef, isVisible] = useIntersectionObserver({ threshold: 0.1 });
  
  // Interactive States
  const [localTimeframe, setLocalTimeframe] = useState<Timeframe>("1M");
  
  const currentRawTimeframe = (propTimeframe || localTimeframe).toUpperCase() as Timeframe;
  const timeframe = (["1D", "1W", "1M", "1Y"].includes(currentRawTimeframe) ? currentRawTimeframe : "1M") as Timeframe;
  
  const setTimeframe = (t: Timeframe) => {
    if (onTimeframeChange) {
      onTimeframeChange(t.toLowerCase());
    } else {
      setLocalTimeframe(t);
    }
  };

  const [viewType, setViewType] = useState<ViewType>("line");
  const [marketState, setMarketState] = useState<MarketState>("bull");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  
  // 3D Tilt rotations
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check prefers-reduced-motion on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !isVisible) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - bounds.left) / bounds.width - 0.5;
    const y = (e.clientY - bounds.top) / bounds.height - 0.5;
    
    // Smooth angle projection limits (max 6deg)
    setTilt({
      rx: y * -12,
      ry: x * 12
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
    setHoveredIdx(null);
  };

  const activeData = useMemo(() => toDataPoints(candles), [candles]);

  // Padding is proportional, not a flat +/-10: a fixed $10 pad is most of the range
  // for a ~1.10 forex pair and invisible on a ~$60,000 crypto price, so the vertical
  // scale only reads correctly across asset classes when it tracks the actual range.
  const priceMin = useMemo(() => {
    if (activeData.length === 0) return 0;
    const prices = activeData.map((d) => d.low);
    const min = Math.min(...prices);
    const max = Math.max(...activeData.map((d) => d.high));
    const pad = (max - min) * 0.1 || Math.abs(min) * 0.01 || 1;
    return min - pad;
  }, [activeData]);

  // Volume normalized per-dataset. Guarded against an all-zero series (some assets
  // report no volume), which would otherwise divide by zero into NaN coordinates.
  const maxVolume = Math.max(...activeData.map((d) => d.volume), 1);
  const VOLUME_MAX_HEIGHT = 45;

  // Every projection below indexes points[0] / points[length-1] directly, so an empty
  // series would throw rather than render. All hooks above have already run, so this
  // early return doesn't change hook order.
  if (activeData.length === 0) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-sm border border-dashed border-border p-6", className)}
        role="status"
      >
        <p className="text-center font-mono text-2xs uppercase tracking-wide text-ink-faint">
          No chart data available for this range.
        </p>
      </div>
    );
  }

  // Projection constants
  const origin = { x: 45, y: 125 };
  const cos30 = 0.866;
  const sin30 = 0.16;
  const cos150 = -0.866;
  const sin150 = 0.16;

  const points = activeData.map((d, i) => {
    const t = i * 26; // X spacing (time)
    
    // Dynamic height mapping based on price
    const h = (d.price - priceMin) * 0.9; 
    const oHeight = (d.open - priceMin) * 0.9;
    const cHeight = (d.close - priceMin) * 0.9;
    const hHeight = (d.high - priceMin) * 0.9;
    const lHeight = (d.low - priceMin) * 0.9;

    // Line View endpoints
    const fx = origin.x + t * cos30;
    const fy = origin.y + t * sin30 - h;
    
    const bx = origin.x + t * cos30 + 14 * cos150;
    const by = origin.y + t * sin30 + 14 * sin150 - h;
    
    // Ground projection points
    const gfx = origin.x + t * cos30;
    const gfy = origin.y + t * sin30;
    const gbx = origin.x + t * cos30 + 14 * cos150;
    const gby = origin.y + t * sin30 + 14 * sin150;

    // Candlestick specific coordinates
    const fxOpen = origin.x + t * cos30;
    const fyOpen = origin.y + t * sin30 - oHeight;
    const fxClose = origin.x + t * cos30;
    const fyClose = origin.y + t * sin30 - cHeight;
    const fxHigh = origin.x + t * cos30;
    const fyHigh = origin.y + t * sin30 - hHeight;
    const fxLow = origin.x + t * cos30;
    const fyLow = origin.y + t * sin30 - lHeight;

    return { 
      fx, fy, bx, by, gfx, gfy, gbx, gby, 
      fxOpen, fyOpen, fxClose, fyClose, fxHigh, fyHigh, fxLow, fyLow,
      data: d 
    };
  });

  const getPointActiveY = (p: typeof points[0]) => {
    if (viewType === "volume") {
      const pillarH = (p.data.volume / maxVolume) * VOLUME_MAX_HEIGHT;
      return p.gfy - pillarH;
    }
    return p.fy;
  };

  // SVG Render utilities
  const frontPath = points.map(p => `${p.fx},${p.fy}`).join(" L ");
  const backPath = points.map(p => `${p.bx},${p.by}`).join(" L ");

  const ribbonTopPoints = [
    ...points.map(p => `${p.fx},${p.fy}`),
    ...[...points].reverse().map(p => `${p.bx},${p.by}`)
  ].join(" ");

  const ribbonFrontPoints = [
    ...points.map(p => `${p.fx},${p.fy}`),
    ...[...points].reverse().map(p => `${p.fx},${p.fy + 2}`)
  ].join(" ");

  const gridLinesZ = points.map(p => `M ${p.gfx} ${p.gfy} L ${p.gbx} ${p.gby}`).join(" ");
  const gridLineXFront = `M ${points[0].gfx} ${points[0].gfy} L ${points[points.length - 1].gfx} ${points[points.length - 1].gfy}`;
  const gridLineXBack = `M ${points[0].gbx} ${points[0].gby} L ${points[points.length - 1].gbx} ${points[points.length - 1].gby}`;

  const curtainPoints = [
    `${points[0].gfx},${points[0].gfy}`,
    ...points.map(p => `${p.fx},${p.fy}`),
    `${points[points.length - 1].gfx},${points[points.length - 1].gfy}`
  ].join(" ");

  // Color mappings based on market state
  const stateColorMap = {
    bull: {
      brand: "rgb(var(--color-bull))",
      strong: "#059669",
      gradient: "bull-grad",
      curtain: "bull-curtain",
      badgeBg: "bg-bull/5 border-bull/20",
      badgeText: "text-bull",
    },
    bear: {
      brand: "rgb(var(--color-bear))",
      strong: "#dc2626",
      gradient: "bear-grad",
      curtain: "bear-curtain",
      badgeBg: "bg-bear/5 border-bear/20",
      badgeText: "text-bear",
    },
    neutral: {
      brand: "rgb(var(--color-brand))",
      strong: "#d97706",
      gradient: "neutral-grad",
      curtain: "neutral-curtain",
      badgeBg: "bg-brand/5 border-brand/20",
      badgeText: "text-brand",
    }
  };

  const currentTheme = stateColorMap[marketState];

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "w-full transition-transform duration-200 select-none",
        minimal && "flex-1 min-h-0 flex flex-col",
        className
      )}
      style={{
        transform: prefersReducedMotion 
          ? "none" 
          : `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(0)`,
      }}
    >
      {/* ================= INTERACTIVE HEADERS / CONTROLS ================= */}
      <div className="mb-3 flex overflow-x-auto scrollbar-none -mx-3 px-3 flex-nowrap items-center gap-2 font-mono text-2xs font-bold uppercase tracking-wider sm:mx-0 sm:px-0 sm:mb-4 sm:justify-between sm:gap-3 sm:flex-wrap">
        {/* Timeframe selector */}
        {!minimal && (
          <div className="flex rounded-sm border border-border bg-surface/50 p-0.5">
            {(["1D", "1W", "1M", "1Y"] as Timeframe[]).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-2.5 py-1 transition-all rounded-sm",
                  timeframe === tf 
                    ? "bg-surface-raised text-ink border border-border/80" 
                    : "text-ink-muted hover:text-ink"
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        )}

        {/* View toggles */}
        <div className="flex rounded-sm border border-border bg-surface/50 p-0.5">
          {(["line", "candles", "volume"] as ViewType[]).map(vt => (
            <button
              key={vt}
              onClick={() => setViewType(vt)}
              className={cn(
                "px-2.5 py-1 transition-all rounded-sm",
                viewType === vt 
                  ? "bg-surface-raised text-ink border border-border/80" 
                  : "text-ink-muted hover:text-ink"
              )}
            >
              {vt}
            </button>
          ))}
        </div>

        {/* State triggers */}
        <div className="flex rounded-sm border border-border bg-surface/50 p-0.5">
          {(["bull", "bear", "neutral"] as MarketState[]).map(ms => (
            <button
              key={ms}
              onClick={() => setMarketState(ms)}
              className={cn(
                "px-2 py-1 transition-all rounded-sm flex items-center gap-1.5",
                marketState === ms 
                  ? "bg-surface-raised text-ink border border-border/80" 
                  : "text-ink-muted hover:text-ink"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", 
                ms === "bull" ? "bg-bull" : ms === "bear" ? "bg-bear" : "bg-brand"
              )} />
              {ms}
            </button>
          ))}
        </div>
      </div>

      {/* ================= GRAPH CONTAINER ================= */}
      <div className={cn(
        "relative overflow-visible",
        minimal ? "flex-1 min-h-0 flex flex-col justify-center" : "rounded-sm border border-border bg-surface p-3 shadow-xl sm:p-4"
      )}>
        
        <div className={cn("relative", minimal ? "w-full flex-1 min-h-0 flex items-center justify-center" : "w-full")}>
          {/* Floating Dynamic HTML Tooltip */}
          {hoveredIdx !== null && (
            <div 
              className="absolute z-20 pointer-events-none rounded-sm border border-border bg-surface-raised/95 px-2.5 py-1.5 text-2xs font-mono shadow-xl transition-all duration-100 flex flex-col gap-1 min-w-[100px] backdrop-blur-[2px] transform -translate-x-1/2 -translate-y-[calc(100%+8px)]"
              style={{
                left: `${((points[hoveredIdx].fx - 18) / 260) * 100}%`,
                top: `${((getPointActiveY(points[hoveredIdx]) - 50) / 135) * 100}%`
              }}
            >
              <div className="text-ink font-bold">NODE #{hoveredIdx + 1}</div>
              <div className="flex justify-between gap-4">
                <span className="text-ink-muted">PRICE:</span>
                {/* Sub-$5 assets (forex pairs) need more precision than the flat one
                    decimal place this used when it only ever rendered ~$145 demo data. */}
                <span className="numeric text-ink font-bold">
                  {points[hoveredIdx].data.price < 5
                    ? points[hoveredIdx].data.price.toFixed(4)
                    : points[hoveredIdx].data.price.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ink-muted">VOL:</span>
                <span className="numeric text-ink-muted">{formatCompactNumber(points[hoveredIdx].data.volume)}</span>
              </div>
            </div>
          )}

          <svg
            viewBox="18 50 260 135"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
              "overflow-visible filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)]",
              minimal ? "h-full w-auto max-w-full mx-auto block" : "w-full h-auto"
            )}
          >
          <defs>
            {/* Bull color stop */}
            <linearGradient id="bull-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="bull-curtain" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>

            {/* Bear color stop */}
            <linearGradient id="bear-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="bear-curtain" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>

            {/* Neutral color stop */}
            <linearGradient id="neutral-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="neutral-curtain" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Floor Bounding Grid */}
          <path d={gridLinesZ} stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.8" />
          <path d={gridLineXFront} stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.8" />
          <path d={gridLineXBack} stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.8" />

          {/* Vertical Grid Ticks */}
          {[15, 30, 45].map((h, idx) => {
            const yStart = origin.y - h;
            const yEnd = origin.y + (points.length - 1) * 26 * sin30 - h;
            const xEnd = origin.x + (points.length - 1) * 26 * cos30;
            return (
              <path
                key={idx}
                d={`M ${origin.x} ${yStart} L ${xEnd} ${yEnd}`}
                stroke="currentColor"
                strokeOpacity="0.04"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
            );
          })}

          {/* ================= VIEW: LINE GRAPH ================= */}
          {viewType === "line" && (
            <g className="transition-all duration-300">
              {/* Vertical stems */}
              {points.map((p, idx) => (
                <line
                  key={idx}
                  x1={p.fx}
                  y1={p.fy}
                  x2={p.gfx}
                  y2={p.gfy}
                  stroke="currentColor"
                  strokeOpacity="0.05"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              ))}

              {/* Curtain area under ribbon */}
              <polygon points={curtainPoints} fill={`url(#${currentTheme.curtain})`} />

              {/* 3D Ribbon Extrusion (Front face thickness) */}
              <polygon points={ribbonFrontPoints} fill={currentTheme.brand} fillOpacity="0.15" />

              {/* 3D Ribbon Top Face */}
              <polygon points={ribbonTopPoints} fill={`url(#${currentTheme.gradient})`} />

              {/* Main Ribbon Front Edge Line */}
              <path
                d={`M ${frontPath}`}
                stroke={currentTheme.brand}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow-filter)"
                className={cn(!prefersReducedMotion && isVisible && "animate-draw-path")}
                style={{
                  strokeDasharray: 380,
                  strokeDashoffset: prefersReducedMotion ? 0 : 380
                }}
              />
            </g>
          )}

          {/* ================= VIEW: CANDLESTICKS ================= */}
          {viewType === "candles" && (
            <g className="transition-all duration-300">
              {points.map((p, idx) => {
                const isGreen = p.data.close >= p.data.open;
                const candleColor = isGreen ? "rgb(var(--color-bull))" : "rgb(var(--color-bear))";
                const candleStroke = isGreen ? "#059669" : "#dc2626";

                // Wick lines
                return (
                  <g key={idx}>
                    <line
                      x1={p.fxHigh}
                      y1={p.fyHigh}
                      x2={p.fxLow}
                      y2={p.fyLow}
                      stroke={candleColor}
                      strokeWidth="1"
                      strokeOpacity="0.6"
                    />

                    {/* 3D Box body projection */}
                    <polygon
                      points={`
                        ${p.fxOpen - 4},${p.fyOpen} 
                        ${p.fxOpen + 4},${p.fyOpen + 2} 
                        ${p.fxClose + 4},${p.fyClose + 2} 
                        ${p.fxClose - 4},${p.fyClose}
                      `}
                      fill={candleColor}
                      stroke={candleStroke}
                      strokeWidth="0.8"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* ================= VIEW: VOLUME PILLARS ================= */}
          {viewType === "volume" && (
            <g className="transition-all duration-300">
              {points.map((p, idx) => {
                const pillarH = (p.data.volume / maxVolume) * VOLUME_MAX_HEIGHT;
                const topY = p.gfy - pillarH;
                const topBackY = p.gby - pillarH;
                
                return (
                  <g key={idx} className="opacity-80 hover:opacity-100 transition-opacity">
                    {/* Front Face */}
                    <polygon
                      points={`
                        ${p.gfx - 5},${p.gfy} 
                        ${p.gfx + 5},${p.gfy + 2.5} 
                        ${p.gfx + 5},${topY + 2.5} 
                        ${p.gfx - 5},${topY}
                      `}
                      fill={currentTheme.brand}
                      stroke={currentTheme.strong}
                      strokeWidth="0.5"
                    />

                    {/* Top Face */}
                    <polygon
                      points={`
                        ${p.gfx - 5},${topY} 
                        ${p.gfx + 5},${topY + 2.5} 
                        ${p.gbx + 5},${topBackY + 2.5} 
                        ${p.gbx - 5},${topBackY}
                      `}
                      fill={currentTheme.brand}
                      fillOpacity="0.85"
                      stroke={currentTheme.strong}
                      strokeWidth="0.5"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Floor projection line (shadow of the path) */}
          <path
            d={`M ${points.map(p => `${p.gfx},${p.gfy}`).join(" L ")}`}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Main vertical anchor pillar */}
          <line
            x1={origin.x}
            y1={origin.y}
            x2={origin.x}
            y2={origin.y - 65}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="0.8"
          />

          {/* Data point circle overlays */}
          {points.map((p, idx) => {
            const isHovered = hoveredIdx === idx;
            const cyVal = getPointActiveY(p);
            return (
              <g 
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                tabIndex={0}
                onFocus={() => setHoveredIdx(idx)}
                onBlur={() => setHoveredIdx(null)}
                className="cursor-pointer outline-none"
              >
                {/* Larger transparent hotspot circle for easy mouse hover */}
                <circle
                  cx={p.fx}
                  cy={cyVal}
                  r="12"
                  fill="transparent"
                />

                <circle
                  cx={p.fx}
                  cy={cyVal}
                  r={isHovered ? 4.5 : 2.5}
                  fill={isHovered ? currentTheme.brand : "rgb(var(--color-surface))"}
                  stroke={currentTheme.brand}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>
      </div>

        <p className="mt-2 text-center text-2xs uppercase tracking-wider text-ink-faint">
          Illustrative {timeframe} metrics &middot; Pointer tilts view
        </p>
      </div>

      <style jsx global>{`
        @keyframes drawPath {
          to { strokeDashoffset: 0; }
        }
        .animate-draw-path {
          animation: drawPath 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
}
