import type { AIAssetContext } from "@/types";

export interface ProvenanceSummary {
  /** Short labels for what actually grounded a reply, e.g. "Live quote", "3 news
   * articles" - derived purely from which parts of the real context were populated,
   * mirroring lib/indicatorInsights.ts's "every claim cites its own number" pattern. */
  sources: string[];
  missingData: string[];
  asOf: string | null;
}

/** Pure summary of an `AIAssetContext` for display alongside the chat reply it
 * grounded - never invents a source that wasn't actually present in the context. */
export function summarizeProvenance(context: AIAssetContext): ProvenanceSummary {
  const sources: string[] = [];

  if (context.latest_price !== null) sources.push("Live quote");
  if (context.technical_indicators) sources.push("Technical indicators");
  if (context.prediction) sources.push("Prediction model");
  if (context.risk) sources.push("Risk score");
  if (context.backtesting?.available) sources.push("Backtest results");
  if (context.news.length > 0) {
    sources.push(`${context.news.length} news ${context.news.length === 1 ? "article" : "articles"}`);
  }
  if (context.rating_changes.length > 0) {
    sources.push(`${context.rating_changes.length} analyst rating${context.rating_changes.length === 1 ? "" : "s"}`);
  }
  if (context.comparison) sources.push(`${context.comparison.asset} comparison`);

  return { sources, missingData: context.missing_data, asOf: context.last_updated };
}
