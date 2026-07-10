import Link from "next/link";
import { Activity, ArrowUpRight, BarChart3, Brain, Gauge, LineChart, ShieldCheck, Sparkles } from "lucide-react";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { BUTTON_SIZE_STYLES, BUTTON_VARIANT_STYLES } from "@/components/Button";
import { cn } from "@/lib/utils";

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

const REASONING_FACTORS = [
  "SMA-20 crossed above SMA-50, twelve sessions ago",
  "RSI at 58 - momentum without overbought risk",
  "Volatility sitting mid-range of the 90-day ATR band",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-12 sm:pt-16">
        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal delay={0} className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-sm border border-brand/20 bg-brand/5 px-3 py-1 font-mono text-[10px] uppercase font-bold tracking-wider text-brand">
            <Sparkles size={11} className="text-brand" />
            Live asset intelligence &middot; Multi-asset stream
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="text-3xl font-bold uppercase tracking-tight text-ink sm:text-5xl font-mono">
              Market intelligence,
              <br />
              <span className="text-brand">read in plain English.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 max-w-xl text-xs leading-relaxed text-ink-muted">
              Live prices, technical indicators, transparent predictions, and risk scoring - in one terminal built for
              traders who want the signal, not the noise.
            </p>
          </Reveal>

          <Reveal delay={0.18} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className={cn(
                BUTTON_VARIANT_STYLES.primary,
                BUTTON_SIZE_STYLES.lg,
                "group flex w-full items-center justify-center gap-2 sm:w-auto"
              )}
            >
              Open the terminal
              <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/backtesting"
              className={cn(
                BUTTON_VARIANT_STYLES.secondary,
                BUTTON_SIZE_STYLES.lg,
                "inline-flex items-center justify-center whitespace-nowrap w-full sm:w-auto"
              )}
            >
              Explore backtesting
            </Link>
          </Reveal>
        </div>

        {/* Signature element: not a generic browser-chrome screenshot, but the thing
            that actually differentiates this product - a reasoning trail rendered in
            the same visual language as the real PriceCard/PredictionCard/
            ExplanationPanel, so this is a preview of the product, not a stock mockup. */}
        <Reveal delay={0.3} className="relative mx-auto mt-14 max-w-xl">
          <div className="overflow-hidden rounded-sm border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 bg-surface-raised/40">
              <div className="flex items-center gap-2">
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-sm bg-bull" />
                <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-ink-faint">AAPL &middot; reasoning trail</span>
              </div>
              <span className="numeric font-mono text-xs font-bold text-ink">$212.48</span>
            </div>

            <div className="flex items-center gap-3 border-b border-border px-5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-bull/30 bg-bull/5">
                <Activity size={14} className="text-bull" />
              </span>
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-bull">Bullish</p>
                <p className="font-mono text-[9px] uppercase tracking-wide text-ink-faint">78% confidence</p>
              </div>
            </div>

            <div className="px-5 py-4">
              <p className="text-xs leading-relaxed text-ink-muted">
                &ldquo;Price action confirms an established uptrend with room before overbought conditions - momentum
                aligns but isn&rsquo;t extreme. This reads as trend continuation, not a speculative spike.&rdquo;
              </p>
              <ul className="mt-4 space-y-2 border-t border-border/60 pt-4">
                {REASONING_FACTORS.map((factor) => (
                  <li key={factor} className="flex gap-2.5 font-mono text-[10px] leading-relaxed text-ink-muted">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-sm bg-brand" />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-wider text-ink-faint">Illustrative example - not a live quote.</p>
        </Reveal>
      </section>

      <section className="border-y border-border bg-surface/40 py-3.5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 font-mono text-[10px] uppercase font-semibold tracking-wider text-ink-faint">
          {ASSET_CLASSES.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold uppercase tracking-wider font-mono text-ink">Built like a trading desk, not a demo</h2>
          <p className="mt-2 text-xs text-ink-muted">Every card on the dashboard answers one question a trader actually asks.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal
              key={feature.title}
              trigger="scroll"
              delay={(i % 3) * 0.08}
              className="rounded-sm border border-border bg-surface p-6 transition-colors hover:border-brand/35"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-brand/25 bg-brand/5">
                <feature.icon size={16} className="text-brand" />
              </div>
              <h3 className="mt-4 font-mono text-xs font-bold uppercase tracking-wider text-ink">{feature.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">{feature.description}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
