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
} from "lucide-react";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { BUTTON_SIZE_STYLES, BUTTON_VARIANT_STYLES } from "@/components/Button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Activity,
    title: "Live market dashboard",
    description:
      "Watch real prices move for stocks, ETFs, crypto, forex, commodities, and indices, so you can connect what you're learning to what's actually happening in the market right now.",
  },
  {
    icon: LineChart,
    title: "Advanced charts",
    description:
      "Candlestick charts with zoom, pan, and full-screen mode help you get comfortable reading price action the way traders actually look at it.",
  },
  {
    icon: Gauge,
    title: "Technical indicators, explained",
    description: "SMA, EMA, RSI, MACD, Bollinger Bands, ATR, and support/resistance - the core building blocks of technical analysis, laid out on the chart you're already looking at.",
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
    icon: BarChart3,
    title: "Backtesting & performance",
    description: "See how a rules-based strategy would have performed historically - a safe, no-money-on-the-line way to learn how strategy testing works.",
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
        {/* Hero */}
        <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-12 sm:pt-16">
          <div className="relative mx-auto max-w-3xl text-center">
            <Reveal delay={0} className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-sm border border-brand/20 bg-brand/5 px-3 py-1 font-mono text-[10px] uppercase font-bold tracking-wider text-brand">
              <Sparkles size={11} className="text-brand" />
              About Market Mind Live
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="text-3xl font-bold uppercase tracking-tight text-ink sm:text-5xl font-mono">
                Learn the stock market by watching it move
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mx-auto mt-6 max-w-2xl text-xs leading-relaxed text-ink-muted">
                Market Mind Live is built mainly for beginners who want to understand the stock market, not just
                trade it. Live charts, technical indicators, AI insights, risk scores, and predictions are all
                paired with simple, plain-English explanations - so every number on screen comes with a "here's
                what that actually means."
              </p>
            </Reveal>
          </div>
        </section>

        {/* What the platform does */}
        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-xl font-bold uppercase tracking-wider font-mono text-ink">What the platform does</h2>
              <p className="mt-4 text-xs leading-relaxed text-ink-muted">
                Search any stock, ETF, forex pair, crypto asset, or index and see how it's actually behaving:
                live prices, a real chart, and the same technical indicators professional traders watch - RSI,
                MACD, moving averages, and more - all on one screen.
              </p>
              <p className="mt-4 text-xs leading-relaxed text-ink-muted">
                Instead of leaving you to guess what a number means, every indicator, prediction, and risk
                score is paired with a plain-English explanation of what's happening and why - so you build
                real understanding of market movements, one asset at a time.
              </p>
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-wider font-mono text-ink">Who it's for</h2>
              <div className="mt-5 flex flex-col gap-4">
                {AUDIENCE.map((item) => (
                  <div key={item.title} className="flex items-start gap-3.5 rounded-sm border border-border bg-surface p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-brand/25 bg-brand/5">
                      <item.icon size={16} className="text-brand" />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Key features */}
        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-bold uppercase tracking-wider font-mono text-ink">Key features</h2>
            <p className="mt-2 text-xs text-ink-muted">Everything you need to learn how to read a market, in one place.</p>
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

        {/* Disclaimer */}
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="rounded-sm border border-warn/30 bg-warn/3 p-6 sm:p-8">
            <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-warn">Disclaimer</p>
            <p className="mt-3 max-w-3xl text-xs leading-relaxed text-ink-muted">
              Market Mind Live is a learning tool built for education and informational purposes only. It does
              not provide financial advice, investment recommendations, or guaranteed trading outcomes. Market
              data may be delayed, and all predictions, risk scores, and AI-generated insights are produced
              algorithmically from historical and live data - they are teaching aids, not a substitute for
              independent research or a licensed financial professional. Always do your own due diligence
              before making investment decisions.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="flex flex-col items-center justify-center gap-4 rounded-sm border border-border bg-surface p-8 text-center sm:p-12">
            <h2 className="text-xl font-bold uppercase tracking-wider font-mono text-ink">Ready to start learning?</h2>
            <p className="max-w-md text-xs text-ink-muted">
              Open the dashboard, pick any asset, and start connecting the dots between price, indicators, and
              risk - no account required.
            </p>
            <Link
              href="/dashboard"
              className={cn(
                BUTTON_VARIANT_STYLES.primary,
                BUTTON_SIZE_STYLES.lg,
                "group mt-2 flex w-full items-center justify-center gap-2 sm:w-auto"
              )}
            >
              Open the terminal
              <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
