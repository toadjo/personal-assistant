/**
 * Tasks service for team mode.
 *
 * Provides functions to create tasks, update tasks, and list tasks within a project.
 */

import { mainLog } from "../log";
import { getAuthenticatedSupabaseClient } from "./supabaseClient";
import { getTeamConfig } from "./config";
import type { TeamProjectTask, TeamTaskPriority, TeamTaskStatus, TeamTaskRecurrence } from "../../shared/team/types";

const NO_ACTIVE_WORKSPACE_ERROR = "No active workspace selected. Please select a workspace first.";

/**
 * Creates a new task in a project.
 * Returns the created task.
 */
export async function createTask(input: {
  projectId: string;
  title: string;
  notes: string;
  dueAt: string | null;
  priority: TeamTaskPriority;
  status: TeamTaskStatus;
  recurrence: TeamTaskRecurrence;
  assigneeDisplayName: string | null;
}): Promise<TeamProjectTask> {
  const config = getTeamConfig();
  if (!config.activeWorkspaceId) {
    throw new Error(NO_ACTIVE_WORKSPACE_ERROR);
  }

  const { client, userId } = await getAuthenticatedSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await client
    .from("team_project_tasks")
    .insert({
      workspace_id: config.activeWorkspaceId,
      project_id: input.projectId,
      title: input.title,
      notes: input.notes,
      due_at: input.dueAt,
      priority: input.priority,
      status: input.status,
      recurrence: input.recurrence,
      assignee_display_name: input.assigneeDisplayName,
      created_by: userId,
      created_at: now,
      updated_by: userId,
      updated_at: now
    })
    .select()
    .single();

  if (error) {
    mainLog.error("[team:tasks] createTask failed", error);
    throw error;
  }

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    projectId: data.project_id,
    title: data.title,
    notes: data.notes,
    dueAt: data.due_at,
    priority: data.priority,
    status: data.status,
    recurrence: data.recurrence,
    assigneeDisplayName: data.assignee_display_name,
    createdAt: data.created_at,
    createdBy: data.created_by,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by
  };
}

/**
 * Updates an existing task.
 * Returns the updated task.
 */
export async function updateTask(input: {
  taskId: string;
  title?: string;
  notes?: string;
  dueAt?: string | null;
  priority?: TeamTaskPriority;
  status?: TeamTaskStatus;
  recurrence?: TeamTaskRecurrence;
  assigneeDisplayName?: string | null;
}): Promise<TeamProjectTask> {
  const config = getTeamConfig();
  if (!config.activeWorkspaceId) {
    throw new Error(NO_ACTIVE_WORKSPACE_ERROR);
  }

  const { client, userId } = await getAuthenticatedSupabaseClient();
  const now = new Date().toISOString();

  const updateData: {
    updated_by: string;
    updated_at: string;
    title?: string;
    notes?: string;
    due_at?: string | null;
    priority?: "low" | "normal" | "high";
    status?: "open" | "done";
    recurrence?: "none" | "daily" | "weekly" | "monthly";
    assignee_display_name?: string | null;
  } = {
    updated_by: userId,
    updated_at: now
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.dueAt !== undefined) updateData.due_at = input.dueAt;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.recurrence !== undefined) updateData.recurrence = input.recurrence;
  if (input.assigneeDisplayName !== undefined) updateData.assignee_display_name = input.assigneeDisplayName;

  const { data, error } = await client
    .from("team_project_tasks")
    .update(updateData)
    .eq("id", input.taskId)
    .select()
    .single();

  if (error) {
    mainLog.error("[team:tasks] updateTask failed", error);
    throw error;
  }

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    projectId: data.project_id,
    title: data.title,
    notes: data.notes,
    dueAt: data.due_at,
    priority: data.priority,
    status: data.status,
    recurrence: data.recurrence,
    assigneeDisplayName: data.assignee_display_name,
    createdAt: data.created_at,
    createdBy: data.created_by,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by
  };
}

/**
 * Lists all tasks in the active workspace.
 */
export async function listTasks(): Promise<TeamProjectTask[]> {
  const config = getTeamConfig();
  if (!config.activeWorkspaceId) {
    throw new Error(NO_ACTIVE_WORKSPACE_ERROR);
  }

  const { client } = await getAuthenticatedSupabaseClient();

  const { data, error } = await client.from("team_project_tasks").select().eq("workspace_id", config.activeWorkspaceId);

  if (error) {
    mainLog.error("[team:tasks] listTasks failed", error);
    throw error;
  }

  return (data || []).map(
    (t: {
      id: string;
      workspace_id: string;
      project_id: string;
      title: string;
      notes: string;
      due_at: string | null;
      priority: "low" | "normal" | "high";
      status: "open" | "done";
      recurrence: "none" | "daily" | "weekly" | "monthly";
      assignee_display_name: string | null;
      created_by: string;
      created_at: string;
      updated_by: string;
      updated_at: string;
    }) => ({
      id: t.id,
      workspaceId: t.workspace_id,
      projectId: t.project_id,
      title: t.title,
      notes: t.notes,
      dueAt: t.due_at,
      priority: t.priority,
      status: t.status,
      recurrence: t.recurrence,
      assigneeDisplayName: t.assignee_display_name,
      createdAt: t.created_at,
      createdBy: t.created_by,
      updatedAt: t.updated_at,
      updatedBy: t.updated_by
    })
  );
}
