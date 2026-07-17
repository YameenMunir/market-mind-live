import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Brain,
  GraduationCap,
  LineChart,
  MessageCircleQuestion,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { BUTTON_SIZE_STYLES, BUTTON_VARIANT_STYLES } from "@/components/Button";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";

const GRID_FEATURES = [
  {
    icon: Activity,
    title: "Live market dashboard",
    description:
      "Watch real prices move for stocks, ETFs, crypto, forex, commodities, and indices, so you can connect what you're learning to what's actually happening in the market right now.",
  },
  {
    icon: LineChart,
    title: "Advanced charts & indicators",
    description:
      "Candlestick charts with zoom, pan, and full-screen mode, plus SMA, EMA, RSI, MACD, Bollinger Bands, ATR, and support/resistance laid directly on the chart with plain-English explanations.",
  },
  {
    icon: Brain,
    title: "AI Insights Assistant",
    description:
      "Ask questions in plain English - \"why is RSI important?\", \"what does this chart mean?\" - and get answers grounded in the exact data on your screen.",
  },
  {
    icon: BarChart3,
    title: "Backtesting & historical testing",
    description:
      "See how a rules-based strategy would have performed historically - a no-money-on-the-line way to learn how strategy testing works, entries and drawdowns included.",
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
    description:
      "A calibrated risk score for every asset, so you build the habit of asking \"how risky is this?\" before \"should I buy this?\"",
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
        <section className="mx-auto max-w-3xl px-6 pb-16 pt-12 text-center sm:pt-16 lg:py-24">
          <Reveal className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-sm border border-brand/20 bg-brand/5 px-3 py-1 font-mono text-xs uppercase font-bold tracking-wider text-brand">
            <Sparkles size={11} className="text-brand" />
            About Market Mind Live
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-5xl">
              Learn the stock market by watching it move.
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
              Market Mind Live is built mainly for beginners who want to understand the stock market, not just
              trade it. Live charts, technical indicators, AI insights, risk scores, and predictions are all
              paired with simple, plain-English explanations - so every number on screen comes with a &ldquo;here&rsquo;s
              what that actually means.&rdquo;
            </p>
          </Reveal>
        </section>

        <section className="mx-auto max-w-5xl border-t border-border px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-8">
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
              <h2 className="text-xl font-bold uppercase tracking-wider font-mono text-ink">Who it&rsquo;s for</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {AUDIENCE.map((item, i) => (
                  <Reveal
                    key={item.title}
                    delay={i * 0.08}
                    trigger="scroll"
                    className="flex flex-col space-y-3 rounded-sm border border-border bg-surface p-4"
                  >
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
        </section>

        <section className="mx-auto max-w-7xl border-t border-border px-6 py-16">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-xl font-bold uppercase tracking-wider font-mono text-ink">What&rsquo;s included</h2>
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

        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-sm border border-warn/30 bg-warn/[0.03] p-6 sm:p-8">
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

        <section className="border-t border-border py-16 sm:py-20">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <Reveal>
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Ready to see it in action?</h2>
            </Reveal>
            <Reveal delay={0.05}>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
                Open the dashboard, pick any asset, and start connecting the dots between price, indicators, and
                risk - no account required.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="mt-8">
              <Link
                href="/dashboard"
                className={cn(
                  BUTTON_VARIANT_STYLES.primary,
                  BUTTON_SIZE_STYLES.lg,
                  "group inline-flex w-full items-center justify-center gap-2 px-6 sm:w-auto"
                )}
              >
                Open Dashboard
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
