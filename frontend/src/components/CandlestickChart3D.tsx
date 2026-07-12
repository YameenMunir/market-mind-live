"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

export function CandlestickChart3D({ className }: { className?: string }) {
  const [containerRef, isVisible] = useIntersectionObserver({ threshold: 0.1 });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
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

  // Coordinates and constants for 3D projection
  const origin = { x: 30, y: 130 };
  const cos30 = 0.866;
  const sin30 = 0.5;
  const stepX = 26;

  const data = [
    { type: "bull", o: 20, c: 35, l: 15, h: 42 },
    { type: "bear", o: 35, c: 25, l: 20, h: 38 },
    { type: "bull", o: 25, c: 50, l: 22, h: 58 },
    { type: "bull", o: 50, c: 65, l: 45, h: 72 },
    { type: "bear", o: 65, c: 55, l: 50, h: 68 },
    { type: "bull", o: 55, c: 80, l: 52, h: 85 }
  ];

  const getCoords = (idx: number, val: number) => {
    const tx = idx * stepX;
    const ty = val * 0.9;
    const x = origin.x + tx * cos30;
    const y = origin.y + tx * sin30 - ty;
    return { x, y };
  };

  return (
    <div 
      ref={containerRef}
      className={cn("relative select-none w-full", className)}
    >
      {/* Floating dynamic candlestick values */}
      {hoveredIdx !== null && (
        <div 
          className="absolute z-20 pointer-events-none rounded-sm border border-border bg-surface-raised/95 px-3 py-2 text-[10px] font-mono shadow-xl transition-all duration-100 flex flex-col gap-1 min-w-[90px]"
          style={{
            left: `${Math.min(getCoords(hoveredIdx, data[hoveredIdx].h).x + 10, 140)}px`,
            top: `${Math.max(getCoords(hoveredIdx, data[hoveredIdx].h).y - 45, 5)}px`
          }}
        >
          <div className="text-ink font-bold font-mono">CANDLE #{hoveredIdx + 1}</div>
          <div className="flex justify-between gap-4">
            <span className="text-ink-muted">OPEN:</span>
            <span className="text-ink">${data[hoveredIdx].o}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-ink-muted">CLOSE:</span>
            <span className="text-ink">${data[hoveredIdx].c}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-ink-muted">HIGH:</span>
            <span className="text-ink">${data[hoveredIdx].h}</span>
          </div>
        </div>
      )}

      <svg
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
      >
        <defs>
          <linearGradient id="green-cube-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="red-cube-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Floor Grid lines */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const start = getCoords(i, 0);
          const endX = start.x - 12 * cos30;
          const endY = start.y + 12 * sin30;
          return (
            <line
              key={i}
              x1={start.x}
              y1={start.y}
              x2={endX}
              y2={endY}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
          );
        })}
        
        {/* Floor Axis Line */}
        <line
          x1={origin.x}
          y1={origin.y}
          x2={getCoords(data.length, 0).x}
          y2={getCoords(data.length, 0).y}
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="1.2"
        />

        {/* Candlesticks loop */}
        {data.map((item, idx) => {
          const isBull = item.type === "bull";
          const fill = isBull ? "url(#green-cube-grad)" : "url(#red-cube-grad)";
          const stroke = isBull ? "#059669" : "#dc2626";

          // Calculate height wicks
          const bottomStem = getCoords(idx, item.l);
          const topStem = getCoords(idx, item.h);
          
          const bodyBottom = getCoords(idx, Math.min(item.o, item.c));
          const bodyTop = getCoords(idx, Math.max(item.o, item.c));
          const bodyHeight = Math.max(item.o, item.c) - Math.min(item.o, item.c);

          // 3D Box dimensions
          const w = 8;
          const d = 8;

          // Front-left
          const fl_x = bodyTop.x;
          const fl_y = bodyTop.y;

          // Back-left
          const bl_x = fl_x - d * cos30;
          const bl_y = fl_y + d * sin30;

          // Front-right
          const fr_x = fl_x + w * cos30;
          const fr_y = fl_y + w * sin30;

          // Back-right
          const br_x = fr_x - d * cos30;
          const br_y = fr_y + d * sin30;

          const h_val = bodyHeight * 0.9;
          const fl_bx = fl_x;
          const fl_by = fl_y + h_val;
          const fr_bx = fr_x;
          const fr_by = fr_y + h_val;
          
          // Render group with animated opacity transition (reveal on scroll)
          const isHovered = hoveredIdx === idx;
          const progressClass = isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4";
          
          return (
            <g 
              key={idx}
              className={cn(
                "transition-all duration-500 cursor-pointer outline-none",
                progressClass
              )}
              style={{
                transitionDelay: prefersReducedMotion ? "0ms" : `${idx * 120}ms`
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              tabIndex={0}
              onFocus={() => setHoveredIdx(idx)}
              onBlur={() => setHoveredIdx(null)}
            >
              {/* Invisible touch hotspot */}
              <polygon
                points={`
                  ${fl_x - 6},${topStem.y} 
                  ${fr_x + 6},${topStem.y} 
                  ${fr_x + 6},${bottomStem.y} 
                  ${fl_x - 6},${bottomStem.y}
                `}
                fill="transparent"
              />

              {/* Vertical Wick (stem) */}
              <line
                x1={bottomStem.x}
                y1={bottomStem.y}
                x2={topStem.x}
                y2={topStem.y}
                stroke={stroke}
                strokeWidth={isHovered ? 2.2 : 1.2}
                strokeOpacity="0.8"
                className="transition-all"
              />

              {/* 3D Box Extrusion */}
              {/* Back / Left Face */}
              <polygon
                points={`${fl_x},${fl_y} ${bl_x},${bl_y} ${bl_x},${bl_y + h_val} ${fl_bx},${fl_by}`}
                fill={fill}
                fillOpacity={isHovered ? 0.6 : 0.4}
                stroke={stroke}
                strokeOpacity="0.25"
                strokeWidth="0.5"
              />

              {/* Front Face */}
              <polygon
                points={`${fl_x},${fl_y} ${fr_x},${fr_y} ${fr_bx},${fr_by} ${fl_bx},${fl_by}`}
                fill={fill}
                stroke={stroke}
                strokeWidth={isHovered ? 1.5 : 0.8}
              />

              {/* Top Face */}
              <polygon
                points={`${fl_x},${fl_y} ${fr_x},${fr_y} ${br_x},${br_y} ${bl_x},${bl_y}`}
                fill={fill}
                fillOpacity={isHovered ? 1.0 : 0.9}
                stroke={stroke}
                strokeWidth={isHovered ? 1.5 : 0.8}
              />
            </g>
          );
        })}
      </svg>
      <p className="text-center font-mono text-[9px] uppercase tracking-wider text-ink-faint">
        Hover candle to read values
      </p>
    </div>
  );
}
