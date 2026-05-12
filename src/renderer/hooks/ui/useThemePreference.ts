import { useEffect, useState, useCallback } from "react";
import { applyPreset } from "../../lib/theme/applyTheme";
import { readThemeState, writeThemeState } from "../../lib/theme/storage";
import type { ThemeMode, ThemeState } from "../../lib/theme/tokens";

export function useThemePreference() {
  const [state, setState] = useState<ThemeState>(readThemeState);
  const theme = state.preset;

  useEffect(() => {
    applyPreset(state.preset, state.custom?.overrides);
  }, [state]);

  const setTheme = useCallback(
    (preset: ThemeMode) => {
      const next: ThemeState = { preset };
      setState(next);
      writeThemeState(next);
    },
    []
  );

  return { theme, setTheme };
}
