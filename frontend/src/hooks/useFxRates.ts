"use client";

import { usePolledResource } from "@/hooks/usePolledResource";
import { api } from "@/lib/api";
import { FX_POLL_MS } from "@/lib/constants";

export function useFxRates() {
  return usePolledResource(() => api.getFxRates(), [], FX_POLL_MS);
}
