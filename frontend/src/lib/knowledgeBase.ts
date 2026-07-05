import { api } from "@/lib/api";
import type { KnowledgeArticle } from "@/types";

let cache: Promise<Record<string, KnowledgeArticle>> | null = null;

/** Fetches every knowledge-base article once and caches it for the life of the page -
 * there are only 9 short, static articles (see backend/services/knowledge_base.py), so
 * this is cheaper than a per-article round trip and lets tooltips open instantly after
 * the first load. Resets the cache on failure so the next caller can retry. */
export function loadKnowledgeBase(): Promise<Record<string, KnowledgeArticle>> {
  if (!cache) {
    cache = api
      .getKnowledgeArticles()
      .then((articles) => Object.fromEntries(articles.map((a) => [a.id, a])))
      .catch((err) => {
        cache = null;
        throw err;
      });
  }
  return cache;
}
