"use client";

import { useEffect, useState } from "react";

import { PredictionCard } from "@/components/PredictionCard";
import { PriceCard } from "@/components/PriceCard";
import { StatusBanner } from "@/components/StatusBanner";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PredictionResult, PriceQuote } from "@/types";

const PREVIEW_SYMBOL = "AAPL";

/** Renders the marketing pages' hero/product visual from the actual `PriceCard`/
 * `PredictionCard` components fed by one real, one-shot REST fetch - not a bespoke
 * mockup with its own colors and, on failure, invented numbers. This guarantees the
 * marketing page can never visually drift from the real dashboard again: a future
 * change to either card flows here automatically. Deliberately a single fetch, not
 * `useLiveSnapshot`'s WebSocket subscription - anonymous marketing traffic doesn't
 * need a live socket, and opening one from every landing-page visit would be needless
 * backend load with no product benefit. Wrapped in its own `CurrencyProvider` since
 * these cards read `useCurrencyContext()` and the marketing routes (outside the
 * `(app)` route group) don't otherwise have one in their tree. */
function DashboardPreviewInner({ className }: { className?: string }) {
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getQuote(PREVIEW_SYMBOL), api.getPrediction(PREVIEW_SYMBOL)])
      .then(([quoteResult, predictionResult]) => {
        if (cancelled) return;
        setQuote(quoteResult);
        setPrediction(predictionResult);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <div className={cn("flex min-h-[220px] items-center justify-center", className)}>
        <StatusBanner
          message="Live preview is temporarily unavailable. The dashboard itself is unaffected."
          tone="muted"
          icon="clock"
        />
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      <PriceCard quote={quote} symbol={PREVIEW_SYMBOL} />
      <PredictionCard prediction={prediction} isLoading={!prediction} />
    </div>
  );
}

export function DashboardPreview({ className }: { className?: string }) {
  return (
    <CurrencyProvider>
      <DashboardPreviewInner className={className} />
    </CurrencyProvider>
  );
}
