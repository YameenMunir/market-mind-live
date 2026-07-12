import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  /** Slightly larger type in full-screen mode, matching AIChatMessage's own sizing. */
  size?: "compact" | "fullscreen";
  className?: string;
}

/** Renders AI chat replies as real markdown (headings, lists, tables, links, bold/
 * italic, code blocks) instead of the old bold-only `renderRichText`. Deliberately
 * does not enable raw HTML (no `rehype-raw`) and never uses `dangerouslySetInnerHTML`
 * - react-markdown parses to React elements only, so AI-generated (or streamed,
 * possibly-incomplete) text can never inject markup.
 *
 * Safe to call on partial/incomplete markdown mid-stream - remark is lenient by
 * design (an unclosed `**` or code fence just renders as literal text/an open block
 * until the closing token arrives in a later chunk), which is the same class of
 * behavior production streaming markdown UIs (ChatGPT, Claude) exhibit. */
export function MarkdownContent({ content, size = "compact", className }: MarkdownContentProps) {
  const isFullscreen = size === "fullscreen";
  const textSize = isFullscreen ? "text-sm" : "text-xs";

  const components: Components = {
    p: ({ children }) => <p className={cn("mb-2 leading-relaxed last:mb-0", textSize)}>{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand underline underline-offset-2 hover:text-brand-strong"
      >
        {children}
      </a>
    ),
    h1: ({ children }) => <h4 className={cn("mb-1.5 mt-3 font-semibold text-ink first:mt-0", isFullscreen ? "text-base" : "text-sm")}>{children}</h4>,
    h2: ({ children }) => <h4 className={cn("mb-1.5 mt-3 font-semibold text-ink first:mt-0", isFullscreen ? "text-base" : "text-sm")}>{children}</h4>,
    h3: ({ children }) => <h5 className={cn("mb-1 mt-2.5 font-semibold text-ink first:mt-0", textSize)}>{children}</h5>,
    h4: ({ children }) => <h5 className={cn("mb-1 mt-2.5 font-semibold text-ink first:mt-0", textSize)}>{children}</h5>,
    h5: ({ children }) => <h6 className={cn("mb-1 mt-2 font-semibold text-ink first:mt-0", textSize)}>{children}</h6>,
    h6: ({ children }) => <h6 className={cn("mb-1 mt-2 font-semibold text-ink first:mt-0", textSize)}>{children}</h6>,
    ul: ({ children }) => <ul className={cn("mb-2 list-disc space-y-1 pl-5 last:mb-0", textSize)}>{children}</ul>,
    ol: ({ children }) => <ol className={cn("mb-2 list-decimal space-y-1 pl-5 last:mb-0", textSize)}>{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="my-2 border-l-2 border-brand/40 pl-3 italic text-ink-muted">{children}</blockquote>
    ),
    hr: () => <hr className="my-3 border-border" />,
    code: ({ className: codeClassName, children, ...props }) => {
      // react-markdown gives inline code no `className`; fenced code blocks get a
      // `language-xxx` className from remark on the <code> inside <pre>. That's the
      // only reliable signal to distinguish them - unlike most markdown renderers,
      // react-markdown doesn't pass an `inline` prop.
      const isBlock = Boolean(codeClassName);
      if (isBlock) {
        return (
          <code className={cn("block whitespace-pre font-mono text-2xs leading-relaxed text-ink", codeClassName)} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className="rounded-sm bg-surface px-1 py-0.5 font-mono text-2xs text-ink" {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="my-2 overflow-x-auto rounded-sm border border-border bg-surface p-3">{children}</pre>
    ),
    table: ({ children }) => (
      <div className="my-2 overflow-x-auto rounded-sm border border-border">
        <table className={cn("w-full border-collapse", textSize)}>{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="border-b border-border bg-surface">{children}</thead>,
    tr: ({ children }) => <tr className="border-b border-border/60 last:border-0">{children}</tr>,
    th: ({ children }) => (
      <th className="px-2.5 py-1.5 text-left font-mono text-2xs font-bold uppercase tracking-wider text-ink-faint">
        {children}
      </th>
    ),
    td: ({ children }) => <td className="px-2.5 py-1.5 align-top">{children}</td>,
  };

  return (
    <div className={cn("break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
