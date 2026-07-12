"use client";

import { useState, MouseEvent, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

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
  confidence: number;
}

const TIMEFRAME_DATA: Record<Timeframe, DataPoint[]> = {
  "1D": [
    { price: 142.0, open: 141.2, close: 142.0, high: 142.5, low: 140.8, volume: 1.2, confidence: 75 },
    { price: 143.5, open: 142.0, close: 143.5, high: 144.0, low: 141.5, volume: 1.5, confidence: 78 },
    { price: 141.2, open: 143.5, close: 141.2, high: 143.8, low: 140.5, volume: 1.1, confidence: 64 },
    { price: 142.8, open: 141.2, close: 142.8, high: 143.2, low: 140.9, volume: 1.3, confidence: 70 },
    { price: 144.0, open: 142.8, close: 144.0, high: 144.5, low: 142.2, volume: 1.6, confidence: 81 },
    { price: 143.2, open: 144.0, close: 143.2, high: 144.2, low: 142.5, volume: 1.0, confidence: 73 },
    { price: 145.0, open: 143.2, close: 145.0, high: 145.5, low: 143.0, volume: 1.8, confidence: 84 },
    { price: 146.8, open: 145.0, close: 146.8, high: 147.2, low: 144.5, volume: 2.1, confidence: 89 },
    { price: 146.2, open: 146.8, close: 146.2, high: 147.0, low: 145.8, volume: 1.4, confidence: 82 },
    { price: 148.0, open: 146.2, close: 148.0, high: 148.5, low: 145.9, volume: 2.5, confidence: 92 }
  ],
  "1W": [
    { price: 132.0, open: 130.5, close: 132.0, high: 133.2, low: 129.8, volume: 8.5, confidence: 72 },
    { price: 136.0, open: 132.0, close: 136.0, high: 137.5, low: 131.5, volume: 9.8, confidence: 79 },
    { price: 134.0, open: 136.0, close: 134.0, high: 136.8, low: 133.0, volume: 7.2, confidence: 66 },
    { price: 138.0, open: 134.0, close: 138.0, high: 139.2, low: 133.5, volume: 8.9, confidence: 75 },
    { price: 142.0, open: 138.0, close: 142.0, high: 143.5, low: 137.2, volume: 11.2, confidence: 83 },
    { price: 139.0, open: 142.0, close: 139.0, high: 142.8, low: 138.0, volume: 8.0, confidence: 71 },
    { price: 145.5, open: 139.0, close: 145.5, high: 146.5, low: 138.5, volume: 12.5, confidence: 86 },
    { price: 148.0, open: 145.5, close: 148.0, high: 149.0, low: 144.2, volume: 13.8, confidence: 90 },
    { price: 146.0, open: 148.0, close: 146.0, high: 148.5, low: 145.0, volume: 9.5, confidence: 80 },
    { price: 152.0, open: 146.0, close: 152.0, high: 153.2, low: 145.2, volume: 15.0, confidence: 93 }
  ],
  "1M": [
    { price: 115.0, open: 112.5, close: 115.0, high: 116.8, low: 111.0, volume: 38.5, confidence: 68 },
    { price: 122.0, open: 115.0, close: 122.0, high: 124.0, low: 114.2, volume: 44.2, confidence: 74 },
    { price: 118.0, open: 122.0, close: 118.0, high: 123.5, low: 117.0, volume: 35.8, confidence: 61 },
    { price: 132.0, open: 118.0, close: 132.0, high: 134.5, low: 116.5, volume: 49.0, confidence: 80 },
    { price: 140.0, open: 132.0, close: 140.0, high: 142.5, low: 131.0, volume: 55.6, confidence: 85 },
    { price: 135.0, open: 140.0, close: 135.0, high: 141.2, low: 134.0, volume: 40.2, confidence: 73 },
    { price: 155.0, open: 135.0, close: 155.0, high: 157.8, low: 133.5, volume: 62.1, confidence: 88 },
    { price: 168.0, open: 155.0, close: 168.0, high: 170.5, low: 153.8, volume: 70.4, confidence: 91 },
    { price: 162.0, open: 168.0, close: 162.0, high: 169.0, low: 160.5, volume: 48.9, confidence: 83 },
    { price: 185.0, open: 162.0, close: 185.0, high: 187.2, low: 161.0, volume: 82.5, confidence: 95 }
  ],
  "1Y": [
    { price: 95.0, open: 98.0, close: 95.0, high: 102.5, low: 92.0, volume: 420.5, confidence: 55 },
    { price: 105.0, open: 95.0, close: 105.0, high: 108.0, low: 94.0, volume: 480.2, confidence: 62 },
    { price: 101.0, open: 105.0, close: 101.0, high: 107.5, low: 99.0, volume: 390.8, confidence: 58 },
    { price: 118.0, open: 101.0, close: 118.0, high: 121.2, low: 98.5, volume: 510.0, confidence: 71 },
    { price: 132.0, open: 118.0, close: 132.0, high: 135.0, low: 116.8, volume: 560.4, confidence: 76 },
    { price: 126.0, open: 132.0, close: 126.0, high: 134.5, low: 124.0, volume: 440.2, confidence: 68 },
    { price: 148.0, open: 126.0, close: 148.0, high: 152.0, low: 123.5, volume: 640.8, confidence: 82 },
    { price: 164.0, open: 148.0, close: 164.0, high: 168.5, low: 145.0, volume: 710.2, confidence: 87 },
    { price: 155.0, open: 164.0, close: 155.0, high: 166.0, low: 153.2, volume: 520.5, confidence: 78 },
    { price: 192.0, open: 155.0, close: 192.0, high: 195.8, low: 152.0, volume: 840.0, confidence: 94 }
  ]
};

export function StockGraph3D({ className }: { className?: string }) {
  const [containerRef, isVisible] = useIntersectionObserver({ threshold: 0.1 });
  
  // Interactive States
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
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

  // Get active dataset
  const activeData = TIMEFRAME_DATA[timeframe];
  
  // Base scale calculation to map to bounds
  const getMinMaxPrices = () => {
    const prices = activeData.map(d => d.price);
    const min = Math.min(...prices) - 10;
    const max = Math.max(...prices) + 10;
    return { min, max };
  };
  const { min: priceMin } = getMinMaxPrices();

  // Projection constants
  const origin = { x: 45, y: 195 };
  const cos30 = 0.866;
  const sin30 = 0.5;
  const cos150 = -0.866;
  const sin150 = 0.5;

  const points = activeData.map((d, i) => {
    const t = i * 26; // X spacing (time)
    
    // Dynamic height mapping based on price
    const h = (d.price - priceMin) * 1.5; 
    const oHeight = (d.open - priceMin) * 1.5;
    const cHeight = (d.close - priceMin) * 1.5;
    const hHeight = (d.high - priceMin) * 1.5;
    const lHeight = (d.low - priceMin) * 1.5;

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
      brand: "var(--color-bull, #10b981)",
      strong: "#059669",
      gradient: "bull-grad",
      curtain: "bull-curtain",
      badgeBg: "bg-bull/5 border-bull/20",
      badgeText: "text-bull",
    },
    bear: {
      brand: "var(--color-bear, #ef4444)",
      strong: "#dc2626",
      gradient: "bear-grad",
      curtain: "bear-curtain",
      badgeBg: "bg-bear/5 border-bear/20",
      badgeText: "text-bear",
    },
    neutral: {
      brand: "var(--color-brand, #f59e0b)",
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
      className={cn("w-full transition-transform duration-200 select-none", className)}
      style={{
        transform: prefersReducedMotion 
          ? "none" 
          : `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(0)`,
      }}
    >
      {/* ================= INTERACTIVE HEADERS / CONTROLS ================= */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 font-mono text-2xs font-bold uppercase tracking-wider">
        {/* Timeframe selector */}
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
      <div className="relative overflow-visible rounded-sm border border-border bg-surface p-4 shadow-xl">
        
        {/* Floating Dynamic HTML Tooltip */}
        {hoveredIdx !== null && (
          <div 
            className="absolute z-20 pointer-events-none rounded-sm border border-border bg-surface-raised/95 px-3 py-2 text-2xs font-mono shadow-xl transition-all duration-100 flex flex-col gap-1 min-w-[100px] backdrop-blur-[2px]"
            style={{
              left: `${Math.min(points[hoveredIdx].fx + 10, 200)}px`,
              top: `${Math.max(points[hoveredIdx].fy - 50, 10)}px`
            }}
          >
            <div className="text-ink font-bold">NODE #{hoveredIdx + 1}</div>
            <div className="flex justify-between gap-4">
              <span className="text-ink-muted">PRICE:</span>
              <span className="text-ink font-bold">${points[hoveredIdx].data.price.toFixed(1)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-ink-muted">VOL:</span>
              <span className="text-ink-muted">{points[hoveredIdx].data.volume}M</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-ink-muted">CONF:</span>
              <span className={cn("font-bold", currentTheme.badgeText)}>{points[hoveredIdx].data.confidence}%</span>
            </div>
          </div>
        )}

        <svg
          viewBox="0 0 320 230"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto overflow-visible filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
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
          {[30, 60, 90].map((h, idx) => {
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
                const candleColor = isGreen ? "var(--color-bull, #10b981)" : "var(--color-bear, #ef4444)";
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
                const pillarH = p.data.volume * 3; // scaled height
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
            y2={origin.y - 120}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="0.8"
          />

          {/* Data point circle overlays */}
          {points.map((p, idx) => {
            const isHovered = hoveredIdx === idx;
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
                  cy={p.fy}
                  r="12"
                  fill="transparent"
                />

                <circle
                  cx={p.fx}
                  cy={p.fy}
                  r={isHovered ? 4.5 : 2.5}
                  fill={isHovered ? currentTheme.brand : "var(--color-surface, #0f172a)"}
                  stroke={currentTheme.brand}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>

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
