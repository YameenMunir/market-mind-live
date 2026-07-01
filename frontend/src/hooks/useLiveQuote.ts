"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { QUOTE_POLL_FALLBACK_MS, WS_BASE_URL } from "@/lib/constants";
import type { ApiErrorPayload, MarketStatus, PriceQuote } from "@/types";
import { ApiError } from "@/types";

export type ConnectionState = "connecting" | "live" | "polling" | "reconnecting" | "error";

interface LiveQuoteState {
  quote: PriceQuote | null;
  marketStatus: MarketStatus | null;
  connectionState: ConnectionState;
  errorMessage: string | null;
}

const MAX_WS_RETRIES = 3;

export function useLiveQuote(symbol: string) {
  const [state, setState] = useState<LiveQuoteState>({
    quote: null,
    marketStatus: null,
    connectionState: "connecting",
    errorMessage: null,
  });

  const retriesRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    retriesRef.current = 0;
    setState({ quote: null, marketStatus: null, connectionState: "connecting", errorMessage: null });

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      setState((prev) => ({ ...prev, connectionState: "polling", errorMessage: null }));

      const poll = async () => {
        try {
          const [quote, marketStatus] = await Promise.all([
            api.getQuote(symbol),
            api.getMarketStatus(symbol),
          ]);
          if (cancelled) return;
          setState({ quote, marketStatus, connectionState: "polling", errorMessage: null });
        } catch (err) {
          if (cancelled) return;
          const message = err instanceof ApiError ? err.message : "Unable to fetch live data.";
          setState((prev) => ({ ...prev, connectionState: "error", errorMessage: message }));
        }
      };

      poll();
      pollTimerRef.current = setInterval(poll, QUOTE_POLL_FALLBACK_MS);
    };

    const connectSocket = () => {
      if (cancelled) return;
      const socket = new WebSocket(`${WS_BASE_URL}/ws/live/${encodeURIComponent(symbol)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        retriesRef.current = 0;
        if (!cancelled) setState((prev) => ({ ...prev, connectionState: "live", errorMessage: null }));
      };

      socket.onmessage = (event) => {
        if (cancelled) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "update") {
            setState({
              quote: payload.quote as PriceQuote,
              marketStatus: payload.market_status as MarketStatus,
              connectionState: "live",
              errorMessage: null,
            });
          } else if (payload.type === "error") {
            const errPayload = payload as ApiErrorPayload;
            setState((prev) => ({ ...prev, connectionState: "live", errorMessage: errPayload.message }));
          }
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
