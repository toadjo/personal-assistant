/**
 * Team-mode configuration storage and validation.
 *
 * Persists Supabase URL, anon key, display name, and active workspace ID
 * via the existing app_settings table. Never exposes the anon key to the renderer.
 */

import { deleteSetting, getSetting, setSetting } from "../services/settingsRepository";
import type { TeamConfigStatus, TeamBackendMode } from "../../shared/team/types";

const TEAM_CONFIG_KEY_PREFIX = "team.";

function key(suffix: string): string {
  return TEAM_CONFIG_KEY_PREFIX + suffix;
}

const TEAM_CONFIG_KEYS = {
  supabaseUrl: key("supabaseUrl"),
  supabaseAnonKey: key("supabaseAnonKey"),
  displayName: key("displayName"),
  activeWorkspaceId: key("activeWorkspaceId")
} as const;

// Hosted backend config from environment or build
const HOSTED_SUPABASE_URL = process.env.TEAM_PROJECTS_SUPABASE_URL || null;
const HOSTED_SUPABASE_ANON_KEY = process.env.TEAM_PROJECTS_SUPABASE_ANON_KEY || null;

/** Basic HTTPS URL validation (no trailing slash). */
function isValidSupabaseUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return false;
  if (trimmed.endsWith("/")) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Returns the public team configuration status. Never includes the anon key.
 */
export function getTeamConfig(): TeamConfigStatus {
  const displayName = getSetting(TEAM_CONFIG_KEYS.displayName) ?? null;
  const activeWorkspaceId = getSetting(TEAM_CONFIG_KEYS.activeWorkspaceId) ?? null;
  const hasManualUrl = !!getSetting(TEAM_CONFIG_KEYS.supabaseUrl);
  const hasManualKey = !!getSetting(TEAM_CONFIG_KEYS.supabaseAnonKey);
  const hasHostedUrl = !!HOSTED_SUPABASE_URL;
  const hasHostedKey = !!HOSTED_SUPABASE_ANON_KEY;

  let backendMode: TeamBackendMode = "unavailable";
  let backendConfigured = false;

  if (hasManualUrl && hasManualKey) {
    backendMode = "manual";
    backendConfigured = true;
  } else if (hasHostedUrl && hasHostedKey) {
    backendMode = "hosted";
    backendConfigured = true;
  }

  const configured = backendConfigured && !!displayName;
  return { configured, backendConfigured, backendMode, displayName, activeWorkspaceId };
}

/**
 * Checks whether team mode is configured (URL and anon key present).
 */
export function isTeamConfigured(): boolean {
  return !!getSetting(TEAM_CONFIG_KEYS.supabaseUrl) && !!getSetting(TEAM_CONFIG_KEYS.supabaseAnonKey);
}

/**
 * Persists team configuration. Validates URL shape before storing.
 */
export function setTeamConfig(input: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  displayName: string;
}): void {
  const { supabaseUrl, supabaseAnonKey, displayName } = input;

  if (!isValidSupabaseUrl(supabaseUrl)) {
    throw new Error("Invalid Supabase URL: must be HTTPS and must not end with a trailing slash.");
  }

  const trimmedName = displayName.trim();
  if (!trimmedName || trimmedName.length > 60) {
    throw new Error("Display name must be between 1 and 60 characters.");
  }

  setSetting(TEAM_CONFIG_KEYS.supabaseUrl, supabaseUrl.trim());
  setSetting(TEAM_CONFIG_KEYS.supabaseAnonKey, supabaseAnonKey.trim());
  setSetting(TEAM_CONFIG_KEYS.displayName, trimmedName);
}

/**
 * Persists display name only. Used in hosted mode or when display name is set separately.
 */
export function setTeamDisplayName(displayName: string): void {
  const trimmedName = displayName.trim();
  if (!trimmedName || trimmedName.length > 60) {
    throw new Error("Display name must be between 1 and 60 characters.");
  }
  setSetting(TEAM_CONFIG_KEYS.displayName, trimmedName);
}

/**
 * Clears all team configuration (URL, anon key, display name, and active workspace).
 */
export function clearTeamConfig(): void {
  deleteSetting(TEAM_CONFIG_KEYS.supabaseUrl);
  deleteSetting(TEAM_CONFIG_KEYS.supabaseAnonKey);
  deleteSetting(TEAM_CONFIG_KEYS.displayName);
  deleteSetting(TEAM_CONFIG_KEYS.activeWorkspaceId);
}

/**
 * Sets the active workspace ID. Called when the user switches workspaces.
 */
export function setTeamActiveWorkspaceId(workspaceId: string | null): void {
  if (workspaceId === null) {
    deleteSetting(TEAM_CONFIG_KEYS.activeWorkspaceId);
  } else {
    setSetting(TEAM_CONFIG_KEYS.activeWorkspaceId, workspaceId);
  }
}

/**
 * Returns the raw Supabase URL and anon key for main-process use only.
 * Never exposed to the renderer. Prefers manual config, falls back to hosted.
 */
export function getTeamCredentials(): { supabaseUrl: string; supabaseAnonKey: string } | null {
  const manualUrl = getSetting(TEAM_CONFIG_KEYS.supabaseUrl);
  const manualKey = getSetting(TEAM_CONFIG_KEYS.supabaseAnonKey);
  if (manualUrl && manualKey) {
    return { supabaseUrl: manualUrl, supabaseAnonKey: manualKey };
  }
  if (HOSTED_SUPABASE_URL && HOSTED_SUPABASE_ANON_KEY) {
    return { supabaseUrl: HOSTED_SUPABASE_URL, supabaseAnonKey: HOSTED_SUPABASE_ANON_KEY };
  }
  return null;
}
