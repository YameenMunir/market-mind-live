"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { ExperienceMode } from "@/types";

/** Device-persisted dashboard preferences (see backend/api/settings.py). Defaults to
 * "advanced" - today's unchanged full dashboard - until the fetch resolves, so existing
 * users see zero flicker/regression on load. `setExperienceMode` updates local state
 * immediately (optimistic) and fires the write in the background; failures are swallowed
 * the same way `useChartPreferences` ignores corrupt storage - this is a low-stakes
 * preference, not worth retry/rollback machinery. */
export function useUserSettings() {
  const [experienceMode, setExperienceModeState] = useState<ExperienceMode>("advanced");
  // Guards against the initial GET (issued on mount) resolving *after* the user has
  // already clicked a mode - without this, a slow fetch can land after an optimistic
  // update and clobber it back to the stale pre-click value.
  const hasLocalChangeRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getUserSettings()
      .then((settings) => {
        if (!cancelled && !hasLocalChangeRef.current) setExperienceModeState(settings.experience_mode);
      })
      .catch(() => {
        // Keep the "advanced" default - matches today's dashboard if the fetch fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setExperienceMode = useCallback((mode: ExperienceMode) => {
    hasLocalChangeRef.current = true;
    setExperienceModeState(mode);
    api.updateUserSettings({ experience_mode: mode }).catch(() => {
      // Best-effort persistence - the toggle still works for this session either way.
    });
  }, []);

  return { experienceMode, setExperienceMode };
}
