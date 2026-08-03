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

## Strengths & Challenges

### Strengths
- **Resilient and Paced Data Pipeline**: Incorporates custom `ThrottlingRateLimiter` pacing at both global and per-symbol levels combined with 24-hour cache fallbacks for quotes, candles, and historical data. If the upstream provider is rate-limiting the server or encounters a network issue, the system gracefully falls back to serving stale/cached values labeled `is_stale=True` rather than presenting errors to the user.
- **Resource-Efficient Connection Pooling (LiveDataHub)**: The `LiveDataHub` manages one background poller task per active symbol, shared by all WebSocket subscribers. Whether 1 or 1,000 users watch a symbol, it consumes exactly one upstream request, preventing unnecessary server-side load. Pacing adaptively slows down during pre/post-market sessions and when the market is closed.
- **Fast Parallel Batch Lookups**: Tickers in watchlist/batch requests are fetched concurrently using a thread pool (`ThreadPoolExecutor`), significantly decreasing latency compared to sequential queries.
- **Privacy-First, Account-Less Persistence**: Interactive features like price alerts and chat histories persist per-device in a SQLite database via SQLModel/Alembic, allowing users to configure alerts and hold conversation sessions without needing to sign up or log in.
- **SSE Streaming AI Insights**: Chat insights are streamed token-by-token over Server-Sent Events from Gemini (or a deterministic keyword-based mock fallback), complete with markdown formatting and control hooks (e.g. stop generation, regenerate).
- **Premium Design System & Responsive Layout**: Features custom theme-synchronized charts (built on `lightweight-charts` and `recharts`), clean geometric typography (Sora and JetBrains Mono), a responsive layout with custom mobile bottom tab navigation, and lightweight CSS/SVG animations without three.js overhead.

### Challenges
- **Keyless Unofficial API Constraints**: Using `yfinance` means the application relies on unofficial Yahoo Finance scraping endpoints that do not guarantee high rate limits or official SLA. This requires strict client-side pacing and fallback handling to maintain stability.
- **IP-Wide Throttling**: Yahoo's rate limiting is IP-wide rather than per-symbol. If one symbol is throttled, the entire server IP faces a cooldown, making global caching and parallel request deduplication critical.
- **Stateless Cloud Hosting Limitations**: Because the backend maintains WebSocket connections, active pollers, and a SQLite database, it requires persistent server resources (like Render) and cannot easily run on serverless platforms (like Vercel or AWS Lambda) without using an external database and a separate WebSocket gateway.
- **High-Frequency WebSocket Synchronization**: Broadcasting live snapshots (quotes, indicators, predictions, risk) every second to multiple concurrent WebSocket clients requires careful version diffing (avoiding pushing frames when data hasn't changed) to prevent browser re-rendering bottlenecks.
- **Client-Side Build Time Configs**: Crucial configuration variables (like the backend API base URLs) are inlined into the frontend bundle at build time, requiring a full redeployment if the backend location changes.
- **LLM Rate-Limiting**: Grounding Gemini chat with live dataframes and recent news articles increases token payload sizes and requires strict client-side chat rate-limiting and intelligent fallback handlers to handle API quota exhaustion gracefully.

## Prerequisites

You need two things installed before you start - both are free:

- **[Node.js](https://nodejs.org/) 20.9 or newer** (includes `npm`). Check your version with
  `node --version`. If you use [nvm](https://github.com/nvm-sh/nvm), running `nvm use` in the
  `frontend/` folder picks up the exact version this project was built against (see
  `frontend/.nvmrc`).
- **[Python](https://www.python.org/downloads/) 3.12 or newer**. Check your version with
  `python --version` (or `python3 --version` on macOS/Linux). On Windows, tick "Add python.exe
  to PATH" during installation.

No database server, Docker, or paid API key is required to run the app locally - see
[Environment variables](#environment-variables) below.

## Getting started

### 1. Get the code

**Option A - Download ZIP (no Git required):** on the repository's GitHub page, click the green
**Code** button → **Download ZIP**, then extract the ZIP file anywhere on your computer.

**Option B - Clone with Git:**
```bash
git clone https://github.com/YameenMunir/market-mind-live.git
cd market-mind-live
```

### 2. Install everything

From the project's root folder (the one containing this README):

```bash
npm run install:all
```

This installs the frontend's dependencies and creates a Python virtual environment for the
backend with its dependencies, in one step. It's safe to re-run at any time (it skips work
that's already done). If you'd rather install each side manually, see
[Manual per-app setup](#manual-per-app-setup) below.

### 3. Start the app

```bash
npm run dev
```

This starts both the backend (`http://localhost:8000`) and frontend
(`http://localhost:3000`) together, with each one's logs prefixed so you can tell them apart.
Open **http://localhost:3000** in your browser - that's the app.

Press `Ctrl+C` once to stop both.

No API key or configuration is required to get a fully working app - yfinance (market data)
needs no key, and the AI Insights assistant automatically falls back to a built-in mock
provider if no Gemini key is configured.

### Manual per-app setup

If you'd rather run/configure each side yourself instead of the root `npm run` scripts above:

<details>
<summary>Backend</summary>

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows; `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
copy .env.example .env         # `cp` on macOS/Linux - optional, see Environment variables below
uvicorn main:app --reload      # http://localhost:8000, health check at /api/health
```
</details>

<details>
<summary>Frontend</summary>

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

Copy `frontend/.env.local.example` to `frontend/.env.local` if you need to point at a
non-default backend URL (`NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_WS_BASE_URL`, both default to
`localhost:8000`).
</details>

### Useful commands

Run from the project root (each also works from inside `backend/`/`frontend/` individually -
see each folder's own scripts):

```bash
npm run install:all   # install frontend deps + create/populate the backend virtual environment
npm run dev           # run backend (auto-reload) + frontend together, for local development
npm run build          # production build of the frontend (also runs the TypeScript check)
npm run start          # run backend + frontend together, production mode (after `npm run build`)
npm run test           # run the backend (pytest) and frontend (Vitest) test suites
npm run lint            # lint the frontend
npm run typecheck       # frontend TypeScript check only, faster than a full build
```

## Environment variables

Every variable below is **optional** - the app runs with sensible defaults out of the box.
Backend variables go in `backend/.env` (copy from `backend/.env.example`); frontend variables go
in `frontend/.env.local` (copy from `frontend/.env.local.example`). Neither file is committed to
the repository (see `.gitignore`) - never commit a real `.env`/`.env.local` file.

| Variable | Where | Required? | Purpose | Default |
|---|---|---|---|---|
| `CORS_ORIGINS` | backend | No | Comma-separated list of frontend origins allowed to call the API. Set this to your deployed frontend's URL in production. | `http://localhost:3000` |
| `APP_ENV` | backend | No | `development` or `production`. Gates the `/api/debug/*` introspection endpoints (dev-only). | `development` |
| `LOG_LEVEL` | backend | No | `DEBUG` \| `INFO` \| `WARNING` \| `ERROR` | `INFO` |
| `DATABASE_URL` | backend | No | Where alerts/chat/prediction history are stored. SQLite needs no setup; use a Postgres URL for deployments with an ephemeral filesystem. | `sqlite:///./market_mind.db` |
| `GEMINI_API_KEY` | backend | No | Enables live AI Insights via [Google Gemini](https://aistudio.google.com/apikey) (free tier available). Without it, AI Insights uses a built-in deterministic mock so the feature still works. | unset (mock provider) |
| `GEMINI_MODEL` | backend | No | Gemini model name. | `gemini-2.5-flash` |
| `AI_KEY_ENCRYPTION_SECRET` | backend | No (recommended in production) | Encrypts per-device "bring your own key" Gemini keys at rest. Without it, a random key is generated each restart and previously-saved device keys become unreadable. Generate one with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. | auto-generated (not persisted) |
| `NEXT_PUBLIC_API_BASE_URL` | frontend | No | Backend REST API URL. Only needed if the backend isn't at `localhost:8000`. Inlined into the build - changing it requires a rebuild. | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_BASE_URL` | frontend | No | Backend WebSocket URL (powers live updates). Use `wss://` for an HTTPS-deployed backend. | `ws://localhost:8000` |

A number of additional backend tuning variables (cache lifetimes, rate limits, live-poll
cadence) exist with working defaults - see the fully-commented `backend/.env.example` for the
complete list and what each one controls.

## Database setup

No manual database setup is needed. The backend uses SQLite by default (a single file,
`backend/market_mind.db`, created automatically) and applies its schema migrations
automatically every time it starts (via Alembic - see `backend/migrations/`). There's no
separate "run migrations" step, no seed data to load, and no database server to install.

- **Reset your local data:** stop the backend, delete `backend/market_mind.db` (and any
  `-wal`/`-shm` files next to it), then start the backend again - a fresh, empty database is
  created and migrated automatically.
- **Back up your local data:** copy `backend/market_mind.db` elsewhere while the backend is
  stopped.
- **Using Postgres instead:** set `DATABASE_URL` to a `postgresql+psycopg://...` URL (see
  [Environment variables](#environment-variables)) - the same automatic-migration-at-startup
  behavior applies, so no extra setup step is needed beyond having an empty database for it to
  connect to.

Live market data (quotes, charts, indicators, predictions) is never stored in the database - it's
fetched live from Yahoo Finance and cached in memory, so there's no "market data" to seed.

## Testing

```bash
npm run test          # both suites, from the project root
npm run test:backend  # backend only (pytest) - 87+ tests covering resilience, caching, API contracts
npm run test:frontend # frontend only (Vitest) - component/hook/unit tests
```

The frontend also has a Playwright-based mobile/accessibility suite (`npm --prefix frontend run
test:mobile`) that checks six mobile breakpoints for layout overflow, touch-target sizing, and
accessibility violations, saving screenshots to `frontend/e2e/.artifacts/screenshots/`.

## Desktop launcher (Windows)

For a double-click "just start the app" experience instead of running `npm run dev`/`npm run
start` from a terminal every time, `launcher/launcher.cjs` builds into a real, standalone
`MarketMindLive.exe`: it starts the backend and frontend together, waits for both to come up,
opens your browser to the app automatically, and stops both cleanly when you close it.

**What it is not:** a fully self-contained desktop app. It still requires Node.js and Python to
already be installed and `npm run install:all` to have already been run (same prerequisites as
everywhere else in this README) - the `.exe` only bundles a small launcher script, not the two
apps' own dependencies. This was a deliberate scope choice: a fully standalone build (bundling
Python itself via PyInstaller, wrapped in Electron) is a much larger undertaking that didn't seem
worth it for what's fundamentally still a client-server app needing a persistent backend
(WebSocket connections, background pollers, a database) - see [Desktop packaging &
WebGPU](#desktop-packaging--webgpu-considered-not-added) above for the fuller reasoning.

**Build it:**
```bash
npm run install:all   # if you haven't already
npm run build:exe     # produces dist/MarketMindLive.exe (~55MB, bundles a Node.js runtime)
```

**Use it:** copy `dist/MarketMindLive.exe` to the project's root folder (next to `package.json`)
and double-click it, or run it from a terminal. A console window shows startup progress; your
browser opens automatically once both the backend and frontend are ready. **Press Ctrl+C in that
window to stop the app** - closing the window via a hard kill (e.g. Task Manager → End Task)
can't run any application's cleanup code and may leave the backend/frontend processes running in
the background; if that happens, they're harmless (just re-run the launcher, or find and end
`python.exe`/`node.exe` in Task Manager).

The built `.exe` isn't committed to the repository (see `.gitignore`) - it's a ~55MB binary
that's cheap to rebuild locally. If you want to hand it to someone who won't build it themselves,
attach it to a [GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github)
rather than committing it.

## Progressive Web App

The frontend is installable as a PWA - a "Install app" / "Add to Home Screen" prompt is
available on supported browsers, backed by a generated web app manifest
(`frontend/src/app/manifest.ts` → served at `/manifest.webmanifest`), app icons
(`frontend/src/app/icon*`), and a service worker (`frontend/public/sw.js`, registered via
`frontend/src/components/ServiceWorkerRegister.tsx`). The
service worker deliberately does **not** cache API responses or live market data (a cached stock
quote would be misleading) - it only enables installability and shows a friendly offline page if
navigation fails with no connection. No extra setup is required; this works automatically in the
production build (`npm run build && npm run start`).

## Security notes

- **No secrets in the frontend.** The only frontend-facing configuration
  (`NEXT_PUBLIC_API_BASE_URL`/`NEXT_PUBLIC_WS_BASE_URL`) contains URLs, never credentials. The
  Gemini API key never leaves the backend; a per-device "bring your own key" is encrypted at
  rest and only ever returned to the browser as a masked hint (e.g. `••••••••f8a2`), never in full.
- **CORS** is allow-listed via `CORS_ORIGINS` (see above), not wildcarded.
- **Rate limiting** applies per-IP across the whole API, plus separate limits for the AI chat and
  the upstream market-data provider, to absorb bursts/abuse without one client starving others.
- **Errors are sanitized.** Unhandled server errors are logged in full (with a correlation ID)
  but never echo internal exception details back to the client.
- **Security headers** (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`) are set on every response by both the backend and frontend. A
  Content-Security-Policy is intentionally not set yet - see
  [Limitations](#limitations--future-work).
- Dependencies are checked with `npm audit` (frontend) - see
  [Limitations](#limitations--future-work) for one accepted, low-risk exception.

If you find a security issue, please open a private report rather than a public issue - see the
repository's Security tab on GitHub, or contact the maintainer directly.

## Troubleshooting

**"python: command not found" / "node: command not found"**
Python or Node.js isn't installed, or isn't on your system PATH. Reinstall from the links in
[Prerequisites](#prerequisites) and make sure to check any "Add to PATH" option during setup,
then open a new terminal window (PATH changes don't apply to already-open terminals).

**"Market Mind Live requires Python 3.12 or newer" on backend startup**
Your `python`/`python3` points at an older version. Install Python 3.12+ and either put it first
on your PATH or create the virtual environment explicitly with `python3.12 -m venv venv`.

**Backend fails to start with a database/migration error**
Usually means `backend/` (or wherever `DATABASE_URL` points) isn't writable, or a custom
`DATABASE_URL` has a typo/unreachable host. The startup error message includes the resolved
`DATABASE_URL` and the original underlying error - check both against
[Database setup](#database-setup) above.

**"Address already in use" / "port 3000 (or 8000) is already in use"**
Another process is already using that port. Either stop it, or run this app's server on a
different port: `PORT=8001 npm run dev:backend` (backend) or `npm --prefix frontend run dev --
-p 3001` (frontend) - if you change the frontend's port, also update `NEXT_PUBLIC_API_BASE_URL`/
`NEXT_PUBLIC_WS_BASE_URL` or `CORS_ORIGINS` accordingly.

**Frontend shows "Having trouble reaching live market data" / a network error banner**
The frontend can't reach the backend. Confirm the backend is actually running
(`curl http://localhost:8000/api/health` should return `{"status":"ok",...}`), and that
`NEXT_PUBLIC_API_BASE_URL` (if you've set it) matches where the backend is actually listening.

**Browser console shows a CORS error**
The backend's `CORS_ORIGINS` doesn't include the frontend's exact origin (scheme + host + port,
no trailing slash). Add it to `backend/.env`'s `CORS_ORIGINS` and restart the backend.

**AI Insights always uses the mock provider even though I set `GEMINI_API_KEY`**
Check the backend's startup logs - they explicitly say whether the key looks validly formatted.
Google AI Studio keys start with `AIza` and are 39 characters long with no surrounding
whitespace/quotes in the `.env` file.

**`npm run install:all` fails partway through**
Re-run it - it's safe to run repeatedly (it skips the backend virtual environment if one already
exists). If the backend half keeps failing, try the [manual backend
setup](#manual-per-app-setup) to see the raw `pip install` error output.

**`pip install` fails with `CERTIFICATE_VERIFY_FAILED` / `SSLError`**
Common on locked-down corporate Windows machines where a proxy or antivirus intercepts HTTPS
traffic with its own certificate that Python doesn't trust yet, not an issue with this project's
dependencies. Try, in order: (1) update pip itself (`python -m pip install --upgrade pip`), (2)
update the `certifi` package, or (3) as a last resort, install with certificate verification
temporarily disabled:
```bash
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt
```

**Live prices/predictions occasionally show a rate-limit or stale-data message**
Expected under heavy use - Yahoo Finance's unofficial API has undocumented throttling. The app
automatically retries with backoff and falls back to the last known-good value rather than
failing outright; it recovers on its own.

## Limitations & future work

- **No Content-Security-Policy header.** Getting a CSP right for Next.js App Router's hydration
  requires a nonce-based setup, a larger and riskier change than a quick header addition - left
  as documented future work rather than shipped half-verified.
- **One accepted dependency advisory.** `npm audit` reports a moderate-severity `esbuild`/`vite`
  advisory via Vitest's dev-server (only exploitable if Vitest's dev/watch UI is exposed to the
  network, which this project never does - `npm run test` runs Vitest in one-shot `run` mode).
  Fixing it requires a breaking Vitest v4 upgrade; deferred rather than force-upgraded without
  full regression verification.
- **SQLite by default.** Fine for local use and small deployments; a multi-instance production
  deployment should switch `DATABASE_URL` to Postgres (see [Database setup](#database-setup)) -
  SQLite's file-level locking doesn't coordinate across multiple server processes.
- **In-memory caches/rate limits are per-process.** Running multiple backend instances behind a
  load balancer (for horizontal scaling) would need those moved to a shared store (e.g. Redis) -
  not required for a single-instance deployment.
- Desktop packaging (Electron/Tauri) and WebGPU-based visuals were evaluated and deliberately not
  added - see the note at the end of this README for why.

## Contributing

Contributions are welcome - have an idea for a new feature, a bug fix, or an improvement? Pull
requests are the preferred way to propose changes:

1. Fork the repo and create a branch off `main` (e.g. `feat/short-description`).
2. Make your changes, following the conventions in `CLAUDE.md` (project structure, where new
   backend errors/schemas/API calls belong, semantic Tailwind tokens, etc.).
3. Verify before pushing:
   - Backend: `npm run test:backend` (or `python -c "import main"` for a quick sanity check).
   - Frontend: `npm run typecheck`, `npm run build`, and `npm run test:frontend`.
4. Open a PR against `main` describing the change and why it's useful - a small PR with a clear
   rationale is easier to review than a large one bundling multiple ideas.

Not ready to write code? Open a [GitHub issue](https://github.com/YameenMunir/market-mind-live/issues)
describing the bug or feature suggestion instead.

## License

[MIT](LICENSE) - Copyright (c) 2026 Yameen Munir. You're free to use, modify, and distribute this
project (including commercially), provided the copyright notice and license text are preserved -
see [LICENSE](LICENSE) for the full text.

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

## Desktop packaging & WebGPU (considered, not added)

- **Electron/Tauri desktop app:** deliberately not added. This app's live-updating dashboard
  needs a persistently-running backend (WebSocket connections, background per-symbol pollers, a
  SQLite database) - wrapping the frontend alone in a desktop shell wouldn't make the app more
  self-contained, since users would still need the Python backend running somewhere. It would
  add real packaging/maintenance overhead (installers for each OS, auto-update infrastructure)
  without solving the actual distribution goal (a working browser app from a downloaded ZIP).
  Revisit this if the backend is ever made fully embeddable/bundleable alongside the desktop app.
- **WebGPU / 3D graphics:** not used, and not needed - the marketing site's "3D" visualizations
  are CSS/SVG-driven precisely to avoid a WebGL/three.js dependency, and the actual dashboard's
  charts (candlesticks, equity curves) are 2D financial data that doesn't benefit from GPU
  rendering. Adding WebGPU would increase bundle size and compatibility risk for no user-facing
  benefit here.

## Disclaimer

This project is for educational/informational purposes. Market data is delayed, predictions are
generated by a transparent rule-based heuristic (not a trained ML model), and nothing here
constitutes financial advice.
