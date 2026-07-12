"use client";

import { cn } from "@/lib/utils";

export function EvidenceNetwork3D({ className }: { className?: string }) {
  // Center node in 3D (projected)
  const center = { x: 120, y: 90 };
  
  // Outer nodes: coordinates representing 3D positions projected onto 2D
  const nodes = [
    { label: "SMA CROSS", x: 60, y: 50, color: "var(--color-brand, #3b82f6)", tone: "blue" },
    { label: "RSI COLD", x: 180, y: 60, color: "#10b981", tone: "green" },
    { label: "VOL ATR", x: 65, y: 130, color: "#a855f7", tone: "purple" },
    { label: "MACD HIST", x: 175, y: 125, color: "#06b6d4", tone: "cyan" }
  ];

  return (
    <div className={cn("relative select-none", className)}>
      <svg
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible filter drop-shadow-[0_4px_16px_rgba(var(--color-brand-rgb,99,102,241),0.12)]"
      >
        <defs>
          <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Center node outer glowing ring */}
        <circle
          cx={center.x}
          cy={center.y}
          r="16"
          stroke="var(--color-brand, #3b82f6)"
          strokeOpacity="0.25"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          className="animate-spin-slow"
          style={{ transformOrigin: `${center.x}px ${center.y}px` }}
        />
        
        {/* Center node main circle */}
        <circle
          cx={center.x}
          cy={center.y}
          r="10"
          fill="var(--color-surface-raised, #1e293b)"
          stroke="#10b981"
          strokeWidth="2"
          filter="url(#node-glow)"
        />
        
        {/* Inside dot */}
        <circle cx={center.x} cy={center.y} r="4" fill="#10b981" />

        {/* Node connections */}
        {nodes.map((node, idx) => (
          <g key={idx}>
            {/* Connection path (3D wireframe line) */}
            <line
              x1={node.x}
              y1={node.y}
              x2={center.x}
              y2={center.y}
              stroke={node.color}
              strokeOpacity="0.4"
              strokeWidth="1.5"
            />
            
            {/* Flow dot animation along line */}
            <circle cx={node.x} cy={node.y} r="2.5" fill={node.color} className={`animate-flow-node-${idx}`} />

            {/* Outer Node circle */}
            <circle
              cx={node.x}
              cy={node.y}
              r="6"
              fill="var(--color-surface, #0f172a)"
              stroke={node.color}
              strokeWidth="1.5"
            />
            
            {/* Outer label tag */}
            <g transform={`translate(${node.x - 25}, ${node.y < 90 ? node.y - 15 : node.y + 12})`}>
              <rect
                x="0"
                y="0"
                width="50"
                height="10"
                rx="2"
                fill="var(--color-surface-raised, #1e293b)"
                stroke="var(--color-border, #1e293b)"
                strokeWidth="0.5"
              />
              <text
                x="25"
                y="7"
                fill="var(--color-ink-muted, #94a3b8)"
                fontSize="5"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
                letterSpacing="0.2"
              >
                {node.label}
              </text>
            </g>
          </g>
        ))}

        {/* Bounding box corners representing 3D matrix */}
        <path
          d="M 30 30 L 50 30 M 30 30 L 30 50 M 210 30 L 190 30 M 210 30 L 210 50 M 30 150 L 50 150 M 30 150 L 30 130 M 210 150 L 190 150 M 210 150 L 210 130"
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="1"
        />
      </svg>

      {/* Inline styles for keyframe flows along coordinates */}
      <style jsx global>{`
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 12s linear infinite;
        }

        /* Flow animations to translate coordinates towards the center (120, 90) */
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

        .animate-flow-node-0 { animation: flow0 2s infinite linear; }
        .animate-flow-node-1 { animation: flow1 2.3s infinite linear; }
        .animate-flow-node-2 { animation: flow2 1.8s infinite linear; }
        .animate-flow-node-3 { animation: flow3 2.1s infinite linear; }
      `}</style>
    </div>
  );
}
