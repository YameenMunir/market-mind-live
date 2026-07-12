"use client";

import { cn } from "@/lib/utils";

export function MarketGlobe3D({ className }: { className?: string }) {
  const center = { x: 120, y: 90 };
  const r = 50; // globe radius

  return (
    <div className={cn("relative select-none", className)}>
      <svg
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible filter drop-shadow-[0_4px_16px_rgba(var(--color-brand-rgb,99,102,241),0.06)]"
      >
        <defs>
          <radialGradient id="globe-bg" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="var(--color-surface, #0f172a)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--color-brand, #3b82f6)" stopOpacity="0.08" />
          </radialGradient>
        </defs>

        {/* Globe Base Shadow on Floor */}
        <ellipse cx={center.x} cy={center.y + r + 10} rx={r - 10} ry="6" fill="#020617" opacity="0.3" />

        {/* Globe Silhouette Sphere */}
        <circle cx={center.x} cy={center.y} r={r} fill="url(#globe-bg)" stroke="var(--color-border, #1e293b)" strokeWidth="0.8" />

        {/* Latitude Rings */}
        <ellipse cx={center.x} cy={center.y} rx={r} ry="16" stroke="var(--color-border, #1e293b)" strokeOpacity="0.35" strokeWidth="0.8" />
        <ellipse cx={center.x} cy={center.y - 25} rx={r - 12} ry="8" stroke="var(--color-border, #1e293b)" strokeOpacity="0.2" strokeWidth="0.8" />
        <ellipse cx={center.x} cy={center.y + 25} rx={r - 12} ry="8" stroke="var(--color-border, #1e293b)" strokeOpacity="0.2" strokeWidth="0.8" />

        {/* Longitude / Meridian Ellipses */}
        <ellipse cx={center.x} cy={center.y} rx="16" ry={r} stroke="var(--color-border, #1e293b)" strokeOpacity="0.35" strokeWidth="0.8" />
        <ellipse cx={center.x} cy={center.y} rx="36" ry={r} stroke="var(--color-border, #1e293b)" strokeOpacity="0.2" strokeWidth="0.8" />

        {/* Global Connection Nodes (NYC, London, Tokyo coordinates on sphere surface) */}
        {/* NYC node */}
        <g transform={`translate(${center.x - 32}, ${center.y - 12})`}>
          <circle cx="0" cy="0" r="3.5" fill="var(--color-brand, #3b82f6)" />
          <circle cx="0" cy="0" r="6" stroke="var(--color-brand, #3b82f6)" strokeOpacity="0.4" strokeWidth="1" className="animate-pulse" />
        </g>

        {/* London node */}
        <g transform={`translate(${center.x + 8}, ${center.y - 30})`}>
          <circle cx="0" cy="0" r="3" fill="#10b981" />
          <circle cx="0" cy="0" r="5.5" stroke="#10b981" strokeOpacity="0.4" strokeWidth="1" className="animate-pulse" />
        </g>

        {/* Tokyo node */}
        <g transform={`translate(${center.x + 36}, ${center.y + 16})`}>
          <circle cx="0" cy="0" r="3.5" fill="#a855f7" />
          <circle cx="0" cy="0" r="6" stroke="#a855f7" strokeOpacity="0.4" strokeWidth="1" className="animate-pulse" />
        </g>

        {/* Connecting Data Beam Arcs */}
        {/* NYC -> London */}
        <path
          d={`M ${center.x - 32} ${center.y - 12} Q ${center.x - 12} ${center.y - 38} ${center.x + 8} ${center.y - 30}`}
          stroke="var(--color-brand, #3b82f6)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.6"
          strokeDasharray="4 4"
        />

        {/* London -> Tokyo */}
        <path
          d={`M ${center.x + 8} ${center.y - 30} Q ${center.x + 28} ${center.y - 10} ${center.x + 36} ${center.y + 16}`}
          stroke="#10b981"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.6"
          strokeDasharray="3 3"
        />

        {/* Floating market indicators around the globe */}
        <g transform={`translate(${center.x - 68}, ${center.y - 45})`}>
          <text x="0" y="0" fill="var(--color-ink-muted, #94a3b8)" fontSize="6.5" fontWeight="bold" fontFamily="monospace" fillOpacity="0.6">NYSE ACTIVE</text>
        </g>
        
        <g transform={`translate(${center.x + 48}, ${center.y - 38})`}>
          <text x="0" y="0" fill="#10b981" fontSize="6.5" fontWeight="bold" fontFamily="monospace">LSE CONNECTED</text>
        </g>

        <g transform={`translate(${center.x + 48}, ${center.y + 36})`}>
          <text x="0" y="0" fill="var(--color-ink-muted, #94a3b8)" fontSize="6.5" fontWeight="bold" fontFamily="monospace" fillOpacity="0.6">TSE CLOSED</text>
        </g>
      </svg>
    </div>
  );
}
