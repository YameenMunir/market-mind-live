# Market Mind Live

Market Mind Live is a fintech market intelligence dashboard for stocks, ETFs, crypto, forex,
commodities, and indices. It brings together live quotes and charts, technical indicators, a
transparent rule-based prediction engine, risk scoring, strategy backtesting, and a Gemini-backed
AI Insights chat assistant in a single enterprise-grade dashboard UI.

> Live quotes are delayed and provided for informational purposes only. Nothing in this app is
> financial advice.

## Features

- **Live dashboard** - real-time-style price, market status (open/closed/pre-market/after-hours),
  and candlestick charts across multiple timeframes (1D through MAX), streamed over WebSocket with
  automatic REST-polling fallback.
- **Technical indicators** - SMA/EMA, RSI, MACD, Bollinger Bands, ATR, and support/resistance,
  computed server-side and explained in plain English.
- **Prediction engine** - a transparent, rule-based model (trend + momentum + volatility position)
  that outputs a bullish/bearish/neutral direction, a confidence score, and human-readable
  reasoning - not a black-box ML model, despite the "AI" framing in the UI.
- **Risk scoring** - annualized volatility, max drawdown, and a composite risk score/level per asset.
  Strategy backtesting - simulates a SMA-20/50 + MACD trend-following strategy over historical
  data, with an equity curve, win rate, and full trade log.
- **AI Insights assistant** - a Gemini-powered chat assistant grounded in the same live data shown
  on the dashboard (falls back to a deterministic mock provider if no Gemini API key is configured,
  so the feature works out of the box).
- **Price alerts** - browser-notification alerts on price/RSI/signal/risk-level conditions.
- **Multi-currency display** - convert prices/charts/backtests to your preferred display currency
  via live FX rates.

## Tech stack

**Backend** (`backend/`)
- Python 3.12, [FastAPI](https://fastapi.tiangolo.com/) + Uvicorn
- [yfinance](https://github.com/ranaroussi/yfinance) - the only external market data source (no
  API key required); wrapped behind an abstract `MarketDataProvider` so a paid vendor can be
  swapped in later
- Pydantic / pydantic-settings for schemas and config
- In-memory TTL caching + sliding-window rate limiting (no database)
- WebSockets for the live data feed
- Google Gemini (via `httpx`, no SDK dependency) for the AI Insights assistant, with a
  deterministic mock fallback

**Frontend** (`frontend/`)
- [Next.js 16](https://nextjs.org/) (App Router, Turbopack), React 18, TypeScript
- Tailwind CSS with a semantic design-token system (dark/light mode)
- `lightweight-charts` for candlestick charts, `recharts` for the backtest equity curve
- Framer Motion for transitions, `lucide-react` for icons

## Project structure

```
backend/
  api/            # thin FastAPI routers
  services/       # business logic (price, indicators, prediction, risk, AI insights, live hub, ...)
  data/           # market data provider abstraction + yfinance implementation
  prediction/     # rule-based prediction engine
  backtesting/    # strategy backtest engine
  models/         # Pydantic schemas (single source of truth for API shapes)
  utils/          # caching, rate limiting, error handling

frontend/
  src/app/        # Next.js App Router pages (dashboard, backtesting, settings, marketing site)
  src/components/ # reusable UI (design-system primitives + dashboard cards/panels)
  src/hooks/      # live data, AI chat, alerts, chart preferences, etc.
  src/lib/        # API client, formatting helpers, design tokens/constants
  src/charts/     # chart wrapper components
```

## Getting started

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows; `source venv/Scripts/activate` in git-bash
pip install -r requirements.txt
copy .env.example .env         # `cp` on macOS/Linux - see comments inside for what each setting does
uvicorn main:app --reload      # http://localhost:8000, health check at /api/health
```

No API key is required to run the backend - yfinance needs none, and the AI Insights assistant
automatically falls back to a mock provider if `GEMINI_API_KEY` is unset.

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

Copy `frontend/.env.local.example` to `frontend/.env.local` if you need to point at a
non-default backend URL (`NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_WS_BASE_URL`, both default to
`localhost:8000`).

### Useful commands

```bash
# Backend
python -c "import main"        # sanity-check the app imports cleanly

# Frontend
npm run build                  # production build (also runs the TypeScript check)
npx tsc --noEmit                # typecheck only, faster than a full build
```

## Dependency management & CI

- **`.github/workflows/ci.yml`** - fast correctness gate on every push/PR to `main`: frontend
  typecheck + build, backend import sanity check.
- **`.github/workflows/dependency-check.yml`** - dependency health: outdated-package reports
  (informational, never fails the build), a security audit (`npm audit` / `pip-audit`, which
  *does* fail the build on high/critical findings), and a re-run of lint/build/tests so a bad
  dependency update is caught before merging. Runs on push/PR to `main` and weekly, so staleness
  and vulnerabilities surface even with no open PRs.
- **`.github/dependabot.yml`** - opens PRs weekly for outdated npm (`frontend/`), pip (`backend/`),
  and GitHub Actions dependencies. Minor/patch bumps are grouped into one PR per ecosystem to cut
  down on noise; major version bumps always get their own PR for individual review rather than
  being silently grouped in. Dependabot's separate *security* updates (which open a PR immediately
  when a vulnerability is disclosed, regardless of schedule) are a repo-level toggle under
  **Settings -> Code security -> Dependabot** rather than something set in `dependabot.yml` itself.

## Disclaimer

This project is for educational/informational purposes. Market data is delayed, predictions are
generated by a transparent rule-based heuristic (not a trained ML model), and nothing here
constitutes financial advice.
