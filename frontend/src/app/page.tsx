"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, BarChart3, Brain, Gauge, LineChart, ShieldCheck, Sparkles, Check } from "lucide-react";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { BUTTON_SIZE_STYLES, BUTTON_VARIANT_STYLES } from "@/components/Button";
import { StockGraph3D } from "@/components/StockGraph3D";
import { ProductPreview3D } from "@/components/ProductPreview3D";
import { CandlestickChart3D } from "@/components/CandlestickChart3D";
import { BacktestingSimulation3D } from "@/components/BacktestingSimulation3D";
import { EvidenceNetwork3D } from "@/components/EvidenceNetwork3D";
import { MarketGlobe3D } from "@/components/MarketGlobe3D";
import { HeroSection } from "@/components/HeroSection";
import { cn } from "@/lib/utils";

const ASSET_CLASSES = ["Stocks", "ETFs", "Crypto", "Forex", "Commodities", "Indices"];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      {/* ================= HERO SECTION ================= */}
      <HeroSection />


      {/* ================= ASSET CLASSES RIBBON ================= */}
      <section className="border-y border-border bg-surface/40 py-3.5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 font-mono text-xs uppercase font-semibold tracking-wider text-ink-faint sm:gap-x-10 sm:px-6">
          {ASSET_CLASSES.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </section>

      {/* ================= PRODUCT PREVIEW SECTION ================= */}
      <section className="relative mx-auto max-w-7xl px-4 py-10 border-b border-border sm:px-6 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
          {/* Left: 3D Product Mockup */}
          <div className="lg:col-span-5 w-full">
            <Reveal delay={0.1}>
              <ProductPreview3D className="mx-auto max-w-[340px] w-full md:max-w-[400px] lg:max-w-none" />
            </Reveal>
          </div>
          
          {/* Right: Feature Description */}
          <div className="lg:col-span-7 space-y-6">
            <Reveal delay={0.05}>
              <h2 className="text-xl font-bold uppercase tracking-wider font-mono text-ink">
                A Unified, Layered Workspace
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-sm leading-relaxed text-ink-muted">
                Ditch the tab-clutter. Market Mind Live brings charting, order books, and real-time AI signal panels 
                together inside a clean desktop terminal model. Everything behaves reactively and stays visible 
                at a single glance, adapting beautifully to standard mobile viewports.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-4">
                {[
                  "Real-time canvas updates",
                  "Layered, high-contrast layouts",
                  "Pulsing status parameters",
                  "Fluid viewport adaptation"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 font-mono text-xs uppercase font-bold text-ink-muted">
                    <Check size={12} className="text-brand shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= INTERACTIVE FEATURES SHOWCASE ================= */}
      <section className="mx-auto max-w-7xl px-4 py-10 space-y-10 sm:px-6 sm:py-16 sm:space-y-20 lg:py-20 lg:space-y-28">

        {/* Feature 1: Charting */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="lg:col-span-7 space-y-4">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand">Workspace primitive</span>
            <h3 className="text-lg font-bold uppercase tracking-wider font-mono text-ink">Institutional Charting</h3>
            <p className="text-sm leading-relaxed text-ink-muted">
              Analyze price action with high-density candlestick visualizations. Overlays are built to run 
              smoothly on low-power mobile engines, offering moving averages, Bollinger Bands, and 
              calculated support/resistance regions without visual overlap.
            </p>
          </div>
          <div className="lg:col-span-5 w-full">
            <Reveal delay={0.1} trigger="scroll">
              <CandlestickChart3D className="mx-auto max-w-[340px] w-full md:max-w-[400px] lg:max-w-none" />
            </Reveal>
          </div>
        </div>

        {/* Feature 2: Backtesting */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="lg:col-span-5 w-full order-last lg:order-first">
            <Reveal delay={0.1} trigger="scroll">
              <BacktestingSimulation3D className="mx-auto max-w-[340px] w-full md:max-w-[400px] lg:max-w-none" />
            </Reveal>
          </div>
          <div className="lg:col-span-7 space-y-4">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand">Risk verification</span>
            <h3 className="text-lg font-bold uppercase tracking-wider font-mono text-ink">Strategy Backtesting</h3>
            <p className="text-sm leading-relaxed text-ink-muted">
              Stress-test indicators across historical intervals. Compare strategy performance 
              against index benchmarks side-by-side in 3D projection, tracking entry flags, exit flags, 
              and drawdown valleys with precision metrics.
            </p>
          </div>
        </div>

        {/* Feature 3: AI Insights */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="lg:col-span-7 space-y-4">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand">Explainable AI</span>
            <h3 className="text-lg font-bold uppercase tracking-wider font-mono text-ink">Evidence-Based Insights</h3>
            <p className="text-sm leading-relaxed text-ink-muted">
              No black boxes. The system outlines its signal reasoning using an interconnected evidence network. 
              Technical crossovers, momentum status, and volume signals converge transparently into a 
              final bullish or bearish confidence rating.
            </p>
          </div>
          <div className="lg:col-span-5 w-full">
            <Reveal delay={0.1} trigger="scroll">
              <EvidenceNetwork3D className="mx-auto max-w-[340px] w-full md:max-w-[400px] lg:max-w-none" />
            </Reveal>
          </div>
        </div>

        {/* Feature 4: Global Market Coverage */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="lg:col-span-5 w-full order-last lg:order-first">
            <Reveal delay={0.1} trigger="scroll">
              <MarketGlobe3D className="mx-auto max-w-[340px] w-full md:max-w-[400px] lg:max-w-none" />
            </Reveal>
          </div>
          <div className="lg:col-span-7 space-y-4">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand">Data ecosystem</span>
            <h3 className="text-lg font-bold uppercase tracking-wider font-mono text-ink">Connected Global Streams</h3>
            <p className="text-sm leading-relaxed text-ink-muted">
              Monitor active market exchanges, crypto channels, forex networks, and commodities indexes globally. 
              Data feeds route through low-overhead pipelines to update values rapidly without clogging threads 
              or battery cycles on mobile hardware.
            </p>
          </div>
        </div>

      </section>

      {/* ================= SEQUENCE / HOW IT WORKS SECTION ================= */}
      <section className="border-t border-border bg-surface/20 py-10 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center mb-10 sm:mb-16">
            <h2 className="text-xl font-bold uppercase tracking-wider font-mono text-ink">
              Structured Terminal Operations
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              How the platform synthesizes raw quotes into clear, actionable insights in four steps.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {[
              { step: "01", title: "Select Ticker", desc: "Choose a global stock, forex pair, index, or cryptocurrency to initialize." },
              { step: "02", title: "Parse Technicals", desc: "Calculates candlesticks, moving average crossover, and volatility indices." },
              { step: "03", title: "Inspect Signal", desc: "Read plain-English AI reasoning logs detailing indicator configurations." },
              { step: "04", title: "Simulate Strategy", desc: "Simulate strategy parameters historically to verify risk performance." }
            ].map((s, idx) => (
              <Reveal key={idx} trigger="scroll" delay={idx * 0.08} className="relative rounded-sm border border-border bg-surface p-5 space-y-3">
                <div className="font-mono text-2xl font-bold text-brand/20">{s.step}</div>
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">{s.title}</h4>
                <p className="text-xs leading-relaxed text-ink-muted">{s.desc}</p>
                {idx < 3 && (
                  <div className="hidden md:block absolute top-[40%] right-[-16px] z-10 translate-x-1/2">
                    <span className="text-brand/40 font-mono font-bold">&rarr;</span>
                  </div>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative overflow-hidden border-t border-border py-10 bg-surface-raised/10 sm:py-16 lg:py-24">
        {/* Subtle background visual curve */}
        <div className="absolute inset-0 -z-10 opacity-30 flex items-center justify-center translate-y-16">
          <StockGraph3D className="w-[600px] h-auto opacity-10" />
        </div>

        <div className="mx-auto max-w-3xl px-4 text-center space-y-6 sm:px-6">
          <Reveal delay={0.05} className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-sm border border-brand/20 bg-brand/5 px-2.5 py-0.5 font-mono text-xs font-bold tracking-wider text-brand-strong uppercase">
            Terminal Active
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="text-2xl font-bold uppercase tracking-wide font-mono text-ink sm:text-4xl">
              Professional asset analytics.
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-muted">
              Get the signal, cut the noise, and access indicators with plain-English insights in seconds.
            </p>
          </Reveal>
          <Reveal delay={0.2} className="pt-4">
            <Link
              href="/dashboard"
              className={cn(
                BUTTON_VARIANT_STYLES.primary,
                BUTTON_SIZE_STYLES.lg,
                "group inline-flex h-11 items-center justify-center gap-2 w-full sm:w-auto"
              )}
            >
              Open Live Terminal
              <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
