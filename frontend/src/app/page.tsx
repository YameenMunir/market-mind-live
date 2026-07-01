"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Brain,
  Gauge,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";

const ASSET_CLASSES = ["Stocks", "ETFs", "Crypto", "Forex", "Commodities", "Indices"];

const FEATURES = [
  {
    icon: LineChart,
    title: "Institutional-grade charting",
    description:
      "TradingView-caliber candlesticks with zoom, pan, moving averages, Bollinger Bands, and support/resistance zones.",
  },
  {
    icon: Brain,
    title: "Transparent predictions",
    description:
      "A rules-based signal engine combining trend, momentum, and volatility - with plain-English reasoning, not a black box.",
  },
  {
    icon: ShieldCheck,
    title: "Risk-aware by default",
    description: "Every asset ships with a volatility-calibrated risk score so you understand exposure before you act.",
  },
  {
    icon: BarChart3,
    title: "Strategy backtesting",
    description: "Stress-test the signal engine against years of historical data with full equity curves and trade logs.",
  },
  {
    icon: Activity,
    title: "Always-on live feed",
    description: "WebSocket streaming with automatic polling fallback, so you never lose the thread on market moves.",
  },
  {
    icon: Gauge,
    title: "Confidence, quantified",
    description: "Every signal carries a calibrated confidence score - know when the model is certain, and when it isn't.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6">
        <BrandMark />
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="whitespace-nowrap rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 sm:px-4"
          >
            <span className="sm:hidden">Launch</span>
            <span className="hidden sm:inline">Launch Dashboard</span>
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl overflow-hidden px-6 pb-24 pt-16 sm:pt-24">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-20 blur-[140px]"
          style={{ background: "radial-gradient(closest-side, rgb(var(--color-brand)), transparent)" }}
        />

        <motion.div initial="hidden" animate="visible" className="relative mx-auto max-w-3xl text-center">
          <motion.div
            custom={0}
            variants={fadeUp}
            className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-border bg-surface-raised px-3.5 py-1.5 text-xs font-medium text-ink-muted"
          >
            <Sparkles size={13} className="text-brand" />
            Live across stocks, crypto, forex, commodities &amp; indices
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-6xl"
          >
            Market intelligence,
            <br />
            <span className="text-brand">read in plain English.</span>
          </motion.h1>

          <motion.p custom={2} variants={fadeUp} className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-muted">
            Live prices, technical indicators, transparent predictions, and risk scoring - in one terminal built for
            traders who want the signal, not the noise.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="group flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-canvas transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              Open the terminal
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/backtesting"
              className="w-full whitespace-nowrap rounded-lg border border-border px-5 py-3 text-center text-sm font-semibold text-ink-muted transition-colors hover:text-ink sm:w-auto"
            >
              Explore backtesting
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-16 max-w-4xl"
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-bear/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warn/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-bull/60" />
              <span className="ml-3 font-mono text-xs text-ink-faint">market-mind-live / dashboard</span>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface-raised p-4">
                <p className="text-[11px] uppercase tracking-wider text-ink-faint">AAPL</p>
                <p className="numeric mt-1.5 font-mono text-2xl font-semibold text-ink">$212.48</p>
                <p className="numeric mt-1 text-sm font-medium text-bull">+1.84 (+0.87%)</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-raised p-4">
                <p className="text-[11px] uppercase tracking-wider text-ink-faint">Model Prediction</p>
                <p className="mt-1.5 text-lg font-semibold text-bull">Bullish</p>
                <p className="mt-1 text-xs text-ink-muted">78% confidence</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-raised p-4">
                <p className="text-[11px] uppercase tracking-wider text-ink-faint">Risk</p>
                <p className="mt-1.5 text-lg font-semibold text-warn">Medium</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div className="h-full w-[46%] rounded-full bg-warn" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="border-y border-border bg-surface/40 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 text-sm font-medium text-ink-faint">
          {ASSET_CLASSES.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">Built like a trading desk, not a demo</h2>
          <p className="mt-3 text-ink-muted">Every card on the dashboard answers one question a trader actually asks.</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}
              className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-brand/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                <feature.icon size={18} className="text-brand" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <BrandMark />
          <p className="text-xs text-ink-faint">
            Market data is delayed and for informational purposes only. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
