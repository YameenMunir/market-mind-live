import Link from "next/link";
import { ArrowUpRight, BarChart3, Gauge, LineChart, ShieldCheck, Sparkles } from "lucide-react";

import { BUTTON_SIZE_STYLES, BUTTON_VARIANT_STYLES } from "@/components/Button";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/HeroSection";
import { Navbar } from "@/components/Navbar";
import { Panel } from "@/components/Panel";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";

const ASSET_CLASSES = ["Stocks", "ETFs", "Crypto", "Forex", "Commodities", "Indices"];

const CAPABILITIES = [
  {
    icon: LineChart,
    eyebrow: "Charting",
    title: "Institutional-grade indicators",
    body: "Candlestick charts with SMA, EMA, RSI, MACD, Bollinger Bands, ATR, and calculated support/resistance - the indicators professional traders use, explained in plain English.",
  },
  {
    icon: Gauge,
    eyebrow: "Predictions",
    title: "Transparent, rule-based scoring",
    body: "Every bullish, bearish, or neutral call ships with a confidence score and the exact trend, momentum, and volatility reasoning behind it - a scoring system you can audit, not a black box.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Risk",
    title: "Risk scoring for every asset",
    body: "A composite score built from volatility and market conditions, so you can size a decision appropriately before acting on a signal.",
  },
  {
    icon: BarChart3,
    eyebrow: "Backtesting",
    title: "Test a strategy before trusting it",
    body: "Simulate a moving-average and MACD crossover strategy against historical data to see how it would have performed - entries, exits, and drawdown included.",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Select an asset", desc: "Search any stock, ETF, cryptocurrency, forex pair, commodity, or index." },
  { step: "02", title: "Read the technicals", desc: "See candlesticks, moving averages, and volatility indicators calculated live." },
  { step: "03", title: "Check the signal", desc: "Read the plain-English reasoning behind the current prediction and risk score." },
  { step: "04", title: "Verify with a backtest", desc: "Simulate the underlying strategy across history before you rely on it." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <main>
        <HeroSection />

        <section className="border-y border-border bg-surface/40 py-3.5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 font-mono text-xs uppercase font-semibold tracking-wider text-ink-faint sm:gap-x-10 sm:px-6">
            {ASSET_CLASSES.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <Reveal trigger="scroll" className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">What&rsquo;s actually under the hood</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
              No marketing gloss - here&rsquo;s what each part of the dashboard computes and how.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CAPABILITIES.map((c, idx) => (
              <Reveal key={c.title} trigger="scroll" delay={idx * 0.05}>
                <Panel eyebrow={c.eyebrow} title={c.title} className="h-full">
                  <p className="text-sm leading-relaxed text-ink-muted">{c.body}</p>
                </Panel>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-surface/20 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <Reveal trigger="scroll" className="lg:col-span-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-brand/25 bg-brand/5">
                  <Sparkles size={18} className="text-brand" />
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  An AI research assistant, not a chatbot
                </h2>
              </Reveal>
              <Reveal trigger="scroll" delay={0.08} className="lg:col-span-7">
                <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
                  Ask questions about any asset and get answers grounded in the same live quote,
                  indicators, prediction, and news shown on your dashboard - not a freshly
                  re-fetched, possibly different view of the market. Responses aim to be clear
                  about what&rsquo;s verified market data versus AI interpretation, with an
                  unobtrusive reminder to double-check figures that matter to your decision.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal trigger="scroll" className="mx-auto mb-10 max-w-2xl text-center sm:mb-16">
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">How it works</h2>
              <p className="mt-2 text-sm text-ink-muted">From raw quotes to an actionable read in four steps.</p>
            </Reveal>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
              {HOW_IT_WORKS.map((s, idx) => (
                <Reveal
                  key={idx}
                  trigger="scroll"
                  delay={idx * 0.08}
                  className="relative space-y-3 rounded-sm border border-border bg-surface p-5"
                >
                  <div className="font-mono text-2xl font-bold text-brand/20">{s.step}</div>
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">{s.title}</h4>
                  <p className="text-xs leading-relaxed text-ink-muted">{s.desc}</p>
                  {idx < 3 && (
                    <div className="absolute right-[-16px] top-[40%] z-10 hidden translate-x-1/2 md:block">
                      <span className="font-mono font-bold text-brand/40">&rarr;</span>
                    </div>
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <Reveal trigger="scroll">
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">See it on your own watchlist.</h2>
            </Reveal>
            <Reveal trigger="scroll" delay={0.05}>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
                Free to use, no account required. Live data is delayed and informational only - not
                financial advice.
              </p>
            </Reveal>
            <Reveal trigger="scroll" delay={0.1} className="mt-8">
              <Link
                href="/dashboard"
                className={cn(
                  BUTTON_VARIANT_STYLES.primary,
                  BUTTON_SIZE_STYLES.lg,
                  "group inline-flex w-full items-center justify-center gap-2 px-6 sm:w-auto"
                )}
              >
                Open Dashboard
                <ArrowUpRight
                  size={15}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
