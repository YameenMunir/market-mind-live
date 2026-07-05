"use client";

import { useEffect, useState } from "react";

import { loadKnowledgeBase } from "@/lib/knowledgeBase";
import type { KnowledgeArticle } from "@/types";

/** Returns the cached knowledge-base articles keyed by id, empty until the (shared,
 * fetch-once) load resolves. Safe to mount from multiple components at once - they all
 * share the same underlying request via lib/knowledgeBase.ts. */
export function useKnowledgeBase(): Record<string, KnowledgeArticle> {
  const [articles, setArticles] = useState<Record<string, KnowledgeArticle>>({});

  useEffect(() => {
    let cancelled = false;
    loadKnowledgeBase()
      .then((data) => {
        if (!cancelled) setArticles(data);
      })
      .catch(() => {
        // Best-effort only - tooltips simply won't render if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return articles;
}
