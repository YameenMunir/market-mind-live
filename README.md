# Market Mind Live

Market Mind Live is a fintech market intelligence dashboard for stocks, ETFs, crypto, forex,
commodities, and indices. It brings together live quotes and charts, technical indicators, a
transparent rule-based prediction engine, risk scoring, strategy backtesting, and a Gemini-backed,
streaming AI Insights chat assistant in a single enterprise-grade dashboard UI.

> Live quotes are delayed and provided for informational purposes only. Nothing in this app is
> financial advice.

## Features

- **Live dashboard** - real-time-style price, market status (open/closed/pre-market/after-hours),
  and candlestick charts across 12 timeframes (1D, 5D, 1W, 2W, 1M, 3M, 6M, YTD, 1Y, 2Y, 5Y, MAX -
  each mapped server-side to the right bar resolution and cache freshness for that range), streamed
  over WebSocket with automatic REST-polling fallback. Resumes on whichever symbol you were last
  viewing (persisted locally) rather than always reopening on a fixed default.
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
  the two are directly comparable. A companion **rating changes** feed
  (`/api/analysts/{symbol}/rating-changes`) surfaces the individual upgrade/downgrade/initiated/
  reiterated events behind that aggregate (firm, from/to grade, date) - more actionable than the
  static snapshot alone, and also fed into the AI Insights context.
- **AI Insights assistant** - a Gemini-powered chat assistant grounded in the same live data shown
  on the dashboard (falls back to a deterministic mock provider if no Gemini API key is configured,
  so the feature works out of the box). Replies stream in token-by-token over Server-Sent Events as
  they're actually generated (not a simulated typewriter effect over an already-complete response),
  rendered as full markdown - headings, bullet/numbered lists, tables, links, bold/italic, code
  blocks - with a **Stop generating** control, one-click **Regenerate response** on the latest reply,
  and contextual follow-up question chips tailored to whatever hasn't come up yet in the
  conversation (all heuristic, no extra model call).
- **News feed** - recent per-symbol headlines (publisher, timestamp, link) sourced from Yahoo via
  yfinance, cached and served from `/api/news/{symbol}`. Also fed into the AI Insights context so
  the assistant can answer questions grounded in real headlines, not just price/indicator data.
- **Price alerts** - browser-notification alerts on price/RSI/signal/risk-level conditions,
  persisted per-browser so they survive a refresh without requiring a login.
- **Multi-currency display** - convert prices/charts/backtests to your preferred display currency
  via live FX rates.
- **Simple/Advanced experience mode** - a per-device toggle that adapts how much detail the
  dashboard surfaces, remembered server-side across sessions.
- **First-run onboarding tour** - a guided walkthrough of the dashboard's key panels for new users,
  restartable any time from the view menu.
- **Marketing site** - a public landing page, About page, and Privacy/Terms pages, with a responsive
  Navbar (desktop nav + mobile hamburger menu, active-route highlighting) shared across them. Several
  "3D" visualizations (market globe, backtesting simulation, candlestick/network/product previews) are
  CSS/SVG-driven, not WebGL - no three.js or similar dependency is required.
- **Installable PWA** - a web app manifest + service worker let the dashboard be installed to a
  phone/desktop home screen ("Add to Home Screen"/"Install app"). The service worker deliberately
  does not cache API responses or live data (a cached stock quote would be misleading) - it only
  enables installability and shows a friendly offline page if navigation fails with no connection.
- **Mobile-friendly** - a dedicated bottom tab bar + sidebar collapse on the dashboard, touch-sized
  interactive elements, and safe-area-aware layout for notched phones.

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
  deterministic mock fallback and genuine token-by-token streaming (Server-Sent Events) for both -
  a cancelled/interrupted stream still persists whatever partial reply was generated

**Frontend** (`frontend/`)
- [Next.js 16](https://nextjs.org/) (App Router, Turbopack), React 18, TypeScript
- Sora (display/UI text) + JetBrains Mono (data values, uppercase/tracked labels) via
  `next/font/google` - a deliberately geometric, technical pairing over a generic humanist sans,
  see `frontend/DESIGN_SYSTEM.md`
- Tailwind CSS with a semantic design-token system (dark/light mode, persisted choice shared live
  across every mounted component via `useSyncExternalStore`, with the OS-level preference as the
  first-visit default before any explicit choice is made)
- `lightweight-charts` for candlestick charts, `recharts` for the backtest equity curve
- `react-markdown` + `remark-gfm` for AI chat responses (no raw HTML, no `dangerouslySetInnerHTML`)
- Framer Motion for transitions, `lucide-react` for icons
- Vitest + React Testing Library for component/hook/unit tests

## Project structure

```
backend/
  api/            # thin FastAPI routers
  services/       # business logic (price, indicators, prediction, risk, news, AI insights, live hub, ...)
  data/           # market data provider abstraction + yfinance implementation
  prediction/     # rule-based prediction engine
  backtesting/    # strategy backtest engine
  models/         # Pydantic schemas (single source of truth for API shapes)
  db/             # SQLModel session/models (alerts, chat, prediction history, settings)
  migrations/     # Alembic migrations, run automatically at startup
  utils/          # caching, rate limiting, error handling

frontend/
  src/app/        # Next.js App Router pages: dashboard/backtesting/settings (app group) +
                  #   marketing site (landing, about, privacy, terms) with a shared Navbar
  src/components/ # reusable UI (design-system primitives, dashboard cards/panels, Navbar,
                  #   CSS/SVG "3D" visualizations for the marketing site)
  src/hooks/      # live data, AI chat, alerts, chart preferences, onboarding tour, etc.
  src/lib/        # API client, formatting helpers, design tokens/constants
  src/charts/     # chart wrapper components (candlestick + equity curve)
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
pip install -r requirements-dev.txt && pytest   # run the backend test suite

# Frontend
npm run build                  # production build (also runs the TypeScript check)
npx tsc --noEmit                # typecheck only, faster than a full build
npm run test                    # run the Vitest suite
```

## Contributing

Have an idea for a new feature? This repo is not open-source (see [License](#license) below),
but contributions back to it are still welcome via pull request:

1. Fork the repo and create a branch off `main` (e.g. `feat/short-description`) - forking for the
   purpose of submitting a PR back to this repository is fine; the license restrictions below are
   about independent reuse/redistribution, not about contributing here.
2. Make your changes, following the conventions in `CLAUDE.md` (project structure, where new
   backend errors/schemas/API calls belong, semantic Tailwind tokens, etc.).
3. Verify before pushing:
   - Backend: `python -c "import main"` and, if relevant, `pytest` (`backend/requirements-dev.txt`).
   - Frontend: `npx tsc --noEmit`, `npm run build`, and `npm run test`.
4. Open a PR against `main` describing the feature/suggestion and why it's useful - a small PR
   with a clear rationale is easier to review than a large one bundling multiple ideas.

Not ready to write code? Open a [GitHub issue](https://github.com/YameenMunir/market-mind-live/issues)
describing the feature suggestion instead.

## License

Copyright (c) 2026 Yameen Munir. All rights reserved - see [LICENSE](LICENSE). This repository is
publicly visible for portfolio/demonstration purposes; it is **not** open-source. Browsing or
cloning the code does not grant any license to use, copy, modify, distribute, or build on it -
see the Contributing section above for the one carve-out (submitting a PR back to this repo).

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
