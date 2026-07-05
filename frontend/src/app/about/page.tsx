"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
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

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto max-w-7xl overflow-hidden px-6 pb-20 pt-12 sm:pt-16">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[820px] max-w-[100vw] -translate-x-1/2 rounded-full opacity-20 blur-[140px]"
            style={{ background: "radial-gradient(closest-side, rgb(var(--color-brand)), transparent)" }}
          />

          <motion.div initial="hidden" animate="visible" className="relative mx-auto max-w-3xl text-center">
            <motion.div
              custom={0}
              variants={fadeUp}
              className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-border bg-surface-raised px-3.5 py-1.5 text-xs font-medium text-ink-muted"
            >
              <Sparkles size={13} className="text-brand" />
              About Market Mind Live
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              className="text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl"
            >
              Learn the stock market by watching it move
            </motion.h1>

            <motion.p custom={2} variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-muted">
              Market Mind Live is built mainly for beginners who want to understand the stock market, not just
              trade it. Live charts, technical indicators, AI insights, risk scores, and predictions are all
              paired with simple, plain-English explanations - so every number on screen comes with a "here's
              what that actually means."
            </motion.p>
          </motion.div>
        </section>

        {/* What the platform does */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">What the platform does</h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted sm:text-base">
                Search any stock, ETF, forex pair, crypto asset, or index and see how it's actually behaving:
                live prices, a real chart, and the same technical indicators professional traders watch - RSI,
                MACD, moving averages, and more - all on one screen.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted sm:text-base">
                Instead of leaving you to guess what a number means, every indicator, prediction, and risk
                score is paired with a plain-English explanation of what's happening and why - so you build
                real understanding of market movements, one asset at a time.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Who it's for</h2>
              <div className="mt-5 flex flex-col gap-4">
                {AUDIENCE.map((item) => (
                  <div key={item.title} className="flex items-start gap-3.5 rounded-xl border border-border bg-surface p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                      <item.icon size={16} className="text-brand" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Key features */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink">Key features</h2>
            <p className="mt-3 text-ink-muted">Everything you need to learn how to read a market, in one place.</p>
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

        {/* Disclaimer */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="rounded-2xl border border-warn/30 bg-warn/5 p-6 sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-warn">Disclaimer</p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
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
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center sm:p-12">
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Ready to start learning?</h2>
            <p className="max-w-md text-sm text-ink-muted">
              Open the dashboard, pick any asset, and start connecting the dots between price, indicators, and
              risk - no account required.
            </p>
            <Link
              href="/dashboard"
              className="group mt-2 flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-canvas transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              Open the terminal
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
