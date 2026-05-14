/**
 * Tests for useTeamState hook.
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTeamState } from "./useTeamState";
import type { TeamConfigStatus, TeamWorkspace, TeamProject, TeamProjectTask } from "../../../shared/team/types";

// Mock window.assistantApi
const mockTeamGetConfig = vi.fn();
const mockTeamSetConfig = vi.fn();
const mockTeamClearConfig = vi.fn();
const mockTeamWorkspacesCreate = vi.fn();
const mockTeamWorkspacesJoin = vi.fn();
const mockTeamWorkspacesList = vi.fn();
const mockTeamWorkspacesSetActive = vi.fn();
const mockTeamProjectsCreate = vi.fn();
const mockTeamProjectsList = vi.fn();
const mockTeamTasksCreate = vi.fn();
const mockTeamTasksUpdate = vi.fn();
const mockTeamTasksList = vi.fn();

Object.defineProperty(window, "assistantApi", {
  value: {
    teamGetConfig: mockTeamGetConfig,
    teamSetConfig: mockTeamSetConfig,
    teamClearConfig: mockTeamClearConfig,
    teamWorkspacesCreate: mockTeamWorkspacesCreate,
    teamWorkspacesJoin: mockTeamWorkspacesJoin,
    teamWorkspacesList: mockTeamWorkspacesList,
    teamWorkspacesSetActive: mockTeamWorkspacesSetActive,
    teamProjectsCreate: mockTeamProjectsCreate,
    teamProjectsList: mockTeamProjectsList,
    teamTasksCreate: mockTeamTasksCreate,
    teamTasksUpdate: mockTeamTasksUpdate,
    teamTasksList: mockTeamTasksList
  },
  writable: true
});

describe("useTeamState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadConfig", () => {
    it("loads team config successfully", async () => {
      const mockConfig: TeamConfigStatus = {
        configured: true,
        displayName: "Alice",
        activeWorkspaceId: "workspace-123"
      };
      mockTeamGetConfig.mockResolvedValue(mockConfig);

      const { result } = renderHook(() => useTeamState());

      await act(async () => {
        await result.current.loadConfig();
      });

      await waitFor(() => {
        expect(result.current.isLoadingConfig).toBe(false);
        expect(result.current.config).toEqual(mockConfig);
      });
      expect(mockTeamGetConfig).toHaveBeenCalledTimes(1);
    });

    it("handles config load error", async () => {
      mockTeamGetConfig.mockRejectedValue(new Error("Failed to load config"));

      const { result } = renderHook(() => useTeamState());

      await act(async () => {
        await result.current.loadConfig();
      });

      await waitFor(() => {
        expect(result.current.isLoadingConfig).toBe(false);
        expect(result.current.configError).toBe("Failed to load config");
      });
      expect(result.current.config).toBe(null);
    });
  });

  describe("saveConfig", () => {
    it("saves team config successfully", async () => {
      const configToSave = {
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key",
        displayName: "Alice"
      };
      const mockConfig: TeamConfigStatus = {
        configured: true,
        displayName: "Alice",
        activeWorkspaceId: null
      };
      mockTeamSetConfig.mockResolvedValue(undefined);
      mockTeamGetConfig.mockResolvedValue(mockConfig);

      const { result } = renderHook(() => useTeamState());

      await act(async () => {
        await result.current.saveConfig(configToSave);
      });

      expect(mockTeamSetConfig).toHaveBeenCalledWith(configToSave);
      expect(mockTeamGetConfig).toHaveBeenCalled();
    });

    it("handles config save error", async () => {
      const configToSave = {
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key",
        displayName: "Alice"
      };
      mockTeamSetConfig.mockRejectedValue(new Error("Failed to save"));

      const { result } = renderHook(() => useTeamState());

      await act(async () => {
        await expect(result.current.saveConfig(configToSave)).rejects.toThrow("Failed to save");
      });

      await waitFor(() => {
        expect(result.current.configError).toBe("Failed to save");
      });
    });
  });

  describe("clearConfig", () => {
    it("clears team config successfully", async () => {
      mockTeamClearConfig.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTeamState());

      await act(async () => {
        await result.current.clearConfig();
      });

      expect(mockTeamClearConfig).toHaveBeenCalledTimes(1);
      expect(result.current.config).toBe(null);
    });
  });

  describe("loadWorkspaces", () => {
    it("loads workspaces successfully and sets active workspace from explicit id", async () => {
      const mockWorkspaces: TeamWorkspace[] = [
        {
          id: "workspace-1",
          name: "Marketing Team",
          workspaceKey: "ABCD2345EFGH6789",
          createdAt: "2024-01-01T00:00:00Z",
          createdBy: "user-1"
        }
      ];
      mockTeamWorkspacesList.mockResolvedValue(mockWorkspaces);

      const { result } = renderHook(() => useTeamState());

      await act(async () => {
        await result.current.loadWorkspaces("workspace-1");
      });

      await waitFor(() => {
        expect(result.current.workspaces).toEqual(mockWorkspaces);
        expect(result.current.activeWorkspace).toEqual(mockWorkspaces[0]);
      });
      expect(mockTeamWorkspacesList).toHaveBeenCalledTimes(1);
    });

    it("handles workspace load error", async () => {
      mockTeamWorkspacesList.mockRejectedValue(new Error("Failed to load"));

      const { result } = renderHook(() => useTeamState());

      await act(async () => {
        await result.current.loadWorkspaces();
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to load");
      });
    });
  });

  describe("createWorkspace", () => {
    it("creates workspace successfully", async () => {
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      mockTeamWorkspacesCreate.mockResolvedValue(mockWorkspace);
      mockTeamWorkspacesSetActive.mockResolvedValue(undefined);
      mockTeamGetConfig.mockResolvedValue({
        configured: true,
        displayName: "Alice",
        activeWorkspaceId: "workspace-1"
      });
      mockTeamWorkspacesList.mockResolvedValue([mockWorkspace]);

      const { result } = renderHook(() => useTeamState());

      let resultWorkspace: TeamWorkspace | null = null;
      await act(async () => {
        resultWorkspace = await result.current.createWorkspace("Marketing Team");
      });

      expect(resultWorkspace).toEqual(mockWorkspace);
      expect(mockTeamWorkspacesCreate).toHaveBeenCalledWith({ name: "Marketing Team" });
      expect(mockTeamWorkspacesList).toHaveBeenCalled();
    });

    it("handles workspace creation error", async () => {
      mockTeamWorkspacesCreate.mockRejectedValue(new Error("Failed to create"));

      const { result } = renderHook(() => useTeamState());

      let resultWorkspace: TeamWorkspace | null = null;
      await act(async () => {
        resultWorkspace = await result.current.createWorkspace("Marketing Team");
      });

      expect(resultWorkspace).toBe(null);
      await waitFor(() => {
        expect(result.current.error).toBe("Failed to create");
      });
    });
  });

  describe("joinWorkspace", () => {
    it("joins workspace successfully", async () => {
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      mockTeamWorkspacesJoin.mockResolvedValue(mockWorkspace);
      mockTeamWorkspacesSetActive.mockResolvedValue(undefined);
      mockTeamGetConfig.mockResolvedValue({
        configured: true,
        displayName: "Alice",
        activeWorkspaceId: "workspace-1"
      });
      mockTeamWorkspacesList.mockResolvedValue([mockWorkspace]);

      const { result } = renderHook(() => useTeamState());

      let resultWorkspace: TeamWorkspace | null = null;
      await act(async () => {
        resultWorkspace = await result.current.joinWorkspace("ABCD2345EFGH6789");
      });

      expect(resultWorkspace).toEqual(mockWorkspace);
      expect(mockTeamWorkspacesJoin).toHaveBeenCalledWith({ workspaceKey: "ABCD2345EFGH6789" });
      expect(mockTeamWorkspacesList).toHaveBeenCalled();
    });

    it("handles workspace join error", async () => {
      mockTeamWorkspacesJoin.mockRejectedValue(new Error("Invalid key"));

      const { result } = renderHook(() => useTeamState());

      let resultWorkspace: TeamWorkspace | null = null;
      await act(async () => {
        resultWorkspace = await result.current.joinWorkspace("INVALID");
      });

      expect(resultWorkspace).toBe(null);
      await waitFor(() => {
        expect(result.current.error).toBe("Invalid key");
      });
    });
  });

  describe("setWorkspaceActive", () => {
    it("sets active workspace successfully", async () => {
      mockTeamWorkspacesSetActive.mockResolvedValue(undefined);
      mockTeamGetConfig.mockResolvedValue({ configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" });
      mockTeamWorkspacesList.mockResolvedValue([]);

      const { result } = renderHook(() => useTeamState());

      await act(async () => {
        await result.current.setWorkspaceActive("workspace-1");
      });

      expect(mockTeamWorkspacesSetActive).toHaveBeenCalledWith({ workspaceId: "workspace-1" });
      expect(mockTeamGetConfig).toHaveBeenCalled();
      expect(mockTeamWorkspacesList).toHaveBeenCalled();
    });
  });

  describe("loadProjects", () => {
    it("loads projects successfully", async () => {
      const mockProjects: TeamProject[] = [
        {
          id: "project-1",
          workspaceId: "workspace-1",
          name: "Q1 Campaign",
          createdAt: "2024-01-01T00:00:00Z",
          createdBy: "user-1"
        }
      ];
      mockTeamProjectsList.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useTeamState());

      await act(async () => {
        await result.current.loadProjects();
      });

      await waitFor(() => {
        expect(result.current.projects).toEqual(mockProjects);
      });
      expect(mockTeamProjectsList).toHaveBeenCalledTimes(1);
    });

    it("handles project load error", async () => {
      mockTeamProjectsList.mockRejectedValue(new Error("Failed to load"));

      const { result } = renderHook(() => useTeamState());

      await act(async () => {
        await result.current.loadProjects();
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to load");
      });
    });
  });

  describe("createProject", () => {
    it("creates project successfully", async () => {
      const mockProject: TeamProject = {
        id: "project-1",
        workspaceId: "workspace-1",
        name: "Q1 Campaign",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      mockTeamGetConfig.mockResolvedValue({
        configured: true,
        displayName: "Alice",
        activeWorkspaceId: "workspace-1"
      });
      mockTeamWorkspacesList.mockResolvedValue([mockWorkspace]);
      mockTeamProjectsCreate.mockResolvedValue(mockProject);
      mockTeamProjectsList.mockResolvedValue([mockProject]);

      const { result } = renderHook(() => useTeamState());

      // Establish active workspace through real hook flow
      await act(async () => {
        await result.current.loadConfig();
      });
      await act(async () => {
        await result.current.loadWorkspaces("workspace-1");
      });
      await waitFor(() => {
        expect(result.current.activeWorkspace).toEqual(mockWorkspace);
      });

      let resultProject: TeamProject | null = null;
      await act(async () => {
        resultProject = await result.current.createProject("Q1 Campaign");
      });

      expect(resultProject).toEqual(mockProject);
      expect(mockTeamProjectsCreate).toHaveBeenCalledWith({ name: "Q1 Campaign" });
      expect(mockTeamProjectsList).toHaveBeenCalled();
    });

    it("returns null when no active workspace", async () => {
      const { result } = renderHook(() => useTeamState());

      let resultProject: TeamProject | null = null;
      await act(async () => {
        resultProject = await result.current.createProject("Q1 Campaign");
      });

      expect(resultProject).toBe(null);
      await waitFor(() => {
        expect(result.current.error).toBe("No active workspace selected");
      });
    });
  });

  describe("loadTasks", () => {
    it("loads tasks successfully", async () => {
      const mockTasks: TeamProjectTask[] = [
        {
          id: "task-1",
          workspaceId: "workspace-1",
          projectId: "project-1",
          title: "Design logo",
          notes: "Create a modern logo",
          dueAt: "2024-01-15T00:00:00Z",
          priority: "normal",
          status: "open",
          recurrence: "none",
          assigneeDisplayName: "Alice",
          createdAt: "2024-01-01T00:00:00Z",
          createdBy: "user-1",
          updatedAt: "2024-01-01T00:00:00Z",
          updatedBy: "user-1"
        }
      ];
      mockTeamTasksList.mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useTeamState());

      await act(async () => {
        await result.current.loadTasks();
      });

      await waitFor(() => {
        expect(result.current.tasks).toEqual(mockTasks);
      });
      expect(mockTeamTasksList).toHaveBeenCalledTimes(1);
    });

    it("handles task load error", async () => {
      mockTeamTasksList.mockRejectedValue(new Error("Failed to load"));

      const { result } = renderHook(() => useTeamState());

      await act(async () => {
        await result.current.loadTasks();
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to load");
      });
    });
  });

  describe("createTask", () => {
    it("creates task successfully", async () => {
      const mockTask: TeamProjectTask = {
        id: "task-1",
        workspaceId: "workspace-1",
        projectId: "project-1",
        title: "Design logo",
        notes: "Create a modern logo",
        dueAt: "2024-01-15T00:00:00Z",
        priority: "normal",
        status: "open",
        recurrence: "none",
        assigneeDisplayName: "Alice",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedAt: "2024-01-01T00:00:00Z",
        updatedBy: "user-1"
      };
      mockTeamTasksCreate.mockResolvedValue(mockTask);
      mockTeamTasksList.mockResolvedValue([mockTask]);

      const { result } = renderHook(() => useTeamState());

      const taskToCreate = {
        projectId: "project-1",
        title: "Design logo",
        notes: "Create a modern logo",
        dueAt: "2024-01-15T00:00:00Z",
        priority: "normal" as const,
        recurrence: "none" as const,
        assigneeDisplayName: null
      };

      let resultTask: TeamProjectTask | null = null;
      await act(async () => {
        resultTask = await result.current.createTask(taskToCreate);
      });

      expect(resultTask).toEqual(mockTask);
      expect(mockTeamTasksCreate).toHaveBeenCalledWith(taskToCreate);
      expect(mockTeamTasksList).toHaveBeenCalled();
    });

    it("handles task creation error", async () => {
      mockTeamTasksCreate.mockRejectedValue(new Error("Failed to create"));

      const { result } = renderHook(() => useTeamState());

      const taskToCreate = {
        projectId: "project-1",
        title: "Design logo",
        notes: "Create a modern logo",
        dueAt: "2024-01-15T00:00:00Z",
        priority: "normal" as const,
        recurrence: "none" as const,
        assigneeDisplayName: null
      };

      let resultTask: TeamProjectTask | null = null;
      await act(async () => {
        resultTask = await result.current.createTask(taskToCreate);
      });

      expect(resultTask).toBe(null);
      await waitFor(() => {
        expect(result.current.error).toBe("Failed to create");
      });
    });

    it("accepts assigneeDisplayName in task creation", async () => {
      const mockTask: TeamProjectTask = {
        id: "task-1",
        workspaceId: "workspace-1",
        projectId: "project-1",
        title: "Design logo",
        notes: "Create a modern logo",
        dueAt: "2024-01-15T00:00:00Z",
        priority: "normal",
        status: "open",
        recurrence: "none",
        assigneeDisplayName: "Alice",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedAt: "2024-01-01T00:00:00Z",
        updatedBy: "user-1"
      };
      mockTeamTasksCreate.mockResolvedValue(mockTask);
      mockTeamTasksList.mockResolvedValue([mockTask]);

      const { result } = renderHook(() => useTeamState());

      const taskToCreate = {
        projectId: "project-1",
        title: "Design logo",
        notes: "Create a modern logo",
        dueAt: "2024-01-15T00:00:00Z",
        priority: "normal" as const,
        recurrence: "none" as const,
        assigneeDisplayName: "Alice"
      };

      let resultTask: TeamProjectTask | null = null;
      await act(async () => {
        resultTask = await result.current.createTask(taskToCreate);
      });

      expect(resultTask).toEqual(mockTask);
      expect(mockTeamTasksCreate).toHaveBeenCalledWith(taskToCreate);
    });
  });

  describe("updateTask", () => {
    it("updates task successfully", async () => {
      const mockTask: TeamProjectTask = {
        id: "task-1",
        workspaceId: "workspace-1",
        projectId: "project-1",
        title: "Design logo",
        notes: "Create a modern logo",
        dueAt: "2024-01-15T00:00:00Z",
        priority: "normal",
        status: "done",
        recurrence: "none",
        assigneeDisplayName: "Alice",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedAt: "2024-01-01T00:00:00Z",
        updatedBy: "user-1"
      };
      mockTeamTasksUpdate.mockResolvedValue(undefined);
      mockTeamTasksList.mockResolvedValue([mockTask]);

      const { result } = renderHook(() => useTeamState());

      await act(async () => {
        await result.current.updateTask(mockTask);
      });

      expect(mockTeamTasksUpdate).toHaveBeenCalledWith({
        id: mockTask.id,
        title: mockTask.title,
        notes: mockTask.notes,
        dueAt: mockTask.dueAt,
        priority: mockTask.priority,
        status: mockTask.status,
        recurrence: mockTask.recurrence,
        assigneeDisplayName: mockTask.assigneeDisplayName
      });
      expect(mockTeamTasksList).toHaveBeenCalled();
    });

    it("handles task update error", async () => {
      mockTeamTasksUpdate.mockRejectedValue(new Error("Failed to update"));

      const { result } = renderHook(() => useTeamState());

      const mockTask: TeamProjectTask = {
        id: "task-1",
        workspaceId: "workspace-1",
        projectId: "project-1",
        title: "Design logo",
        notes: "Create a modern logo",
        dueAt: "2024-01-15T00:00:00Z",
        priority: "normal",
        status: "open",
        recurrence: "none",
        assigneeDisplayName: "Alice",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedAt: "2024-01-01T00:00:00Z",
        updatedBy: "user-1"
      };

      await act(async () => {
        await result.current.updateTask(mockTask);
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to update");
      });
    });
  });
});
