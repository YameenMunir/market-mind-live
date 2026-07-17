import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, BarChart3, LineChart, Shield, Zap } from "lucide-react";

import { BUTTON_SIZE_STYLES, BUTTON_VARIANT_STYLES } from "@/components/Button";
import { DashboardPreview } from "@/components/marketing/DashboardPreview";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";

interface FeatureItemProps {
  icon: ReactNode;
  title: string;
  desc: string;
}

function HeroFeatureItem({ icon, title, desc }: FeatureItemProps) {
  return (
    <div className="flex min-w-[220px] flex-1 items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-brand/20 bg-brand/5 text-brand">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-semibold leading-tight text-ink">{title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{desc}</p>
      </div>
    </div>
  );
}

// No "use client" here - Reveal and DashboardPreview are themselves client
// components, so this stays a server component and ships no extra JS of its own
// (see Reveal.tsx's own doc comment on why that split exists).
export function HeroSection() {
  return (
    <section className="border-b border-border bg-canvas">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center lg:gap-8">
          <div className="lg:col-span-7">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-sm border border-brand/30 bg-brand/5 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-brand">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                Live market intelligence
              </span>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.25rem]">
                Market intelligence you can verify.
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
                Live prices, technical indicators, transparent rule-based predictions, and risk
                scoring for stocks, ETFs, crypto, forex, commodities, and indices - plus an AI
                research assistant that shows its sources instead of asserting answers.
              </p>
            </Reveal>

            <Reveal delay={0.15} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className={cn(
                  BUTTON_VARIANT_STYLES.primary,
                  BUTTON_SIZE_STYLES.lg,
                  "group inline-flex items-center justify-center gap-2 px-6"
                )}
              >
                Open Dashboard
                <ArrowUpRight
                  size={15}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
              <Link
                href="/backtesting"
                className={cn(
                  BUTTON_VARIANT_STYLES.secondary,
                  BUTTON_SIZE_STYLES.lg,
                  "inline-flex items-center justify-center gap-2 px-6"
                )}
              >
                Explore Backtesting
                <BarChart3 size={15} />
              </Link>
            </Reveal>

            <Reveal delay={0.2} className="mt-10 flex flex-col gap-5 border-t border-border pt-8 sm:flex-row sm:flex-wrap">
              <HeroFeatureItem
                icon={<Zap size={16} />}
                title="Continuously refreshed"
                desc="Quotes and charts update while markets are open, with clear delayed and closed states otherwise."
              />
              <HeroFeatureItem
                icon={<Shield size={16} />}
                title="Transparent by design"
                desc="Every prediction shows the indicators and reasoning behind it, not a black-box model."
              />
              <HeroFeatureItem
                icon={<LineChart size={16} />}
                title="Six asset classes"
                desc="Stocks, ETFs, crypto, forex, commodities, and indices in one dashboard."
              />
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={0.1}>
              <DashboardPreview />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
