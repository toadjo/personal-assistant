/**
 * Apply display preferences as CSS custom properties.
 */

import type { DisplayPreferences, Density, PanelRadius } from "./types";

const DENSITY_VARS: Record<Density, Record<string, string>> = {
  comfortable: {
    "--space-1": "6px",
    "--space-2": "10px",
    "--space-3": "14px",
    "--space-4": "18px",
    "--space-5": "24px",
    "--panel-padding": "14px",
    "--panel-margin-top": "14px",
    "--list-row-padding": "10px 14px",
    "--input-padding": "10px 12px"
  },
  compact: {
    "--space-1": "4px",
    "--space-2": "8px",
    "--space-3": "10px",
    "--space-4": "12px",
    "--space-5": "16px",
    "--panel-padding": "10px",
    "--panel-margin-top": "10px",
    "--list-row-padding": "6px 10px",
    "--input-padding": "6px 10px"
  },
  spacious: {
    "--space-1": "8px",
    "--space-2": "14px",
    "--space-3": "20px",
    "--space-4": "26px",
    "--space-5": "32px",
    "--panel-padding": "20px",
    "--panel-margin-top": "20px",
    "--list-row-padding": "14px 20px",
    "--input-padding": "12px 14px"
  }
};

const RADIUS_VARS: Record<PanelRadius, Record<string, string>> = {
  sharp: {
    "--panel-radius": "4px",
    "--input-radius": "2px",
    "--button-radius": "2px",
    "--card-radius": "2px"
  },
  soft: {
    "--panel-radius": "12px",
    "--input-radius": "6px",
    "--button-radius": "6px",
    "--card-radius": "8px"
  },
  rounded: {
    "--panel-radius": "16px",
    "--input-radius": "10px",
    "--button-radius": "10px",
    "--card-radius": "12px"
  }
};

export function applyDisplayPreferences(prefs: DisplayPreferences): void {
  const root = document.documentElement;

  // Density
  const densityVars = DENSITY_VARS[prefs.density];
  for (const [key, value] of Object.entries(densityVars)) {
    root.style.setProperty(key, value);
  }

  // Radius
  const radiusVars = RADIUS_VARS[prefs.panelRadius];
  for (const [key, value] of Object.entries(radiusVars)) {
    root.style.setProperty(key, value);
  }

  // Shadows
  root.style.setProperty("--panel-shadow", prefs.shadows
    ? "0 3px 14px rgba(0, 0, 0, 0.04)"
    : "none");

  // Glass blur
  root.style.setProperty("--glass-blur", prefs.glassBlur ? "blur(10px)" : "none");

  // DCC preference
  root.setAttribute("data-dcc-mode", prefs.dccShowAllSecondary ? "all" : "one");
}
