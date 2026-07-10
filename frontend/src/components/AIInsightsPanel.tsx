"use client";

import { useEffect, useState } from "react";
import { History, Maximize2, MessageSquarePlus, Sparkles, Trash2, X } from "lucide-react";

import { AIChatConversation } from "@/components/AIChatConversation";
import { AIChatHistoryList } from "@/components/AIChatHistoryList";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { FullscreenChatShell } from "@/components/FullscreenChatShell";
import { useAIChat } from "@/hooks/useAIChat";
import { SIGNAL_META } from "@/lib/signalMeta";
import { cn } from "@/lib/utils";
import type { AIAssetContext } from "@/types";

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
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  useEffect(() => {
    setIsConfirmingClear(false);
  }, [chat.sessionId]);

  const context = isOpen ? buildContext() : null;
  const signalMeta = context?.prediction ? SIGNAL_META[context.prediction.signal] : null;

  const openHistory = () => {
    setShowHistory(true);
    chat.refreshSessions();
  };

  const handleClearChat = () => {
    if (chat.sessionId) chat.deleteSession(chat.sessionId);
    setIsConfirmingClear(false);
  };

  return (
    <>
      <Dialog
        isOpen={isOpen && !isFullscreen}
        onClose={onClose}
        variant="drawer"
        labelledBy="ai-insights-panel-title"
        className="max-w-[420px]"
      >
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-brand/25 bg-brand/5">
                    <Sparkles size={16} className="text-brand" />
                  </div>
                  <div className="min-w-0">
                    <p id="ai-insights-panel-title" className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                      AI Insights
                    </p>
                    <p className="truncate font-mono text-[9px] uppercase tracking-wider text-ink-faint">
                      {context?.asset_name ? `${context.asset_name} · ${asset}` : asset}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => (showHistory ? setShowHistory(false) : openHistory())}
                    aria-label="Chat history"
                    className={cn(showHistory && "bg-brand/10 text-brand hover:bg-brand/10 hover:text-brand")}
                  >
                    <History size={15} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => chat.startNewChat()} aria-label="New chat">
                    <MessageSquarePlus size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsConfirmingClear(true)}
                    aria-label="Clear chat"
                    disabled={!chat.sessionId || chat.messages.length <= 1}
                  >
                    <Trash2 size={15} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setIsFullscreen(true)} aria-label="Expand to full screen">
                    <Maximize2 size={15} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close AI Insights">
                    <X size={16} />
                  </Button>
                </div>
              </div>

              {isConfirmingClear && (
                <div className="flex items-center justify-between gap-2 border-b border-border bg-bear/5 px-4 py-2.5">
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

              {signalMeta && context?.risk && (
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
                  <Badge tone={signalMeta.tone}>{signalMeta.label}</Badge>
                  <Badge className="font-medium">{context.risk.level} risk</Badge>
                  {context.data_is_delayed && (
                    <Badge className="font-medium text-ink-faint">Delayed data</Badge>
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
      </Dialog>

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
