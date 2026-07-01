import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sora)", "sans-serif"],
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
        panel: "0 1px 0 0 rgb(var(--color-border) / 0.6), 0 24px 48px -24px rgb(0 0 0 / 0.5)",
        glow: "0 0 0 1px rgb(var(--color-brand) / 0.3), 0 0 32px -4px rgb(var(--color-brand) / 0.35)",
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "ticker-flash-up": "ticker-flash-up 0.6s ease-out",
        "ticker-flash-down": "ticker-flash-down 0.6s ease-out",
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
      },
    },
  },
  plugins: [],
};

export default config;
