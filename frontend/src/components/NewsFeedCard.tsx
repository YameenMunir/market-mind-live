import { Clock, ExternalLink, Newspaper } from "lucide-react";

import { LastUpdated } from "@/components/LastUpdated";
import { Panel } from "@/components/Panel";
import { timeAgo } from "@/lib/utils";
import type { ApiError, NewsFeed } from "@/types";

interface NewsFeedCardProps {
  news: NewsFeed | null;
  isLoading?: boolean;
  error?: ApiError | null;
}

export function NewsFeedCard({ news, isLoading, error }: NewsFeedCardProps) {
  const articles = news?.articles ?? [];

  return (
    <Panel eyebrow="News" title="Recent Headlines" className="flex h-full flex-col">
      {!news && error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border px-3 py-6 text-center">
          <Clock size={18} className="text-ink-faint" aria-hidden />
          <p className="text-xs font-mono font-bold uppercase text-ink-muted">
            {error.errorCode === "rate_limited" ? "Rate-Limited" : "Load Failed"}
          </p>
          <p className="font-mono text-2xs leading-relaxed text-ink-faint">
            {error.errorCode === "rate_limited"
              ? "The market data provider is busy. Automatic retry active."
              : error.message}
          </p>
        </div>
      ) : !news && isLoading ? (
        <div aria-hidden className="animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5 border-b border-border/60 pb-3 last:border-0">
              <div className="h-3 w-full rounded-sm bg-surface-raised" />
              <div className="h-3 w-2/3 rounded-sm bg-surface-raised" />
              <div className="h-2.5 w-24 rounded-sm bg-surface-raised" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border px-3 py-6 text-center">
          <Newspaper size={18} className="text-ink-faint" aria-hidden />
          <p className="font-mono text-xs font-bold uppercase text-ink-muted">No Recent News</p>
          <p className="font-mono text-2xs leading-relaxed text-ink-faint">
            No headlines available for this symbol right now.
          </p>
        </div>
      ) : (
        <ul className="-mx-1 max-h-80 space-y-3 overflow-y-auto px-1">
          {articles.map((article, i) => (
            <li key={`${article.url}-${i}`} className={i < articles.length - 1 ? "border-b border-border/60 pb-3" : ""}>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-snug text-ink group-hover:text-brand">
                    {article.title}
                  </p>
                  <p className="mt-1 font-mono text-2xs uppercase text-ink-faint">
                    {[article.publisher, article.published_at ? timeAgo(article.published_at) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <ExternalLink
                  size={12}
                  className="mt-0.5 shrink-0 text-ink-faint transition-colors group-hover:text-brand"
                  aria-hidden
                />
              </a>
            </li>
          ))}
        </ul>
      )}

      {news && (
        <div className="mt-auto pt-3">
          <div className="border-t border-border pt-3">
            <LastUpdated updatedAt={news.as_of} isStale={news.is_stale} />
          </div>
        </div>
      )}
    </Panel>
  );
}
