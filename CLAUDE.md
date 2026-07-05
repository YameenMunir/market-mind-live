# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Market Mind Live is a fintech market intelligence dashboard: live quotes/charts, technical indicators, a
rule-based prediction engine, risk scoring, strategy backtesting, and a Gemini-backed AI Insights chat
assistant, across stocks/ETFs/crypto/forex/commodities/indices. Two independent apps in one repo:

- `backend/` - FastAPI + yfinance, Python 3.12, no database (in-memory caches/stores only).
- `frontend/` - Next.js 16 (App Router, Turbopack) + React 18 + TypeScript + Tailwind.

## Commands

### Backend (`backend/`)
```bash
python -m venv venv
venv\Scripts\activate            # Windows; `source venv/Scripts/activate` in git-bash
pip install -r requirements.txt
uvicorn main:app --reload        # http://localhost:8000, health check at /api/health
```
No test suite or linter is configured for the backend. Sanity-check changes by importing the app
(`python -c "import main"`) and/or hitting endpoints with `curl` against a running `uvicorn` instance.

### Frontend (`frontend/`)
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (also runs the TypeScript check)
npm run start    # serve a production build
npx tsc --noEmit # typecheck only, faster than a full build
```
`npm run lint` (`next lint`) is currently broken in this repo (ESLint flat-config/eslintrc circular
reference in `next lint`'s internal config loading) - it errors out even with no code changes. Don't rely on
it; `npx tsc --noEmit` and `npm run build` are the real correctness checks. No test suite is configured
(only stray `playwright`/`playwright-core` packages exist in a root-level `node_modules/` with no
associated config or spec files - not a working test setup, ignore it).

### Environment
Copy `backend/.env.example` to `backend/.env` before running the backend. Key settings (see
`backend/config.py` for the full list, all overridable via env vars):
- `CORS_ORIGINS` - must include the frontend origin (default `http://localhost:3000`).
- `GEMINI_API_KEY` / `GEMINI_MODEL` - AI Insights Assistant. If unset, the assistant automatically falls
  back to a deterministic mock provider (`services/mock_ai_provider.py`) - the feature works without a key.
- Frontend reads `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_WS_BASE_URL` (default to `localhost:8000`).

## Architecture

### Backend request flow
`api/*.py` routers are thin - they call into `services/*.py`, which call `data/yfinance_provider.py`
(wraps `yfinance`, the only external market data source, no API key required). Everything funnels through
`services/price_service.py`, which adds a TTL cache (`utils/cache.py: TTLCache`) and a per-symbol sliding-window
rate limiter before hitting yfinance - **always fetch history/quotes through `price_service`**, never call
the provider directly, or you'll bypass caching and rate limiting.

- `data/provider.py` - abstract `MarketDataProvider` so a paid vendor can replace yfinance later without
  touching services/API layers. `infer_asset_type()` guesses asset type from symbol suffix (`^`=index,
  `=X`=forex, `=F`=commodity, `-USD`/`-USDT`/`-EUR`=crypto, else stock).
- `data/symbols.py` - static curated symbol directory backing asset *search* (`/api/assets/search`).
  yfinance has no search endpoint; live quotes/candles for any chosen symbol still come from yfinance
  directly regardless of whether it's in this directory.
- `services/indicator_service.py` - pure functions computing SMA/EMA/RSI/MACD/Bollinger/ATR/support-resistance
  from a `pandas.DataFrame`; `prediction/engine.py` and `services/risk_service.py` consume its output.
- `prediction/engine.py` - transparent rule-based scoring (trend + momentum + volatility position), **not**
  a black-box ML model, despite "AI/ML predictions" language in some docs/UI copy. Outputs direction
  (bullish/bearish/neutral), confidence, and plain-English reasoning strings.
- `prediction/history_store.py` - in-memory (resets on restart) per-symbol prediction log, capped at 100
  entries; swap for a real DB table if predictions need to survive restarts.
- `backtesting/engine.py` - simulates exactly one strategy (long when SMA-20 > SMA-50 and MACD histogram >
  0, flat otherwise) over historical bars. Not a general backtesting framework.
- `services/live_hub.py` (`LiveDataHub`) - one background asyncio poller per actively-*subscribed* symbol,
  shared across every connected WebSocket client watching that symbol, so N viewers cost exactly 1 upstream
  yfinance poll. Quote/market-status poll cadence adapts per symbol to its own market session
  (`hub_quote_interval_open/extended/closed_seconds` via `_base_interval_for_session()`) - fast while that
  market is open, slower pre/post-market, much slower while fully closed, since yfinance has no push/
  streaming API or documented rate limit and hammering it at a fixed fast interval around the clock risks
  a soft IP ban. Indicators/prediction/risk refresh far less often (`hub_indicator_interval_seconds`) since
  they're derived from daily bars. Idles out and cancels its own task after `hub_idle_shutdown_seconds` with
  no subscribers; `main.py`'s lifespan handler cancels all remaining pollers on shutdown (and logs the active
  provider/poll-cadence/Gemini-key config at startup). `api/ws.py` is a thin serializer over this hub's
  snapshot state - it does not fetch data itself.
- `data/yfinance_provider.py` retries transient network failures (`_call_with_retry`, exponential backoff +
  jitter, `provider_max_retries`/`provider_retry_base_delay_seconds`) before raising `NetworkError`. A real
  `YFRateLimitError` from yfinance is handled differently - it is never retried (that would only make an
  active rate limit worse); instead it starts a module-level cooldown (`provider_rate_limit_cooldown_seconds`)
  that makes *every* symbol's calls short-circuit into `RateLimitedError` immediately, since Yahoo's
  undocumented throttling is IP-wide rather than per-symbol - one rate-limited symbol means they all are.
  `services/price_service.py` layers a matching global `RateLimiter` (`provider_global_rate_limit_per_minute`)
  alongside the existing per-symbol one for the same IP-wide reason. `get_quotes_batch()` fetches multiple
  symbols via one shared `yf.Tickers` session rather than one `yf.Ticker()` per symbol (yfinance has no true
  single-request multi-symbol quote endpoint); `price_service.get_quotes_batch()` wraps it with the same
  per-symbol cache `get_quote()` uses, and it's exposed at `GET /api/prices/batch/quotes?symbols=A,B,C` for
  watchlist-style multi-symbol lookups.
- `utils/errors.py` - all domain errors are `AppError` subclasses with a `status_code` + `ErrorCode` enum
  member, registered via a single global exception handler in `main.py`. Add new failure modes as new
  `AppError` subclasses here (and a matching `ErrorCode` value in `models/schemas.py`), not ad-hoc
  `HTTPException`s.
- `models/schemas.py` - single source of truth for every Pydantic model shared across routers/services;
  frontend `types/index.ts` is a hand-maintained TypeScript mirror of these (snake_case field names
  preserved, no case conversion at the API boundary).

### AI Insights Assistant (backend)
Self-contained subsystem under `api/ai_insights.py` + `services/{ai_insights_service,context_builder,
gemini_service,mock_ai_provider,chat_store,knowledge_base}.py`:
- `context_builder.py` builds a structured `AIAssetContext` from the *same* services the rest of the API
  uses (so the assistant's view of an asset matches the dashboard), recording any fetch failures into
  `missing_data` instead of raising - the assistant should say what's missing rather than crash or invent data.
- `ai_insights_service.resolve_context()` prefers a `client_context` sent by the frontend (exactly what's
  rendered on screen) over rebuilding context server-side, to avoid the assistant contradicting the UI.
- `gemini_service.py` calls the Gemini REST `generateContent` endpoint directly via `httpx` (no
  `google-generativeai` SDK dependency). `mock_ai_provider.py` is a deterministic, keyword-intent-routed
  fallback used whenever `GEMINI_API_KEY` is unset *or* a live Gemini call fails - always grounded in the
  same `AIAssetContext`, never a hard error for the end user except on a genuine rate limit.
- `knowledge_base.py` is a keyword-retrieval "RAG" layer (no embeddings/vector DB) of static articles on
  indicator/risk/backtest methodology, injected into the Gemini system prompt when relevant.
- `chat_store.py` holds sessions/history/feedback in memory only; feedback is captured for future manual
  review, never used to auto-retrain or auto-alter prompts.

### Frontend
App Router with a route group: `src/app/(app)/{dashboard,backtesting,settings}` share
`src/app/(app)/layout.tsx` (Sidebar + MobileNav chrome); `src/app/page.tsx` is the public marketing landing
page outside that group.

- `hooks/useLiveSnapshot.ts` is the dashboard's single source of live truth - one WebSocket connection to
  `/ws/live/{symbol}` driving quote/status/indicators/prediction/risk together, with automatic REST-polling
  fallback (`api.getQuote`/`getMarketStatus` fast poll, `getIndicators`/`getPrediction`/`getRisk` slow poll)
  if the socket can't connect or drops repeatedly (3 retries then permanent fallback for that mount).
- `lib/api.ts` is the only place that calls `fetch` - a single `request<T>()` wrapper that throws typed
  `ApiError` (matching backend `ErrorCode` values) on any non-2xx response. Always add new backend calls
  here rather than calling `fetch` directly from components.
- `lib/aiContext.ts` mirrors `backend/services/context_builder.py`'s shape client-side, building an
  `AIAssetContext` from whatever the current page already has in state (quote/indicators/prediction/risk/
  backtest) - this is the `client_context` sent to `/api/ai/insights/chat`, keeping the assistant's grounding
  in sync with what's rendered rather than a freshly re-fetched (possibly different) value.
- `hooks/useAIChat.ts` persists a chat session id in `sessionStorage` (`mml-ai-session-id`) so navigating
  between dashboard/backtesting keeps the same conversation.
- Design tokens live in `styles/globals.css` (CSS custom properties, e.g. `--color-brand`) mapped into
  Tailwind's `theme.extend.colors` in `tailwind.config.ts` (e.g. `bg-canvas`, `text-ink-muted`, `bg-bull`/
  `bg-bear` for directional color). Dark/light mode toggles the `.light` class on `<html>`
  (`hooks/useTheme.ts`); `darkMode: "class"` in the Tailwind config. Prefer these semantic color tokens
  over raw Tailwind palette classes to stay consistent with the existing UI.
- `components/Panel.tsx` is the standard card container (`eyebrow`/`title`/`action` header slots) used
  throughout the dashboard - reach for it instead of a bespoke `<div>` when adding a new dashboard card.
