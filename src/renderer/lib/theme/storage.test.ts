import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readThemeState, writeThemeState, getDefaultPreset } from "./storage";
import { STORAGE_THEME } from "../../constants/storageKeys";
import type { ThemeState } from "./tokens";

describe("theme storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads stored preset and custom overrides", () => {
    const state = { preset: "glass", custom: { basePreset: "glass", overrides: { primary: "#ff0000" } } };
    window.localStorage.setItem(STORAGE_THEME, JSON.stringify(state));
    expect(readThemeState()).toEqual(state);
  });

  it("migrates legacy plain string preset", () => {
    window.localStorage.setItem(STORAGE_THEME, "paper");
    expect(readThemeState()).toEqual({ preset: "paper" });
  });

  it("migrates legacy aliases", () => {
    window.localStorage.setItem(STORAGE_THEME, "dark");
    expect(readThemeState()).toEqual({ preset: "obsidian" });
  });

  it("falls back to the system light default when nothing is stored", () => {
    const mql = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList;
    vi.stubGlobal("matchMedia", () => mql);
    expect(getDefaultPreset()).toBe("paper");
    expect(readThemeState()).toEqual({ preset: "paper" });
  });

  it("falls back to the system dark default when nothing is stored", () => {
    const mql = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList;
    vi.stubGlobal("matchMedia", () => mql);
    expect(getDefaultPreset()).toBe("obsidian");
    expect(readThemeState()).toEqual({ preset: "obsidian" });
  });

  it("persists state as JSON", () => {
    const state: ThemeState = { preset: "fog" };
    writeThemeState(state);
    expect(window.localStorage.getItem(STORAGE_THEME)).toBe(JSON.stringify(state));
    expect(readThemeState()).toEqual(state);
  });
});
