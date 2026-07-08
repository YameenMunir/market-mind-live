"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { GeminiKeyStatus } from "@/types";

const INITIAL_STATUS: GeminiKeyStatus = { has_key: false, masked_key: null, updated_at: null };

/** Device-persisted Gemini API key (BYOK) status - see backend/api/gemini_key.py. The
 * decrypted key itself never comes back from the API; only has_key/masked_key do. */
export function useGeminiKey() {
  const [status, setStatus] = useState<GeminiKeyStatus>(INITIAL_STATUS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getGeminiKeyStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        // Treat a failed fetch as "not configured" rather than blocking the UI.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (apiKey: string) => {
    const updated = await api.setGeminiKey(apiKey);
    setStatus(updated);
    return updated;
  }, []);

  const remove = useCallback(async () => {
    const updated = await api.deleteGeminiKey();
    setStatus(updated);
    return updated;
  }, []);

  return { status, isLoading, save, remove };
}
