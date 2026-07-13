"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

interface NodeData {
  label: string;
  x: number;
  y: number;
  color: string;
  tone: string;
  detail: string;
}

const NODES: NodeData[] = [
  { 
    label: "SMA CROSS", 
    x: 60, 
    y: 50, 
    color: "rgb(var(--color-brand))", 
    tone: "blue",
    detail: "Golden Cross: 20-day SMA crossed 50-day SMA upwards, suggesting positive momentum."
  },
  { 
    label: "RSI COLD", 
    x: 180, 
    y: 60, 
    color: "#10b981", 
    tone: "green",
    detail: "Momentum Sand: RSI sits at 58. Indicates active buying pressure without hit overbought bounds."
  },
  { 
    label: "VOL ATR", 
    x: 65, 
    y: 130, 
    color: "#a855f7", 
    tone: "purple",
    detail: "Volatility Band: ATR is sitting mid-range of its 90-day historic volatility channels."
  },
  { 
    label: "MACD HIST", 
    x: 175, 
    y: 125, 
    color: "#06b6d4", 
    tone: "cyan",
    detail: "Histogram Strength: MACD bars are rising above baseline, confirming trend continuation."
  }
];

export function EvidenceNetwork3D({ className }: { className?: string }) {
  const [containerRef, isVisible] = useIntersectionObserver({ threshold: 0.1 });
  const [activeNode, setActiveNode] = useState<number | null>(null);
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

  const getExplanation = () => {
    if (activeNode !== null) return NODES[activeNode].detail;
    return "AI insights network: Hover nodes to inspect reasoning parameters.";
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
          className="w-full h-auto overflow-visible filter drop-shadow-[0_4px_16px_rgba(var(--color-brand-rgb,99,102,241),0.1)]"
        >
          <defs>
            <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Center glowing loop ring */}
          <circle
            cx={center.x}
            cy={center.y}
            r="16"
            stroke="rgb(var(--color-brand))"
            strokeOpacity="0.25"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            className={cn(!prefersReducedMotion && isVisible && "animate-spin-slow")}
            style={{ transformOrigin: `${center.x}px ${center.y}px` }}
          />
          
          {/* Main center consensus hub */}
          <circle
            cx={center.x}
            cy={center.y}
            r="10"
            fill="var(--color-surface-raised, #1e293b)"
            stroke="#10b981"
            strokeWidth="2"
            filter="url(#node-glow)"
          />
          <circle cx={center.x} cy={center.y} r="4" fill="#10b981" />

          {/* Node Connections & Labels */}
          {NODES.map((node, idx) => {
            const isActive = activeNode === idx;
            return (
              <g 
                key={idx}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setActiveNode(idx)}
                onMouseLeave={() => setActiveNode(null)}
                tabIndex={0}
                onFocus={() => setActiveNode(idx)}
                onBlur={() => setActiveNode(null)}
              >
                {/* Hotspot circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="14"
                  fill="transparent"
                />

                {/* Connection lines */}
                <line
                  x1={node.x}
                  y1={node.y}
                  x2={center.x}
                  y2={center.y}
                  stroke={node.color}
                  strokeOpacity={isActive ? 0.8 : 0.35}
                  strokeWidth={isActive ? 2 : 1.2}
                  className="transition-all"
                />
                
                {/* Connection particles flow */}
                {!prefersReducedMotion && isVisible && (
                  <circle 
                    cx={node.x} 
                    cy={node.y} 
                    r={isActive ? 3.5 : 2} 
                    fill={node.color} 
                    className={cn(
                      "transition-all duration-300",
                      isActive ? "animate-flow-fast" : `animate-flow-node-${idx}`
                    )} 
                  />
                )}

                {/* Outer Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? 8 : 6}
                  fill="var(--color-surface, #0f172a)"
                  stroke={node.color}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  filter={isActive ? "url(#node-glow)" : "none"}
                  className="transition-all"
                />
                
                {/* Node tag boxes */}
                <g transform={`translate(${node.x - 25}, ${node.y < 90 ? node.y - 16 : node.y + 13})`}>
                  <rect
                    x="0"
                    y="0"
                    width="50"
                    height="11"
                    rx="2.5"
                    fill="var(--color-surface-raised, #1e293b)"
                    stroke={isActive ? node.color : "var(--color-border, #1e293b)"}
                    strokeWidth={isActive ? 1 : 0.5}
                    className="transition-colors duration-150"
                  />
                  <text
                    x="25"
                    y="7.5"
                    fill={isActive ? "var(--color-ink, #f8fafc)" : "var(--color-ink-muted, #94a3b8)"}
                    fontSize="5"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                    letterSpacing="0.2"
                    className="transition-colors duration-150"
                  >
                    {node.label}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Matrix boundary nodes */}
          <path
            d="M 30 30 L 50 30 M 30 30 L 30 50 M 210 30 L 190 30 M 210 30 L 210 50 M 30 150 L 50 150 M 30 150 L 30 130 M 210 150 L 190 150 M 210 150 L 210 130"
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Dynamic reasoning text panel */}
      <div className="rounded-sm border border-border bg-surface/50 px-4 py-3 min-h-[50px] flex items-center shadow-md">
        <p className="font-mono text-xs font-semibold text-ink-muted leading-relaxed">
          {getExplanation()}
        </p>
      </div>

      {/* Animation timelines styles */}
      <style jsx global>{`
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 12s linear infinite;
        }

        @keyframes flow0 {
          0% { transform: translate(0px, 0px); opacity: 0.8; }
          100% { transform: translate(60px, 40px); opacity: 0.1; }
        }
        @keyframes flow1 {
          0% { transform: translate(0px, 0px); opacity: 0.8; }
          100% { transform: translate(-60px, 30px); opacity: 0.1; }
        }
        @keyframes flow2 {
          0% { transform: translate(0px, 0px); opacity: 0.8; }
          100% { transform: translate(55px, -40px); opacity: 0.1; }
        }
        @keyframes flow3 {
          0% { transform: translate(0px, 0px); opacity: 0.8; }
          100% { transform: translate(-55px, -35px); opacity: 0.1; }
        }
        @keyframes flowFast {
          0% { transform: translate(0px, 0px); opacity: 1; }
          100% { transform: translate(0px, 0px); opacity: 0; }
        }

        .animate-flow-node-0 { animation: flow0 2s infinite linear; }
        .animate-flow-node-1 { animation: flow1 2.3s infinite linear; }
        .animate-flow-node-2 { animation: flow2 1.8s infinite linear; }
        .animate-flow-node-3 { animation: flow3 2.1s infinite linear; }
        .animate-flow-fast { animation: flowFast 0.5s infinite linear; }
      `}</style>
    </div>
  );
}
