import { useEffect, useState } from "react";
import { THEME_IDS } from "../../constants/themes";
import { STORAGE_THEME } from "../../constants/storageKeys";
import type { ThemeMode } from "../../types";

const LEGACY_THEME: Record<string, ThemeMode> = {
  light: "paper",
  dark: "obsidian",
  graphite: "fog",
  midnight: "obsidian"
};

function readInitialTheme(): ThemeMode {
  const raw = window.localStorage.getItem(STORAGE_THEME);
  if (!raw) return "glass";
  const v = raw.trim();
  if (THEME_IDS.has(v as ThemeMode)) return v as ThemeMode;
  return LEGACY_THEME[v] ?? "glass";
}

export function useThemePreference() {
  const [theme, setTheme] = useState<ThemeMode>(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_THEME, theme);
  }, [theme]);

  return { theme, setTheme };
}
