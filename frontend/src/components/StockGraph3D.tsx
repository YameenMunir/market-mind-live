"use client";

import { cn } from "@/lib/utils";

export function StockGraph3D({ className }: { className?: string }) {
  // Apple stock graph inspired data points (rising trend with realistic consolidations)
  const prices = [115, 122, 118, 132, 140, 135, 155, 168, 162, 185];
  
  // Projection constants
  const origin = { x: 45, y: 195 };
  const cos30 = 0.866;
  const sin30 = 0.5;
  const cos150 = -0.866;
  const sin150 = 0.5;
  
  // Calculate points
  const points = prices.map((price, i) => {
    const t = i * 26; // X spacing (time)
    const h = (price - 90) * 1.3; // Y spacing (price height)
    
    // Front edge of ribbon (Z = 0)
    const fx = origin.x + t * cos30;
    const fy = origin.y + t * sin30 - h;
    
    // Back edge of ribbon (Z = 16)
    const bx = origin.x + t * cos30 + 16 * cos150;
    const by = origin.y + t * sin30 + 16 * sin150 - h;
    
    // Floor project point (Y = 0, Z = 0)
    const gfx = origin.x + t * cos30;
    const gfy = origin.y + t * sin30;
    
    // Floor project point (Y = 0, Z = 16)
    const gbx = origin.x + t * cos30 + 16 * cos150;
    const gby = origin.y + t * sin30 + 16 * sin150;

    return { fx, fy, bx, by, gfx, gfy, gbx, gby };
  });

  // Create paths
  const frontPath = points.map(p => `${p.fx},${p.fy}`).join(" L ");
  const backPath = points.map(p => `${p.bx},${p.by}`).join(" L ");
  
  // Ribbon top face polygon
  const ribbonTopPoints = [
    ...points.map(p => `${p.fx},${p.fy}`),
    ...[...points].reverse().map(p => `${p.bx},${p.by}`)
  ].join(" ");

  // Ribbon front face polygon (extrusion)
  const ribbonFrontPoints = [
    ...points.map(p => `${p.fx},${p.fy}`),
    ...[...points].reverse().map(p => `${p.fx},${p.fy + 2}`)
  ].join(" ");

  // Floor grid paths
  const gridLinesZ = points.map(p => `M ${p.gfx} ${p.gfy} L ${p.gbx} ${p.gby}`).join(" ");
  const gridLineXFront = `M ${points[0].gfx} ${points[0].gfy} L ${points[points.length - 1].gfx} ${points[points.length - 1].gfy}`;
  const gridLineXBack = `M ${points[0].gbx} ${points[0].gby} L ${points[points.length - 1].gbx} ${points[points.length - 1].gby}`;

  // Curtain path (area fill)
  const curtainPoints = [
    `${points[0].gfx},${points[0].gfy}`,
    ...points.map(p => `${p.fx},${p.fy}`),
    `${points[points.length - 1].gfx},${points[points.length - 1].gfy}`
  ].join(" ");

  // Highlight points
  const peak = points[points.length - 1];

  return (
    <div className={cn("relative select-none animate-float", className)}>
      <svg
        viewBox="0 0 320 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible filter drop-shadow-[0_8px_24px_rgba(var(--color-brand-rgb,99,102,241),0.06)]"
      >
        <defs>
          {/* Gradient for ribbon top */}
          <linearGradient id="ribbon-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-brand, #3b82f6)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.65" />
          </linearGradient>

          {/* Gradient for curtain (glowing area fill) */}
          <linearGradient id="curtain-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-brand, #3b82f6)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-brand, #3b82f6)" stopOpacity="0" />
          </linearGradient>

          {/* Stroke gradient for path */}
          <linearGradient id="stroke-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-brand, #3b82f6)" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Floor Bounding Grid */}
        <path d={gridLinesZ} stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
        <path d={gridLineXFront} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        <path d={gridLineXBack} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />

        {/* Back Wall Grid lines (Y-axis tick references) */}
        {[30, 60, 90, 120].map((h, idx) => {
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
              strokeDasharray="3 3"
            />
          );
        })}

        {/* Vertical Stems/Drop Lines */}
        {points.map((p, idx) => (
          <line
            key={idx}
            x1={p.fx}
            y1={p.fy}
            x2={p.gfx}
            y2={p.gfy}
            stroke="currentColor"
            strokeOpacity="0.06"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
        ))}

        {/* Curtain Area under the curve */}
        <polygon points={curtainPoints} fill="url(#curtain-grad)" />

        {/* 3D Ribbon Extrusion (Front face thickness) */}
        <polygon points={ribbonFrontPoints} fill="url(#stroke-grad)" fillOpacity="0.25" />

        {/* 3D Ribbon Top Face */}
        <polygon points={ribbonTopPoints} fill="url(#ribbon-grad)" />

        {/* Main Ribbon Front Edge Line */}
        <path
          d={`M ${frontPath}`}
          stroke="url(#stroke-grad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow-filter)"
        />

        {/* Floor projection line (shadow of the path) */}
        <path
          d={`M ${points.map(p => `${p.gfx},${p.gfy}`).join(" L ")}`}
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Bounding box back pillar */}
        <line
          x1={origin.x}
          y1={origin.y}
          x2={origin.x}
          y2={origin.y - 130}
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="1"
        />

        {/* Floating Callout at Peak */}
        <g transform={`translate(${peak.fx + 10}, ${peak.fy - 15})`} className="font-mono">
          {/* Connector line */}
          <line
            x1="-10"
            y1="15"
            x2="0"
            y2="0"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="1"
          />
          {/* Tag Box */}
          <rect
            x="0"
            y="-10"
            width="74"
            height="18"
            rx="3"
            fill="var(--color-surface, #0f172a)"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="1"
          />
          {/* Status Dot */}
          <circle cx="8" cy="-1" r="2.5" fill="#10b981" />
          {/* Text */}
          <text
            x="17"
            y="2"
            fill="var(--color-ink, #f8fafc)"
            fontSize="7.5"
            fontWeight="bold"
            letterSpacing="0.5"
          >
            AAPL +24.8%
          </text>
        </g>

        {/* Small Data Point Circles */}
        {points.map((p, idx) => {
          const isLast = idx === points.length - 1;
          return (
            <circle
              key={idx}
              cx={p.fx}
              cy={p.fy}
              r={isLast ? 3.5 : 2}
              fill={isLast ? "#10b981" : "var(--color-brand, #3b82f6)"}
              stroke="var(--color-canvas, #020617)"
              strokeWidth={isLast ? 1.5 : 1}
            />
          );
        })}
      </svg>
      
      {/* Floating inline glow style to inject the float animation safely if not present */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
