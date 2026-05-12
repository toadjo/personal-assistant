import { THEME_PRESETS, THEME_IDS } from "../lib/theme/tokens";
import type { ThemeMode } from "../types";

export { THEME_PRESETS, THEME_IDS };

/** Flat select options derived from presets. Kept for backward compatibility. */
export const THEME_OPTIONS: { id: ThemeMode; label: string }[] = THEME_PRESETS.map((p) => ({
  id: p.id,
  label: p.label
}));
