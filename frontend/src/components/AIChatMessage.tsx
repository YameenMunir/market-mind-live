import { Fragment } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChatMessage, FeedbackRating } from "@/types";

interface AIChatMessageProps {
  message: ChatMessage;
  onFeedback?: (rating: FeedbackRating) => void;
  feedbackGiven?: FeedbackRating;
}

/** Renders `**bold**` spans and line breaks from AI replies without a markdown
 * dependency or `dangerouslySetInnerHTML` - splits into React text nodes only. */
function renderRichText(content: string) {
  return content.split("\n").map((line, lineIndex) => {
    const segments = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return (
      <Fragment key={lineIndex}>
        {segments.map((segment, i) =>
          segment.startsWith("**") && segment.endsWith("**") ? (
            <strong key={i} className="font-semibold text-ink">
              {segment.slice(2, -2)}
            </strong>
          ) : (
            <Fragment key={i}>{segment}</Fragment>
          )
        )}
        {lineIndex < content.split("\n").length - 1 && <br />}
      </Fragment>
    );
  });
}

export function AIChatMessage({ message, onFeedback, feedbackGiven }: AIChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
          isUser ? "bg-brand text-canvas" : "border border-border bg-surface-raised text-ink-muted"
        )}
      >
        {renderRichText(message.content)}
      </div>

      {!isUser && onFeedback && (
        <div className="flex items-center gap-1 px-1">
          <button
            type="button"
            aria-label="Good response"
            onClick={() => onFeedback("up")}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
              feedbackGiven === "up" ? "bg-bull/15 text-bull" : "text-ink-faint hover:text-ink-muted"
            )}
          >
            <ThumbsUp size={12} />
          </button>
          <button
            type="button"
            aria-label="Poor response"
            onClick={() => onFeedback("down")}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
              feedbackGiven === "down" ? "bg-bear/15 text-bear" : "text-ink-faint hover:text-ink-muted"
            )}
          >
            <ThumbsDown size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
