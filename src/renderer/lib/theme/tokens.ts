/**
 * Theme token system (v1.5.6).
 *
 * All theme colors flow through typed tokens that map to CSS custom properties.
 * Presets define full token sets. Custom themes start from a preset and override
 * individual tokens. The renderer applies tokens by setting properties on
 * document.documentElement.style.
 */

import type { ThemeMode as ThemeModeFromTypes } from "../../types";
export type ThemeMode = ThemeModeFromTypes;

export type ThemeTokenKey =
  | "bg"
  | "text"
  | "title"
  | "subtitle"
  | "panelBg"
  | "panelBorder"
  | "surfaceBorderStrong"
  | "statBg"
  | "statBorder"
  | "statText"
  | "inputBg"
  | "inputBorder"
  | "inputText"
  | "primary"
  | "primaryHover"
  | "primarySoft"
  | "focusRing"
  | "muted"
  | "listText"
  | "ghostBg"
  | "ghostText"
  | "ghostBorder"
  | "successBg"
  | "successBorder"
  | "successText"
  | "errorBg"
  | "errorBorder"
  | "errorText";

/** Map each typed token to its CSS custom property name. */
export const TOKEN_CSS_VAR: Record<ThemeTokenKey, string> = {
  bg: "--bg",
  text: "--text",
  title: "--title",
  subtitle: "--subtitle",
  panelBg: "--panel-bg",
  panelBorder: "--panel-border",
  surfaceBorderStrong: "--surface-border-strong",
  statBg: "--stat-bg",
  statBorder: "--stat-border",
  statText: "--stat-text",
  inputBg: "--input-bg",
  inputBorder: "--input-border",
  inputText: "--input-text",
  primary: "--primary",
  primaryHover: "--primary-hover",
  primarySoft: "--primary-soft",
  focusRing: "--focus-ring",
  muted: "--muted",
  listText: "--list-text",
  ghostBg: "--ghost-bg",
  ghostText: "--ghost-text",
  ghostBorder: "--ghost-border",
  successBg: "--success-bg",
  successBorder: "--success-border",
  successText: "--success-text",
  errorBg: "--error-bg",
  errorBorder: "--error-border",
  errorText: "--error-text"
};

/** A full preset with a label and its complete token map. */
export type ThemePreset = {
  id: ThemeMode;
  label: string;
  tokens: Record<ThemeTokenKey, string>;
};

/** A custom theme derived from a preset with selective overrides. */
export type CustomTheme = {
  basePreset: ThemeMode;
  overrides: Partial<Record<ThemeTokenKey, string>>;
};

/** What we store in localStorage. */
export type ThemeState = {
  preset: ThemeMode;
  custom?: CustomTheme;
};

const GLASS_TOKENS: Record<ThemeTokenKey, string> = {
  bg: "#fafbfc",
  text: "#1d1d21",
  title: "#0a0a0d",
  subtitle: "#5a5a64",
  panelBg: "rgba(255, 255, 255, 0.72)",
  panelBorder: "rgba(0, 0, 0, 0.06)",
  surfaceBorderStrong: "rgba(0, 0, 0, 0.1)",
  statBg: "rgba(255, 255, 255, 0.8)",
  statBorder: "rgba(0, 0, 0, 0.06)",
  statText: "#2a2a32",
  inputBg: "rgba(255, 255, 255, 0.9)",
  inputBorder: "rgba(0, 0, 0, 0.08)",
  inputText: "#111118",
  primary: "#0071e3",
  primaryHover: "#005bb5",
  primarySoft: "rgba(0, 113, 227, 0.08)",
  focusRing: "rgba(0, 113, 227, 0.3)",
  muted: "#6b6b76",
  listText: "#232328",
  ghostBg: "rgba(255, 255, 255, 0.65)",
  ghostText: "#35353d",
  ghostBorder: "rgba(0, 0, 0, 0.06)",
  successBg: "rgba(52, 199, 89, 0.08)",
  successBorder: "rgba(52, 199, 89, 0.22)",
  successText: "#1a7f37",
  errorBg: "rgba(255, 59, 48, 0.06)",
  errorBorder: "rgba(255, 59, 48, 0.22)",
  errorText: "#c42b1f"
};

const PAPER_TOKENS: Record<ThemeTokenKey, string> = {
  bg: "#f6f6f8",
  text: "#141418",
  title: "#0b0b0e",
  subtitle: "#5c5c66",
  panelBg: "rgba(255, 255, 255, 0.94)",
  panelBorder: "rgba(20, 20, 28, 0.1)",
  surfaceBorderStrong: "rgba(20, 20, 28, 0.16)",
  statBg: "rgba(255, 255, 255, 0.88)",
  statBorder: "rgba(20, 20, 28, 0.1)",
  statText: "#2a2a32",
  inputBg: "#ffffff",
  inputBorder: "rgba(20, 20, 28, 0.14)",
  inputText: "#111118",
  primary: "#0066d4",
  primaryHover: "#0055b3",
  primarySoft: "rgba(0, 102, 212, 0.1)",
  focusRing: "rgba(0, 102, 212, 0.35)",
  muted: "#6b6b76",
  listText: "#232328",
  ghostBg: "rgba(255, 255, 255, 0.75)",
  ghostText: "#35353d",
  ghostBorder: "rgba(20, 20, 28, 0.12)",
  successBg: "rgba(46, 125, 50, 0.09)",
  successBorder: "rgba(46, 125, 50, 0.26)",
  successText: "#1b6b2f",
  errorBg: "rgba(181, 34, 48, 0.08)",
  errorBorder: "rgba(181, 34, 48, 0.26)",
  errorText: "#8f1f2b"
};

const OBSIDIAN_TOKENS: Record<ThemeTokenKey, string> = {
  bg: "#000000",
  text: "#ebebeb",
  title: "#ffffff",
  subtitle: "#8f8f8f",
  panelBg: "rgba(8, 8, 8, 0.98)",
  panelBorder: "rgba(255, 255, 255, 0.06)",
  surfaceBorderStrong: "rgba(255, 255, 255, 0.12)",
  statBg: "rgba(18, 18, 18, 0.95)",
  statBorder: "rgba(255, 255, 255, 0.08)",
  statText: "#e4e4e4",
  inputBg: "rgba(10, 10, 10, 0.98)",
  inputBorder: "rgba(255, 255, 255, 0.1)",
  inputText: "#f5f5f5",
  primary: "#7ec8ff",
  primaryHover: "#a6d9ff",
  primarySoft: "rgba(126, 200, 255, 0.14)",
  focusRing: "rgba(126, 200, 255, 0.45)",
  muted: "#8a8a8a",
  listText: "#e0e0e0",
  ghostBg: "rgba(28, 28, 28, 0.65)",
  ghostText: "#e8e8e8",
  ghostBorder: "rgba(255, 255, 255, 0.1)",
  successBg: "rgba(64, 200, 120, 0.12)",
  successBorder: "rgba(100, 220, 150, 0.35)",
  successText: "#b8ffd0",
  errorBg: "rgba(220, 80, 100, 0.14)",
  errorBorder: "rgba(255, 140, 155, 0.35)",
  errorText: "#ffd6dc"
};

const FOG_TOKENS: Record<ThemeTokenKey, string> = {
  bg: "#c4cad4",
  text: "#151820",
  title: "#0e1118",
  subtitle: "#3d4554",
  panelBg: "rgba(248, 249, 252, 0.92)",
  panelBorder: "rgba(32, 40, 56, 0.14)",
  surfaceBorderStrong: "rgba(32, 40, 56, 0.22)",
  statBg: "rgba(255, 255, 255, 0.82)",
  statBorder: "rgba(32, 40, 56, 0.14)",
  statText: "#242a36",
  inputBg: "rgba(255, 255, 255, 0.96)",
  inputBorder: "rgba(32, 40, 56, 0.18)",
  inputText: "#141820",
  primary: "#2a5fbd",
  primaryHover: "#234f9e",
  primarySoft: "rgba(42, 95, 189, 0.12)",
  focusRing: "rgba(42, 95, 189, 0.38)",
  muted: "#4a5364",
  listText: "#1e2430",
  ghostBg: "rgba(255, 255, 255, 0.72)",
  ghostText: "#2a3140",
  ghostBorder: "rgba(32, 40, 56, 0.14)",
  successBg: "rgba(46, 125, 50, 0.1)",
  successBorder: "rgba(46, 125, 50, 0.28)",
  successText: "#1d5c2e",
  errorBg: "rgba(171, 49, 64, 0.1)",
  errorBorder: "rgba(171, 49, 64, 0.28)",
  errorText: "#7a1f2a"
};

const DEEPBLUE_TOKENS: Record<ThemeTokenKey, string> = {
  bg: "#050d18",
  text: "#dce8f4",
  title: "#f4f8ff",
  subtitle: "#7d93ad",
  panelBg: "rgba(14, 32, 54, 0.94)",
  panelBorder: "rgba(100, 160, 220, 0.18)",
  surfaceBorderStrong: "rgba(120, 180, 230, 0.28)",
  statBg: "rgba(18, 42, 72, 0.92)",
  statBorder: "rgba(100, 160, 220, 0.2)",
  statText: "#e8f2fc",
  inputBg: "rgba(10, 26, 48, 0.96)",
  inputBorder: "rgba(100, 160, 220, 0.22)",
  inputText: "#f2f8ff",
  primary: "#5ed4ff",
  primaryHover: "#8ae2ff",
  primarySoft: "rgba(94, 212, 255, 0.16)",
  focusRing: "rgba(94, 212, 255, 0.45)",
  muted: "#8aa3bd",
  listText: "#e4eef8",
  ghostBg: "rgba(22, 48, 78, 0.55)",
  ghostText: "#e8f2fc",
  ghostBorder: "rgba(100, 160, 220, 0.22)",
  successBg: "rgba(56, 200, 140, 0.14)",
  successBorder: "rgba(110, 230, 180, 0.38)",
  successText: "#c6ffea",
  errorBg: "rgba(230, 90, 110, 0.16)",
  errorBorder: "rgba(255, 150, 170, 0.38)",
  errorText: "#ffd8e0"
};

const CORPORATE_TOKENS: Record<ThemeTokenKey, string> = {
  bg: "#f5f6f8",
  text: "#1a1a1f",
  title: "#0e0e12",
  subtitle: "#4a4a52",
  panelBg: "rgba(255, 255, 255, 0.96)",
  panelBorder: "rgba(20, 20, 28, 0.08)",
  surfaceBorderStrong: "rgba(20, 20, 28, 0.14)",
  statBg: "rgba(255, 255, 255, 0.9)",
  statBorder: "rgba(20, 20, 28, 0.08)",
  statText: "#2a2a32",
  inputBg: "#ffffff",
  inputBorder: "rgba(20, 20, 28, 0.1)",
  inputText: "#111118",
  primary: "#1a5fb4",
  primaryHover: "#154a8c",
  primarySoft: "rgba(26, 95, 180, 0.08)",
  focusRing: "rgba(26, 95, 180, 0.3)",
  muted: "#5c5c66",
  listText: "#1f1f24",
  ghostBg: "rgba(255, 255, 255, 0.8)",
  ghostText: "#2a2a32",
  ghostBorder: "rgba(20, 20, 28, 0.08)",
  successBg: "rgba(46, 125, 50, 0.08)",
  successBorder: "rgba(46, 125, 50, 0.22)",
  successText: "#1b6b2f",
  errorBg: "rgba(181, 34, 48, 0.06)",
  errorBorder: "rgba(181, 34, 48, 0.22)",
  errorText: "#8f1f2b"
};

/** Ordered list of all built-in presets. */
export const THEME_PRESETS: ThemePreset[] = [
  { id: "glass", label: "Glass", tokens: GLASS_TOKENS },
  { id: "paper", label: "Paper", tokens: PAPER_TOKENS },
  { id: "corporate", label: "Corporate", tokens: CORPORATE_TOKENS },
  { id: "obsidian", label: "Obsidian", tokens: OBSIDIAN_TOKENS },
  { id: "fog", label: "Fog", tokens: FOG_TOKENS },
  { id: "deepblue", label: "Deep blue", tokens: DEEPBLUE_TOKENS }
];

/** Set of valid preset IDs for quick membership checks. */
export const THEME_IDS = new Set<ThemeMode>(THEME_PRESETS.map((p) => p.id));

/** Map preset ID to its full token set. */
export function getPresetTokens(id: ThemeMode): Record<ThemeTokenKey, string> | undefined {
  return THEME_PRESETS.find((p) => p.id === id)?.tokens;
}

/** Merge a base preset with optional custom overrides. */
export function resolveTokens(
  preset: ThemeMode,
  overrides?: Partial<Record<ThemeTokenKey, string>>
): Record<ThemeTokenKey, string> {
  const base = getPresetTokens(preset);
  if (!base) return PAPER_TOKENS; // safe fallback
  if (!overrides || Object.keys(overrides).length === 0) return base;
  return { ...base, ...overrides };
}
