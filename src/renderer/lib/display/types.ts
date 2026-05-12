/**
 * Display preference types (v1.5.8).
 */

export type Density = "comfortable" | "compact" | "spacious";
export type PanelRadius = "sharp" | "soft" | "rounded";

export type DisplayPreferences = {
  density: Density;
  panelRadius: PanelRadius;
  shadows: boolean;
  glassBlur: boolean;
  dccShowAllSecondary: boolean;
};

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  density: "comfortable",
  panelRadius: "soft",
  shadows: true,
  glassBlur: true,
  dccShowAllSecondary: false
};
