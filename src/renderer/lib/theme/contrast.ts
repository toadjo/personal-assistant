/**
 * Contrast utilities for theme token validation.
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim();
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(clean);
  if (!m || !m[1]) return null;
  const shortHex = m[1];
  const full =
    shortHex.length === 3
      ? shortHex
          .split("")
          .map((c) => c + c)
          .join("")
      : shortHex;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

function rgbaToRgb(rgba: string): { r: number; g: number; b: number } | null {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/.exec(rgba);
  if (m && m[1] && m[2] && m[3]) {
    return {
      r: parseInt(m[1], 10),
      g: parseInt(m[2], 10),
      b: parseInt(m[3], 10)
    };
  }
  return hexToRgb(rgba);
}

/** Relative luminance of a color (WCAG). */
export function getLuminance(color: string): number {
  const rgb = rgbaToRgb(color);
  if (!rgb) return 0;
  const srgb: [number, number, number] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((s) =>
    s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  ) as [number, number, number];
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/** Contrast ratio between two colors (WCAG 2.1). */
export function contrastRatio(a: string, b: string): number {
  const l1 = getLuminance(a);
  const l2 = getLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Whether contrast meets WCAG AA for normal text (4.5:1). */
export function isContrastSafe(foreground: string, background: string, minRatio = 4.5): boolean {
  return contrastRatio(foreground, background) >= minRatio;
}
