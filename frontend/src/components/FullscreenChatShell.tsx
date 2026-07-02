"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History, Minimize2, MessageSquarePlus, Sparkles, X } from "lucide-react";

import { AIChatConversation } from "@/components/AIChatConversation";
import { AIChatHistoryList } from "@/components/AIChatHistoryList";
import type { useAIChat } from "@/hooks/useAIChat";
import { cn } from "@/lib/utils";
import type { AIAssetContext } from "@/types";

const SIGNAL_META: Record<string, { label: string; className: string }> = {
  buy: { label: "Buy signal", className: "bg-bull/15 text-bull" },
  sell: { label: "Sell signal", className: "bg-bear/15 text-bear" },
  hold: { label: "Hold signal", className: "bg-warn/15 text-warn" },
};

interface FullscreenChatShellProps {
  isOpen: boolean;
  /** Collapses back to the compact side-panel view, keeping the same conversation. */
  onMinimize: () => void;
  /** Fully closes the assistant. */
  onClose: () => void;
  asset: string;
  context: AIAssetContext | null;
  chat: ReturnType<typeof useAIChat>;
}

export function FullscreenChatShell({ isOpen, onMinimize, onClose, asset, context, chat }: FullscreenChatShellProps) {
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMinimize();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onMinimize]);

  const signalMeta = context?.prediction ? SIGNAL_META[context.prediction.signal] : null;

  const openHistory = () => {
    setShowHistory(true);
    chat.refreshSessions();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex flex-col bg-canvas"
        >
          <div className="relative shrink-0 border-b border-border px-4 py-3.5 sm:px-6">
            <div className="absolute right-4 top-3 flex items-center gap-1.5 sm:right-6">
              <button
                onClick={onMinimize}
                aria-label="Minimize to side panel"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-raised text-ink-muted transition-colors hover:text-ink"
              >
                <Minimize2 size={16} />
              </button>
              <button
                onClick={onClose}
                aria-label="Close AI Insights"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-raised text-ink-muted transition-colors hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pr-24">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                  <Sparkles size={17} className="text-brand" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">AI Insights</p>
                  <h2 className="text-sm font-semibold text-ink">
                    {context?.asset_name ? `${context.asset_name} · ${asset}` : asset}
                  </h2>
                </div>
              </div>

              {signalMeta && context?.risk && (
                <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5 sm:px-6">
            <button
              onClick={() => (showHistory ? setShowHistory(false) : openHistory())}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                showHistory
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-border bg-surface-raised text-ink-muted hover:text-ink"
              )}
            >
              <History size={13} />
              History
            </button>
            <button
              onClick={() => chat.startNewChat()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
            >
              <MessageSquarePlus size={13} />
              New chat
            </button>
          </div>

          <div className="flex min-h-0 flex-1">
            {showHistory && (
              <AIChatHistoryList
                className="w-80 shrink-0 border-r border-border"
                sessions={chat.sessions}
                isLoading={chat.isLoadingSessions}
                activeSessionId={chat.sessionId}
                onSelect={(id) => chat.loadSession(id)}
                onDelete={chat.deleteSession}
                onNewChat={() => chat.startNewChat()}
              />
            )}
            <AIChatConversation
              asset={asset}
              messages={chat.messages}
              isSending={chat.isSending}
              isLoadingSession={chat.isLoadingSession}
              error={chat.error}
              onSend={chat.sendMessage}
              onFeedback={chat.sendFeedback}
              feedbackGiven={chat.feedbackGiven}
              size="fullscreen"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
