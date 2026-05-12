/**
 * Apply theme tokens to the document root as CSS custom properties.
 */

import { TOKEN_CSS_VAR, type ThemeTokenKey, type ThemeMode } from "./tokens";
import { resolveTokens } from "./tokens";

/** Apply a resolved token map to the document root. */
export function applyThemeTokens(tokens: Record<ThemeTokenKey, string>): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens) as [ThemeTokenKey, string][]) {
    const cssVar = TOKEN_CSS_VAR[key];
    if (cssVar) {
      root.style.setProperty(cssVar, value);
    }
  }
}

/** Apply a preset, optionally with custom overrides. Also sets data-theme for structural CSS. */
export function applyPreset(preset: ThemeMode, overrides?: Partial<Record<ThemeTokenKey, string>>): void {
  const tokens = resolveTokens(preset, overrides);
  applyThemeTokens(tokens);
  document.documentElement.setAttribute("data-theme", preset);
}

/** Remove all dynamically applied theme CSS variables from the root. */
export function clearThemeTokens(): void {
  const root = document.documentElement;
  for (const cssVar of Object.values(TOKEN_CSS_VAR)) {
    root.style.removeProperty(cssVar);
  }
  root.removeAttribute("data-theme");
}
