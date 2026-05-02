import type { ThemeMode } from "../types";

export const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: "paper", label: "Paper · white" },
  { id: "obsidian", label: "Obsidian · black" },
  { id: "fog", label: "Fog · grey" },
  { id: "deepblue", label: "Deep blue" }
];

export const THEME_IDS = new Set(THEME_OPTIONS.map((t) => t.id));
