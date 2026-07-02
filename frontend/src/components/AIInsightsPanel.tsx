"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send, ShieldAlert, Sparkles, X } from "lucide-react";

import { AIChatMessage } from "@/components/AIChatMessage";
import { StatusBanner } from "@/components/StatusBanner";
import { useAIChat } from "@/hooks/useAIChat";
import { AI_SUGGESTED_QUESTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AIAssetContext } from "@/types";

const SIGNAL_META: Record<string, { label: string; className: string }> = {
  buy: { label: "Buy signal", className: "bg-bull/15 text-bull" },
  sell: { label: "Sell signal", className: "bg-bear/15 text-bear" },
  hold: { label: "Hold signal", className: "bg-warn/15 text-warn" },
};

interface AIInsightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  asset: string;
  buildContext: () => AIAssetContext;
}

export function AIInsightsPanel({ isOpen, onClose, asset, buildContext }: AIInsightsPanelProps) {
  const { messages, isSending, error, sendMessage, sendFeedback, feedbackGiven } = useAIChat({
    asset,
    buildContext,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  const context = isOpen ? buildContext() : null;
  const signalMeta = context?.prediction ? SIGNAL_META[context.prediction.signal] : null;

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-border bg-surface shadow-panel"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                  <Sparkles size={16} className="text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">AI Insights</p>
                  <p className="truncate text-[11px] text-ink-faint">
                    {context?.asset_name ? `${context.asset_name} · ${asset}` : asset}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close AI Insights"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-raised hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            {signalMeta && context?.risk && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", signalMeta.className)}>
                  {signalMeta.label}
                </span>
                <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                  {context.risk.level} risk
                </span>
                {context.data_is_delayed && (
                  <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-ink-faint">
                    Delayed data
                  </span>
                )}
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <p className="text-xs leading-relaxed text-ink-muted">
                    Ask me anything about {asset}'s live price, indicators, prediction, risk score, or backtest
                    results. I'll ground every answer in what's currently on your dashboard.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {AI_SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
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
                  onFeedback={
                    message.role === "assistant" ? (rating) => sendFeedback(message.message_id, rating) : undefined
                  }
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

            <div className="border-t border-border p-3">
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
                  disabled={isSending || !input.trim()}
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
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
