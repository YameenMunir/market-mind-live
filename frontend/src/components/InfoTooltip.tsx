"use client";

import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";

interface InfoTooltipProps {
  articleId: string;
}

/** A small info icon that reveals a knowledge-base article's title/body on hover, click,
 * or keyboard focus. Hover and click-to-pin are tracked as separate state (not one
 * shared toggle) - a real mouse hovers the button before a click ever lands, so a single
 * toggle would flip straight back to closed on click. Pinning survives the mouse
 * leaving, which is what makes click-to-toggle actually useful for touch/keyboard users;
 * outside-click and Escape clear both. Renders nothing if the article hasn't loaded yet
 * or isn't found - callers that prefetch (see IndicatorPanel.tsx) won't usually hit that
 * gap beyond the very first paint. */
export function InfoTooltip({ articleId }: InfoTooltipProps) {
  const articles = useKnowledgeBase();
  const article = articles[articleId];
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || pinned;
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function close() {
      setHovered(false);
      setPinned(false);
    }
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) close();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!article) return null;

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={`What is ${article.title}?`}
        aria-expanded={open}
        onClick={() => setPinned((prev) => !prev)}
        className="text-ink-faint transition-colors hover:text-ink-muted"
      >
        <Info size={12} />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-xl border border-border bg-surface-raised p-3 text-left shadow-panel"
        >
          <p className="text-xs font-semibold text-ink">{article.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{article.body}</p>
        </div>
      )}
    </span>
  );
}
