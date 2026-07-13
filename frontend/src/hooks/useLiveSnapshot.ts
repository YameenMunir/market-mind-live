"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
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
}

const MAX_WS_RETRIES = 3;

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
};

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
  const fastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    retriesRef.current = 0;
    setState(INITIAL_STATE);

    const stopPolling = () => {
      if (fastTimerRef.current) {
        clearInterval(fastTimerRef.current);
        fastTimerRef.current = null;
      }
      if (slowTimerRef.current) {
        clearInterval(slowTimerRef.current);
        slowTimerRef.current = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      setState((prev) => ({ ...prev, connectionState: "polling", errorMessage: null, errorCode: null }));

      const pollFast = async () => {
        try {
          const [quote, marketStatus] = await Promise.all([api.getQuote(symbol), api.getMarketStatus(symbol)]);
          if (cancelled) return;
          const now = new Date().toISOString();
          setState((prev) => ({
            ...prev,
            quote,
            quoteUpdatedAt: now,
            marketStatus,
            marketStatusUpdatedAt: now,
            connectionState: "polling",
            errorMessage: null,
            errorCode: null,
            isStale: false,
          }));
        } catch (err) {
          if (cancelled) return;
          const message = err instanceof ApiError ? err.message : "Unable to fetch live data.";
          const code = err instanceof ApiError ? err.errorCode : null;
          setState((prev) => ({ ...prev, connectionState: "error", errorMessage: message, errorCode: code, isStale: true }));
        }
      };

      const pollSlow = async () => {
        try {
          const [indicators, prediction, risk] = await Promise.all([
            api.getIndicators(symbol),
            api.getPrediction(symbol),
            api.getRisk(symbol),
          ]);
          if (cancelled) return;
          const now = new Date().toISOString();
          setState((prev) => ({
            ...prev,
            indicators,
            indicatorsUpdatedAt: now,
            prediction,
            predictionUpdatedAt: now,
            risk,
            riskUpdatedAt: now,
          }));
        } catch {
          // Analytics are secondary to the live quote - swallow errors here rather than
          // downgrading the whole connection state; the quote poll surfaces real outages.
        }
      };

      pollFast();
      pollSlow();
      fastTimerRef.current = setInterval(pollFast, QUOTE_POLL_FALLBACK_MS);
      slowTimerRef.current = setInterval(pollSlow, INDICATOR_POLL_MS);
    };

    const connectSocket = () => {
      if (cancelled) return;
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
            errorMessage: payload.error_message ?? null,
            errorCode: payload.error_code ?? null,
            isStale: Boolean(payload.is_stale),
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

    if (typeof window !== "undefined" && "WebSocket" in window) {
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
    };
  }, [symbol]);

  return state;
}
