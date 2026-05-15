/**
 * Shared team-mode types used by both the main process and the renderer.
 *
 * These mirror the columns defined in `docs/TEAM_SCHEMA.sql` and are returned by the
 * team-mode IPC handlers. Personal tasks/reminders remain on local SQLite and are
 * unchanged; team entities live in a hosted Supabase backend.
 */

export type TeamTaskStatus = "open" | "done";
export type TeamTaskPriority = "low" | "normal" | "high";
export type TeamTaskRecurrence = "none" | "daily" | "weekly" | "monthly";

/** Workspace row visible to the current user. */
export interface TeamWorkspace {
  id: string;
  name: string;
  /** Invite code used by other devices to join. Sensitive enough that we only return it to members. */
  workspaceKey: string;
  createdAt: string;
  createdBy: string;
}

/** Membership row pairing a Supabase user id with a per-workspace display name. */
export interface TeamWorkspaceMember {
  workspaceId: string;
  userId: string;
  displayName: string;
  joinedAt: string;
}

export interface TeamProject {
  id: string;
  workspaceId: string;
  name: string;
  createdAt: string;
  createdBy: string;
}

export interface TeamProjectTask {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  notes: string;
  dueAt: string | null;
  priority: TeamTaskPriority;
  status: TeamTaskStatus;
  recurrence: TeamTaskRecurrence;
  assigneeDisplayName: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export type TeamBackendMode = "hosted" | "manual" | "unavailable";

/**
 * Public team configuration status returned to the renderer.
 * Never includes the Supabase URL or anon key.
 */
export interface TeamConfigStatus {
  configured: boolean;
  backendConfigured: boolean;
  backendMode: TeamBackendMode;
  displayName: string | null;
  activeWorkspaceId: string | null;
}
