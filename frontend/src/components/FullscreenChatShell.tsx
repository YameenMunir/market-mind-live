"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History, Minimize2, MessageSquarePlus, Sparkles, Trash2, X } from "lucide-react";

import { AIChatConversation } from "@/components/AIChatConversation";
import { AIChatHistoryList } from "@/components/AIChatHistoryList";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import type { useAIChat } from "@/hooks/useAIChat";
import { SIGNAL_META } from "@/lib/signalMeta";
import { cn } from "@/lib/utils";
import type { AIAssetContext } from "@/types";

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
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

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

  useEffect(() => {
    setIsConfirmingClear(false);
  }, [chat.sessionId]);

  const openHistory = () => {
    setShowHistory(true);
    chat.refreshSessions();
  };

  const handleClearChat = () => {
    if (chat.sessionId) chat.deleteSession(chat.sessionId);
    setIsConfirmingClear(false);
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
              <Button variant="secondary" size="icon" onClick={onMinimize} aria-label="Minimize to side panel">
                <Minimize2 size={16} />
              </Button>
              <Button variant="secondary" size="icon" onClick={onClose} aria-label="Close AI Insights">
                <X size={17} />
              </Button>
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
                  <Badge tone={signalMeta.tone}>{signalMeta.label}</Badge>
                  <Badge className="font-medium">{context.risk.level} risk</Badge>
                  {context.data_is_delayed && (
                    <Badge className="font-medium text-ink-faint">Delayed data</Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5 sm:px-6">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => (showHistory ? setShowHistory(false) : openHistory())}
              className={cn(showHistory && "border-brand/40 bg-brand/10 text-brand hover:border-brand/40 hover:bg-brand/10")}
            >
              <History size={13} />
              History
            </Button>
            <Button variant="secondary" size="sm" onClick={() => chat.startNewChat()}>
              <MessageSquarePlus size={13} />
              New chat
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsConfirmingClear(true)}
              disabled={!chat.sessionId || chat.messages.length <= 1}
            >
              <Trash2 size={13} />
              Clear chat
            </Button>
          </div>

          {isConfirmingClear && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-bear/5 px-4 py-2.5 sm:px-6">
              <p className="text-xs text-ink">Clear this conversation? This can't be undone.</p>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsConfirmingClear(false)}
                  className="h-auto px-2 py-1 text-[11px]"
                >
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={handleClearChat} className="h-auto px-2 py-1 text-[11px]">
                  Clear chat
                </Button>
              </div>
            </div>
          )}

          <div className="relative flex min-h-0 flex-1">
            {showHistory && (
              <AIChatHistoryList
                className="absolute inset-0 z-10 bg-canvas sm:static sm:z-auto sm:w-80 sm:shrink-0 sm:border-r sm:border-border"
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
