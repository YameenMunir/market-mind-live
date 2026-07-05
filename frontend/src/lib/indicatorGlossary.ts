/** Maps IndicatorPanel's `insight.key` values (see lib/indicatorInsights.ts) to
 * backend/services/knowledge_base.py article ids. The four moving-average rows all
 * point at the same `moving_averages` article; everything else is a 1:1 name match. */
export const GLOSSARY_ID_BY_INDICATOR_KEY: Record<string, string> = {
  rsi: "rsi",
  sma_20: "moving_averages",
  sma_50: "moving_averages",
  sma_200: "moving_averages",
  ema: "moving_averages",
  macd: "macd",
  bollinger: "bollinger",
  atr: "atr",
};

/** Support/Resistance aren't rendered from `insight.key` (they're static rows), and the
 * `atr` article already covers this topic. */
export const SUPPORT_RESISTANCE_GLOSSARY_ID = "atr";
