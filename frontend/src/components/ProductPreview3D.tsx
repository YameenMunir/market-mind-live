"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

type ActiveLayer = "all" | "chart" | "gauge" | "ai";

export function ProductPreview3D({ className }: { className?: string }) {
  const [containerRef, isVisible] = useIntersectionObserver({ threshold: 0.1 });
  const [hovered, setHovered] = useState(false);
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>("all");
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

  const getLayerText = () => {
    switch (activeLayer) {
      case "chart":
        return "Technical Charting: High-density interactive candlestick plots with indicators.";
      case "gauge":
        return "Market Volatility Gauge: Calibrated trade confidence meter and session status.";
      case "ai":
        return "Explainable AI Insights: Transparent indicator explanations in plain English.";
      default:
        return "Unified Terminal: Stacks coordinate feeds in a layered dashboard layout.";
    }
  };

  // Determine offsets based on hover split
  const getOffset = (layer: ActiveLayer) => {
    if (prefersReducedMotion) {
      // In reduced motion, keep panels cleanly offset for static legibility
      switch (layer) {
        case "chart": return 5;
        case "gauge": return 15;
        case "ai": return 30;
        default: return 0;
      }
    }
    
    // Dynamic height mapping representing Z-axis depth expansion when hovered
    const isSplit = hovered;
    switch (layer) {
      case "chart":
        return isSplit ? -15 : 0;
      case "gauge":
        return isSplit ? -35 : -15;
      case "ai":
        return isSplit ? -65 : -35;
      default:
        return 0;
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setActiveLayer("all");
      }}
      className={cn("w-full flex flex-col gap-4", className)}
    >
      <div 
        className={cn(
          "relative select-none", 
          !prefersReducedMotion && isVisible && !hovered && "animate-float-preview"
        )}
      >
        <svg
          viewBox="0 0 340 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto overflow-visible filter drop-shadow-[0_12px_32px_rgba(var(--color-brand-rgb,99,102,241),0.06)]"
        >
          <defs>
            {/* Glassmorphism gradient for cards */}
            <linearGradient id="glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-surface-raised, #1e293b)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--color-surface, #0f172a)" stopOpacity="0.95" />
            </linearGradient>

            {/* Soft shadow filter */}
            <filter id="preview-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="-2" dy="8" stdDeviation="6" floodColor="#020617" floodOpacity="0.3" />
            </filter>
            
            {/* Glowing borders */}
            <filter id="glow-border" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--color-brand, #3b82f6)" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* ================= LAYER 1: BASE WINDOW (Terminal Frame) ================= */}
          <g 
            className="transition-all duration-300 cursor-pointer"
            onClick={() => setActiveLayer("all")}
            opacity={activeLayer === "all" ? 1 : 0.4}
          >
            {/* Base Shadow */}
            <polygon points="50,110 230,50 300,150 120,210" fill="#020617" opacity="0.25" />
            
            {/* Base Window Panel */}
            <polygon points="50,100 230,40 300,140 120,200" fill="var(--color-surface, #0f172a)" stroke="var(--color-border, #1e293b)" strokeWidth="1.5" />
            
            {/* Terminal Header */}
            <polygon points="50,100 230,40 248,66 68,126" fill="var(--color-surface-raised, #1e293b)" stroke="var(--color-border, #1e293b)" strokeWidth="1" />
            
            {/* Window control dots */}
            <circle cx="70" cy="113" r="2.5" fill="#ef4444" opacity="0.8" />
            <circle cx="78" cy="110" r="2.5" fill="#f59e0b" opacity="0.8" />
            <circle cx="86" cy="107" r="2.5" fill="#10b981" opacity="0.8" />

            {/* Grid references */}
            <path d="M 90 119 L 248 66" stroke="var(--color-border, #1e293b)" strokeWidth="1" strokeDasharray="2 2" />
            <path d="M 125 150 L 265 103" stroke="var(--color-border, #1e293b)" strokeWidth="1" strokeOpacity="0.4" />
            <path d="M 160 173 L 282 132" stroke="var(--color-border, #1e293b)" strokeWidth="1" strokeOpacity="0.4" />
            <path d="M 160 89 L 210 160" stroke="var(--color-border, #1e293b)" strokeWidth="1.5" strokeOpacity="0.6" />
          </g>

          {/* ================= LAYER 2: CHART LAYER (Dynamic projection Offset) ================= */}
          <g 
            transform={`translate(0, ${getOffset("chart")})`} 
            className="transition-all duration-300 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setActiveLayer("chart");
            }}
            onMouseEnter={() => setActiveLayer("chart")}
            opacity={activeLayer === "all" || activeLayer === "chart" ? 1 : 0.4}
          >
            {/* Dynamic trend line */}
            <path
              d="M 90 155 L 120 140 L 150 150 L 180 130 L 210 138 L 240 110 L 270 120"
              stroke={activeLayer === "chart" ? "var(--color-brand, #3b82f6)" : "var(--color-ink-muted, #94a3b8)"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
            
            {/* Green / Red mockup candles */}
            <line x1="120" y1="130" x2="120" y2="150" stroke="#10b981" strokeWidth="1.5" />
            <polygon points="117,135 123,133 123,145 117,147" fill="#10b981" />
            
            <line x1="150" y1="142" x2="150" y2="158" stroke="#ef4444" strokeWidth="1.5" />
            <polygon points="147,148 153,146 153,154 147,156" fill="#ef4444" />

            <line x1="180" y1="120" x2="180" y2="140" stroke="#10b981" strokeWidth="1.5" />
            <polygon points="177,124 183,122 183,134 177,136" fill="#10b981" />
          </g>

          {/* ================= LAYER 3: DYNAMIC ANALYST GAUGE CARD ================= */}
          <g 
            transform={`translate(0, ${getOffset("gauge")})`} 
            className="transition-all duration-300 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setActiveLayer("gauge");
            }}
            onMouseEnter={() => setActiveLayer("gauge")}
            opacity={activeLayer === "all" || activeLayer === "gauge" ? 1 : 0.4}
            filter={activeLayer === "gauge" ? "url(#glow-border)" : "none"}
          >
            {/* Shadow projection */}
            <polygon points="160,110 260,77 290,122 190,155" fill="#020617" opacity="0.3" filter="url(#preview-shadow)" />
            
            {/* Card base */}
            <polygon points="160,95 260,62 290,107 190,140" fill="url(#glass-grad)" stroke={activeLayer === "gauge" ? "var(--color-brand, #3b82f6)" : "var(--color-border, #1e293b)"} strokeWidth="1.2" />
            
            {/* Arc parameters */}
            <path d="M 195 105 A 20 20 0 0 1 235 92" stroke="var(--color-border, #1e293b)" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeOpacity="0.4" />
            <path d="M 195 105 A 20 20 0 0 1 220 94" stroke="#10b981" strokeWidth="3" strokeLinecap="round" fill="none" />
            
            <text x="195" y="125" fill="var(--color-ink, #f8fafc)" fontSize="9" fontWeight="bold" fontFamily="monospace">78% CONF</text>
          </g>

          {/* ================= LAYER 4: AI INSIGHTS DIALOG LAYER ================= */}
          <g 
            transform={`translate(0, ${getOffset("ai")})`} 
            className="transition-all duration-300 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setActiveLayer("ai");
            }}
            onMouseEnter={() => setActiveLayer("ai")}
            opacity={activeLayer === "all" || activeLayer === "ai" ? 1 : 0.4}
            filter={activeLayer === "ai" ? "url(#glow-border)" : "none"}
          >
            {/* Card Shadow */}
            <polygon points="65,160 175,123 205,178 95,215" fill="#020617" opacity="0.35" filter="url(#preview-shadow)" />
            
            {/* Card Body */}
            <polygon points="65,145 175,108 205,163 95,200" fill="url(#glass-grad)" stroke={activeLayer === "ai" ? "var(--color-brand, #3b82f6)" : "var(--color-border, #1e293b)"} strokeWidth="1.5" />
            
            {/* Card header */}
            <polygon points="65,145 175,108 178,118 68,155" fill="var(--color-brand-opacity, rgba(59, 130, 246, 0.08))" />
            <circle cx="78" cy="154" r="2.5" fill="var(--color-brand, #3b82f6)" />
            <text x="86" y="156" fill="var(--color-brand, #3b82f6)" fontSize="7" fontWeight="bold" fontFamily="monospace">AI SIGNAL</text>

            {/* Layout lines */}
            <line x1="80" y1="172" x2="160" y2="145" stroke="var(--color-ink, #f8fafc)" strokeOpacity="0.8" strokeWidth="1.5" />
            <line x1="80" y1="181" x2="140" y2="161" stroke="var(--color-ink-muted, #94a3b8)" strokeOpacity="0.6" strokeWidth="1.2" />
            <line x1="80" y1="190" x2="120" y2="177" stroke="var(--color-ink-muted, #94a3b8)" strokeOpacity="0.4" strokeWidth="1.2" />
          </g>
        </svg>
      </div>

      {/* ================= INTERACTIVE DYNAMIC EXPLANATION PILL ================= */}
      <div className="rounded-sm border border-border bg-surface/50 px-4 py-3 min-h-[54px] flex items-center transition-all duration-200 shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-brand animate-pulse" />
          <p className="font-mono text-xs font-semibold text-ink-muted leading-relaxed">
            {getLayerText()}
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes floatPreview {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(0.5deg); }
        }
        .animate-float-preview {
          animation: floatPreview 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
