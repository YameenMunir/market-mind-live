import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Minus,
  RotateCw,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { MarkdownContent } from "@/components/MarkdownContent";
import { cn } from "@/lib/utils";
import type { ChatMessage, FeedbackRating } from "@/types";

interface AIChatMessageProps {
  message: ChatMessage;
  onFeedback?: (rating: FeedbackRating) => void;
  feedbackGiven?: FeedbackRating;
  /** Only wired for the conversation's single most recent assistant reply - regenerating
   * an earlier one would leave it "replaced in place" out of chronological order without
   * also discarding everything after it, which this simple (non-branching) chat history
   * doesn't support. */
  onRegenerate?: () => void;
  /** Slightly larger type/spacing in full-screen mode where there's room to breathe. */
  size?: "compact" | "fullscreen";
  /** True while this specific message is the one actively streaming - drives the
   * thinking-dots/blinking-cursor treatment. Also skips InsightCard detection, which
   * otherwise would restructure the bubble mid-stream as more bullet lines complete
   * (cards appearing/reordering), which is exactly the kind of layout jump streaming
   * responses shouldn't cause - see the requirements this satisfies. */
  isStreaming?: boolean;
  /** Disables the pulsing/blinking motion for this message without affecting content
   * delivery - a manual "I'd rather not see this" toggle alongside the automatic
   * prefers-reduced-motion handling (both use the same motion-safe: variant). */
  skipAnimation?: boolean;
  /** True when the backend's post-hoc numeric grounding check (services/
   * grounding_check.py) flagged this reply as containing a figure it couldn't trace
   * back to the underlying data - see ChatResponse.unverified_figures. A soft,
   * non-blocking hint to double-check this specific reply, not an error state. */
  hasUnverifiedFigures?: boolean;
}

interface InsightSection {
  label: string;
  body: string;
}

interface ParsedInsight {
  intro: string;
  sections: InsightSection[];
  footer: string;
}

// Matches a section heading line in the AI's own reply shape: a bolded label,
// optionally preceded by a number marker ("1. ") and optionally followed by inline
// body text on the same line - the rest of that section's body, if any, follows on
// subsequent non-heading lines (see parseInsightSections below). Deliberately does
// NOT treat a "* "/"- " bullet marker as a heading prefix - both the live prompt and
// the mock provider (mock_ai_provider.py, e.g. "- **Bull Scenario**: ...") use
// dash/asterisk bullets exclusively for sub-items *within* a section, never for the
// section heading itself, so allowing them here would misread a bold-labeled
// sub-bullet as the start of a new section and truncate the one it belongs to.
const SECTION_HEADING = /^(?:\d+\.\s+)?\*\*([^*]+)\*\*:?\s*(.*)$/;

// Substrings (checked case-insensitively against a heading's label) recognized as
// one of the assistant's own structured-reply sections - covers both the live
// Gemini prompt's headings (ai_insights_service.py's response_structure: "Direct
// Answer", "Bullish vs. Bearish Factors", "Key Risks", "Confidence Level",
// "Actionable Scenarios / What to Watch Next", "Balanced Conclusion") and the mock
// provider's (mock_ai_provider.py: "Bullish/Bearish Factors", "Key Risks", "Model
// Confidence", "Actionable Scenarios", "Balanced Conclusion", "{TICKER}
// Strengths", ...). Gates which bolded lines get treated as card sections instead
// of being left as ordinary prose.
const KNOWN_SECTION_KEYWORDS = [
  "direct answer",
  "reasoning",
  "bullish",
  "bearish",
  "risk",
  "confidence",
  "actionable",
  "scenario",
  "conclusion",
  "strengths",
  "market status",
  "ai prediction",
  "technical",
  "methodology",
];

function isKnownSectionLabel(label: string): boolean {
  const l = label.toLowerCase();
  return KNOWN_SECTION_KEYWORDS.some((k) => l.includes(k));
}

function parseInsightSections(content: string): ParsedInsight | null {
  const lines = content.split("\n");
  const intro: string[] = [];
  const sections: InsightSection[] = [];
  let current: InsightSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(SECTION_HEADING);
    const label = match?.[1]?.trim();

    if (match && label && isKnownSectionLabel(label)) {
      current = { label, body: match[2].trim() };
      sections.push(current);
    } else if (current) {
      if (line) current.body = current.body ? `${current.body}\n${line}` : line;
    } else if (line) {
      intro.push(line);
    }
  }

  // Require at least two recognized headings before switching to card layout - a
  // single stray bold phrase in otherwise free-form prose (e.g. an isolated
  // "**Note**") shouldn't be enough to reshape the whole reply.
  if (sections.length < 2) return null;

  // Trailing standalone lines (the disclaimer, or a "data is delayed"/"missing
  // data" note - see mock_ai_provider.py) read better pulled out into a separate
  // footer than buried inside the last section's body.
  const last = sections[sections.length - 1];
  const bodyLines = last.body.split("\n");
  const footerLines: string[] = [];
  while (bodyLines.length > 1 && /^(_[^_]+_|Note:.*)$/i.test(bodyLines[bodyLines.length - 1])) {
    footerLines.unshift(bodyLines.pop()!);
  }
  if (footerLines.length > 0) {
    last.body = bodyLines.join("\n").trim();
  }

  return { intro: intro.join(" "), sections, footer: footerLines.join("\n") };
}

interface SectionMeta {
  icon: LucideIcon;
  iconClass: string;
  badgeClass: string;
}

/** Presentation-only: picks an icon + color for a section based on its label and,
 * where useful, keywords already present in the model's own wording (e.g. "sell" /
 * "bearish" / "high risk") - never invents or alters the underlying analysis. */
function getSectionMeta(label: string, body: string): SectionMeta {
  const l = label.toLowerCase();
  const b = body.toLowerCase();

  if (l.includes("risk")) {
    if (b.includes("extreme")) return { icon: ShieldAlert, iconClass: "text-bear", badgeClass: "border border-bear/30 bg-bear/5" };
    if (b.includes("high")) return { icon: ShieldAlert, iconClass: "text-brand", badgeClass: "border border-brand/30 bg-brand/5" };
    if (b.includes("low")) return { icon: ShieldAlert, iconClass: "text-bull", badgeClass: "border border-bull/30 bg-bull/5" };
    return { icon: ShieldAlert, iconClass: "text-warn", badgeClass: "border border-warn/30 bg-warn/5" };
  }

  if (l.includes("predict") || l.includes("signal") || l.includes("forecast")) {
    if (b.includes("sell") || b.includes("bearish")) {
      return { icon: TrendingDown, iconClass: "text-bear", badgeClass: "border border-bear/30 bg-bear/5" };
    }
    if (b.includes("buy") || b.includes("bullish")) {
      return { icon: TrendingUp, iconClass: "text-bull", badgeClass: "border border-bull/30 bg-bull/5" };
    }
    return { icon: Minus, iconClass: "text-ink-muted", badgeClass: "border border-border bg-surface-raised" };
  }

  // A combined "Bullish vs. Bearish Factors" section (the live prompt's shape)
  // covers both directions at once, so it gets a neutral chart icon rather than
  // picking a side; the mock provider's separate "Bullish Factors"/"Bearish
  // Factors" (and comparison "{TICKER} Strengths") sections are single-sided and
  // get the directional treatment.
  if (l.includes("bullish") && l.includes("bearish")) {
    return { icon: BarChart3, iconClass: "text-brand", badgeClass: "border border-brand/30 bg-brand/5" };
  }
  if (l.includes("bullish") || l.includes("strengths")) {
    return { icon: TrendingUp, iconClass: "text-bull", badgeClass: "border border-bull/30 bg-bull/5" };
  }
  if (l.includes("bearish")) {
    return { icon: TrendingDown, iconClass: "text-bear", badgeClass: "border border-bear/30 bg-bear/5" };
  }

  if (l.includes("confidence")) {
    return { icon: Activity, iconClass: "text-brand", badgeClass: "border border-brand/30 bg-brand/5" };
  }

  if (l.includes("actionable") || l.includes("scenario")) {
    return { icon: BarChart3, iconClass: "text-brand", badgeClass: "border border-brand/30 bg-brand/5" };
  }

  if (l.includes("technical") || l.includes("trend")) {
    return { icon: BarChart3, iconClass: "text-brand", badgeClass: "border border-brand/30 bg-brand/5" };
  }

  if (l.includes("market") || l.includes("status") || l.includes("data")) {
    return { icon: Clock, iconClass: "text-ink-muted", badgeClass: "border border-border bg-surface-raised" };
  }

  return { icon: Activity, iconClass: "text-ink-muted", badgeClass: "border border-border bg-surface-raised" };
}

function InsightCard({ insight, size }: { insight: ParsedInsight; size: "compact" | "fullscreen" }) {
  const isFullscreen = size === "fullscreen";

  return (
    <div
      className={cn(
        "w-full rounded-sm border border-border bg-surface-raised break-words",
        isFullscreen ? "max-w-2xl p-5" : "max-w-[92%] p-4"
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-ink-faint border-b border-border/60 pb-2">
        <Sparkles size={13} className="text-brand" />
        <p className="font-mono text-2xs font-bold uppercase tracking-wider text-ink-muted">AI Insights</p>
      </div>

      {insight.intro && <MarkdownContent content={insight.intro} size={size} className="mb-4 text-ink" />}

      <div className="space-y-2.5">
        {insight.sections.map((section, i) => {
          const meta = getSectionMeta(section.label, section.body);
          const Icon = meta.icon;
          return (
            <div
              key={i}
              className="flex gap-3 rounded-sm border border-border bg-surface p-3"
            >
              <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm", meta.badgeClass)}>
                <Icon size={14} className={meta.iconClass} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-2xs font-bold uppercase tracking-wider text-ink-faint">{section.label}</p>
                <MarkdownContent content={section.body} size={size} className="mt-1 text-ink-muted" />
              </div>
            </div>
          );
        })}
      </div>

      {insight.footer && (
        <div className="mt-4 flex items-start gap-2 border-t border-border/60 pt-3 font-mono text-2xs uppercase tracking-wide leading-relaxed text-ink-faint/80">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <MarkdownContent content={insight.footer} size={size} />
        </div>
      )}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5" role="status" aria-label="AI is thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-ink-faint motion-safe:animate-bounce"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

export function AIChatMessage({
  message,
  onFeedback,
  feedbackGiven,
  onRegenerate,
  size = "compact",
  isStreaming,
  skipAnimation,
  hasUnverifiedFigures,
}: AIChatMessageProps) {
  const isUser = message.role === "user";
  const isFullscreen = size === "fullscreen";
  const insight = !isUser && !isStreaming ? parseInsightSections(message.content) : null;
  const isThinking = Boolean(isStreaming) && message.content === "";

  return (
    <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
      {insight ? (
        <InsightCard insight={insight} size={size} />
      ) : (
        <div
          className={cn(
            "rounded-sm leading-relaxed border break-words",
            isFullscreen ? "max-w-2xl px-4 py-3 text-sm" : "max-w-[92%] px-3.5 py-2.5 text-xs",
            isUser ? "border-brand/35 bg-brand/5 text-ink font-mono font-medium tracking-wide" : "border-border bg-surface-raised text-ink-muted"
          )}
        >
          {isThinking ? (
            <ThinkingDots />
          ) : isUser ? (
            // User messages are always literal, never markdown - a user who types a
            // literal "*" shouldn't have it reinterpreted as formatting.
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : (
            <>
              <MarkdownContent content={message.content} size={size} />
              {isStreaming && (
                <span
                  aria-hidden
                  className={cn(
                    "ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-ink-faint",
                    !skipAnimation && "motion-safe:animate-pulse-soft"
                  )}
                />
              )}
            </>
          )}
        </div>
      )}

      {!isUser && !isStreaming && hasUnverifiedFigures && (
        <div className="flex items-center gap-1.5 px-1 font-mono text-2xs uppercase tracking-wide text-warn/90">
          <AlertTriangle size={11} className="shrink-0" />
          Double-check the figures in this reply
        </div>
      )}

      {!isUser && !isStreaming && (onFeedback || onRegenerate) && (
        <div className="flex items-center gap-1 px-1">
          {onFeedback && (
            <>
              <button
                type="button"
                aria-label="Good response"
                onClick={() => onFeedback("up")}
                aria-pressed={feedbackGiven === "up"}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  feedbackGiven === "up" ? "bg-bull/15 text-bull" : "text-ink-faint hover:bg-surface-raised hover:text-ink-muted"
                )}
              >
                <ThumbsUp size={12} />
              </button>
              <button
                type="button"
                aria-label="Poor response"
                onClick={() => onFeedback("down")}
                aria-pressed={feedbackGiven === "down"}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  feedbackGiven === "down" ? "bg-bear/15 text-bear" : "text-ink-faint hover:bg-surface-raised hover:text-ink-muted"
                )}
              >
                <ThumbsDown size={12} />
              </button>
            </>
          )}
          {onRegenerate && (
            <button
              type="button"
              aria-label="Regenerate response"
              title="Regenerate response"
              onClick={onRegenerate}
              className="flex h-9 w-9 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink-muted"
            >
              <RotateCw size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
