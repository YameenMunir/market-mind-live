"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, ShieldAlert } from "lucide-react";

import { AIChatMessage } from "@/components/AIChatMessage";
import { StatusBanner } from "@/components/StatusBanner";
import { AI_SUGGESTED_QUESTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ChatMessage, FeedbackRating } from "@/types";

interface AIChatConversationProps {
  asset: string;
  messages: ChatMessage[];
  isSending: boolean;
  isLoadingSession: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onFeedback: (messageId: string, rating: FeedbackRating) => void;
  feedbackGiven: Record<string, FeedbackRating>;
  /** Slightly larger type/spacing in full-screen mode where there's room to breathe. */
  size?: "compact" | "fullscreen";
}

export function AIChatConversation({
  asset,
  messages,
  isSending,
  isLoadingSession,
  error,
  onSend,
  onFeedback,
  feedbackGiven,
  size = "compact",
}: AIChatConversationProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFullscreen = size === "fullscreen";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className={cn("flex-1 space-y-4 overflow-y-auto", isFullscreen ? "mx-auto w-full max-w-3xl px-4 py-6 sm:px-0" : "px-4 py-4")}
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
                  className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-left text-[11px] text-ink-muted transition-colors hover:border-brand/40 hover:text-ink"
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
          />
        ))}

        {isSending && (
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-ink-faint">
            <Loader2 size={13} className="animate-spin" />
            Thinking through the current data...
          </div>
        )}

        {error && <StatusBanner message={error} tone="error" icon="warning" />}
      </div>

      <div className={cn("border-t border-border p-3", isFullscreen && "mx-auto w-full max-w-3xl border-t-0 pt-0")}>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about this asset's data..."
            rows={1}
            className="max-h-28 flex-1 resize-none rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand/60 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={isSending || isLoadingSession || !input.trim()}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-faint">
          <ShieldAlert size={11} className="mt-0.5 shrink-0" />
          This is for informational purposes only and is not financial advice.
        </p>
      </div>
    </div>
  );
}
