# Market Mind Live

Market Mind Live is a fintech market intelligence dashboard for stocks, ETFs, crypto, forex,
commodities, and indices. It brings together live quotes and charts, technical indicators, a
transparent rule-based prediction engine, risk scoring, strategy backtesting, and a Gemini-backed
AI Insights chat assistant in a single enterprise-grade dashboard UI.

> Live quotes are delayed and provided for informational purposes only. Nothing in this app is
> financial advice.

## Features

- **Live dashboard** - real-time-style price, market status (open/closed/pre-market/after-hours),
  and candlestick charts across 12 timeframes (1D, 5D, 1W, 2W, 1M, 3M, 6M, YTD, 1Y, 2Y, 5Y, MAX -
  each mapped server-side to the right bar resolution and cache freshness for that range), streamed
  over WebSocket with automatic REST-polling fallback.
- **Technical indicators** - SMA/EMA, RSI, MACD, Bollinger Bands, ATR, and support/resistance,
  computed server-side and explained in plain English.
- **Prediction engine** - a transparent, rule-based model (trend + momentum + volatility position)
  that outputs a bullish/bearish/neutral direction, a confidence score, and human-readable
  reasoning - not a black-box ML model, despite the "AI" framing in the UI.
- **Risk scoring** - annualized volatility, max drawdown, and a composite risk score/level per asset.
  Strategy backtesting - simulates a SMA-20/50 + MACD trend-following strategy over historical
  data, with an equity curve, win rate, and full trade log.
- **Analyst consensus** - buy/hold/sell breakdown and price targets sourced from Yahoo's analyst
  coverage, collapsed into the same bullish/neutral/bearish shape as the app's own prediction so
  the two are directly comparable.
- **AI Insights assistant** - a Gemini-powered chat assistant grounded in the same live data shown
  on the dashboard (falls back to a deterministic mock provider if no Gemini API key is configured,
  so the feature works out of the box).
- **Price alerts** - browser-notification alerts on price/RSI/signal/risk-level conditions,
  persisted per-browser so they survive a refresh without requiring a login.
- **Multi-currency display** - convert prices/charts/backtests to your preferred display currency
  via live FX rates.
- **Simple/Advanced experience mode** - a per-device toggle that adapts how much detail the
  dashboard surfaces, remembered server-side across sessions.
- **First-run onboarding tour** - a guided walkthrough of the dashboard's key panels for new users,
  restartable any time from the view menu.

## Tech stack

**Backend** (`backend/`)
- Python 3.12, [FastAPI](https://fastapi.tiangolo.com/) + Uvicorn
- [yfinance](https://github.com/ranaroussi/yfinance) - the only external market data source (no
  API key required); wrapped behind an abstract `MarketDataProvider` so a paid vendor can be
  swapped in later
- Pydantic / pydantic-settings for schemas and config
- SQLite (via SQLModel + Alembic migrations) for alerts, AI chat sessions, prediction history, and
  per-device settings - everything else (quotes, candles, indicators, etc.) is in-memory TTL-cached
  only, with sliding-window rate limiting and escalating cooldowns in front of the upstream provider
  to absorb bursty traffic without tripping Yahoo's own rate limits
- Anonymous per-browser device IDs (no login) scope alerts/chat/settings to "this browser"
- WebSockets for the live data feed, with one shared background poller per actively-watched symbol
  (N viewers of the same symbol cost exactly one upstream poll)
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
  db/             # SQLModel session/models (alerts, chat, prediction history, settings)
  migrations/     # Alembic migrations, run automatically at startup
  utils/          # caching, rate limiting, error handling

frontend/
  src/app/        # Next.js App Router pages: dashboard/backtesting/settings (app group) +
                  #   marketing site (landing, about, contact, privacy, terms)
  src/components/ # reusable UI (design-system primitives + dashboard cards/panels)
  src/hooks/      # live data, AI chat, alerts, chart preferences, onboarding tour, etc.
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

## Deployment

The frontend and backend deploy independently:

- **Backend -> [Render](https://render.com)**. `render.yaml` at the repo root is a Render
  Blueprint - importing this repo as a Blueprint auto-configures the `market-mind-backend` web
  service (build/start commands, health check at `/api/health`, Python version) and prompts only
  for `CORS_ORIGINS` (set it to your deployed frontend's origin, comma-separated if there's more
  than one). Set `GEMINI_API_KEY` there too if you want live AI Insights instead of the mock
  provider. Vercel isn't suitable for this service - it needs a persistent process for the
  WebSocket live feed, the background per-symbol pollers, and the SQLite file, none of which
  survive on a stateless serverless platform.
- **Frontend -> [Vercel](https://vercel.com)**. Import the repo, set the project's root directory
  to `frontend/`, and set `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_WS_BASE_URL` (the latter using
  `wss://`) to the deployed Render URL before the first build - these are inlined into the client
  bundle at build time, so changing them later requires a redeploy.

After both are live, double-check `CORS_ORIGINS` on Render matches the exact Vercel origin
(no trailing slash) - a mismatch surfaces as a CORS error in the browser console rather than an
obvious backend failure.

## Disclaimer

This project is for educational/informational purposes. Market data is delayed, predictions are
generated by a transparent rule-based heuristic (not a trained ML model), and nothing here
constitutes financial advice.
