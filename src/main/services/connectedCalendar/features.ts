import type { ConnectedCalendarFeature } from "../../../shared/types";

const SUPPORTED_FEATURES: readonly ConnectedCalendarFeature[] = ["calendar"];

export function parseEnabledFeatures(enabledFeatures: string): ConnectedCalendarFeature[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(enabledFeatures);
  } catch {
    throw new Error("enabledFeatures must be valid JSON.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("enabledFeatures must be a non-empty JSON array.");
  }
  for (const item of parsed) {
    if (typeof item !== "string" || !SUPPORTED_FEATURES.includes(item as ConnectedCalendarFeature)) {
      throw new Error(`Unsupported connected calendar feature: ${String(item)}`);
    }
  }
  return parsed as ConnectedCalendarFeature[];
}

export function serializeEnabledFeatures(features: ConnectedCalendarFeature[]): string {
  const unique = [...new Set(features)];
  for (const feature of unique) {
    if (!SUPPORTED_FEATURES.includes(feature)) {
      throw new Error(`Unsupported connected calendar feature: ${feature}`);
    }
  }
  if (unique.length === 0) {
    throw new Error("enabledFeatures must include at least one feature.");
  }
  return JSON.stringify(unique);
}

export const DEFAULT_CALENDAR_ENABLED_FEATURES = serializeEnabledFeatures(["calendar"]);
