import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { setTeamConfig, getTeamConfig, clearTeamConfig } from "../../team/config";
import {
  createWorkspace,
  joinWorkspace,
  listWorkspaces,
  setActiveWorkspace
} from "../../team/workspaces";
import { createProject, listProjects } from "../../team/projects";
import { createTask, updateTask, listTasks } from "../../team/tasks";
import {
  startTeamRealtime,
  stopTeamRealtime,
  stopAllTeamRealtime,
  refreshTeamRealtime,
  removeTeamRealtimeRequester
} from "../../team/realtime";
import { registerInvoke } from "../invoke-handle";
import { generateWorkspaceKey } from "../../../shared/team/keyValidation";
import { mapTeamError } from "../../team/errors";
import {
  teamSetConfigSchema,
  teamWorkspaceSetActiveSchema,
  teamWorkspaceCreateSchema,
  teamWorkspaceJoinSchema,
  teamProjectCreateSchema,
  teamTaskCreateSchema,
  teamTaskUpdateSchema
} from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for team mode operations (trusted renderer only). */
export function registerTeamHandlers(assertSender: AssertSender): void {
  // Config operations
  registerInvoke(IpcInvoke.teamSetConfig, assertSender, (_event, payload) => {
    return setTeamConfig(teamSetConfigSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.teamGetConfig, assertSender, () => {
    return getTeamConfig();
  });
  registerInvoke(IpcInvoke.teamClearConfig, assertSender, async () => {
    await stopAllTeamRealtime();
    return clearTeamConfig();
  });

  // Workspace operations
  registerInvoke(IpcInvoke.teamWorkspacesCreate, assertSender, async (_event, payload) => {
    const data = teamWorkspaceCreateSchema.parse(payload);
    const workspaceKey = generateWorkspaceKey();
    try {
      return await createWorkspace({ name: data.name, workspaceKey });
    } catch (error) {
      mapTeamError(error);
    }
  });
  registerInvoke(IpcInvoke.teamWorkspacesJoin, assertSender, async (_event, payload) => {
    try {
      return await joinWorkspace(teamWorkspaceJoinSchema.parse(payload).workspaceKey);
    } catch (error) {
      mapTeamError(error);
    }
  });
  registerInvoke(IpcInvoke.teamWorkspacesList, assertSender, async () => {
    try {
      return await listWorkspaces();
    } catch (error) {
      mapTeamError(error);
    }
  });
  registerInvoke(IpcInvoke.teamWorkspacesSetActive, assertSender, async (_event, payload) => {
    const workspaceId = teamWorkspaceSetActiveSchema.parse(payload).workspaceId;
    if (!workspaceId) {
      throw new Error("workspaceId is required");
    }
    try {
      const out = await setActiveWorkspace(workspaceId);
      await refreshTeamRealtime();
      return out;
    } catch (error) {
      mapTeamError(error);
    }
  });

  // Project operations
  registerInvoke(IpcInvoke.teamProjectsCreate, assertSender, async (_event, payload) => {
    try {
      return await createProject(teamProjectCreateSchema.parse(payload));
    } catch (error) {
      mapTeamError(error);
    }
  });
  registerInvoke(IpcInvoke.teamProjectsList, assertSender, async () => {
    try {
      return await listProjects();
    } catch (error) {
      mapTeamError(error);
    }
  });

  // Task operations
  registerInvoke(IpcInvoke.teamTasksCreate, assertSender, async (_event, payload) => {
    const data = teamTaskCreateSchema.parse(payload);
    try {
      return await createTask({
        projectId: data.projectId,
        title: data.title,
        notes: data.notes,
        dueAt: data.dueAt,
        priority: data.priority,
        status: "open",
        recurrence: data.recurrence,
        assigneeDisplayName: data.assigneeDisplayName
      });
    } catch (error) {
      mapTeamError(error);
    }
  });
  registerInvoke(IpcInvoke.teamTasksUpdate, assertSender, async (_event, payload) => {
    const data = teamTaskUpdateSchema.parse(payload);
    try {
      return await updateTask({
        taskId: data.id,
        title: data.title,
        notes: data.notes,
        dueAt: data.dueAt,
        priority: data.priority,
        status: data.status,
        recurrence: data.recurrence,
        assigneeDisplayName: data.assigneeDisplayName
      });
    } catch (error) {
      mapTeamError(error);
    }
  });
  registerInvoke(IpcInvoke.teamTasksList, assertSender, async () => {
    try {
      return await listTasks();
    } catch (error) {
      mapTeamError(error);
    }
  });

  // Realtime control
  registerInvoke(IpcInvoke.teamRealtimeStart, assertSender, async (event) => {
    const senderId = event.sender.id;
    try {
      await startTeamRealtime(senderId);
      event.sender.once("destroyed", () => removeTeamRealtimeRequester(senderId));
    } catch (error) {
      mapTeamError(error);
    }
  });
  registerInvoke(IpcInvoke.teamRealtimeStop, assertSender, async (event) => {
    await stopTeamRealtime(event.sender.id);
  });
}
