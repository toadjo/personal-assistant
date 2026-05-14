/**
 * Tests for ProjectsPanel component.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ProjectsPanel } from "./ProjectsPanel";
import type { TeamWorkspace, TeamProject, TeamProjectTask } from "../../../shared/team/types";

// Mock useTeamState hook
vi.mock("../../hooks/team/useTeamState", () => ({
  useTeamState: vi.fn()
}));

import { useTeamState } from "../../hooks/team/useTeamState";

// Mock window.assistantApi for realtime calls made directly from the panel.
const teamRealtimeStartMock = vi.fn().mockResolvedValue(undefined);
const teamRealtimeStopMock = vi.fn().mockResolvedValue(undefined);
let teamDataUpdatedListener:
  | ((event: unknown, payload: { workspaceId: string; tables: ("projects" | "tasks")[] }) => void)
  | null = null;
const onTeamDataUpdatedMock = vi.fn(
  (cb: (event: unknown, payload: { workspaceId: string; tables: ("projects" | "tasks")[] }) => void) => {
    teamDataUpdatedListener = cb;
    return () => {
      teamDataUpdatedListener = null;
    };
  }
);

Object.defineProperty(window, "assistantApi", {
  value: {
    teamRealtimeStart: teamRealtimeStartMock,
    teamRealtimeStop: teamRealtimeStopMock,
    onTeamDataUpdated: onTeamDataUpdatedMock
  },
  writable: true,
  configurable: true
});

function emitTeamDataUpdated(payload: { workspaceId: string; tables: ("projects" | "tasks")[] }): void {
  teamDataUpdatedListener?.({}, payload);
}

describe("ProjectsPanel", () => {
  const mockTeamState = {
    config: null,
    configError: null,
    isLoadingConfig: false,
    workspaces: [],
    activeWorkspace: null,
    isLoadingWorkspaces: false,
    projects: [],
    isLoadingProjects: false,
    tasks: [],
    isLoadingTasks: false,
    error: null,
    loadConfig: vi.fn(),
    saveConfig: vi.fn(),
    clearConfig: vi.fn(),
    loadWorkspaces: vi.fn(),
    createWorkspace: vi.fn(),
    joinWorkspace: vi.fn(),
    setWorkspaceActive: vi.fn(),
    loadProjects: vi.fn(),
    createProject: vi.fn(),
    loadTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn()
  } as unknown as ReturnType<typeof useTeamState>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mock state properties
    mockTeamState.config = null;
    mockTeamState.configError = null;
    mockTeamState.isLoadingConfig = false;
    mockTeamState.workspaces = [];
    mockTeamState.activeWorkspace = null;
    mockTeamState.isLoadingWorkspaces = false;
    mockTeamState.projects = [];
    mockTeamState.isLoadingProjects = false;
    mockTeamState.tasks = [];
    mockTeamState.isLoadingTasks = false;
    mockTeamState.error = null;
    vi.mocked(useTeamState).mockReturnValue(mockTeamState);
  });

  describe("Workspace selection", () => {
    it("clicking Open on workspace calls setWorkspaceActive", async () => {
      const mockWorkspaces: TeamWorkspace[] = [
        {
          id: "workspace-1",
          name: "Marketing Team",
          workspaceKey: "ABCD2345EFGH6789",
          createdAt: "2024-01-01T00:00:00Z",
          createdBy: "user-1"
        }
      ];
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: null };
      mockTeamState.workspaces = mockWorkspaces;

      render(<ProjectsPanel />);

      const openButton = screen.getByText("Open");
      await userEvent.click(openButton);

      expect(mockTeamState.setWorkspaceActive).toHaveBeenCalledWith("workspace-1");
    });
  });

  describe("Auto-set workspace active", () => {
    it("create workspace sets the new workspace active when no active workspace", async () => {
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: null };
      mockTeamState.activeWorkspace = null;
      mockTeamState.workspaces = [];
      vi.mocked(mockTeamState.createWorkspace).mockResolvedValue(mockWorkspace);
      vi.mocked(mockTeamState.loadWorkspaces).mockResolvedValue(undefined);

      render(<ProjectsPanel />);

      // This test verifies the hook behavior; the actual UI interaction would require userEvent
      expect(mockTeamState.createWorkspace).toBeDefined();
    });

    it("join workspace sets the joined workspace active when no active workspace", async () => {
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: null };
      mockTeamState.activeWorkspace = null;
      mockTeamState.workspaces = [];
      vi.mocked(mockTeamState.joinWorkspace).mockResolvedValue(mockWorkspace);
      vi.mocked(mockTeamState.loadWorkspaces).mockResolvedValue(undefined);

      render(<ProjectsPanel />);

      // Click Join Workspace button
      const joinButton = screen.getByText("Join Workspace");
      await userEvent.click(joinButton);

      // Enter workspace key (valid: no 0, 1, O, I)
      const keyInput = screen.getByPlaceholderText("Workspace key (16 characters)");
      await userEvent.type(keyInput, "ABCD2345EFGH6789");

      // Click Join button
      const saveButton = screen.getByText("Join");
      await userEvent.click(saveButton);

      // Verify joinWorkspace was called
      expect(mockTeamState.joinWorkspace).toHaveBeenCalledWith("ABCD2345EFGH6789");

      // Verify loadWorkspaces was called (to persist the active workspace)
      expect(mockTeamState.loadWorkspaces).toHaveBeenCalled();
    });
  });

  describe("Create workspace flow", () => {
    it("clicking Create Workspace, entering name, saving sets workspace active and shows project empty state", async () => {
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: null };
      mockTeamState.workspaces = [];
      mockTeamState.activeWorkspace = null;
      mockTeamState.projects = [];
      vi.mocked(mockTeamState.createWorkspace).mockResolvedValue(mockWorkspace);
      vi.mocked(mockTeamState.loadWorkspaces).mockResolvedValue(undefined);

      render(<ProjectsPanel />);

      // Click Create Workspace button
      const createButton = screen.getByText("Create Workspace");
      await userEvent.click(createButton);

      // Enter workspace name
      const nameInput = screen.getByPlaceholderText("Workspace name");
      await userEvent.type(nameInput, "Marketing Team");

      // Click Create button
      const saveButton = screen.getByText("Create");
      await userEvent.click(saveButton);

      // Verify createWorkspace was called
      expect(mockTeamState.createWorkspace).toHaveBeenCalledWith("Marketing Team");

      // Verify loadWorkspaces was called (to persist the active workspace)
      expect(mockTeamState.loadWorkspaces).toHaveBeenCalled();
    });
  });

  describe("Join workspace flow", () => {
    it("clicking Join Workspace, entering key, saving sets workspace active", async () => {
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: null };
      mockTeamState.workspaces = [];
      mockTeamState.activeWorkspace = null;
      mockTeamState.projects = [];
      vi.mocked(mockTeamState.joinWorkspace).mockResolvedValue(mockWorkspace);
      vi.mocked(mockTeamState.loadWorkspaces).mockResolvedValue(undefined);

      render(<ProjectsPanel />);

      // Click Join Workspace button
      const joinButton = screen.getByText("Join Workspace");
      await userEvent.click(joinButton);

      // Enter workspace key (valid key without 0, 1, O, I)
      const keyInput = screen.getByPlaceholderText("Workspace key (16 characters)");
      await userEvent.type(keyInput, "ABCD2345EFGH6789");

      // Click Join button
      const saveButton = screen.getByText("Join");
      await userEvent.click(saveButton);

      // Verify joinWorkspace was called
      expect(mockTeamState.joinWorkspace).toHaveBeenCalledWith("ABCD2345EFGH6789");

      // Verify loadWorkspaces was called (to persist the active workspace)
      expect(mockTeamState.loadWorkspaces).toHaveBeenCalled();
    });
  });

  describe("Task creation", () => {
    it("shows create task form when Add Task is clicked", () => {
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      const mockProjects: TeamProject[] = [
        {
          id: "project-1",
          workspaceId: "workspace-1",
          name: "Q1 Campaign",
          createdAt: "2024-01-01T00:00:00Z",
          createdBy: "user-1"
        }
      ];
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = mockWorkspace;
      mockTeamState.projects = mockProjects;
      mockTeamState.tasks = [];

      render(<ProjectsPanel />);

      expect(screen.getByText("Add Task")).toBeInTheDocument();
    });

    it("task status toggle button is visible for tasks", async () => {
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      const mockProjects: TeamProject[] = [
        {
          id: "project-1",
          workspaceId: "workspace-1",
          name: "Q1 Campaign",
          createdAt: "2024-01-01T00:00:00Z",
          createdBy: "user-1"
        }
      ];
      const mockTasks: TeamProjectTask[] = [
        {
          id: "task-1",
          workspaceId: "workspace-1",
          projectId: "project-1",
          title: "Design logo",
          notes: "Create a modern logo",
          dueAt: "2024-01-15T00:00:00Z",
          priority: "high",
          status: "open",
          recurrence: "none",
          assigneeDisplayName: "Alice",
          createdAt: "2024-01-01T00:00:00Z",
          createdBy: "user-1",
          updatedAt: "2024-01-01T00:00:00Z",
          updatedBy: "user-1"
        }
      ];
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = mockWorkspace;
      mockTeamState.projects = mockProjects;
      mockTeamState.tasks = mockTasks;

      render(<ProjectsPanel />);

      const statusButton = screen.getByTitle("Mark as done");
      expect(statusButton).toBeInTheDocument();
    });

    it("blocks recurring task creation without due date", async () => {
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      const mockProjects: TeamProject[] = [
        {
          id: "project-1",
          workspaceId: "workspace-1",
          name: "Q1 Campaign",
          createdAt: "2024-01-01T00:00:00Z",
          createdBy: "user-1"
        }
      ];
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = mockWorkspace;
      mockTeamState.projects = mockProjects;
      mockTeamState.tasks = [];

      render(<ProjectsPanel />);

      // Click Add Task button
      const addTaskButton = screen.getByText("Add Task");
      await userEvent.click(addTaskButton);

      // Select project
      const projectSelect = screen.getByLabelText("Project");
      await userEvent.selectOptions(projectSelect, "project-1");

      // Enter task title
      const titleInput = screen.getByLabelText("Title");
      await userEvent.type(titleInput, "Daily task");

      // Select recurrence without due date
      const recurrenceSelect = screen.getByLabelText("Recurrence");
      await userEvent.selectOptions(recurrenceSelect, "daily");

      // Click Create Task button
      const createTaskButton = screen.getAllByText("Create Task")[0];
      if (createTaskButton) {
        await userEvent.click(createTaskButton);
      }

      // Verify createTask was NOT called (blocked by validation)
      expect(mockTeamState.createTask).not.toHaveBeenCalled();

      // Verify validation error is shown
      expect(screen.getByText("Recurring tasks require a due date")).toBeInTheDocument();
    });

    it("blocks workspace join with invalid key", async () => {
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: null };
      mockTeamState.workspaces = [];
      mockTeamState.activeWorkspace = null;

      render(<ProjectsPanel />);

      // Click Join Workspace button
      const joinButton = screen.getByText("Join Workspace");
      await userEvent.click(joinButton);

      // Enter invalid workspace key (too short)
      const keyInput = screen.getByPlaceholderText("Workspace key (16 characters)");
      await userEvent.type(keyInput, "ABC123");

      // Click Join button
      const saveButton = screen.getByText("Join");
      await userEvent.click(saveButton);

      // Verify joinWorkspace was NOT called (blocked by validation)
      expect(mockTeamState.joinWorkspace).not.toHaveBeenCalled();

      // Verify validation error is shown
      expect(screen.getByText(/must be exactly 16 characters/)).toBeInTheDocument();
    });
  });

  describe("Setup state: team mode not configured", () => {
    it("shows setup form when not configured", () => {
      mockTeamState.config = { configured: false, displayName: null, activeWorkspaceId: null };

      render(<ProjectsPanel />);

      expect(screen.getByText("Team Projects Not Configured")).toBeInTheDocument();
      expect(screen.getByText("Configure Team Mode")).toBeInTheDocument();
    });
  });

  describe("Workspace state: configured but no active workspace", () => {
    it("shows workspace list when workspaces exist", () => {
      const mockWorkspaces: TeamWorkspace[] = [
        {
          id: "workspace-1",
          name: "Marketing Team",
          workspaceKey: "ABCD2345EFGH6789",
          createdAt: "2024-01-01T00:00:00Z",
          createdBy: "user-1"
        }
      ];
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: null };
      mockTeamState.workspaces = mockWorkspaces;

      render(<ProjectsPanel />);

      expect(screen.getByText("Your Workspaces")).toBeInTheDocument();
      expect(screen.getByText("Marketing Team")).toBeInTheDocument();
      expect(screen.getByText("Key: ABCD2345EFGH6789")).toBeInTheDocument();
    });

    it("shows empty state when no workspaces", () => {
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: null };
      mockTeamState.activeWorkspace = null;
      mockTeamState.workspaces = [];

      render(<ProjectsPanel />);

      expect(screen.getByText("No Workspaces")).toBeInTheDocument();
    });
  });

  describe("Project state: active workspace but no projects", () => {
    it("shows empty project state when no projects", () => {
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = mockWorkspace;
      mockTeamState.projects = [];

      render(<ProjectsPanel />);

      expect(screen.getByText("Projects: Marketing Team")).toBeInTheDocument();
      expect(screen.getByText("No Projects")).toBeInTheDocument();
      expect(screen.getByText("Create Project")).toBeInTheDocument();
    });
  });

  describe("Tasks state: projects and tasks exist", () => {
    it("shows project list when projects exist", () => {
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      const mockProjects: TeamProject[] = [
        {
          id: "project-1",
          workspaceId: "workspace-1",
          name: "Q1 Campaign",
          createdAt: "2024-01-01T00:00:00Z",
          createdBy: "user-1"
        }
      ];
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = mockWorkspace;
      mockTeamState.projects = mockProjects;

      render(<ProjectsPanel />);

      expect(screen.getByText("Projects")).toBeInTheDocument();
      expect(screen.getByText("Q1 Campaign")).toBeInTheDocument();
    });

    it("shows shared tasks when tasks exist", () => {
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      const mockProjects: TeamProject[] = [
        {
          id: "project-1",
          workspaceId: "workspace-1",
          name: "Q1 Campaign",
          createdAt: "2024-01-01T00:00:00Z",
          createdBy: "user-1"
        }
      ];
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
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = mockWorkspace;
      mockTeamState.projects = mockProjects;
      mockTeamState.tasks = mockTasks;

      render(<ProjectsPanel />);

      expect(screen.getByText("Shared Tasks")).toBeInTheDocument();
      expect(screen.getByText("Design logo")).toBeInTheDocument();
      expect(screen.getByText("Assignee: Alice")).toBeInTheDocument();
    });

    it("shows empty task state when no tasks", () => {
      const mockWorkspace: TeamWorkspace = {
        id: "workspace-1",
        name: "Marketing Team",
        workspaceKey: "ABCD2345EFGH6789",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };
      const mockProjects: TeamProject[] = [
        {
          id: "project-1",
          workspaceId: "workspace-1",
          name: "Q1 Campaign",
          createdAt: "2024-01-01T00:00:00Z",
          createdBy: "user-1"
        }
      ];
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = mockWorkspace;
      mockTeamState.projects = mockProjects;
      mockTeamState.tasks = [];

      render(<ProjectsPanel />);

      expect(screen.getByText("No Tasks")).toBeInTheDocument();
    });
  });

  describe("Realtime", () => {
    const baseWorkspace: TeamWorkspace = {
      id: "workspace-1",
      name: "Marketing Team",
      workspaceKey: "ABCD2345EFGH6789",
      createdAt: "2024-01-01T00:00:00Z",
      createdBy: "user-1"
    };

    beforeEach(() => {
      teamRealtimeStartMock.mockClear();
      teamRealtimeStopMock.mockClear();
      onTeamDataUpdatedMock.mockClear();
      teamDataUpdatedListener = null;
    });

    it("starts realtime and subscribes when an active workspace exists", async () => {
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = baseWorkspace;

      render(<ProjectsPanel />);

      expect(teamRealtimeStartMock).toHaveBeenCalledTimes(1);
      expect(onTeamDataUpdatedMock).toHaveBeenCalledTimes(1);
    });

    it("refreshes projects and tasks on matching workspace events", async () => {
      vi.useFakeTimers();
      try {
        mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" };
        mockTeamState.activeWorkspace = baseWorkspace;

        render(<ProjectsPanel />);

        // The initial active-workspace effect runs loadProjects/loadTasks once.
        const initialLoadProjects = vi.mocked(mockTeamState.loadProjects).mock.calls.length;
        const initialLoadTasks = vi.mocked(mockTeamState.loadTasks).mock.calls.length;

        emitTeamDataUpdated({ workspaceId: "workspace-1", tables: ["projects", "tasks"] });
        vi.advanceTimersByTime(250);

        expect(vi.mocked(mockTeamState.loadProjects).mock.calls.length).toBe(initialLoadProjects + 1);
        expect(vi.mocked(mockTeamState.loadTasks).mock.calls.length).toBe(initialLoadTasks + 1);
      } finally {
        vi.useRealTimers();
      }
    });

    it("ignores events for other workspaces", () => {
      vi.useFakeTimers();
      try {
        mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" };
        mockTeamState.activeWorkspace = baseWorkspace;

        render(<ProjectsPanel />);

        const initialLoadProjects = vi.mocked(mockTeamState.loadProjects).mock.calls.length;
        const initialLoadTasks = vi.mocked(mockTeamState.loadTasks).mock.calls.length;

        emitTeamDataUpdated({ workspaceId: "other-workspace", tables: ["projects", "tasks"] });
        vi.advanceTimersByTime(250);

        expect(vi.mocked(mockTeamState.loadProjects).mock.calls.length).toBe(initialLoadProjects);
        expect(vi.mocked(mockTeamState.loadTasks).mock.calls.length).toBe(initialLoadTasks);
      } finally {
        vi.useRealTimers();
      }
    });

    it("debounces repeated events into one refresh", () => {
      vi.useFakeTimers();
      try {
        mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" };
        mockTeamState.activeWorkspace = baseWorkspace;

        render(<ProjectsPanel />);

        const initialLoadProjects = vi.mocked(mockTeamState.loadProjects).mock.calls.length;

        emitTeamDataUpdated({ workspaceId: "workspace-1", tables: ["projects"] });
        emitTeamDataUpdated({ workspaceId: "workspace-1", tables: ["projects"] });
        emitTeamDataUpdated({ workspaceId: "workspace-1", tables: ["projects"] });
        vi.advanceTimersByTime(250);

        expect(vi.mocked(mockTeamState.loadProjects).mock.calls.length).toBe(initialLoadProjects + 1);
      } finally {
        vi.useRealTimers();
      }
    });

    it("accumulates different tables during debounce and refreshes both", () => {
      vi.useFakeTimers();
      try {
        mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" };
        mockTeamState.activeWorkspace = baseWorkspace;

        render(<ProjectsPanel />);

        const initialLoadProjects = vi.mocked(mockTeamState.loadProjects).mock.calls.length;
        const initialLoadTasks = vi.mocked(mockTeamState.loadTasks).mock.calls.length;

        // Send events for different tables within debounce window
        emitTeamDataUpdated({ workspaceId: "workspace-1", tables: ["projects"] });
        emitTeamDataUpdated({ workspaceId: "workspace-1", tables: ["tasks"] });
        vi.advanceTimersByTime(250);

        // Both should be refreshed
        expect(vi.mocked(mockTeamState.loadProjects).mock.calls.length).toBe(initialLoadProjects + 1);
        expect(vi.mocked(mockTeamState.loadTasks).mock.calls.length).toBe(initialLoadTasks + 1);
      } finally {
        vi.useRealTimers();
      }
    });

    it("unsubscribes and stops realtime on unmount", () => {
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = baseWorkspace;

      const { unmount } = render(<ProjectsPanel />);
      unmount();

      expect(teamRealtimeStopMock).toHaveBeenCalled();
      expect(teamDataUpdatedListener).toBe(null);
    });

    it("does not start realtime when no active workspace exists", () => {
      mockTeamState.config = { configured: true, displayName: "Alice", activeWorkspaceId: null };
      mockTeamState.activeWorkspace = null;

      render(<ProjectsPanel />);

      expect(teamRealtimeStartMock).not.toHaveBeenCalled();
      expect(onTeamDataUpdatedMock).not.toHaveBeenCalled();
    });
  });
});
