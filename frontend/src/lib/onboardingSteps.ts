export interface OnboardingStep {
  id: string;
  /** CSS selector for the `data-tour` attribute this step highlights. */
  selector: string;
  title: string;
  body: string;
  /** Preferred popover side - OnboardingTour flips it if there isn't room. */
  placement: "top" | "bottom";
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "asset-search",
    selector: '[data-tour="asset-search"]',
    title: "Search any asset",
    body: "Look up any stock, ETF, crypto, forex pair, commodity, or index by symbol or name to load its live dashboard.",
    placement: "bottom",
  },
  {
    id: "view-menu",
    selector: '[data-tour="view-menu"]',
    title: "Customize your view",
    body: "Switch between Simple and Advanced view, go fullscreen, hide the sidebar, or replay this tour - all from here.",
    placement: "bottom",
  },
  {
    id: "stat-cards",
    selector: '[data-tour="stat-cards"]',
    title: "At a glance",
    body: "Live price and the model's prediction, always on. Switch to Advanced view (View menu, above) to add market session status, analyst consensus, and a risk score.",
    placement: "bottom",
  },
  {
    id: "live-chart",
    selector: '[data-tour="live-chart"]',
    title: "Interactive chart",
    body: "Explore price history across timeframes, toggle moving average and Bollinger Band overlays, and try the price predictor forecast.",
    placement: "top",
  },
  {
    id: "indicator-panel",
    selector: '[data-tour="indicator-panel"]',
    title: "Technical indicators",
    body: "A full breakdown of RSI, MACD, moving averages, and more. Hover the small (i) icon next to any label for a plain-English explanation of what it means. Advanced view only.",
    placement: "top",
  },
  {
    id: "beginner-explanation",
    selector: '[data-tour="beginner-explanation"]',
    title: "Plain-English summary",
    body: "Not sure how to read all the numbers above? This panel explains what the model thinks and why, written for newcomers. Switch to Advanced view for a deeper technical explanation alongside it.",
    placement: "top",
  },
  {
    id: "ai-insights-button",
    selector: '[data-tour="ai-insights-button"]',
    title: "Ask the AI assistant",
    body: "Have a question about anything on this page? Open the AI Insights chat and ask - it's grounded in exactly what you're looking at.",
    placement: "bottom",
  },
];
