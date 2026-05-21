/**
 * Team mode state management hook.
 *
 * Manages team configuration, workspaces, projects, and tasks.
 * Uses window.assistantApi.team* methods for all backend interactions.
 */

import { useState, useCallback } from "react";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { requireAssistantApi } from "../../lib/assistantApi";
import type { TeamConfigStatus, TeamWorkspace, TeamProject, TeamProjectTask } from "../../../shared/team/types";

export type TeamState = {
  config: TeamConfigStatus | null;
  configError: string | null;
  isLoadingConfig: boolean;
  workspaces: TeamWorkspace[];
  activeWorkspace: TeamWorkspace | null;
  isLoadingWorkspaces: boolean;
  projects: TeamProject[];
  isLoadingProjects: boolean;
  tasks: TeamProjectTask[];
  isLoadingTasks: boolean;
  error: string | null;
  loadConfig: () => Promise<void>;
  saveConfig: (config: { supabaseUrl: string; supabaseAnonKey: string; displayName: string }) => Promise<void>;
  clearConfig: () => Promise<void>;
  loadWorkspaces: (activeWorkspaceId?: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<TeamWorkspace | null>;
  joinWorkspace: (workspaceKey: string) => Promise<TeamWorkspace | null>;
  setWorkspaceActive: (workspaceId: string) => Promise<void>;
  loadProjects: () => Promise<void>;
  createProject: (name: string) => Promise<TeamProject | null>;
  loadTasks: () => Promise<void>;
  createTask: (task: {
    projectId: string;
    title: string;
    notes: string;
    dueAt: string | null;
    priority: "low" | "normal" | "high";
    recurrence: "none" | "daily" | "weekly" | "monthly";
    assigneeDisplayName: string | null;
  }) => Promise<TeamProjectTask | null>;
  updateTask: (task: TeamProjectTask) => Promise<void>;
};

export function useTeamState(): TeamState {
  const [config, setConfig] = useState<TeamConfigStatus | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [workspaces, setWorkspaces] = useState<TeamWorkspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<TeamWorkspace | null>(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [tasks, setTasks] = useState<TeamProjectTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    setConfigError(null);
    try {
      const api = requireAssistantApi();
      const result = await api.teamGetConfig();
      setConfig(result);
    } catch (err) {
      setConfigError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  const saveConfig = useCallback(
    async (configToSave: { supabaseUrl: string; supabaseAnonKey: string; displayName: string }) => {
      setIsLoadingConfig(true);
      setConfigError(null);
      try {
        const api = requireAssistantApi();
        await api.teamSetConfig(configToSave);
        await loadConfig();
      } catch (err) {
        setConfigError(getAssistantInvokeErrorMessage(err));
        throw err;
      } finally {
        setIsLoadingConfig(false);
      }
    },
    [loadConfig]
  );

  const clearConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    setConfigError(null);
    try {
      const api = requireAssistantApi();
      await api.teamClearConfig();
      setConfig(null);
    } catch (err) {
      setConfigError(getAssistantInvokeErrorMessage(err));
      throw err;
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  const loadWorkspaces = useCallback(
    async (activeWorkspaceId?: string) => {
      setIsLoadingWorkspaces(true);
      setError(null);
      try {
        const api = requireAssistantApi();
        const result = await api.teamWorkspacesList();
        setWorkspaces(result);
        const activeId = activeWorkspaceId ?? config?.activeWorkspaceId;
        setActiveWorkspaceState(result.find((w) => w.id === activeId) || null);
      } catch (err) {
        setError(getAssistantInvokeErrorMessage(err));
      } finally {
        setIsLoadingWorkspaces(false);
      }
    },
    [config?.activeWorkspaceId]
  );

  const createWorkspace = useCallback(
    async (name: string) => {
      setError(null);
      try {
        const api = requireAssistantApi();
        const result = await api.teamWorkspacesCreate({ name });
        // Auto-set the new workspace as active if no workspace is currently active
        if (!activeWorkspace) {
          await api.teamWorkspacesSetActive({ workspaceId: result.id });
          await loadConfig();
          await loadWorkspaces(result.id);
        } else {
          await loadWorkspaces();
        }
        return result;
      } catch (err) {
        setError(getAssistantInvokeErrorMessage(err));
        return null;
      }
    },
    [activeWorkspace, loadConfig, loadWorkspaces]
  );

  const joinWorkspace = useCallback(
    async (workspaceKey: string) => {
      setError(null);
      try {
        const api = requireAssistantApi();
        const result = await api.teamWorkspacesJoin({ workspaceKey });
        // Auto-set the joined workspace as active if no workspace is currently active
        if (!activeWorkspace) {
          await api.teamWorkspacesSetActive({ workspaceId: result.id });
          await loadConfig();
          await loadWorkspaces(result.id);
        } else {
          await loadWorkspaces();
        }
        return result;
      } catch (err) {
        setError(getAssistantInvokeErrorMessage(err));
        return null;
      }
    },
    [activeWorkspace, loadConfig, loadWorkspaces]
  );

  const setWorkspaceActive = useCallback(
    async (workspaceId: string) => {
      setError(null);
      try {
        const api = requireAssistantApi();
        await api.teamWorkspacesSetActive({ workspaceId });
        await loadConfig();
        await loadWorkspaces(workspaceId);
      } catch (err) {
        setError(getAssistantInvokeErrorMessage(err));
      }
    },
    [loadConfig, loadWorkspaces]
  );

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    setError(null);
    try {
      const api = requireAssistantApi();
      const result = await api.teamProjectsList();
      setProjects(result);
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  const createProject = useCallback(
    async (name: string) => {
      setError(null);
      if (!activeWorkspace) {
        setError("No active workspace selected");
        return null;
      }
      try {
        const api = requireAssistantApi();
        const result = await api.teamProjectsCreate({ name });
        await loadProjects();
        return result;
      } catch (err) {
        setError(getAssistantInvokeErrorMessage(err));
        return null;
      }
    },
    [activeWorkspace, loadProjects]
  );

  const loadTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    setError(null);
    try {
      const api = requireAssistantApi();
      const result = await api.teamTasksList();
      setTasks(result);
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  const createTask = useCallback(
    async (taskToCreate: {
      projectId: string;
      title: string;
      notes: string;
      dueAt: string | null;
      priority: "low" | "normal" | "high";
      recurrence: "none" | "daily" | "weekly" | "monthly";
      assigneeDisplayName: string | null;
    }) => {
      setError(null);
      try {
        const api = requireAssistantApi();
        const result = await api.teamTasksCreate(taskToCreate);
        await loadTasks();
        return result;
      } catch (err) {
        setError(getAssistantInvokeErrorMessage(err));
        return null;
      }
    },
    [loadTasks]
  );

  const updateTask = useCallback(
    async (taskToUpdate: TeamProjectTask) => {
      setError(null);
      try {
        const api = requireAssistantApi();
        await api.teamTasksUpdate({
          id: taskToUpdate.id,
          title: taskToUpdate.title,
          notes: taskToUpdate.notes,
          dueAt: taskToUpdate.dueAt,
          priority: taskToUpdate.priority,
          status: taskToUpdate.status,
          recurrence: taskToUpdate.recurrence,
          assigneeDisplayName: taskToUpdate.assigneeDisplayName
        });
        await loadTasks();
      } catch (err) {
        setError(getAssistantInvokeErrorMessage(err));
      }
    },
    [loadTasks]
  );

  return {
    config,
    configError,
    isLoadingConfig,
    workspaces,
    activeWorkspace,
    isLoadingWorkspaces,
    projects,
    isLoadingProjects,
    tasks,
    isLoadingTasks,
    error,
    loadConfig,
    saveConfig,
    clearConfig,
    loadWorkspaces,
    createWorkspace,
    joinWorkspace,
    setWorkspaceActive,
    loadProjects,
    createProject,
    loadTasks,
    createTask,
    updateTask
  };
}
