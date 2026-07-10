import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      colors: {
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--color-surface-raised) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--color-ink-muted) / <alpha-value>)",
        "ink-faint": "rgb(var(--color-ink-faint) / <alpha-value>)",
        brand: "rgb(var(--color-brand) / <alpha-value>)",
        "brand-strong": "rgb(var(--color-brand-strong) / <alpha-value>)",
        bull: "rgb(var(--color-bull) / <alpha-value>)",
        bear: "rgb(var(--color-bear) / <alpha-value>)",
        warn: "rgb(var(--color-warn) / <alpha-value>)",
      },
      boxShadow: {
        // Persistent page sections (cards, drawers, the fullscreen chart). Flat panel style.
        panel: "none",
        // Transient floating UI (dropdown menus, tooltips) - clean sharp border-shadow
        popover: "0 4px 12px 0 rgb(0 0 0 / 0.15), 0 0 0 1px rgb(var(--color-border))",
        glow: "0 0 0 1px rgb(var(--color-brand) / 0.4)",
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "ticker-flash-up": "ticker-flash-up 0.6s ease-out",
        "ticker-flash-down": "ticker-flash-down 0.6s ease-out",
        "dropdown-in": "dropdown-in 120ms ease-out",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "ticker-flash-up": {
          "0%": { backgroundColor: "rgb(var(--color-bull) / 0.25)" },
          "100%": { backgroundColor: "transparent" },
        },
        "ticker-flash-down": {
          "0%": { backgroundColor: "rgb(var(--color-bear) / 0.25)" },
          "100%": { backgroundColor: "transparent" },
        },
        "dropdown-in": {
          "0%": { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
