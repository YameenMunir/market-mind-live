"use client";

import { cn } from "@/lib/utils";

export function BacktestingSimulation3D({ className }: { className?: string }) {
  const origin = { x: 30, y: 135 };
  const cos30 = 0.866;
  const sin30 = 0.5;

  const data = [
    { t: 0, strategy: 100, benchmark: 100 },
    { t: 1, strategy: 112, benchmark: 105 },
    { t: 2, strategy: 105, benchmark: 102 },
    { t: 3, strategy: 125, benchmark: 108 }, // Buy marker around here
    { t: 4, strategy: 142, benchmark: 114 },
    { t: 5, strategy: 135, benchmark: 110 }, // Sell marker around here
    { t: 6, strategy: 165, benchmark: 118 },
    { t: 7, strategy: 180, benchmark: 122 }
  ];

  // Helper to project point
  const getCoords = (idx: number, val: number, isBenchmark: boolean) => {
    const stepX = 25;
    const tx = idx * stepX;
    const ty = (val - 80) * 0.9;
    const zOffset = isBenchmark ? -10 : 10;
    
    const x = origin.x + tx * cos30 + zOffset * -0.866;
    const y = origin.y + tx * sin30 + zOffset * 0.5 - ty;
    return { x, y };
  };

  const getFloorCoords = (idx: number, isBenchmark: boolean) => {
    const stepX = 25;
    const tx = idx * stepX;
    const zOffset = isBenchmark ? -10 : 10;
    
    const x = origin.x + tx * cos30 + zOffset * -0.866;
    const y = origin.y + tx * sin30 + zOffset * 0.5;
    return { x, y };
  };

  // Build SVG paths
  const strategyPath = data.map((d, i) => `${getCoords(i, d.strategy, false).x},${getCoords(i, d.strategy, false).y}`).join(" L ");
  const benchmarkPath = data.map((d, i) => `${getCoords(i, d.benchmark, true).x},${getCoords(i, d.benchmark, true).y}`).join(" L ");

  // Strategy curtain area
  const strategyCurtain = [
    `${getFloorCoords(0, false).x},${getFloorCoords(0, false).y}`,
    ...data.map((d, i) => `${getCoords(i, d.strategy, false).x},${getCoords(i, d.strategy, false).y}`),
    `${getFloorCoords(data.length - 1, false).x},${getFloorCoords(data.length - 1, false).y}`
  ].join(" ");

  // Buy / Sell coordinates
  const buyPt = getCoords(3, data[3].strategy, false);
  const sellPt = getCoords(5, data[5].strategy, false);

  return (
    <div className={cn("relative select-none", className)}>
      <svg
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
      >
        <defs>
          <linearGradient id="strat-curtain-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Bounding axes */}
        <line
          x1={getFloorCoords(0, true).x}
          y1={getFloorCoords(0, true).y}
          x2={getFloorCoords(data.length - 1, true).x}
          y2={getFloorCoords(data.length - 1, true).y}
          stroke="currentColor"
          strokeOpacity="0.1"
        />
        <line
          x1={getFloorCoords(0, false).x}
          y1={getFloorCoords(0, false).y}
          x2={getFloorCoords(data.length - 1, false).x}
          y2={getFloorCoords(data.length - 1, false).y}
          stroke="currentColor"
          strokeOpacity="0.1"
        />

        {/* Floor parallel connectors */}
        {data.map((_, i) => (
          <line
            key={i}
            x1={getFloorCoords(i, true).x}
            y1={getFloorCoords(i, true).y}
            x2={getFloorCoords(i, false).x}
            y2={getFloorCoords(i, false).y}
            stroke="currentColor"
            strokeOpacity="0.06"
            strokeWidth="0.8"
          />
        ))}

        {/* Benchmark Path (Bottom Back) */}
        <path
          d={`M ${benchmarkPath}`}
          stroke="var(--color-ink-muted, #94a3b8)"
          strokeWidth="1.2"
          strokeOpacity="0.35"
          strokeDasharray="2 2"
        />

        {/* Strategy Area Curtain */}
        <polygon points={strategyCurtain} fill="url(#strat-curtain-grad)" />

        {/* Strategy Path (Front Top) */}
        <path
          d={`M ${strategyPath}`}
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Benchmark end dot */}
        <circle
          cx={getCoords(data.length - 1, data[data.length - 1].benchmark, true).x}
          cy={getCoords(data.length - 1, data[data.length - 1].benchmark, true).y}
          r="2.5"
          fill="var(--color-ink-muted, #94a3b8)"
          fillOpacity="0.5"
        />

        {/* Strategy end dot */}
        <circle
          cx={getCoords(data.length - 1, data[data.length - 1].strategy, false).x}
          cy={getCoords(data.length - 1, data[data.length - 1].strategy, false).y}
          r="3"
          fill="#10b981"
        />

        {/* Buy Flag (Green) */}
        <g transform={`translate(${buyPt.x}, ${buyPt.y - 12})`}>
          <line x1="0" y1="12" x2="0" y2="0" stroke="#10b981" strokeWidth="1" />
          <rect x="0" y="0" width="10" height="8" fill="#10b981" rx="1.5" />
          <text x="2.5" y="6.5" fill="#020617" fontSize="5.5" fontWeight="bold" fontFamily="monospace">B</text>
        </g>

        {/* Sell Flag (Red) */}
        <g transform={`translate(${sellPt.x}, ${sellPt.y - 12})`}>
          <line x1="0" y1="12" x2="0" y2="0" stroke="#ef4444" strokeWidth="1" />
          <rect x="0" y="0" width="10" height="8" fill="#ef4444" rx="1.5" />
          <text x="2.5" y="6.5" fill="#f8fafc" fontSize="5.5" fontWeight="bold" fontFamily="monospace">S</text>
        </g>
      </svg>
    </div>
  );
}
