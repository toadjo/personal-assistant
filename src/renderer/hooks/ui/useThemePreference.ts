import { useEffect, useState, useCallback } from "react";
import { applyPreset } from "../../lib/theme/applyTheme";
import { readThemeState, writeThemeState, makeCustomTheme } from "../../lib/theme/storage";
import type { ThemeMode, ThemeState, ThemeTokenKey } from "../../lib/theme/tokens";

export function useThemePreference() {
  const [state, setState] = useState<ThemeState>(readThemeState);
  const theme = state.preset;
  const custom = state.custom;

  useEffect(() => {
    applyPreset(state.preset, state.custom?.overrides);
  }, [state]);

  const setTheme = useCallback((preset: ThemeMode) => {
    const next: ThemeState = { preset };
    setState(next);
    writeThemeState(next);
  }, []);

  const setCustomOverride = useCallback((key: ThemeTokenKey, value: string | undefined) => {
    setState((prev) => {
      const basePreset = prev.custom?.basePreset ?? prev.preset;
      const nextOverrides: Partial<Record<ThemeTokenKey, string>> = { ...(prev.custom?.overrides ?? {}) };
      if (value === undefined || value.trim() === "") {
        delete nextOverrides[key];
      } else {
        nextOverrides[key] = value.trim();
      }
      const next: ThemeState = {
        preset: prev.preset,
        custom: Object.keys(nextOverrides).length > 0 ? makeCustomTheme(basePreset, nextOverrides) : undefined
      };
      writeThemeState(next);
      return next;
    });
  }, []);

  const resetCustomOverrides = useCallback(
    (preset?: ThemeMode) => {
      const target = preset ?? state.preset;
      const next: ThemeState = { preset: target };
      setState(next);
      writeThemeState(next);
    },
    [state.preset]
  );

  return { theme, custom, setTheme, setCustomOverride, resetCustomOverrides };
}
