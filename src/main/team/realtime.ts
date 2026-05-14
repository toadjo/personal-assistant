/**
 * Team realtime manager.
 *
 * Owns a single Supabase Postgres Changes subscription for the active workspace.
 * Listens to `team_projects` and `team_project_tasks` filtered by workspace_id, and emits
 * a coalesced `team:dataUpdated` push event to trusted windows.
 *
 * The renderer never receives raw database payloads or Supabase credentials.
 */

import type { BrowserWindow } from "electron";
import type { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import { IpcRendererEvent } from "../../shared/ipc-channels";
import { getAuthenticatedSupabaseClient } from "./supabaseClient";
import { getTeamConfig } from "./config";
import { safeWebContentsSend } from "../ipc-safe-send";
import { mainLog } from "../log";

const DEBOUNCE_MS = 250;

type TrustedWindowsGetter = () => readonly (BrowserWindow | null)[];

type ChangedTable = "projects" | "tasks";

type RealtimeUpdatePayload = {
  workspaceId: string;
  tables: ChangedTable[];
};

let currentChannel: RealtimeChannel | null = null;
let currentClient: SupabaseClient | null = null;
let currentWorkspaceId: string | null = null;
let getTrustedWindowsRef: TrustedWindowsGetter | null = null;

let pendingTables: Set<ChangedTable> = new Set();
let debounceTimer: NodeJS.Timeout | null = null;

// Track which renderer windows have requested realtime (by sender.id)
const realtimeRequesters = new Set<number>();

/**
 * Sets the trusted windows accessor used to dispatch push events.
 * Called once during main process startup.
 */
export function configureTeamRealtime(getTrustedWindows: TrustedWindowsGetter): void {
  getTrustedWindowsRef = getTrustedWindows;
}

/**
 * Starts (or replaces) the realtime subscription for the active workspace.
 *
 * @param senderId - The ID of the renderer window requesting realtime.
 * Returns silently if team is not configured or no active workspace is set;
 * `mapTeamError` is left to upstream handlers if they want explicit errors.
 */
export async function startTeamRealtime(senderId: number): Promise<void> {
  const config = getTeamConfig();
  if (!config.configured) {
    throw new Error("Team mode is not configured");
  }
  const workspaceId = config.activeWorkspaceId;
  if (!workspaceId) {
    throw new Error("No active workspace selected. Please select a workspace first.");
  }

  // Add this requester to the set
  realtimeRequesters.add(senderId);

  if (currentChannel && currentWorkspaceId === workspaceId) {
    // Already subscribed to this workspace.
    return;
  }

  // Replace any existing subscription before opening a new one.
  await stopTeamRealtimeInternal();

  const { client } = await getAuthenticatedSupabaseClient();
  const filter = `workspace_id=eq.${workspaceId}`;

  const channel = client
    .channel(`team-workspace-${workspaceId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "team_projects", filter },
      (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        queueUpdate(workspaceId, "projects");
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "team_project_tasks", filter },
      (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        queueUpdate(workspaceId, "tasks");
      }
    );

  channel.subscribe((status) => {
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      mainLog.warn("[team:realtime] subscription status", { status, workspaceId });
    }
  });

  currentChannel = channel;
  currentClient = client;
  currentWorkspaceId = workspaceId;
  mainLog.info("[team:realtime] subscribed", { workspaceId, requesterCount: realtimeRequesters.size });
}

/**
 * Removes the current realtime channel, if any.
 * Internal function that does not check requesters.
 */
export async function stopTeamRealtimeInternal(): Promise<void> {
  flushDebounceTimer();
  pendingTables = new Set();

  const channel = currentChannel;
  const client = currentClient;
  const workspaceId = currentWorkspaceId;
  currentChannel = null;
  currentClient = null;
  currentWorkspaceId = null;

  if (!channel) return;

  try {
    if (client && typeof client.removeChannel === "function") {
      await client.removeChannel(channel);
    } else {
      await channel.unsubscribe();
    }
    mainLog.info("[team:realtime] unsubscribed", { workspaceId });
  } catch (error) {
    mainLog.warn("[team:realtime] failed to remove channel", error);
  }
}

/**
 * Stops realtime completely and clears all renderer requesters.
 * Use this for config clear and app shutdown.
 */
export async function stopAllTeamRealtime(): Promise<void> {
  realtimeRequesters.clear();
  await stopTeamRealtimeInternal();
}

/**
 * Removes a requester and stops realtime if no requesters remain.
 *
 * @param senderId - The ID of the renderer window stopping realtime.
 */
export async function stopTeamRealtime(senderId: number): Promise<void> {
  realtimeRequesters.delete(senderId);
  if (realtimeRequesters.size === 0) {
    await stopTeamRealtimeInternal();
    mainLog.info("[team:realtime] stopped (no requesters)");
  } else {
    mainLog.info("[team:realtime] requester removed", { remaining: realtimeRequesters.size });
  }
}

/**
 * Removes a requester when its webContents is destroyed.
 * Called from IPC handlers when a window is closed.
 */
export function removeTeamRealtimeRequester(senderId: number): void {
  realtimeRequesters.delete(senderId);
  if (realtimeRequesters.size === 0) {
    void stopTeamRealtimeInternal();
    mainLog.info("[team:realtime] stopped (requester destroyed)");
  }
}

/**
 * Convenience used by config/workspace handlers when the active workspace changes
 * or team config is cleared. Restarts when an active workspace is available; otherwise stops.
 * Clears all requesters and stops the channel, then restarts if active workspace exists.
 */
export async function refreshTeamRealtime(): Promise<void> {
  realtimeRequesters.clear();
  await stopTeamRealtimeInternal();

  const config = getTeamConfig();
  if (!config.configured || !config.activeWorkspaceId) {
    return;
  }
  try {
    // Restart the channel for the new workspace without requiring a new sender
    const workspaceId = config.activeWorkspaceId;
    const { client } = await getAuthenticatedSupabaseClient();
    const filter = `workspace_id=eq.${workspaceId}`;

    const channel = client
      .channel(`team-workspace-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_projects", filter },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          queueUpdate(workspaceId, "projects");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_project_tasks", filter },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          queueUpdate(workspaceId, "tasks");
        }
      );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        mainLog.warn("[team:realtime] subscription status", { status, workspaceId });
      }
    });

    currentChannel = channel;
    currentClient = client;
    currentWorkspaceId = workspaceId;
    mainLog.info("[team:realtime] refreshed", { workspaceId });
  } catch (error) {
    mainLog.warn("[team:realtime] refresh failed", error);
  }
}

function queueUpdate(workspaceId: string, table: ChangedTable): void {
  // Ignore late events from a previous workspace.
  if (workspaceId !== currentWorkspaceId) {
    return;
  }
  pendingTables.add(table);
  if (debounceTimer) return;
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const tables = Array.from(pendingTables);
    pendingTables = new Set();
    if (!tables.length || !currentWorkspaceId) return;
    dispatchUpdate({ workspaceId: currentWorkspaceId, tables });
  }, DEBOUNCE_MS);
}

function dispatchUpdate(payload: RealtimeUpdatePayload): void {
  const getter = getTrustedWindowsRef;
  if (!getter) return;
  for (const w of getter()) {
    if (!w || w.isDestroyed() || w.webContents.isDestroyed()) continue;
    safeWebContentsSend(w.webContents, IpcRendererEvent.teamDataUpdated, payload);
  }
}

function flushDebounceTimer(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

/** Test-only reset. */
export function __resetTeamRealtimeForTests(): void {
  flushDebounceTimer();
  pendingTables = new Set();
  currentChannel = null;
  currentClient = null;
  currentWorkspaceId = null;
  getTrustedWindowsRef = null;
  realtimeRequesters.clear();
}
