"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, FastForward, Loader2, Send, ShieldAlert, Square } from "lucide-react";

import { AIChatMessage } from "@/components/AIChatMessage";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { StatusBanner } from "@/components/StatusBanner";
import { AI_SUGGESTED_QUESTIONS } from "@/lib/constants";
import { getFollowUpSuggestions } from "@/lib/followUpSuggestions";
import { cn } from "@/lib/utils";
import type { AIAssetContext, ChatMessage, FeedbackRating } from "@/types";

interface AIChatConversationProps {
  asset: string;
  /** Used only to generate contextual follow-up suggestions after a reply (see
   * lib/followUpSuggestions.ts) - not sent anywhere itself, `onSend` already carries
   * whatever context each message needs. */
  context: AIAssetContext | null;
  messages: ChatMessage[];
  isSending: boolean;
  /** message_id of the assistant message currently being streamed into, or null when
   * nothing is in flight. Drives the thinking/streaming-cursor treatment on that one
   * message and the "Stop generating" control below the message list. */
  streamingMessageId: string | null;
  onStopGenerating: () => void;
  isLoadingSession: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onRegenerate: () => void;
  onFeedback: (messageId: string, rating: FeedbackRating) => void;
  feedbackGiven: Record<string, FeedbackRating>;
  /** Slightly larger type/spacing in full-screen mode where there's room to breathe. */
  size?: "compact" | "fullscreen";
}

// How close to the bottom (px) counts as "still following along" - within this, new
// content auto-scrolls into view; beyond it, the user has deliberately scrolled up to
// read earlier messages and new content shouldn't yank them back down.
const AUTO_SCROLL_THRESHOLD_PX = 80;

export function AIChatConversation({
  asset,
  context,
  messages,
  isSending,
  streamingMessageId,
  onStopGenerating,
  isLoadingSession,
  error,
  onSend,
  onRegenerate,
  onFeedback,
  feedbackGiven,
  size = "compact",
}: AIChatConversationProps) {
  const [input, setInput] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [skipAnimation, setSkipAnimation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFullscreen = size === "fullscreen";

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !autoScroll) return;
    // Instant while a response is actively streaming in (content grows continuously,
    // so it just stays glued to the bottom) - smooth for any other change (a new
    // message being sent, history finishing loading), which is a single, deliberate
    // jump rather than dozens of overlapping animations fighting each new chunk.
    el.scrollTo({ top: el.scrollHeight, behavior: streamingMessageId ? "auto" : "smooth" });
  }, [messages, isSending, autoScroll, streamingMessageId]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distanceFromBottom < AUTO_SCROLL_THRESHOLD_PX);
  };

  const scrollToBottom = () => {
    setAutoScroll(true);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
    setSkipAnimation(false);
  };

  // Regenerate is only offered on the single most recent assistant reply - see
  // AIChatMessage's onRegenerate prop doc for why earlier ones aren't candidates.
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.message_id;

  // Shown once a real exchange has settled (not the lone welcome message, and not
  // mid-stream/mid-send) - recomputed only then, so suggestions don't flicker as
  // content streams in and briefly disappear again the moment the next message sends.
  const settled = !isSending && !streamingMessageId && !isLoadingSession;
  const lastMessage = messages[messages.length - 1];
  const showFollowUps = settled && messages.length > 1 && lastMessage?.role === "assistant";
  const followUpSuggestions = useMemo(
    () => (showFollowUps ? getFollowUpSuggestions(context, messages) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showFollowUps, context, messages.length]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn(
            "h-full space-y-4 overflow-y-auto",
            isFullscreen ? "mx-auto w-full max-w-3xl px-4 py-6 sm:px-0" : "px-4 py-4"
          )}
        >
          {isLoadingSession && messages.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              <Loader2 size={13} className="animate-spin" />
              Loading conversation...
            </div>
          )}

          {!isLoadingSession && messages.length <= 1 && (
            <div className="space-y-4">
              {messages.length === 0 && (
                <p className={cn("leading-relaxed text-ink-muted", isFullscreen ? "text-sm" : "text-xs")}>
                  Ask me anything about {asset}'s live price, indicators, prediction, risk score, or backtest results.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {AI_SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => onSend(q)}
                    className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-left text-xs text-ink-muted transition-colors hover:border-brand/40 hover:text-ink"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <AIChatMessage
              key={message.message_id}
              message={message}
              onFeedback={message.role === "assistant" ? (rating) => onFeedback(message.message_id, rating) : undefined}
              feedbackGiven={feedbackGiven[message.message_id]}
              onRegenerate={message.message_id === lastAssistantId ? onRegenerate : undefined}
              size={size}
              isStreaming={message.message_id === streamingMessageId}
              skipAnimation={skipAnimation}
            />
          ))}

          {followUpSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-1">
              {followUpSuggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => onSend(q)}
                  className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-left text-xs text-ink-muted transition-colors hover:border-brand/40 hover:text-ink"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {error && <StatusBanner message={error} tone="error" icon="warning" />}
        </div>

        {!autoScroll && (
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label="Scroll to latest message"
            className="absolute bottom-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface shadow-popover transition-colors hover:border-brand/40 hover:text-brand"
          >
            <ArrowDown size={14} />
          </button>
        )}
      </div>

      {streamingMessageId && (
        <div
          className={cn(
            "flex items-center justify-center gap-2 border-t border-border py-2",
            isFullscreen && "mx-auto w-full max-w-3xl border-t-0"
          )}
        >
          <Button variant="secondary" size="sm" onClick={onStopGenerating} className="gap-1.5">
            <Square size={11} className="fill-current" />
            Stop generating
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSkipAnimation(true)}
            disabled={skipAnimation}
            className="gap-1.5 text-ink-faint"
          >
            <FastForward size={12} />
            Skip animation
          </Button>
        </div>
      )}

      <div className={cn("border-t border-border p-3", isFullscreen && "mx-auto w-full max-w-3xl border-t-0 pt-0")}>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              aria-label={`Ask the AI assistant about ${asset}`}
              placeholder="Ask about this asset's data"
            />
          </div>
          <Button
            variant="primary"
            size="icon"
            onClick={handleSend}
            disabled={isSending || isLoadingSession || !input.trim()}
            aria-label="Send message"
            className="h-10 w-10 shrink-0"
          >
            <Send size={15} />
          </Button>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-2xs leading-relaxed text-ink-faint/80">
          <ShieldAlert size={11} className="mt-0.5 shrink-0" />
          This is for informational purposes only and is not financial advice.
        </p>
      </div>
    </div>
  );
}
