/**
 * Workspace service for team mode.
 *
 * Provides functions to create workspaces, join workspaces via invite key,
 * list workspaces for the current user, and set the active workspace.
 */

import { mainLog } from "../log";
import { getAuthenticatedSupabaseClient, invalidateSupabaseClient } from "./supabaseClient";
import { getTeamConfig, setTeamActiveWorkspaceId } from "./config";
import type { TeamWorkspace } from "../../shared/team/types";

/**
 * Creates a new workspace with the given name and workspace key.
 * Returns the created workspace.
 */
export async function createWorkspace(input: {
  name: string;
  workspaceKey: string;
}): Promise<TeamWorkspace> {
  const { client } = await getAuthenticatedSupabaseClient();
  const { displayName } = getTeamConfig();

  // Call the RPC function to create workspace and add creator as member
  const { data, error } = await client.rpc("create_team_workspace", {
    p_name: input.name,
    p_workspace_key: input.workspaceKey,
    p_display_name: displayName
  });

  if (error) {
    mainLog.error("[team:workspaces] createWorkspace failed", error);
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create workspace: no data returned");
  }

  return {
    id: data.id,
    name: data.name,
    workspaceKey: data.workspace_key,
    createdAt: data.created_at,
    createdBy: data.created_by
  };
}

/**
 * Joins a workspace using the workspace invite key.
 * Returns the joined workspace.
 */
export async function joinWorkspace(workspaceKey: string): Promise<TeamWorkspace> {
  const { client } = await getAuthenticatedSupabaseClient();
  const { displayName } = getTeamConfig();

  // Call the RPC function to join workspace by key
  const { data, error } = await client.rpc("join_workspace_by_key", {
    p_workspace_key: workspaceKey,
    p_display_name: displayName
  });

  if (error) {
    mainLog.error("[team:workspaces] workspace lookup failed", error);
    throw new Error("Invalid workspace key");
  }

  if (!data) {
    throw new Error("Failed to join workspace: no data returned");
  }

  return {
    id: data.id,
    name: data.name,
    workspaceKey: data.workspace_key,
    createdAt: data.created_at,
    createdBy: data.created_by
  };
}

/**
 * Lists all workspaces for the current user.
 */
export async function listWorkspaces(): Promise<TeamWorkspace[]> {
  const { client, userId } = await getAuthenticatedSupabaseClient();

  const { data, error } = await client
    .from("team_workspace_members")
    .select("workspace_id")
    .eq("user_id", userId);

  if (error) {
    mainLog.error("[team:workspaces] listWorkspaces failed", error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  const workspaceIds = data.map((m: { workspace_id: string }) => m.workspace_id);

  const { data: workspaces, error: workspacesError } = await client
    .from("team_workspaces")
    .select()
    .in("id", workspaceIds);

  if (workspacesError) {
    mainLog.error("[team:workspaces] failed to fetch workspaces", workspacesError);
    throw workspacesError;
  }

  return (workspaces || []).map((w: {
    id: string;
    name: string;
    workspace_key: string;
    created_by: string;
    created_at: string;
  }) => ({
    id: w.id,
    name: w.name,
    workspaceKey: w.workspace_key,
    createdAt: w.created_at,
    createdBy: w.created_by
  }));
}

/**
 * Sets the active workspace for the current user.
 * Invalidates the Supabase client to ensure fresh state.
 */
export async function setActiveWorkspace(workspaceId: string): Promise<void> {
  const { client, userId } = await getAuthenticatedSupabaseClient();

  // Verify the user is a member of the workspace
  const { data: member } = await client
    .from("team_workspace_members")
    .select()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (!member) {
    throw new Error("You are not a member of this workspace");
  }

  setTeamActiveWorkspaceId(workspaceId);
  invalidateSupabaseClient();
}
