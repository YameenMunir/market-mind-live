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
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const resolvedForAssetRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startNewChat = useCallback(async () => {
    // Switching sessions mid-stream would otherwise leave an old stream's callbacks
    // still writing into what's now a different conversation's message list.
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStreamingMessageId(null);
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
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStreamingMessageId(null);
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

  const stopGenerating = useCallback(() => {
    // A deliberate user action, not a failure - finalize whatever's on screen right
    // now immediately rather than waiting for the abort to propagate through the fetch
    // reader loop. The backend independently detects the dropped connection and
    // persists whatever partial reply it had generated (see handle_chat_stream), so
    // the truncated answer isn't lost even though no "done" event will arrive here.
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStreamingMessageId(null);
    setIsSending(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending || !sessionId) return;

      setError(null);
      setIsSending(true);

      const optimisticUserMessage: ChatMessage = {
        message_id: `local-user-${Date.now()}`,
        role: "user",
        content: trimmed,
        created_at: new Date().toISOString(),
      };
      const streamingId = `local-assistant-${Date.now()}`;
      // Pushed immediately (empty content) rather than only once the first chunk
      // arrives, so the "thinking" state and the streaming-content state are the same
      // message bubble growing in place - AIChatMessage switches its internal render
      // based on content/streaming state, never swapping in a differently-shaped
      // element, which is what avoids a layout jump at the moment content starts.
      const placeholderAssistantMessage: ChatMessage = {
        message_id: streamingId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUserMessage, placeholderAssistantMessage]);
      setStreamingMessageId(streamingId);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      let receivedAny = false;

      const context = buildContext();
      await api.streamAIChat(
        { session_id: sessionId, message: trimmed, asset, client_context: context },
        {
          onChunk: (delta) => {
            receivedAny = true;
            setMessages((prev) =>
              prev.map((m) => (m.message_id === streamingId ? { ...m, content: m.content + delta } : m))
            );
          },
          onDone: (final) => {
            // Swaps in the real, server-persisted message id/timestamp so feedback
            // (thumbs up/down) and any future session reload reference the same row
            // chat_store actually wrote, instead of the local placeholder id.
            setMessages((prev) =>
              prev.map((m) =>
                m.message_id === streamingId ? { ...m, message_id: final.message_id, created_at: final.created_at } : m
              )
            );
            setStreamingMessageId(null);
            setIsSending(false);
            abortControllerRef.current = null;
          },
          onError: (err) => {
            setStreamingMessageId(null);
            setIsSending(false);
            abortControllerRef.current = null;
            if (!receivedAny) {
              // Nothing was ever shown for this turn - remove both placeholders and
              // fall back to the same top-level error banner the non-streaming path
              // used, rather than leaving an empty assistant bubble on screen.
              setMessages((prev) =>
                prev.filter((m) => m.message_id !== optimisticUserMessage.message_id && m.message_id !== streamingId)
              );
              setError(err.message);
            }
            // A mid-stream interruption with content already shown is handled
            // server-side instead (an interruption note gets appended to the reply
            // itself and the stream still ends with a normal "done" event) - onError
            // firing after real content was already streamed shouldn't normally
            // happen, but if it does, the partial content stays visible rather than
            // being discarded.
          },
        },
        controller.signal
      );
    },
    [asset, buildContext, isSending, sessionId]
  );

  const regenerate = useCallback(async () => {
    if (isSending || !sessionId) return;
    const lastAssistantIndex = [...messages].reverse().findIndex((m) => m.role === "assistant");
    if (lastAssistantIndex === -1) return;
    const index = messages.length - 1 - lastAssistantIndex;
    const originalMessage = messages[index];

    setError(null);
    setIsSending(true);

    const streamingId = `local-regenerate-${Date.now()}`;
    // Replaces the stale reply in place (same position) rather than appending a new
    // message at the end - mirrors sendMessage's "same bubble grows in place" approach
    // so there's no layout jump between the old answer disappearing and the new one
    // starting to stream in.
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { message_id: streamingId, role: "assistant", content: "", created_at: new Date().toISOString() } : m))
    );
    setStreamingMessageId(streamingId);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let receivedAny = false;

    const context = buildContext();
    await api.streamRegenerate(
      { session_id: sessionId, asset, client_context: context },
      {
        onChunk: (delta) => {
          receivedAny = true;
          setMessages((prev) =>
            prev.map((m) => (m.message_id === streamingId ? { ...m, content: m.content + delta } : m))
          );
        },
        onDone: (final) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.message_id === streamingId ? { ...m, message_id: final.message_id, created_at: final.created_at } : m
            )
          );
          setStreamingMessageId(null);
          setIsSending(false);
          abortControllerRef.current = null;
        },
        onError: (err) => {
          setStreamingMessageId(null);
          setIsSending(false);
          abortControllerRef.current = null;
          if (!receivedAny) {
            // Regeneration failed before producing anything - restore the original
            // reply rather than leaving an empty bubble or losing it outright.
            setMessages((prev) => prev.map((m) => (m.message_id === streamingId ? originalMessage : m)));
            setError(err.message);
          }
        },
      },
      controller.signal
    );
  }, [asset, buildContext, isSending, messages, sessionId]);

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
    streamingMessageId,
    stopGenerating,
    isLoadingSession,
    error,
    sendMessage,
    regenerate,
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
