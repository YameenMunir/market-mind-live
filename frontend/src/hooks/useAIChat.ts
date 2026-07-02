"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { AIAssetContext, ChatMessage, ChatSessionSummary, FeedbackRating } from "@/types";
import { ApiError } from "@/types";

const ACTIVE_SESSION_MAP_KEY = "mml-ai-active-sessions";

/** Which session is "active" for a given asset, persisted for the browser tab's
 * lifetime - lets switching between assets resume each one's own conversation
 * instead of spawning a fresh session every time the user revisits an asset. */
function readActiveSessionMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_SESSION_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeActiveSession(asset: string, sessionId: string) {
  if (typeof window === "undefined") return;
  try {
    const map = readActiveSessionMap();
    map[asset] = sessionId;
    window.sessionStorage.setItem(ACTIVE_SESSION_MAP_KEY, JSON.stringify(map));
  } catch {
    // Best-effort persistence only - a failure here just means the next asset
    // switch starts a fresh session instead of resuming one.
  }
}

interface UseAIChatOptions {
  asset: string;
  /** Gates session resolution/creation - switching the dashboard's selected asset
   * shouldn't silently spin up chat sessions while the assistant panel is closed. */
  enabled: boolean;
  buildContext: () => AIAssetContext;
}

export function useAIChat({ asset, enabled, buildContext }: UseAIChatOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionAsset, setSessionAsset] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, FeedbackRating>>({});
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const resolvedForAssetRef = useRef<string | null>(null);

  const startNewChat = useCallback(async () => {
    setError(null);
    setIsLoadingSession(true);
    try {
      const context = buildContext();
      const res = await api.newAISession({ asset, client_context: context });
      writeActiveSession(asset, res.session_id);
      setSessionId(res.session_id);
      setSessionAsset(res.asset);
      setMessages([res.welcome_message]);
      setFeedbackGiven({});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start a new chat session.");
    } finally {
      setIsLoadingSession(false);
    }
  }, [asset, buildContext]);

  const loadSession = useCallback(async (id: string) => {
    setError(null);
    setIsLoadingSession(true);
    try {
      const detail = await api.getAISessionDetail(id);
      setSessionId(detail.session_id);
      setSessionAsset(detail.asset);
      setMessages(detail.messages);
      setFeedbackGiven({});
      if (detail.asset) writeActiveSession(detail.asset, detail.session_id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load that conversation.");
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || resolvedForAssetRef.current === asset) return;
    resolvedForAssetRef.current = asset;

    const existing = readActiveSessionMap()[asset];
    if (existing) {
      loadSession(existing);
    } else {
      startNewChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, enabled]);

  const refreshSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const res = await api.getAISessions();
      setSessions(res.sessions);
    } catch {
      // Best-effort - the history list just stays stale/empty on failure.
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      try {
        await api.deleteAISession(id);
      } catch {
        // Ignore - worst case the entry lingers in the list until the next refresh.
      }
      setSessions((prev) => prev.filter((s) => s.session_id !== id));
      if (id === sessionId) {
        resolvedForAssetRef.current = null;
        await startNewChat();
      }
    },
    [sessionId, startNewChat]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending || !sessionId) return;

      setError(null);
      setIsSending(true);

      const optimisticUserMessage: ChatMessage = {
        message_id: `local-${Date.now()}`,
        role: "user",
        content: trimmed,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUserMessage]);

      try {
        const context = buildContext();
        const response = await api.aiChat({
          session_id: sessionId,
          message: trimmed,
          asset,
          client_context: context,
        });
        setMessages((prev) => [
          ...prev,
          {
            message_id: response.message_id,
            role: "assistant",
            content: response.reply,
            created_at: response.created_at,
          },
        ]);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "The AI assistant couldn't respond. Please try again.";
        setError(message);
        setMessages((prev) => prev.filter((m) => m.message_id !== optimisticUserMessage.message_id));
      } finally {
        setIsSending(false);
      }
    },
    [asset, buildContext, isSending, sessionId]
  );

  const sendFeedback = useCallback(
    async (messageId: string, rating: FeedbackRating) => {
      if (!sessionId) return;
      setFeedbackGiven((prev) => ({ ...prev, [messageId]: rating }));
      try {
        await api.sendAIFeedback({ session_id: sessionId, message_id: messageId, rating });
      } catch {
        // Feedback is best-effort - don't disrupt the chat experience if it fails to save.
      }
    },
    [sessionId]
  );

  return {
    sessionId,
    sessionAsset,
    messages,
    isSending,
    isLoadingSession,
    error,
    sendMessage,
    sendFeedback,
    feedbackGiven,
    startNewChat,
    loadSession,
    sessions,
    isLoadingSessions,
    refreshSessions,
    deleteSession,
  };
}
