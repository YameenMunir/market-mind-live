"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { AIAssetContext, ChatMessage, FeedbackRating } from "@/types";
import { ApiError } from "@/types";

const SESSION_STORAGE_KEY = "mml-ai-session-id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const created =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return `sess-${Date.now()}`;
  }
}

interface UseAIChatOptions {
  asset: string;
  buildContext: () => AIAssetContext;
}

export function useAIChat({ asset, buildContext }: UseAIChatOptions) {
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, FeedbackRating>>({});

  useEffect(() => {
    let cancelled = false;
    api
      .getAIHistory(sessionId)
      .then((res) => {
        if (!cancelled) setMessages(res.messages);
      })
      .catch(() => {
        // No history yet, or backend unavailable - start with an empty conversation.
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

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
      setFeedbackGiven((prev) => ({ ...prev, [messageId]: rating }));
      try {
        await api.sendAIFeedback({ session_id: sessionId, message_id: messageId, rating });
      } catch {
        // Feedback is best-effort - don't disrupt the chat experience if it fails to save.
      }
    },
    [sessionId]
  );

  return { sessionId, messages, isSending, error, sendMessage, sendFeedback, feedbackGiven };
}
