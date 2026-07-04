"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History, Maximize2, MessageSquarePlus, Sparkles, X } from "lucide-react";

import { AIChatConversation } from "@/components/AIChatConversation";
import { AIChatHistoryList } from "@/components/AIChatHistoryList";
import { FullscreenChatShell } from "@/components/FullscreenChatShell";
import { useAIChat } from "@/hooks/useAIChat";
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
  const chat = useAIChat({ asset, enabled: isOpen, buildContext });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!isOpen || isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

  const context = isOpen ? buildContext() : null;
  const signalMeta = context?.prediction ? SIGNAL_META[context.prediction.signal] : null;

  const openHistory = () => {
    setShowHistory(true);
    chat.refreshSessions();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && !isFullscreen && (
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
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3.5">
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
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => (showHistory ? setShowHistory(false) : openHistory())}
                    aria-label="Chat history"
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                      showHistory ? "bg-brand/10 text-brand" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                    )}
                  >
                    <History size={15} />
                  </button>
                  <button
                    onClick={() => chat.startNewChat()}
                    aria-label="New chat"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-raised hover:text-ink"
                  >
                    <MessageSquarePlus size={15} />
                  </button>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    aria-label="Expand to full screen"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-raised hover:text-ink"
                  >
                    <Maximize2 size={15} />
                  </button>
                  <button
                    onClick={onClose}
                    aria-label="Close AI Insights"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-raised hover:text-ink"
                  >
                    <X size={16} />
                  </button>
                </div>
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

              {showHistory ? (
                <AIChatHistoryList
                  className="flex-1"
                  sessions={chat.sessions}
                  isLoading={chat.isLoadingSessions}
                  activeSessionId={chat.sessionId}
                  onSelect={(id) => {
                    chat.loadSession(id);
                    setShowHistory(false);
                  }}
                  onDelete={chat.deleteSession}
                  onNewChat={() => {
                    chat.startNewChat();
                    setShowHistory(false);
                  }}
                />
              ) : (
                <AIChatConversation
                  asset={asset}
                  messages={chat.messages}
                  isSending={chat.isSending}
                  isLoadingSession={chat.isLoadingSession}
                  error={chat.error}
                  onSend={chat.sendMessage}
                  onFeedback={chat.sendFeedback}
                  feedbackGiven={chat.feedbackGiven}
                  size="compact"
                />
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <FullscreenChatShell
        isOpen={isOpen && isFullscreen}
        onMinimize={() => setIsFullscreen(false)}
        onClose={() => {
          setIsFullscreen(false);
          onClose();
        }}
        asset={asset}
        context={context}
        chat={chat}
      />
    </>
  );
}
