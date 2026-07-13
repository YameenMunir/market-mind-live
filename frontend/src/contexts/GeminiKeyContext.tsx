"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api";
import { getDeviceId } from "@/lib/deviceId";
import { encryptKey, decryptKey } from "@/lib/secureStorage";
import type { GeminiKeyStatus } from "@/types";

const ENCRYPTED_KEY_STORAGE_KEY = "mml-encrypted-gemini-key";
const PROMPT_DISMISSED_STORAGE_KEY = "mml-gemini-key-prompt-dismissed";
const INITIAL_STATUS: GeminiKeyStatus = { has_key: false, masked_key: null, updated_at: null };

interface GeminiKeyContextValue {
  status: GeminiKeyStatus;
  isLoading: boolean;
  save: (apiKey: string) => Promise<GeminiKeyStatus>;
  remove: () => Promise<GeminiKeyStatus>;
}

const GeminiKeyContext = createContext<GeminiKeyContextValue | null>(null);

export function GeminiKeyProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GeminiKeyStatus>(INITIAL_STATUS);
  const [isLoading, setIsLoading] = useState(true);

  // Derive encryption salt based on the browser's device ID
  const getSalt = useCallback(() => {
    const deviceId = getDeviceId();
    return `mml-secure-storage-${deviceId}`;
  }, []);

  const remove = useCallback(async () => {
    try {
      await api.deleteGeminiKey();
    } catch (err) {
      console.error("Failed to delete key from backend:", err);
    }

    // Clear local storage key and reset dismissal prompt
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ENCRYPTED_KEY_STORAGE_KEY);
      window.localStorage.removeItem(PROMPT_DISMISSED_STORAGE_KEY);
    }
    const updatedStatus = { has_key: false, masked_key: null, updated_at: null };
    setStatus(updatedStatus);
    return updatedStatus;
  }, []);

  const save = useCallback(async (apiKey: string) => {
    // 1. Save to backend first
    const updated = await api.setGeminiKey(apiKey);

    // 2. Encrypt and store locally if backend success
    if (updated.has_key && typeof window !== "undefined") {
      try {
        const encrypted = await encryptKey(apiKey, getSalt());
        window.localStorage.setItem(ENCRYPTED_KEY_STORAGE_KEY, encrypted);
      } catch (err) {
        console.error("Failed to encrypt key locally:", err);
      }
    }

    setStatus(updated);
    return updated;
  }, [getSalt]);

  useEffect(() => {
    let cancelled = false;

    async function initializeKey() {
      try {
        // Fetch current status from backend
        const backendStatus = await api.getGeminiKeyStatus();

        if (backendStatus.has_key) {
          if (!cancelled) {
            setStatus(backendStatus);
            setIsLoading(false);
          }
          return;
        }

        // If backend does not have the key, check if we have a locally stored one to restore
        if (typeof window !== "undefined") {
          const storedEncrypted = window.localStorage.getItem(ENCRYPTED_KEY_STORAGE_KEY);
          if (storedEncrypted) {
            try {
              const decrypted = await decryptKey(storedEncrypted, getSalt());
              if (decrypted && decrypted.trim()) {
                // Restore to backend
                const restoredStatus = await api.setGeminiKey(decrypted.trim());
                if (!cancelled) {
                  setStatus(restoredStatus);
                  setIsLoading(false);
                }
                return;
              }
            } catch (err) {
              console.error("Failed to decrypt or restore key from local storage:", err);
              // Clean up potentially corrupt key
              window.localStorage.removeItem(ENCRYPTED_KEY_STORAGE_KEY);
            }
          }
        }

        // Default fallback if no key anywhere
        if (!cancelled) {
          setStatus(backendStatus);
          setIsLoading(false);
        }
      } catch {
        // Best-effort, same as useAIChat.ts's refreshSessions - this runs
        // automatically on every app-section page load (mounted once, in
        // AppLayout), so a transient network hiccup or a backend that's still
        // starting up shouldn't surface a console error every time. The UI already
        // degrades correctly either way: `status` just stays INITIAL_STATUS
        // ("no key configured"), which is the same state a genuinely keyless
        // device would show.
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    initializeKey();

    return () => {
      cancelled = true;
    };
  }, [getSalt]);

  const value = {
    status,
    isLoading,
    save,
    remove,
  };

  return <GeminiKeyContext.Provider value={value}>{children}</GeminiKeyContext.Provider>;
}

export function useGeminiKeyContext() {
  const context = useContext(GeminiKeyContext);
  if (!context) {
    throw new Error("useGeminiKeyContext must be used within a GeminiKeyProvider");
  }
  return context;
}
