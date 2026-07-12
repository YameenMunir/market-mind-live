"use client";

import { cn } from "@/lib/utils";

export function ProductPreview3D({ className }: { className?: string }) {
  return (
    <div className={cn("relative select-none animate-float-preview", className)}>
      <svg
        viewBox="0 0 340 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible filter drop-shadow-[0_12px_32px_rgba(var(--color-brand-rgb,99,102,241),0.08)]"
      >
        <defs>
          {/* Glassmorphism gradient for cards */}
          <linearGradient id="glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-surface-raised, #1e293b)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--color-surface, #0f172a)" stopOpacity="0.95" />
          </linearGradient>

          {/* Glowing gradients */}
          <linearGradient id="glow-grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          
          <linearGradient id="glow-grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-brand, #3b82f6)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-brand, #3b82f6)" stopOpacity="0" />
          </linearGradient>

          {/* Soft shadow filter */}
          <filter id="preview-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-2" dy="8" stdDeviation="6" floodColor="#020617" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* ================= LAYER 1: BASE GRID (MAIN TERMINAL WINDOW) ================= */}
        {/* Shadow layer */}
        <polygon points="50,110 230,50 300,150 120,210" fill="#020617" opacity="0.25" />
        
        {/* Window Panel */}
        <polygon points="50,100 230,40 300,140 120,200" fill="var(--color-surface, #0f172a)" stroke="var(--color-border, #1e293b)" strokeWidth="1.5" />
        
        {/* Terminal Header Bar */}
        <polygon points="50,100 230,40 248,66 68,126" fill="var(--color-surface-raised, #1e293b)" stroke="var(--color-border, #1e293b)" strokeWidth="1" />
        
        {/* Window Control Dots */}
        <circle cx="70" cy="113" r="2.5" fill="#ef4444" opacity="0.8" />
        <circle cx="78" cy="110" r="2.5" fill="#f59e0b" opacity="0.8" />
        <circle cx="86" cy="107" r="2.5" fill="#10b981" opacity="0.8" />

        {/* Dashboard Grid Lines (on base terminal) */}
        <path d="M 90 119 L 248 66" stroke="var(--color-border, #1e293b)" strokeWidth="1" strokeDasharray="2 2" />
        <path d="M 125 150 L 265 103" stroke="var(--color-border, #1e293b)" strokeWidth="1" strokeOpacity="0.4" />
        <path d="M 160 173 L 282 132" stroke="var(--color-border, #1e293b)" strokeWidth="1" strokeOpacity="0.4" />
        
        {/* Vertical Separator */}
        <path d="M 160 89 L 210 160" stroke="var(--color-border, #1e293b)" strokeWidth="1.5" strokeOpacity="0.6" />

        {/* ================= LAYER 2: THE CANDLESTICK CHART (Sits on Base) ================= */}
        {/* Chart Line projection */}
        <path
          d="M 90 155 L 120 140 L 150 150 L 180 130 L 210 138 L 240 110 L 270 120"
          stroke="var(--color-brand, #3b82f6)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />

        {/* Green/Red mock candles floating slightly */}
        {/* Candle 1 (Green) */}
        <line x1="120" y1="130" x2="120" y2="150" stroke="#10b981" strokeWidth="1.5" />
        <polygon points="117,135 123,133 123,145 117,147" fill="#10b981" />
        
        {/* Candle 2 (Red) */}
        <line x1="150" y1="142" x2="150" y2="158" stroke="#ef4444" strokeWidth="1.5" />
        <polygon points="147,148 153,146 153,154 147,156" fill="#ef4444" />

        {/* Candle 3 (Green) */}
        <line x1="180" y1="120" x2="180" y2="140" stroke="#10b981" strokeWidth="1.5" />
        <polygon points="177,124 183,122 183,134 177,136" fill="#10b981" />

        {/* ================= LAYER 3: FLOATING ANALYST PANEL (Offset upwards) ================= */}
        {/* Shadow */}
        <polygon points="160,110 260,77 290,122 190,155" fill="#020617" opacity="0.3" filter="url(#preview-shadow)" />
        
        {/* Floating Sheet */}
        <polygon points="160,95 260,62 290,107 190,140" fill="url(#glass-grad)" stroke="var(--color-border, #1e293b)" strokeWidth="1.2" />
        
        {/* Gauge Arc on Floating Sheet */}
        <path d="M 195 105 A 20 20 0 0 1 235 92" stroke="var(--color-border, #1e293b)" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeOpacity="0.4" />
        <path d="M 195 105 A 20 20 0 0 1 220 94" stroke="#10b981" strokeWidth="3" strokeLinecap="round" fill="none" />
        
        <text x="195" y="125" fill="var(--color-ink, #f8fafc)" fontSize="9" fontWeight="bold" fontFamily="monospace">78% CONF</text>

        {/* ================= LAYER 4: FLOATING AI INSIGHT CARD (Top layer, offset +35px) ================= */}
        {/* Shadow */}
        <polygon points="65,160 175,123 205,178 95,215" fill="#020617" opacity="0.35" filter="url(#preview-shadow)" />
        
        {/* Floating Card Sheet */}
        <polygon points="65,145 175,108 205,163 95,200" fill="url(#glass-grad)" stroke="var(--color-brand, #3b82f6)" strokeWidth="1.5" strokeOpacity="0.5" />
        
        {/* Micro-nodes inside Card */}
        <g transform="translate(0, 0)">
          {/* Header */}
          <polygon points="65,145 175,108 178,118 68,155" fill="var(--color-brand-opacity, rgba(59, 130, 246, 0.08))" />
          <circle cx="78" cy="154" r="2.5" fill="var(--color-brand, #3b82f6)" />
          <text x="86" y="156" fill="var(--color-brand, #3b82f6)" fontSize="7" fontWeight="bold" fontFamily="monospace">AI SIGNAL</text>

          {/* Text lines */}
          <line x1="80" y1="172" x2="160" y2="145" stroke="var(--color-ink, #f8fafc)" strokeOpacity="0.8" strokeWidth="1.5" />
          <line x1="80" y1="181" x2="140" y2="161" stroke="var(--color-ink-muted, #94a3b8)" strokeOpacity="0.6" strokeWidth="1.2" />
          <line x1="80" y1="190" x2="120" y2="177" stroke="var(--color-ink-muted, #94a3b8)" strokeOpacity="0.4" strokeWidth="1.2" />
        </g>
      </svg>

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
