"use client";

import { useGeminiKeyContext } from "@/contexts/GeminiKeyContext";

/** Hook to consume the global device-persisted Gemini API key status.
 * The decrypted key itself never comes back from the API; only has_key/masked_key do. */
export function useGeminiKey() {
  return useGeminiKeyContext();
}
