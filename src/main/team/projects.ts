/**
 * Projects service for team mode.
 *
 * Provides functions to create projects and list projects within a workspace.
 */

import { mainLog } from "../log";
import { getAuthenticatedSupabaseClient } from "./supabaseClient";
import { getTeamConfig } from "./config";
import type { TeamProject } from "../../shared/team/types";

const NO_ACTIVE_WORKSPACE_ERROR = "No active workspace selected. Please select a workspace first.";

/**
 * Creates a new project in the active workspace.
 * Returns the created project.
 */
export async function createProject(input: {
  name: string;
}): Promise<TeamProject> {
  const config = getTeamConfig();
  if (!config.activeWorkspaceId) {
    throw new Error(NO_ACTIVE_WORKSPACE_ERROR);
  }

  const { client, userId } = await getAuthenticatedSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await client
    .from("team_projects")
    .insert({
      workspace_id: config.activeWorkspaceId,
      name: input.name,
      created_by: userId,
      created_at: now
    })
    .select()
    .single();

  if (error) {
    mainLog.error("[team:projects] createProject failed", error);
    throw error;
  }

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    name: data.name,
    createdAt: data.created_at,
    createdBy: data.created_by
  };
}

/**
 * Lists all projects in the active workspace.
 */
export async function listProjects(): Promise<TeamProject[]> {
  const config = getTeamConfig();
  if (!config.activeWorkspaceId) {
    throw new Error(NO_ACTIVE_WORKSPACE_ERROR);
  }

  const { client } = await getAuthenticatedSupabaseClient();

  const { data, error } = await client
    .from("team_projects")
    .select()
    .eq("workspace_id", config.activeWorkspaceId);

  if (error) {
    mainLog.error("[team:projects] listProjects failed", error);
    throw error;
  }

  return (data || []).map((p: {
    id: string;
    workspace_id: string;
    name: string;
    created_by: string;
    created_at: string;
  }) => ({
    id: p.id,
    workspaceId: p.workspace_id,
    name: p.name,
    createdAt: p.created_at,
    createdBy: p.created_by
  }));
}
