/**
 * Display preference persistence.
 */

import { STORAGE_DISPLAY } from "../../constants/storageKeys";
import { DEFAULT_DISPLAY_PREFERENCES, type DisplayPreferences, type Density, type PanelRadius } from "./types";

const DENSITY_VALUES: Density[] = ["comfortable", "compact", "spacious"];
const RADIUS_VALUES: PanelRadius[] = ["sharp", "soft", "rounded"];

function isValidDensity(v: unknown): v is Density {
  return typeof v === "string" && DENSITY_VALUES.includes(v as Density);
}

function isValidRadius(v: unknown): v is PanelRadius {
  return typeof v === "string" && RADIUS_VALUES.includes(v as PanelRadius);
}

function isBool(v: unknown): v is boolean {
  return typeof v === "boolean";
}

export function readDisplayPreferences(): DisplayPreferences {
  const raw = window.localStorage.getItem(STORAGE_DISPLAY);
  if (!raw) return DEFAULT_DISPLAY_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      density: isValidDensity(parsed.density) ? parsed.density : DEFAULT_DISPLAY_PREFERENCES.density,
      panelRadius: isValidRadius(parsed.panelRadius) ? parsed.panelRadius : DEFAULT_DISPLAY_PREFERENCES.panelRadius,
      shadows: isBool(parsed.shadows) ? parsed.shadows : DEFAULT_DISPLAY_PREFERENCES.shadows,
      glassBlur: isBool(parsed.glassBlur) ? parsed.glassBlur : DEFAULT_DISPLAY_PREFERENCES.glassBlur,
      dccShowAllSecondary: isBool(parsed.dccShowAllSecondary)
        ? parsed.dccShowAllSecondary
        : DEFAULT_DISPLAY_PREFERENCES.dccShowAllSecondary
    };
  } catch {
    return DEFAULT_DISPLAY_PREFERENCES;
  }
}

export function writeDisplayPreferences(prefs: DisplayPreferences): void {
  window.localStorage.setItem(STORAGE_DISPLAY, JSON.stringify(prefs));
}
