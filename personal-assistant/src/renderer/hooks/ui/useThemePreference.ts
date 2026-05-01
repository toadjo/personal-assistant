import { useEffect, useState } from "react";
import { STORAGE_THEME } from "../../constants/storageKeys";
import type { ThemeMode } from "../../types";

function readInitialTheme(): ThemeMode {
  const saved = window.localStorage.getItem(STORAGE_THEME);
  return saved === "dark" || saved === "light" ? saved : "light";
}

export function useThemePreference() {
  const [theme, setTheme] = useState<ThemeMode>(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_THEME, theme);
  }, [theme]);

  return { theme, setTheme };
}
