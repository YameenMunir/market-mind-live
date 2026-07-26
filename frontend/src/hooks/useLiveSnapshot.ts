"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { describeError } from "@/lib/errorMessages";
import { INDICATOR_POLL_MS, QUOTE_POLL_FALLBACK_MS, WS_BASE_URL } from "@/lib/constants";
import type { ErrorCode, IndicatorSet, MarketStatus, PredictionResult, PriceQuote, RiskAssessment } from "@/types";
import { ApiError } from "@/types";

export type ConnectionState = "connecting" | "live" | "polling" | "reconnecting" | "error";

interface LiveSnapshotState {
  quote: PriceQuote | null;
  quoteUpdatedAt: string | null;
  marketStatus: MarketStatus | null;
  marketStatusUpdatedAt: string | null;
  indicators: IndicatorSet | null;
  indicatorsUpdatedAt: string | null;
  prediction: PredictionResult | null;
  predictionUpdatedAt: string | null;
  risk: RiskAssessment | null;
  riskUpdatedAt: string | null;
  connectionState: ConnectionState;
  errorMessage: string | null;
  /** Lets callers distinguish "provider is rate-limited" (transient, the app is already
   * retrying/backing off on its own - not worth alarming the user with a banner) from a
   * genuinely actionable error (e.g. invalid symbol) that should still be shown. */
  errorCode: ErrorCode | null;
  /** True when the backend's poller is serving a known-stale value because its last
   * fetch attempt failed (e.g. provider outage) - distinct from `errorMessage`, which
   * can be cleared on the next successful poll while `isStale` reflects the same signal
   * the backend used to decide that. Surfaced to `LastUpdated` so freshness labels
   * genuinely reflect backend-reported staleness instead of always reading "live". */
  isStale: boolean;
  /** Timestamp of the most recent successful refresh from *any* source (a WS snapshot
   * or a successful REST fallback poll) - shown next to the error banner so a user
   * hitting a refresh failure still sees exactly how fresh the data on screen is. */
  lastSuccessAt: string | null;
}

const MAX_WS_RETRIES = 3;

// Errors worth retrying sooner than the normal cadence, with exponential backoff -
// all represent a temporary condition (network hiccup, timeout, provider rate limit,
// an unclassified/internal failure, or momentarily-incomplete history data) that's
// reasonably likely to clear on its own within seconds. Anything else (e.g. an
// invalid symbol) is a stable condition that retrying faster can't fix, so it stays on
// the normal poll cadence instead of hammering the backend pointlessly.
const RETRYABLE_ERROR_CODES = new Set<ErrorCode>(["network_error", "rate_limited", "internal_error", "insufficient_history"]);
const RETRY_BASE_MS = 3_000;
const RETRY_JITTER_RATIO = 0.25;

const INITIAL_STATE: LiveSnapshotState = {
  quote: null,
  quoteUpdatedAt: null,
  marketStatus: null,
  marketStatusUpdatedAt: null,
  indicators: null,
  indicatorsUpdatedAt: null,
  prediction: null,
  predictionUpdatedAt: null,
  risk: null,
  riskUpdatedAt: null,
  connectionState: "connecting",
  errorMessage: null,
  errorCode: null,
  isStale: false,
  lastSuccessAt: null,
};

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Minimal shape validation for a quote - guards against a technically-2xx but
 * malformed/empty payload being applied as if it were good data (req: validate API
 * responses before using them). Pydantic already guarantees this server-side for a
 * well-formed response; this is a cheap client-side backstop, not a full schema check. */
function isValidQuote(value: unknown): value is PriceQuote {
  return !!value && typeof value === "object" && typeof (value as PriceQuote).price === "number" && Number.isFinite((value as PriceQuote).price);
}

/**
 * Drives every "live" panel on the dashboard from a single WebSocket connection
 * (quote, market status, indicators, prediction, risk - one snapshot per tick).
 * Falls back to REST polling if the socket can't be established or drops
 * repeatedly, at a slower/safer cadence for the analytics sections since those
 * are derived from daily bars and don't change every second.
 */
export function useLiveSnapshot(symbol: string) {
  const [state, setState] = useState<LiveSnapshotState>(INITIAL_STATE);

  const retriesRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);
  const fastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Exposed to callers as a stable `retry()` - the actual implementation is redefined
  // every time the effect (re)runs (it closes over that run's connectSocket/
  // startPolling/pollFast/pollSlow), so it's stashed in a ref rather than returned
  // directly.
  const retryImplRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    retriesRef.current = 0;
    setState(INITIAL_STATE);

    // Tracks which transport is actually active right now, so `retry()` (defined once
    // below and invoked an arbitrary amount of time later) knows whether to reconnect
    // the socket or re-poll over REST - reading `state.connectionState` here instead
    // would be a stale closure, since this effect only re-runs when `symbol` changes,
    // not on every state update.
    let mode: "socket" | "polling" = "socket";

    // In-flight guards prevent two overlapping calls to the same poll function (e.g.
    // the timer firing again before a slow response has resolved) from both running
    // at once; the abort controllers let a *newer* call (a manual retry, or a fresh
    // cycle) cancel a still-pending older one instead of leaving it to resolve into
    // stale state later.
    let pollFastInFlight = false;
    let pollSlowInFlight = false;
    let pollFastAbort: AbortController | null = null;
    let pollSlowAbort: AbortController | null = null;
    let pollFastFailures = 0;
    let pollSlowFailures = 0;

    const stopPolling = () => {
      if (fastTimerRef.current) {
        clearTimeout(fastTimerRef.current);
        fastTimerRef.current = null;
      }
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
      pollFastAbort?.abort();
      pollSlowAbort?.abort();
    };

    const scheduleFast = (delayMs: number) => {
      if (cancelled) return;
      fastTimerRef.current = setTimeout(pollFast, delayMs);
    };
    const scheduleSlow = (delayMs: number) => {
      if (cancelled) return;
      slowTimerRef.current = setTimeout(pollSlow, delayMs);
    };

    async function pollFast(): Promise<void> {
      if (cancelled || pollFastInFlight) return;
      pollFastInFlight = true;
      pollFastAbort = new AbortController();
      const signal = pollFastAbort.signal;

      if (isOffline()) {
        pollFastInFlight = false;
        setState((prev) => ({
          ...prev,
          connectionState: "error",
          errorMessage: "No internet connection. Reconnecting automatically once it's back.",
          errorCode: "network_error",
          isStale: true,
        }));
        scheduleFast(QUOTE_POLL_FALLBACK_MS);
        return;
      }

      const [quoteResult, statusResult] = await Promise.allSettled([
        api.getQuote(symbol, signal),
        api.getMarketStatus(symbol, signal),
      ]);
      pollFastInFlight = false;
      if (cancelled || signal.aborted) return;

      const now = new Date().toISOString();
      const quoteOk = quoteResult.status === "fulfilled" && isValidQuote(quoteResult.value);
      const statusOk = statusResult.status === "fulfilled";

      // Promise.allSettled means one endpoint failing never blanks out the other's
      // result - each is applied independently, and whatever didn't succeed just
      // keeps its previous value rather than being cleared.
      if (quoteOk || statusOk) {
        setState((prev) => ({
          ...prev,
          quote: quoteOk ? (quoteResult as PromiseFulfilledResult<PriceQuote>).value : prev.quote,
          quoteUpdatedAt: quoteOk ? now : prev.quoteUpdatedAt,
          marketStatus: statusOk ? (statusResult as PromiseFulfilledResult<MarketStatus>).value : prev.marketStatus,
          marketStatusUpdatedAt: statusOk ? now : prev.marketStatusUpdatedAt,
          connectionState: "polling",
          lastSuccessAt: now,
          ...(quoteOk && statusOk ? { errorMessage: null, errorCode: null, isStale: false } : {}),
        }));
      }

      if (quoteOk && statusOk) {
        pollFastFailures = 0;
        scheduleFast(QUOTE_POLL_FALLBACK_MS);
        return;
      }

      // At least one of the two failed - surface the more actionable of the two
      // errors (a real ApiError beats a generic fallback) and decide the retry pace.
      const failure = !quoteOk ? quoteResult : statusResult;
      const err = failure.status === "rejected" ? failure.reason : null;
      if (err instanceof DOMException && err.name === "AbortError") return; // superseded, not a real failure

      const apiError = err instanceof ApiError ? err : new ApiError({ error_code: "network_error", message: "Unable to fetch live data." });
      const described = describeError(apiError);
      setState((prev) => ({ ...prev, connectionState: "error", errorMessage: described.message, errorCode: apiError.errorCode, isStale: true }));

      pollFastFailures += 1;
      if (RETRYABLE_ERROR_CODES.has(apiError.errorCode)) {
        const backoff = Math.min(RETRY_BASE_MS * 2 ** (pollFastFailures - 1), QUOTE_POLL_FALLBACK_MS);
        scheduleFast(backoff + backoff * RETRY_JITTER_RATIO * Math.random());
      } else {
        scheduleFast(QUOTE_POLL_FALLBACK_MS);
      }
    }

    async function pollSlow(): Promise<void> {
      if (cancelled || pollSlowInFlight) return;
      pollSlowInFlight = true;
      pollSlowAbort = new AbortController();
      const signal = pollSlowAbort.signal;

      if (isOffline()) {
        pollSlowInFlight = false;
        scheduleSlow(INDICATOR_POLL_MS);
        return;
      }

      const [indicatorsResult, predictionResult, riskResult] = await Promise.allSettled([
        api.getIndicators(symbol, signal),
        api.getPrediction(symbol, signal),
        api.getRisk(symbol, signal),
      ]);
      pollSlowInFlight = false;
      if (cancelled || signal.aborted) return;

      const now = new Date().toISOString();
      const indicatorsOk = indicatorsResult.status === "fulfilled";
      const predictionOk = predictionResult.status === "fulfilled";
      const riskOk = riskResult.status === "fulfilled";

      // Analytics are secondary to the live quote - a failure here never downgrades
      // connectionState/errorMessage (the fast poll already owns that signal); each
      // section just independently keeps its last-known-good value on failure.
      if (indicatorsOk || predictionOk || riskOk) {
        setState((prev) => ({
          ...prev,
          indicators: indicatorsOk ? (indicatorsResult as PromiseFulfilledResult<IndicatorSet>).value : prev.indicators,
          indicatorsUpdatedAt: indicatorsOk ? now : prev.indicatorsUpdatedAt,
          prediction: predictionOk ? (predictionResult as PromiseFulfilledResult<PredictionResult>).value : prev.prediction,
          predictionUpdatedAt: predictionOk ? now : prev.predictionUpdatedAt,
          risk: riskOk ? (riskResult as PromiseFulfilledResult<RiskAssessment>).value : prev.risk,
          riskUpdatedAt: riskOk ? now : prev.riskUpdatedAt,
        }));
      }

      if (indicatorsOk && predictionOk && riskOk) {
        pollSlowFailures = 0;
        scheduleSlow(INDICATOR_POLL_MS);
        return;
      }

      pollSlowFailures += 1;
      const anyRejected = [indicatorsResult, predictionResult, riskResult].find((r) => r.status === "rejected");
      const err = anyRejected?.status === "rejected" ? anyRejected.reason : null;
      const retryable = err instanceof ApiError && RETRYABLE_ERROR_CODES.has(err.errorCode);
      if (retryable) {
        const backoff = Math.min(RETRY_BASE_MS * 2 ** (pollSlowFailures - 1), INDICATOR_POLL_MS);
        scheduleSlow(backoff + backoff * RETRY_JITTER_RATIO * Math.random());
      } else {
        scheduleSlow(INDICATOR_POLL_MS);
      }
    }

    const startPolling = () => {
      mode = "polling";
      stopPolling();
      pollFastFailures = 0;
      pollSlowFailures = 0;
      setState((prev) => ({ ...prev, connectionState: "polling", errorMessage: null, errorCode: null }));
      pollFast();
      pollSlow();
    };

    const connectSocket = () => {
      if (cancelled) return;
      mode = "socket";
      // Browsers silently kill a ws:// connection opened from an https:// page (mixed
      // content) - no error event, straight to onclose - which looks identical to a
      // real connection failure and burns all MAX_WS_RETRIES before falling back to
      // REST polling. Force wss:// whenever the page itself is https:// so a
      // NEXT_PUBLIC_WS_BASE_URL misconfigured with the wrong scheme doesn't silently
      // disable live updates for every visitor on that deployment.
      const wsBase =
        typeof window !== "undefined" && window.location.protocol === "https:"
          ? WS_BASE_URL.replace(/^ws:\/\//, "wss://")
          : WS_BASE_URL;
      const socket = new WebSocket(`${wsBase}/ws/live/${encodeURIComponent(symbol)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        retriesRef.current = 0;
        if (!cancelled)
          setState((prev) => ({ ...prev, connectionState: "live", errorMessage: null, errorCode: null, isStale: false }));
      };

      socket.onmessage = (event) => {
        if (cancelled) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type !== "snapshot") return;

          // The server only marks a frame `changed: false` for periodic heartbeats sent
          // when nothing new actually happened (see api/ws.py) - skip the state update
          // entirely rather than replacing every field with a freshly-parsed but
          // value-identical object, which would otherwise re-render the whole dashboard
          // every ~15s for no visible change. `changed` missing (older backend) still
          // processes normally.
          if (payload.changed === false) return;

          const now = new Date().toISOString();
          const rawErrorCode = payload.error_code ?? null;
          const rawErrorMessage = payload.error_message ?? null;
          const described = rawErrorCode
            ? describeError(new ApiError({ error_code: rawErrorCode, message: rawErrorMessage || "" }))
            : null;

          setState((prev) => ({
            quote: payload.quote ?? prev.quote,
            quoteUpdatedAt: payload.quote_updated_at ?? prev.quoteUpdatedAt,
            marketStatus: payload.market_status ?? prev.marketStatus,
            marketStatusUpdatedAt: payload.market_status_updated_at ?? prev.marketStatusUpdatedAt,
            indicators: payload.indicators ?? prev.indicators,
            indicatorsUpdatedAt: payload.indicators_updated_at ?? prev.indicatorsUpdatedAt,
            prediction: payload.prediction ?? prev.prediction,
            predictionUpdatedAt: payload.prediction_updated_at ?? prev.predictionUpdatedAt,
            risk: payload.risk ?? prev.risk,
            riskUpdatedAt: payload.risk_updated_at ?? prev.riskUpdatedAt,
            connectionState: "live",
            // Replaces whatever raw diagnostic string the backend attached (meant for
            // server logs, not end users) with a clear, stable, user-facing message.
            errorMessage: described?.message ?? null,
            errorCode: rawErrorCode,
            isStale: Boolean(payload.is_stale),
            lastSuccessAt: payload.is_stale ? prev.lastSuccessAt : now,
          }));
        } catch {
          // ignore malformed frames
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onclose = () => {
        if (cancelled) return;
        retriesRef.current += 1;
        if (retriesRef.current > MAX_WS_RETRIES) {
          startPolling();
          return;
        }
        setState((prev) => ({ ...prev, connectionState: "reconnecting" }));
        reconnectTimerRef.current = setTimeout(connectSocket, 1500 * retriesRef.current);
      };
    };

    const usesWebSocket = typeof window !== "undefined" && "WebSocket" in window;

    // Manual retry (the StatusBanner's Retry button): cancels whatever's in flight and
    // starts a fresh attempt immediately, rather than waiting for the next scheduled
    // tick or reconnect backoff - the whole point of a Retry button.
    const retry = () => {
      if (cancelled) return;
      if (usesWebSocket && mode === "socket") {
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        retriesRef.current = 0;
        socketRef.current?.close();
        setState((prev) => ({ ...prev, connectionState: "connecting" }));
        connectSocket();
      } else {
        stopPolling();
        pollFastInFlight = false;
        pollSlowInFlight = false;
        startPolling();
      }
    };
    retryImplRef.current = retry;

    const handleOnline = () => {
      // Connectivity just came back - don't wait for the next scheduled tick/backoff
      // window, which could be tens of seconds away.
      retryImplRef.current();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
    }

    if (usesWebSocket) {
      connectSocket();
    } else {
      startPolling();
    }

    return () => {
      cancelled = true;
      stopPolling();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
      socketRef.current = null;
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const retry = useCallback(() => retryImplRef.current(), []);

  return { ...state, retry };
}
