"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

type ActiveRegion = "nyc" | "london" | "tokyo" | null;

interface RegionDetails {
  name: string;
  status: string;
  index: string;
  change: string;
  latency: string;
  description: string;
}

const REGION_DATA: Record<string, RegionDetails> = {
  nyc: {
    name: "New York Stock Exchange (NYSE)",
    status: "Active Session",
    index: "S&P 500",
    change: "+0.42%",
    latency: "12ms",
    description: "East coast primary connection hub. Feeds real-time equities updates directly."
  },
  london: {
    name: "London Stock Exchange (LSE)",
    status: "Active Session",
    index: "FTSE 100",
    change: "+0.15%",
    latency: "28ms",
    description: "European coordination anchor. Routes currency pairs and indices feeds."
  },
  tokyo: {
    name: "Tokyo Stock Exchange (TSE)",
    status: "Closed (Post-Market)",
    index: "Nikkei 225",
    change: "-0.22%",
    latency: "84ms",
    description: "Asian markets tracking node. Stores closing indices value updates."
  }
};

export function MarketGlobe3D({ className }: { className?: string }) {
  const [containerRef, isVisible] = useIntersectionObserver({ threshold: 0.1 });
  const [activeRegion, setActiveRegion] = useState<ActiveRegion>(null);
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

  const center = { x: 120, y: 90 };
  const r = 50;

  const getRegionText = () => {
    if (activeRegion !== null) {
      const details = REGION_DATA[activeRegion];
      return `${details.name} &middot; ${details.status} &middot; ${details.index} (${details.change}) &middot; Ping: ${details.latency}`;
    }
    return "Market Globe: Hover exchange node hubs to query status parameters.";
  };

  return (
    <div 
      ref={containerRef}
      className={cn("w-full space-y-4 select-none", className)}
    >
      <div className="relative rounded-sm border border-border bg-surface p-4 shadow-xl">
        <svg
          viewBox="0 0 240 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto overflow-visible filter drop-shadow-[0_4px_16px_rgba(var(--color-brand-rgb,99,102,241),0.05)]"
        >
          <defs>
            <radialGradient id="globe-bg" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="var(--color-surface, #0f172a)" stopOpacity="0" />
              <stop offset="100%" stopColor="var(--color-brand, #3b82f6)" stopOpacity="0.08" />
            </radialGradient>
            
            <filter id="globe-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Globe Floor Shadow */}
          <ellipse cx={center.x} cy={center.y + r + 10} rx={r - 10} ry="6" fill="#020617" opacity="0.3" />

          {/* Globe Base Sphere */}
          <circle cx={center.x} cy={center.y} r={r} fill="url(#globe-bg)" stroke="var(--color-border, #1e293b)" strokeWidth="0.8" />

          {/* Latitude Bands */}
          <ellipse cx={center.x} cy={center.y} rx={r} ry="16" stroke="var(--color-border, #1e293b)" strokeOpacity="0.35" strokeWidth="0.8" />
          <ellipse cx={center.x} cy={center.y - 25} rx={r - 12} ry="8" stroke="var(--color-border, #1e293b)" strokeOpacity="0.2" strokeWidth="0.8" />
          <ellipse cx={center.x} cy={center.y + 25} rx={r - 12} ry="8" stroke="var(--color-border, #1e293b)" strokeOpacity="0.2" strokeWidth="0.8" />

          {/* Longitude Bands */}
          <ellipse cx={center.x} cy={center.y} rx="16" ry={r} stroke="var(--color-border, #1e293b)" strokeOpacity="0.35" strokeWidth="0.8" />
          <ellipse cx={center.x} cy={center.y} rx="36" ry={r} stroke="var(--color-border, #1e293b)" strokeOpacity="0.2" strokeWidth="0.8" />

          {/* ================= NYC NODE ================= */}
          <g 
            transform={`translate(${center.x - 32}, ${center.y - 12})`}
            className="cursor-pointer outline-none"
            onMouseEnter={() => setActiveRegion("nyc")}
            onMouseLeave={() => setActiveRegion(null)}
            tabIndex={0}
            onFocus={() => setActiveRegion("nyc")}
            onBlur={() => setActiveRegion(null)}
          >
            {/* Hover hotspot */}
            <circle cx="0" cy="0" r="12" fill="transparent" />

            <circle 
              cx="0" 
              cy="0" 
              r={activeRegion === "nyc" ? 5 : 3.5} 
              fill="var(--color-brand, #3b82f6)" 
              className="transition-all"
            />
            {!prefersReducedMotion && isVisible && (
              <circle 
                cx="0" 
                cy="0" 
                r={activeRegion === "nyc" ? 9 : 6} 
                stroke="var(--color-brand, #3b82f6)" 
                strokeOpacity="0.4" 
                strokeWidth="1.2" 
                className="animate-pulse" 
              />
            )}
          </g>

          {/* ================= LONDON NODE ================= */}
          <g 
            transform={`translate(${center.x + 8}, ${center.y - 30})`}
            className="cursor-pointer outline-none"
            onMouseEnter={() => setActiveRegion("london")}
            onMouseLeave={() => setActiveRegion(null)}
            tabIndex={0}
            onFocus={() => setActiveRegion("london")}
            onBlur={() => setActiveRegion(null)}
          >
            {/* Hover hotspot */}
            <circle cx="0" cy="0" r="12" fill="transparent" />

            <circle 
              cx="0" 
              cy="0" 
              r={activeRegion === "london" ? 4.5 : 3} 
              fill="#10b981" 
              className="transition-all"
            />
            {!prefersReducedMotion && isVisible && (
              <circle 
                cx="0" 
                cy="0" 
                r={activeRegion === "london" ? 8.5 : 5.5} 
                stroke="#10b981" 
                strokeOpacity="0.4" 
                strokeWidth="1.2" 
                className="animate-pulse" 
              />
            )}
          </g>

          {/* ================= TOKYO NODE ================= */}
          <g 
            transform={`translate(${center.x + 36}, ${center.y + 16})`}
            className="cursor-pointer outline-none"
            onMouseEnter={() => setActiveRegion("tokyo")}
            onMouseLeave={() => setActiveRegion(null)}
            tabIndex={0}
            onFocus={() => setActiveRegion("tokyo")}
            onBlur={() => setActiveRegion(null)}
          >
            {/* Hover hotspot */}
            <circle cx="0" cy="0" r="12" fill="transparent" />

            <circle 
              cx="0" 
              cy="0" 
              r={activeRegion === "tokyo" ? 5 : 3.5} 
              fill="#a855f7" 
              className="transition-all"
            />
            {!prefersReducedMotion && isVisible && (
              <circle 
                cx="0" 
                cy="0" 
                r={activeRegion === "tokyo" ? 9 : 6} 
                stroke="#a855f7" 
                strokeOpacity="0.4" 
                strokeWidth="1.2" 
                className="animate-pulse" 
              />
            )}
          </g>

          {/* Connecting Data Beam Arcs */}
          {/* NYC -> London */}
          <path
            d={`M ${center.x - 32} ${center.y - 12} Q ${center.x - 12} ${center.y - 38} ${center.x + 8} ${center.y - 30}`}
            stroke="var(--color-brand, #3b82f6)"
            strokeWidth={activeRegion === "nyc" || activeRegion === "london" ? 2 : 1.2}
            strokeLinecap="round"
            strokeOpacity={activeRegion === "nyc" || activeRegion === "london" ? 0.8 : 0.4}
            strokeDasharray="4 4"
            className="transition-all"
          />

          {/* London -> Tokyo */}
          <path
            d={`M ${center.x + 8} ${center.y - 30} Q ${center.x + 28} ${center.y - 10} ${center.x + 36} ${center.y + 16}`}
            stroke="#10b981"
            strokeWidth={activeRegion === "london" || activeRegion === "tokyo" ? 2 : 1.2}
            strokeLinecap="round"
            strokeOpacity={activeRegion === "london" || activeRegion === "tokyo" ? 0.8 : 0.4}
            strokeDasharray="3 3"
            className="transition-all"
          />

          {/* Active text labels */}
          <g transform={`translate(${center.x - 68}, ${center.y - 45})`}>
            <text 
              x="0" 
              y="0" 
              fill={activeRegion === "nyc" ? "var(--color-ink, #f8fafc)" : "var(--color-ink-muted, #94a3b8)"} 
              fontSize="6.5" 
              fontWeight="bold" 
              fontFamily="monospace" 
              fillOpacity={activeRegion === "nyc" ? 1.0 : 0.6}
              className="transition-all duration-150"
            >
              NYSE ACTIVE
            </text>
          </g>
          
          <g transform={`translate(${center.x + 48}, ${center.y - 38})`}>
            <text 
              x="0" 
              y="0" 
              fill={activeRegion === "london" ? "var(--color-bull, #10b981)" : "#10b981"} 
              fontSize="6.5" 
              fontWeight="bold" 
              fontFamily="monospace"
              fillOpacity={activeRegion === "london" ? 1.0 : 0.7}
              className="transition-all duration-150"
            >
              LSE CONNECTED
            </text>
          </g>

          <g transform={`translate(${center.x + 48}, ${center.y + 36})`}>
            <text 
              x="0" 
              y="0" 
              fill={activeRegion === "tokyo" ? "var(--color-ink, #f8fafc)" : "var(--color-ink-muted, #94a3b8)"} 
              fontSize="6.5" 
              fontWeight="bold" 
              fontFamily="monospace" 
              fillOpacity={activeRegion === "tokyo" ? 1.0 : 0.6}
              className="transition-all duration-150"
            >
              TSE CLOSED
            </text>
          </g>
        </svg>
      </div>

      {/* Connection details panel */}
      <div className="rounded-sm border border-border bg-surface/50 px-4 py-3 min-h-[50px] flex items-center shadow-md">
        <p 
          className="font-mono text-xs font-semibold text-ink-muted leading-relaxed"
          dangerouslySetInnerHTML={{ __html: getRegionText() }}
        />
      </div>
    </div>
  );
}
