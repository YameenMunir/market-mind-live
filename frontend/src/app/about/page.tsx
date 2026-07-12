"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  Gauge,
  GraduationCap,
  LineChart,
  MessageCircleQuestion,
  Radio,
  ShieldCheck,
  Sparkles,
  Check,
} from "lucide-react";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { BUTTON_SIZE_STYLES, BUTTON_VARIANT_STYLES } from "@/components/Button";
import { StockGraph3D } from "@/components/StockGraph3D";
import { CandlestickChart3D } from "@/components/CandlestickChart3D";
import { BacktestingSimulation3D } from "@/components/BacktestingSimulation3D";
import { EvidenceNetwork3D } from "@/components/EvidenceNetwork3D";
import { MarketGlobe3D } from "@/components/MarketGlobe3D";
import { cn } from "@/lib/utils";

const GRID_FEATURES = [
  {
    icon: Activity,
    title: "Live market dashboard",
    description:
      "Watch real prices move for stocks, ETFs, crypto, forex, commodities, and indices, so you can connect what you're learning to what's actually happening in the market right now.",
  },
  {
    icon: Brain,
    title: "AI Insights Assistant",
    description:
      "Ask questions in plain English - \"why is RSI important?\", \"what does this chart mean?\" - and get answers grounded in the exact data on your screen.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Simple explanations of market moves",
    description:
      "Every prediction comes with a beginner-friendly summary and a plain-English breakdown of the reasoning behind it - never just a signal with no explanation.",
  },
  {
    icon: ShieldCheck,
    title: "Risk scores",
    description: "A calibrated risk score for every asset, so you build the habit of asking \"how risky is this?\" before \"should I buy this?\"",
  },
  {
    icon: Radio,
    title: "Real-time data status",
    description:
      "Every view is clearly labeled as a live stream or a polling fallback, and whether the underlying market data is real-time or delayed - so you always know what you're looking at.",
  },
];

const AUDIENCE = [
  {
    icon: GraduationCap,
    title: "Complete beginners",
    description: "Who are curious about the stock market and want a hands-on way to learn, not just a textbook.",
  },
  {
    icon: BookOpen,
    title: "New investors & traders",
    description: "Who want to understand what indicators, signals, and risk scores actually mean before putting real money behind a decision.",
  },
  {
    icon: Sparkles,
    title: "Curious learners",
    description: "Who want an AI assistant on hand to explain any chart, term, or market move in plain English, on demand.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Navbar />

      <main className="flex-1">
        {/* ================= HERO SECTION ================= */}
        <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-12 sm:pt-16 lg:py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Heading, Supporting Text */}
            <div className="relative mx-auto max-w-3xl text-center lg:col-span-7 lg:text-left lg:max-w-none">
              <Reveal delay={0} className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-sm border border-brand/20 bg-brand/5 px-3 py-1 font-mono text-xs uppercase font-bold tracking-wider text-brand lg:mx-0">
                <Sparkles size={11} className="text-brand" />
                About Market Mind Live
              </Reveal>

              <Reveal delay={0.06}>
                <h1 className="text-3xl font-bold uppercase tracking-tight text-ink sm:text-5xl font-mono leading-none">
                  Learn the stock market
                  <br />
                  <span className="text-brand">by watching it move.</span>
                </h1>
              </Reveal>

              <Reveal delay={0.12}>
                <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-ink-muted lg:mx-0">
                  Market Mind Live is built mainly for beginners who want to understand the stock market, not just
                  trade it. Live charts, technical indicators, AI insights, risk scores, and predictions are all
                  paired with simple, plain-English explanations - so every number on screen comes with a &ldquo;here&rsquo;s
                  what that actually means.&rdquo;
                </p>
              </Reveal>
            </div>

            {/* Right Column: 3D Connected Nodes (Understanding / Reasoning visual) */}
            <div className="lg:col-span-5 w-full">
              <Reveal delay={0.18}>
                <EvidenceNetwork3D className="mx-auto max-w-[340px] w-full md:max-w-[400px] lg:max-w-none" />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================= PLATFORM & AUDIENCE OVERVIEW ================= */}
        <section className="mx-auto max-w-7xl px-6 py-16 border-t border-border">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left: Global 3D Globe Visual */}
            <div className="lg:col-span-5 w-full">
              <Reveal delay={0.1}>
                <MarketGlobe3D className="mx-auto max-w-[340px] w-full md:max-w-[400px] lg:max-w-none" />
              </Reveal>
            </div>
            
            {/* Right: What & Who content */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-3">
                <h2 className="text-xl font-bold uppercase tracking-wider font-mono text-ink">What the platform does</h2>
                <p className="text-sm leading-relaxed text-ink-muted">
                  Search any stock, ETF, forex pair, crypto asset, or index and see how it&rsquo;s actually behaving:
                  live prices, a real chart, and the same technical indicators professional traders watch - RSI,
                  MACD, moving averages, and more - all on one screen.
                </p>
                <p className="text-sm leading-relaxed text-ink-muted">
                  Instead of leaving you to guess what a number means, every indicator, prediction, and risk
                  score is paired with a plain-English explanation of what&rsquo;s happening and why - so you build
                  real understanding of market movements, one asset at a time.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-bold uppercase tracking-wider font-mono text-ink">Who it&rsquo;s for</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {AUDIENCE.map((item, i) => (
                    <Reveal key={item.title} delay={i * 0.08} trigger="scroll" className="flex flex-col rounded-sm border border-border bg-surface p-4 space-y-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-brand/25 bg-brand/5">
                        <item.icon size={15} className="text-brand" />
                      </div>
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">{item.title}</h4>
                      <p className="text-xs leading-relaxed text-ink-muted">{item.description}</p>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SPOTLIGHT FEATURES (3D Models) ================= */}
        <section className="mx-auto max-w-7xl px-6 py-16 border-t border-border space-y-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-bold uppercase tracking-wider font-mono text-ink">Core Learning Tools</h2>
            <p className="mt-2 text-sm text-ink-muted">Hands-on visual environments designed to simplify complex market concepts.</p>
          </div>

          {/* Spotlight 1: Charting */}
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand">Visual analysis</span>
              <h3 className="text-lg font-bold uppercase tracking-wider font-mono text-ink">Advanced Charts & Indicators</h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                Candlestick charts with zoom, pan, and full-screen mode help you get comfortable reading price 
                action the way traders actually look at it. SMA, EMA, RSI, MACD, Bollinger Bands, ATR, and 
                support/resistance are laid out directly on the active chart with interactive explanations.
              </p>
            </div>
            <div className="lg:col-span-5 w-full">
              <Reveal delay={0.1} trigger="scroll">
                <CandlestickChart3D className="mx-auto max-w-[340px] w-full md:max-w-[400px] lg:max-w-none" />
              </Reveal>
            </div>
          </div>

          {/* Spotlight 2: Backtesting */}
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5 w-full order-last lg:order-first">
              <Reveal delay={0.1} trigger="scroll">
                <BacktestingSimulation3D className="mx-auto max-w-[340px] w-full md:max-w-[400px] lg:max-w-none" />
              </Reveal>
            </div>
            <div className="lg:col-span-7 space-y-4">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand">Risk-free sandbox</span>
              <h3 className="text-lg font-bold uppercase tracking-wider font-mono text-ink">Backtesting & Historical Testing</h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                See how a rules-based strategy would have performed historically - a safe, no-money-on-the-line 
                way to learn how strategy testing works. Study performance curves and gain confidence 
                evaluating market strategies across previous cycles.
              </p>
            </div>
          </div>
        </section>

        {/* ================= SUPPORTING FEATURES GRID ================= */}
        <section className="mx-auto max-w-7xl px-6 py-16 border-t border-border">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-xl font-bold uppercase tracking-wider font-mono text-ink">Additional Features</h2>
            <p className="mt-2 text-sm text-ink-muted">Everything you need to learn how to read a market, in one place.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GRID_FEATURES.map((feature, i) => (
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
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.description}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ================= DISCLAIMER SECTION ================= */}
        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-sm border border-warn/30 bg-warn/3 p-6 sm:p-8">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-warn">Disclaimer</p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
              Market Mind Live is a learning tool built for education and informational purposes only. It does
              not provide financial advice, investment recommendations, or guaranteed trading outcomes. Market
              data may be delayed, and all predictions, risk scores, and AI-generated insights are produced
              algorithmically from historical and data feeds - they are teaching aids, not a substitute for
              independent research or a licensed financial professional. Always do your own due diligence
              before making investment decisions.
            </p>
          </div>
        </section>

        {/* ================= FINAL CTA ================= */}
        <section className="relative overflow-hidden border-t border-border py-24 bg-surface-raised/10">
          {/* Subtle background visual curve */}
          <div className="absolute inset-0 -z-10 opacity-30 flex items-center justify-center translate-y-16">
            <StockGraph3D className="w-[600px] h-auto opacity-10" />
          </div>

          <div className="mx-auto max-w-3xl px-6 text-center space-y-6">
            <Reveal delay={0.05} className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-sm border border-brand/20 bg-brand/5 px-2.5 py-0.5 font-mono text-xs font-bold tracking-wider text-brand uppercase">
              Get Started
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="text-2xl font-bold uppercase tracking-wide font-mono text-ink sm:text-4xl">
                Ready to start learning?
              </h2>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-muted">
                Open the dashboard, pick any asset, and start connecting the dots between price, indicators, and
                risk - no account required.
              </p>
            </Reveal>
            <Reveal delay={0.2} className="pt-4">
              <Link
                href="/dashboard"
                className={cn(
                  BUTTON_VARIANT_STYLES.primary,
                  BUTTON_SIZE_STYLES.lg,
                  "group inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                )}
              >
                Open the terminal
                <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
