"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Shield, Zap, TrendingUp, Sparkles, BarChart3, LineChart, Sparkle } from "lucide-react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AIAssetContext } from "@/types";

// ================= APPLE SVG LOGO =================
const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.8 16.5 3.32 8.78 8.55 8.25c1.47-.02 2.4.63 3.23.63.82 0 2.22-.76 4-.54 1.76.22 3.1 1.05 3.73 2.5-3.66 2.2-3.08 7.25.5 8.73-.7 1.8-1.57 3.7-2.96 4.7zM12 8.2c-.1-2.96 2.37-5.54 5.3-5.7.3 3.3-2.6 5.95-5.3 5.7z" />
  </svg>
);

// ================= CONFIDENCE SVG RING =================
export function ConfidenceRing({ percent = 78, strokeColor = "#3b82f6" }: { percent?: number; strokeColor?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const radius = 16;
  const strokeWidth = 3.5;
  const circumference = 2 * Math.PI * radius; // 100.53px
  const targetOffset = circumference - (percent / 100) * circumference;

  return (
    <svg className="w-10 h-10 rotate-[-90deg]" viewBox="0 0 38 38" aria-hidden="true">
      <circle
        className="text-slate-800"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="19"
        cy="19"
      />
      <motion.circle
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        initial={prefersReducedMotion ? { strokeDashoffset: targetOffset } : { strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: targetOffset }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.2, ease: "easeOut", delay: 0.8 }}
        strokeLinecap="round"
        stroke={strokeColor}
        fill="transparent"
        r={radius}
        cx="19"
        cy="19"
      />
    </svg>
  );
}

// ================= BACKGROUND DECORATIVE CHART =================
export function HeroBackgroundChart() {
  const prefersReducedMotion = useReducedMotion();
  const pathD =
    "M 0 480 L 40 470 L 80 490 L 120 460 L 160 475 L 200 440 L 240 450 L 280 410 L 320 430 L 360 380 L 400 400 L 440 350 L 480 370 L 520 320 L 560 340 L 600 290 L 640 310 L 680 260 L 720 280 L 760 230 L 800 250 L 840 200 L 880 220 L 920 160 L 960 185 L 1000 130 L 1040 150 L 1080 100 L 1120 120 L 1160 70 L 1200 95 L 1240 45 L 1280 65 L 1320 20 L 1360 40 L 1400 10 L 1440 30";
  const pathAreaD = `${pathD} L 1440 800 L 0 800 Z`;
  const strokeDasharray = 2500;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true">
      {/* Background radial glow */}
      <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] rounded-full bg-brand/5 blur-[140px]" />
      <div className="absolute bottom-[10%] right-[5%] w-[600px] h-[600px] rounded-full bg-brand/10 blur-[160px]" />

      <svg
        className="w-full h-full opacity-35 sm:opacity-50"
        viewBox="0 0 1440 800"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="800" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgb(245, 158, 11)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="rgb(245, 158, 11)" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="line-gradient" x1="0" y1="480" x2="1440" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgb(245, 158, 11)" stopOpacity="0.5" />
            <stop offset="50%" stopColor="rgb(245, 158, 11)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="rgb(245, 158, 11)" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {/* Horizontal */}
        <line x1="0" y1="100" x2="1440" y2="100" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="0" y1="200" x2="1440" y2="200" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="0" y1="300" x2="1440" y2="300" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="0" y1="400" x2="1440" y2="400" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="0" y1="500" x2="1440" y2="500" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="0" y1="600" x2="1440" y2="600" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="0" y1="700" x2="1440" y2="700" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />

        {/* Vertical */}
        <line x1="144" y1="0" x2="144" y2="800" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="288" y1="0" x2="288" y2="800" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="432" y1="0" x2="432" y2="800" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="576" y1="0" x2="576" y2="800" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="720" y1="0" x2="720" y2="800" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="864" y1="0" x2="864" y2="800" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="1008" y1="0" x2="1008" y2="800" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="1152" y1="0" x2="1152" y2="800" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="1296" y1="0" x2="1296" y2="800" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />

        {/* Shaded Area */}
        <motion.path
          d={pathAreaD}
          fill="url(#area-gradient)"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.5, delay: 0.8 }}
        />

        {/* Glow behind the path */}
        <motion.path
          d={pathD}
          stroke="url(#line-gradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.2"
          strokeDasharray={strokeDasharray}
          initial={prefersReducedMotion ? { strokeDashoffset: 0 } : { strokeDashoffset: strokeDasharray }}
          animate={{ strokeDashoffset: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 2.2, ease: "easeOut", delay: 0.1 }}
        />

        {/* Main Line */}
        <motion.path
          d={pathD}
          stroke="url(#line-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={strokeDasharray}
          initial={prefersReducedMotion ? { strokeDashoffset: 0 } : { strokeDashoffset: strokeDasharray }}
          animate={{ strokeDashoffset: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 2.2, ease: "easeOut", delay: 0.1 }}
        />

        {/* Peak Glow Dots */}
        <g opacity="0.95">
          <circle cx="1400" cy="10" r="7" fill="rgb(245, 158, 11)" fillOpacity="0.3" className="animate-pulse" />
          <circle cx="1400" cy="10" r="2.5" fill="rgb(251, 191, 36)" />

          <circle cx="1440" cy="30" r="9" fill="rgb(245, 158, 11)" fillOpacity="0.2" className="animate-pulse" />
          <circle cx="1440" cy="30" r="3.5" fill="rgb(251, 191, 36)" />
        </g>
      </svg>
    </div>
  );
}

// ================= DYNAMIC PRODUCT PREVIEW CARD =================
export function AssetAnalysisCard() {
  const [liveData, setLiveData] = useState<AIAssetContext | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    let active = true;
    api.getAIContext("AAPL")
      .then((res) => {
        if (active && res) {
          setLiveData(res);
          setIsLoaded(true);
        }
      })
      .catch((err) => {
        console.warn("Could not load AAPL AI Context from API, using premium default fallback data.", err);
      });

    // Keep disclaimer time realistic
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
          " &bull; " +
          now.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" }) +
          " ET"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // minute updates are sufficient

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Standard static fallback data (matching the high fidelity mockup)
  const ticker = liveData?.asset || "AAPL";
  const name = liveData?.asset_name || "Apple Inc.";
  const exchange = "NASDAQ";
  const price = liveData?.latest_price !== null && liveData?.latest_price !== undefined 
    ? liveData.latest_price 
    : 212.48;
  const change = liveData?.price_change !== null && liveData?.price_change !== undefined 
    ? liveData.price_change 
    : 1.38;
  const changePercent = liveData?.price_change_percent !== null && liveData?.price_change_percent !== undefined 
    ? liveData.price_change_percent 
    : 0.65;

  const rawSignal = liveData?.prediction?.signal || "buy";
  const signal = rawSignal.toUpperCase() === "BUY" ? "Bullish" : rawSignal.toUpperCase() === "SELL" ? "Bearish" : "Neutral";
  const bias = rawSignal.toUpperCase() === "BUY" ? "Bias: Long" : rawSignal.toUpperCase() === "SELL" ? "Bias: Short" : "Bias: Neutral";
  const confidence = liveData?.prediction?.confidence || 78;

  const explanation =
    liveData?.prediction?.explanation ||
    "Price action confirms an established uptrend with strong momentum and improving breadth. Pullbacks are shallow with buyers stepping in at key levels.";

  const insights = liveData?.prediction?.reasoning || [
    "Price above 50-day and 200-day moving averages",
    "RSI(14) at 58 — room to run before overbought",
    "Volatility remains in a healthy mid-range zone",
  ];

  const formattedPrice = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
  const isPositive = change >= 0;
  const formattedChange = `${isPositive ? "+" : ""}${change.toFixed(2)} (${isPositive ? "+" : ""}${changePercent.toFixed(2)}%)`;

  return (
    <div className="w-full max-w-[580px] rounded-2xl border border-border/80 bg-[#0a0d16]/95 p-5 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.06)] backdrop-blur-md transition-all duration-300 hover:border-brand/20 hover:shadow-[0_0_50px_rgba(245,158,11,0.1)]">
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white">
            <AppleIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-sans text-[20px] font-bold text-white leading-none">{ticker}</span>
            </div>
            <span className="text-[12px] text-ink-muted mt-1 block">
              {name} &middot; {exchange}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-[22px] font-bold text-white leading-none numeric">
            {formattedPrice}
          </div>
          <span
            className={cn(
              "font-mono text-[12px] font-semibold mt-1 block leading-none numeric",
              isPositive ? "text-bull" : "text-bear"
            )}
          >
            {formattedChange}
          </span>
        </div>
      </div>

      {/* 2. Signal and Confidence */}
      <div className="grid grid-cols-2 gap-4 py-4 border-b border-border/40">
        <div className="flex flex-col justify-center">
          <span className="text-[11px] text-ink-muted">Signal</span>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bull/20 bg-bull/5 text-bull">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="font-sans text-[14px] font-bold text-bull leading-tight">{signal}</p>
              <p className="font-sans text-[11px] text-ink-muted leading-tight mt-0.5">{bias}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col border-l border-border/40 pl-6 justify-center">
          <span className="text-[11px] text-ink-muted">Confidence</span>
          <div className="flex items-center justify-between mt-1">
            <div className="flex flex-col">
              <span className="text-[18px] font-bold text-white font-mono leading-none numeric">{confidence}%</span>
              <span className="text-[11px] text-ink-muted mt-1 leading-none">High confidence</span>
            </div>
            <ConfidenceRing percent={confidence} strokeColor="#3b82f6" />
          </div>
        </div>
      </div>

      {/* 3. AI Reasoning */}
      <div className="py-4 border-b border-border/40">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkle size={13} className="text-[#3b82f6]" fill="#3b82f6" />
          <span className="text-[11px] text-ink-muted uppercase tracking-wider font-bold">AI Reasoning</span>
        </div>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-300 font-sans">
          {explanation}
        </p>
      </div>

      {/* 4. Key Insights */}
      <div className="py-4 pb-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Shield size={13} className="text-[#3b82f6]" />
          <span className="text-[11px] text-ink-muted uppercase tracking-wider font-bold">Key insights</span>
        </div>
        <ul className="space-y-2">
          {insights.slice(0, 3).map((insight, idx) => (
            <li key={idx} className="flex items-center gap-2.5 text-xs text-slate-300 leading-relaxed font-sans border-b border-border/20 pb-2 last:border-0 last:pb-0">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3b82f6]" />
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 5. Footer / Disclaimer */}
      <div className="pt-3 text-left">
        <span
          className="text-[10px] font-sans text-ink-faint/70"
          dangerouslySetInnerHTML={{
            __html: isLoaded
              ? `Data as of ${currentTime}`
              : `Data as of May 24, 2024 &bull; 10:30 AM ET`,
          }}
        />
      </div>
    </div>
  );
}

// ================= FEATURE ROW ITEM =================
interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

export function HeroFeatureItem({ icon, title, desc }: FeatureItemProps) {
  return (
    <div className="flex-1 flex items-start gap-3.5 min-w-[240px]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/5 text-brand">
        {icon}
      </div>
      <div>
        <h4 className="font-sans text-[13px] font-bold text-white leading-tight">{title}</h4>
        <p className="text-[12px] text-slate-400 mt-1 leading-relaxed font-sans">{desc}</p>
      </div>
    </div>
  );
}

// ================= MAIN HERO SECTION =================
export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  // Entrance animation transitions
  const leftColContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const entranceItem = {
    hidden: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section className="relative overflow-hidden w-full bg-[#05070c] text-[#f1f3f7] flex flex-col justify-center min-h-[calc(100vh-68px)] lg:min-h-[850px] border-b border-border/40">
      {/* 1. Interactive Background Chart + Ambient Radial Lighting */}
      <HeroBackgroundChart />

      {/* 2. Main content container */}
      <div className="relative z-10 w-full max-w-[1550px] mx-auto px-4 sm:px-8 lg:px-12 py-12 lg:py-24 flex items-center justify-center">
        <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-12 xl:gap-16">
          
          {/* Left Column - Product Proposition */}
          <motion.div
            variants={leftColContainer}
            initial="hidden"
            animate="visible"
            className="w-full lg:w-[54%] flex flex-col text-left"
          >
            {/* Eyebrow Label */}
            <motion.div variants={entranceItem} className="mb-5 sm:mb-6">
              <span className="inline-flex items-center gap-2 border border-brand/30 bg-brand/5 px-3.5 py-1.5 text-[11px] font-mono tracking-wider text-brand font-bold uppercase rounded-full h-8 w-fit backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                Live Market Intelligence
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.div variants={entranceItem}>
              <h1 className="font-sans text-[44px] sm:text-[68px] lg:text-[76px] xl:text-[84px] font-bold leading-[1.05] -tracking-[0.02em] text-white">
                Actionable market<br />
                intelligence.<br />
                <span className="text-brand">Powered by AI.</span>
              </h1>
            </motion.div>

            {/* Supporting Copy */}
            <motion.div variants={entranceItem} className="mt-5 sm:mt-6">
              <p className="text-slate-400 text-base sm:text-lg lg:text-[20px] leading-relaxed max-w-[620px] font-sans">
                Live prices, advanced technical indicators, transparent predictions, and risk scoring &mdash; all in one place.
              </p>
            </motion.div>

            {/* Call To Actions */}
            <motion.div
              variants={entranceItem}
              className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <Link
                href="/dashboard"
                className="group inline-flex h-14 items-center justify-center gap-3 px-8 rounded-lg bg-brand hover:bg-brand-strong text-black font-bold tracking-wide text-[14px] transition-all duration-150 hover:-translate-y-0.5 shadow-[0_0_20px_rgba(245,158,11,0.15)] focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-[#05070c] outline-none"
              >
                Open the Terminal
                <span className="font-mono text-base font-extrabold opacity-80 group-hover:translate-x-0.5 transition-transform">&gt;_</span>
              </Link>
              <Link
                href="/backtesting"
                className="group inline-flex h-14 items-center justify-center gap-3 px-8 rounded-lg border border-border bg-surface/25 hover:bg-surface/45 text-white font-bold tracking-wide text-[14px] transition-all duration-150 hover:border-ink-muted hover:-translate-y-0.5 focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-[#05070c] outline-none"
              >
                Explore Backtesting
                <BarChart3 size={16} className="text-white/70 group-hover:scale-105 transition-transform" />
              </Link>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              variants={entranceItem}
              className="flex flex-col sm:flex-row sm:flex-wrap md:flex-nowrap gap-6 md:gap-8 mt-12 border-t border-border/20 pt-8"
            >
              <HeroFeatureItem
                icon={<Zap size={18} />}
                title="Real-time data"
                desc="Live prices. No delays."
              />
              <div className="hidden sm:block w-px bg-border/20 shrink-0 self-stretch my-1" />
              <HeroFeatureItem
                icon={<Shield size={18} />}
                title="Transparent"
                desc="No black-box models."
              />
              <div className="hidden md:block w-px bg-border/20 shrink-0 self-stretch my-1" />
              <HeroFeatureItem
                icon={<LineChart size={18} />}
                title="Multi-asset"
                desc="Stocks, ETFs, Crypto & more."
              />
            </motion.div>

          </motion.div>

          {/* Right Column - Premium Stock Preview Panel */}
          <div className="w-full lg:w-[46%] flex items-center justify-center lg:justify-end">
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full flex justify-center lg:justify-end z-10"
            >
              <AssetAnalysisCard />
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
