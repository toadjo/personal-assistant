/**
 * Theme state persistence in localStorage with legacy migration.
 */

import { type ThemeMode, type ThemeState, type CustomTheme, THEME_IDS } from "./tokens";
import { STORAGE_THEME } from "../../constants/storageKeys";

const LEGACY_THEME: Record<string, ThemeMode> = {
  light: "paper",
  dark: "obsidian",
  graphite: "fog",
  midnight: "obsidian"
};

/** Determine the default preset from the system color-scheme preference. */
export function getDefaultPreset(): ThemeMode {
  if (typeof window === "undefined") return "paper";
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  return prefersDark ? "obsidian" : "paper";
}

function isValidTokenValue(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function sanitizeOverrides(raw: unknown): Partial<Record<string, string>> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (isValidTokenValue(v)) {
      result[k] = v.trim();
    }
  }
  return result;
}

function parseStored(raw: string | null): ThemeState | null {
  if (!raw) return null;

  // Structured format with custom theme overrides.
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.preset === "string" && THEME_IDS.has(parsed.preset as ThemeMode)) {
      const state: ThemeState = { preset: parsed.preset as ThemeMode };
      if (parsed.custom && typeof parsed.custom === "object") {
        const custom = parsed.custom as Record<string, unknown>;
        const basePreset =
          typeof custom.basePreset === "string" && THEME_IDS.has(custom.basePreset as ThemeMode)
            ? (custom.basePreset as ThemeMode)
            : state.preset;
        state.custom = {
          basePreset,
          overrides: sanitizeOverrides(custom.overrides)
        };
      }
      return state;
    }
  } catch {
    // Not structured JSON, so fall through to plain string handling.
  }

  // Legacy plain string format, for example "glass", "paper", "light", or "dark".
  const plain = raw.trim();
  if (THEME_IDS.has(plain as ThemeMode)) {
    return { preset: plain as ThemeMode };
  }
  const migrated = LEGACY_THEME[plain];
  if (migrated) {
    return { preset: migrated };
  }

  return null;
}

/** Read theme state from localStorage, migrating legacy values. */
export function readThemeState(): ThemeState {
  const raw = window.localStorage.getItem(STORAGE_THEME);
  const parsed = parseStored(raw);
  if (parsed) return parsed;
  return { preset: getDefaultPreset() };
}

/** Persist theme state to localStorage. */
export function writeThemeState(state: ThemeState): void {
  window.localStorage.setItem(STORAGE_THEME, JSON.stringify(state));
}

/** Create a custom theme derived from the current preset. */
export function makeCustomTheme(basePreset: ThemeMode, overrides: Partial<Record<string, string>>): CustomTheme {
  return {
    basePreset,
    overrides: sanitizeOverrides(overrides)
  };
}
