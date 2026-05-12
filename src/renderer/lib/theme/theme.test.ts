import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  TOKEN_CSS_VAR,
  THEME_PRESETS,
  THEME_IDS,
  getPresetTokens,
  resolveTokens
} from "./tokens";
import { applyThemeTokens, applyPreset, clearThemeTokens } from "./applyTheme";
import { readThemeState, writeThemeState } from "./storage";
import type { ThemeMode, ThemeTokenKey } from "./tokens";

describe("Theme token system (v1.5.6)", () => {
  beforeEach(() => {
    clearThemeTokens();
    window.localStorage.clear();
  });

  afterEach(() => {
    clearThemeTokens();
    window.localStorage.clear();
  });

  describe("TOKEN_CSS_VAR", () => {
    it("maps every token to a CSS custom property", () => {
      const keys = Object.keys(TOKEN_CSS_VAR) as ThemeTokenKey[];
      for (const key of keys) {
        expect(TOKEN_CSS_VAR[key]).toMatch(/^--/);
      }
    });
  });

  describe("THEME_PRESETS", () => {
    it("includes all expected presets", () => {
      const ids = THEME_PRESETS.map((p) => p.id);
      expect(ids).toContain("glass");
      expect(ids).toContain("paper");
      expect(ids).toContain("obsidian");
      expect(ids).toContain("fog");
      expect(ids).toContain("deepblue");
      expect(ids).toContain("corporate");
    });

    it("each preset has a full token set", () => {
      const tokenKeys = Object.keys(TOKEN_CSS_VAR) as ThemeTokenKey[];
      for (const preset of THEME_PRESETS) {
        for (const key of tokenKeys) {
          expect(preset.tokens[key]).toBeDefined();
          expect(typeof preset.tokens[key]).toBe("string");
          expect(preset.tokens[key].length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("THEME_IDS", () => {
    it("contains every preset ID", () => {
      for (const preset of THEME_PRESETS) {
        expect(THEME_IDS.has(preset.id)).toBe(true);
      }
    });
  });

  describe("getPresetTokens", () => {
    it("returns the correct token set for each preset", () => {
      for (const preset of THEME_PRESETS) {
        const tokens = getPresetTokens(preset.id);
        expect(tokens).toBeDefined();
        expect(tokens).toEqual(preset.tokens);
      }
    });

    it("returns undefined for an unknown preset", () => {
      expect(getPresetTokens("unknown" as ThemeMode)).toBeUndefined();
    });
  });

  describe("resolveTokens", () => {
    it("returns base tokens when no overrides", () => {
      const result = resolveTokens("paper");
      expect(result).toEqual(getPresetTokens("paper"));
    });

    it("merges overrides into base tokens", () => {
      const result = resolveTokens("paper", { primary: "#ff0000" });
      expect(result.primary).toBe("#ff0000");
      expect(result.bg).toBe(getPresetTokens("paper")!.bg);
    });

    it("falls back to paper tokens for unknown preset", () => {
      const result = resolveTokens("unknown" as ThemeMode);
      expect(result).toEqual(getPresetTokens("paper"));
    });
  });

  describe("applyThemeTokens", () => {
    it("sets CSS variables on the document root", () => {
      const tokens = getPresetTokens("corporate")!;
      applyThemeTokens(tokens);

      const root = document.documentElement;
      expect(root.style.getPropertyValue("--bg")).toBe(tokens.bg);
      expect(root.style.getPropertyValue("--primary")).toBe(tokens.primary);
    });
  });

  describe("applyPreset", () => {
    it("sets data-theme attribute and CSS variables", () => {
      applyPreset("obsidian");

      expect(document.documentElement.getAttribute("data-theme")).toBe("obsidian");
      expect(document.documentElement.style.getPropertyValue("--bg")).toBe("#000000");
    });

    it("applies custom overrides alongside preset", () => {
      applyPreset("paper", { primary: "#ff0000" });

      expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#ff0000");
      expect(document.documentElement.style.getPropertyValue("--bg")).toBe("#f6f6f8");
    });
  });

  describe("clearThemeTokens", () => {
    it("removes all applied theme CSS variables and data-theme", () => {
      applyPreset("deepblue");
      clearThemeTokens();

      expect(document.documentElement.getAttribute("data-theme")).toBeNull();
      expect(document.documentElement.style.getPropertyValue("--bg")).toBe("");
    });
  });

  describe("readThemeState", () => {
    it("defaults to glass when nothing is stored", () => {
      const state = readThemeState();
      expect(state.preset).toBe("glass");
      expect(state.custom).toBeUndefined();
    });

    it("reads a v1.5.6 structured state", () => {
      window.localStorage.setItem(
        "assistant-theme",
        JSON.stringify({ preset: "corporate" })
      );
      const state = readThemeState();
      expect(state.preset).toBe("corporate");
    });

    it("reads a structured state with custom overrides", () => {
      window.localStorage.setItem(
        "assistant-theme",
        JSON.stringify({
          preset: "corporate",
          custom: {
            basePreset: "corporate",
            overrides: { primary: "#ff0000", bg: "#ffffff" }
          }
        })
      );
      const state = readThemeState();
      expect(state.preset).toBe("corporate");
      expect(state.custom?.basePreset).toBe("corporate");
      expect(state.custom?.overrides?.primary).toBe("#ff0000");
    });

    it("migrates legacy plain-string preset", () => {
      window.localStorage.setItem("assistant-theme", "fog");
      const state = readThemeState();
      expect(state.preset).toBe("fog");
    });

    it("migrates legacy 'light' to paper", () => {
      window.localStorage.setItem("assistant-theme", "light");
      const state = readThemeState();
      expect(state.preset).toBe("paper");
    });

    it("migrates legacy 'dark' to obsidian", () => {
      window.localStorage.setItem("assistant-theme", "dark");
      const state = readThemeState();
      expect(state.preset).toBe("obsidian");
    });

    it("migrates legacy 'graphite' to fog", () => {
      window.localStorage.setItem("assistant-theme", "graphite");
      const state = readThemeState();
      expect(state.preset).toBe("fog");
    });

    it("falls back to glass for unknown value", () => {
      window.localStorage.setItem("assistant-theme", "neoncyan");
      const state = readThemeState();
      expect(state.preset).toBe("glass");
    });

    it("rejects invalid custom token overrides", () => {
      window.localStorage.setItem(
        "assistant-theme",
        JSON.stringify({
          preset: "paper",
          custom: {
            basePreset: "paper",
            overrides: {
              primary: "#ff0000",
              invalidToken: "#000000",
              emptyValue: "",
              numericValue: 123
            }
          }
        })
      );
      const state = readThemeState();
      const overrides = state.custom?.overrides as Record<string, string | undefined>;
      expect(overrides.primary).toBe("#ff0000");
      expect(overrides.invalidToken).toBe("#000000"); // non-empty strings are kept
      expect(overrides.emptyValue).toBeUndefined();
      expect(overrides.numericValue).toBeUndefined();
    });
  });

  describe("writeThemeState", () => {
    it("persists structured state to localStorage", () => {
      writeThemeState({ preset: "corporate" });
      const raw = window.localStorage.getItem("assistant-theme");
      expect(raw).toBe(JSON.stringify({ preset: "corporate" }));
    });
  });
});
