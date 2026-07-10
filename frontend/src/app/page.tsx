import Link from "next/link";
import { Activity, ArrowUpRight, BarChart3, Brain, Gauge, LineChart, ShieldCheck, Sparkles } from "lucide-react";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";

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

      <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 sm:pt-24">
        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal delay={0} className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-border bg-surface-raised px-3.5 py-1.5 text-xs font-medium text-ink-muted">
            <Sparkles size={13} className="text-brand" />
            Live across stocks, crypto, forex, commodities &amp; indices
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-6xl">
              Market intelligence,
              <br />
              <span className="text-brand">read in plain English.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-muted">
              Live prices, technical indicators, transparent predictions, and risk scoring - in one terminal built for
              traders who want the signal, not the noise.
            </p>
          </Reveal>

          <Reveal delay={0.18} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
          </Reveal>
        </div>

        {/* Signature element: not a generic browser-chrome screenshot, but the thing
            that actually differentiates this product - a reasoning trail rendered in
            the same visual language as the real PriceCard/PredictionCard/
            ExplanationPanel, so this is a preview of the product, not a stock mockup. */}
        <Reveal delay={0.3} className="relative mx-auto mt-16 max-w-xl">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-bull" />
                <span className="font-mono text-xs text-ink-faint">AAPL &middot; reasoning trail</span>
              </div>
              <span className="numeric font-mono text-sm font-semibold text-ink">$212.48</span>
            </div>

            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bull/10">
                <Activity size={16} className="text-bull" />
              </span>
              <div>
                <p className="text-sm font-semibold text-bull">Bullish</p>
                <p className="text-xs text-ink-faint">78% confidence</p>
              </div>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm leading-relaxed text-ink-muted">
                &ldquo;Price action confirms an established uptrend with room before overbought conditions - momentum
                aligns but isn&rsquo;t extreme. This reads as trend continuation, not a speculative spike.&rdquo;
              </p>
              <ul className="mt-4 space-y-2 border-t border-border pt-4">
                {REASONING_FACTORS.map((factor) => (
                  <li key={factor} className="flex gap-2.5 text-xs leading-relaxed text-ink-muted">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-ink-faint">Illustrative example - not a live quote.</p>
        </Reveal>
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
            <Reveal
              key={feature.title}
              trigger="scroll"
              delay={(i % 3) * 0.08}
              className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-brand/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                <feature.icon size={18} className="text-brand" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.description}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
