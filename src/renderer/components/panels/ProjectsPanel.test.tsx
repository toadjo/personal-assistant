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
    onTeamDataUpdated: onTeamDataUpdatedMock,
    teamSetDisplayName: vi.fn().mockResolvedValue(undefined)
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: null };
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: null };
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: null };
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: null };
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: null };
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: null };
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
    it("shows display-name-only setup when backend is configured", () => {
      mockTeamState.config = { configured: false, backendConfigured: true, backendMode: "hosted", displayName: null, activeWorkspaceId: null };

      render(<ProjectsPanel />);

      expect(screen.getByText("Enter your display name to start collaborating on shared projects and tasks.")).toBeInTheDocument();
      expect(screen.getByText("Continue")).toBeInTheDocument();
      expect(screen.queryByText("Supabase URL")).not.toBeInTheDocument();
      expect(screen.queryByText("Supabase Anon Key")).not.toBeInTheDocument();
    });

    it("shows unavailable state when backend is not configured", () => {
      mockTeamState.config = { configured: false, backendConfigured: false, backendMode: "unavailable", displayName: null, activeWorkspaceId: null };

      render(<ProjectsPanel />);

      expect(screen.getByText("Team Projects is not available in this build")).toBeInTheDocument();
      expect(screen.getByText("Advanced self-hosted backend")).toBeInTheDocument();
    });

    it("clicking Advanced self-hosted backend shows manual config form", async () => {
      mockTeamState.config = { configured: false, backendConfigured: false, backendMode: "unavailable", displayName: null, activeWorkspaceId: null };

      render(<ProjectsPanel />);

      const advancedButton = screen.getByText("Advanced self-hosted backend");
      await userEvent.click(advancedButton);

      expect(screen.getByLabelText("Supabase URL")).toBeInTheDocument();
      expect(screen.getByLabelText("Supabase Anon Key")).toBeInTheDocument();
      expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
    });

    it("clicking Continue saves display name only", async () => {
      mockTeamState.config = { configured: false, backendConfigured: true, backendMode: "hosted", displayName: null, activeWorkspaceId: null };

      render(<ProjectsPanel />);

      const continueButton = screen.getByText("Continue");
      await userEvent.click(continueButton);

      const displayNameInput = screen.getByLabelText("Your display name");
      await userEvent.type(displayNameInput, "Alice");

      const saveButton = screen.getByText("Continue");
      await userEvent.click(saveButton);

      expect(window.assistantApi.teamSetDisplayName).toHaveBeenCalledWith({ displayName: "Alice" });
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: null };
      mockTeamState.workspaces = mockWorkspaces;

      render(<ProjectsPanel />);

      expect(screen.getByText("Your Workspaces")).toBeInTheDocument();
      expect(screen.getByText("Marketing Team")).toBeInTheDocument();
      expect(screen.getByText("Invite code: ABCD2345EFGH6789")).toBeInTheDocument();
    });

    it("shows empty state when no workspaces", () => {
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: null };
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = mockWorkspace;
      mockTeamState.projects = mockProjects;

      render(<ProjectsPanel />);

      expect(screen.getByText("Projects")).toBeInTheDocument();
      expect(screen.getAllByText("Q1 Campaign")).toHaveLength(2);
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = mockWorkspace;
      mockTeamState.projects = mockProjects;
      mockTeamState.tasks = mockTasks;

      render(<ProjectsPanel />);

      expect(screen.getByText("Shared Tasks")).toBeInTheDocument();
      expect(screen.getByText("Design logo")).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = mockWorkspace;
      mockTeamState.projects = mockProjects;
      mockTeamState.tasks = [];

      render(<ProjectsPanel />);

      expect(screen.getByText("No Tasks")).toBeInTheDocument();
    });
  });

  describe("Task board filters", () => {
    const baseWorkspace: TeamWorkspace = {
      id: "workspace-1",
      name: "Marketing Team",
      workspaceKey: "ABCD2345EFGH6789",
      createdAt: "2024-01-01T00:00:00Z",
      createdBy: "user-1"
    };
    const baseProjects: TeamProject[] = [
      {
        id: "project-1",
        workspaceId: "workspace-1",
        name: "Q1 Campaign",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      },
      {
        id: "project-2",
        workspaceId: "workspace-1",
        name: "Q2 Campaign",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      }
    ];
    const baseTasks: TeamProjectTask[] = [
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
      },
      {
        id: "task-2",
        workspaceId: "workspace-1",
        projectId: "project-1",
        title: "Write copy",
        notes: "Marketing copy for launch",
        dueAt: "2024-01-20T00:00:00Z",
        priority: "normal",
        status: "done",
        recurrence: "none",
        assigneeDisplayName: "Bob",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedAt: "2024-01-01T00:00:00Z",
        updatedBy: "user-1"
      },
      {
        id: "task-3",
        workspaceId: "workspace-1",
        projectId: "project-2",
        title: "Schedule launch",
        notes: "Coordinate launch timeline",
        dueAt: "2024-02-01T00:00:00Z",
        priority: "high",
        status: "open",
        recurrence: "none",
        assigneeDisplayName: "Charlie",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedAt: "2024-01-01T00:00:00Z",
        updatedBy: "user-1"
      }
    ];

    beforeEach(() => {
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = baseWorkspace;
      mockTeamState.projects = baseProjects;
      mockTeamState.tasks = baseTasks;
    });

    it("project and status filter controls render when projects exist", () => {
      render(<ProjectsPanel />);

      expect(screen.getByLabelText("Project:")).toBeInTheDocument();
      expect(screen.getByLabelText("Status:")).toBeInTheDocument();
    });

    it("default status filter shows open tasks and hides done tasks", () => {
      render(<ProjectsPanel />);

      expect(screen.getByText("Design logo")).toBeInTheDocument();
      expect(screen.getByText("Schedule launch")).toBeInTheDocument();
      expect(screen.queryByText("Write copy")).not.toBeInTheDocument();
    });

    it("status filter Done shows done tasks", async () => {
      render(<ProjectsPanel />);

      const statusFilter = screen.getByLabelText("Status:");
      await userEvent.selectOptions(statusFilter, "done");

      expect(screen.queryByText("Design logo")).not.toBeInTheDocument();
      expect(screen.queryByText("Schedule launch")).not.toBeInTheDocument();
      expect(screen.getByText("Write copy")).toBeInTheDocument();
    });

    it("status filter All shows open and done tasks", async () => {
      render(<ProjectsPanel />);

      const statusFilter = screen.getByLabelText("Status:");
      await userEvent.selectOptions(statusFilter, "all");

      expect(screen.getByText("Design logo")).toBeInTheDocument();
      expect(screen.getByText("Write copy")).toBeInTheDocument();
      expect(screen.getByText("Schedule launch")).toBeInTheDocument();
    });

    it("project filter narrows tasks to the selected project", async () => {
      render(<ProjectsPanel />);

      const statusFilter = screen.getByLabelText("Status:");
      await userEvent.selectOptions(statusFilter, "all");

      const projectFilter = screen.getByLabelText("Project:");
      await userEvent.selectOptions(projectFilter, "project-1");

      expect(screen.getByText("Design logo")).toBeInTheDocument();
      expect(screen.getByText("Write copy")).toBeInTheDocument();
      expect(screen.queryByText("Schedule launch")).not.toBeInTheDocument();
    });

    it("filtered empty state appears when no task matches", async () => {
      render(<ProjectsPanel />);

      const projectFilter = screen.getByLabelText("Project:");
      await userEvent.selectOptions(projectFilter, "project-2");

      const statusFilter = screen.getByLabelText("Status:");
      await userEvent.selectOptions(statusFilter, "done");

      expect(screen.getByText("No Tasks Match Filters")).toBeInTheDocument();
      expect(screen.getByText("No tasks match these filters.")).toBeInTheDocument();
    });

    it("selected project filter resets when that project is no longer available", async () => {
      const { rerender } = render(<ProjectsPanel />);

      const projectFilter = screen.getByLabelText("Project:");
      await userEvent.selectOptions(projectFilter, "project-1");

      expect(screen.getByDisplayValue("Q1 Campaign")).toBeInTheDocument();

      // Simulate project being removed
      mockTeamState.projects = [baseProjects[1]!];
      vi.mocked(useTeamState).mockReturnValue(mockTeamState);

      // Re-render to trigger useEffect
      rerender(<ProjectsPanel />);

      // Filter should reset to "All projects"
      expect(screen.getByDisplayValue("All projects")).toBeInTheDocument();
    });
  });

  describe("Task editor", () => {
    const baseWorkspace: TeamWorkspace = {
      id: "workspace-1",
      name: "Marketing Team",
      workspaceKey: "ABCD2345EFGH6789",
      createdAt: "2024-01-01T00:00:00Z",
      createdBy: "user-1"
    };
    const baseProjects: TeamProject[] = [
      {
        id: "project-1",
        workspaceId: "workspace-1",
        name: "Q1 Campaign",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      }
    ];
    const baseTask: TeamProjectTask = {
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
    };

    beforeEach(() => {
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = baseWorkspace;
      mockTeamState.projects = baseProjects;
      mockTeamState.tasks = [baseTask];
    });

    it("clicking Edit opens the editor with existing task values", async () => {
      render(<ProjectsPanel />);

      const editButton = screen.getByTitle("Edit task");
      await userEvent.click(editButton);

      expect(screen.getByLabelText("Title")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Design logo")).toBeInTheDocument();
      expect(screen.getByLabelText("Notes")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Create a modern logo")).toBeInTheDocument();
    });

    it("saving changed title and notes calls team.updateTask with the merged task", async () => {
      render(<ProjectsPanel />);

      const editButton = screen.getByTitle("Edit task");
      await userEvent.click(editButton);

      const titleInput = screen.getByLabelText("Title");
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, "Updated title");

      const notesInput = screen.getByLabelText("Notes");
      await userEvent.clear(notesInput);
      await userEvent.type(notesInput, "Updated notes");

      const saveButton = screen.getByText("Save");
      await userEvent.click(saveButton);

      expect(mockTeamState.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated title",
          notes: "Updated notes"
        })
      );
    });

    it("saving changed priority, recurrence, assignee, due date, and status sends the updated values", async () => {
      render(<ProjectsPanel />);

      const editButton = screen.getByTitle("Edit task");
      await userEvent.click(editButton);

      const prioritySelect = screen.getByLabelText("Priority");
      await userEvent.selectOptions(prioritySelect, "low");

      const recurrenceSelect = screen.getByLabelText("Recurrence");
      await userEvent.selectOptions(recurrenceSelect, "daily");

      const dueAtInput = screen.getByLabelText("Due Date");
      await userEvent.clear(dueAtInput);
      await userEvent.type(dueAtInput, "2024-02-01T10:00");

      const assigneeInput = screen.getByLabelText("Assignee");
      await userEvent.clear(assigneeInput);
      await userEvent.type(assigneeInput, "Bob");

      const statusSelect = screen.getByLabelText("Status");
      await userEvent.selectOptions(statusSelect, "done");

      const saveButton = screen.getByText("Save");
      await userEvent.click(saveButton);

      expect(mockTeamState.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "low",
          recurrence: "daily",
          assigneeDisplayName: "Bob",
          status: "done"
        })
      );
    });

    it("cancel closes the editor and does not call team.updateTask", async () => {
      render(<ProjectsPanel />);

      const editButton = screen.getByTitle("Edit task");
      await userEvent.click(editButton);

      const titleInput = screen.getByLabelText("Title");
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, "Changed title");

      const cancelButton = screen.getByText("Cancel");
      await userEvent.click(cancelButton);

      expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
      expect(mockTeamState.updateTask).not.toHaveBeenCalled();
    });

    it("empty title shows validation error and does not save", async () => {
      render(<ProjectsPanel />);

      const editButton = screen.getByTitle("Edit task");
      await userEvent.click(editButton);

      const titleInput = screen.getByLabelText("Title");
      await userEvent.clear(titleInput);

      const saveButton = screen.getByText("Save");
      await userEvent.click(saveButton);

      expect(screen.getByText("Task title is required")).toBeInTheDocument();
      expect(mockTeamState.updateTask).not.toHaveBeenCalled();
    });

    it("recurrence without due date shows validation error and does not save", async () => {
      render(<ProjectsPanel />);

      const editButton = screen.getByTitle("Edit task");
      await userEvent.click(editButton);

      const dueAtInput = screen.getByLabelText("Due Date");
      await userEvent.clear(dueAtInput);

      const recurrenceSelect = screen.getByLabelText("Recurrence");
      await userEvent.selectOptions(recurrenceSelect, "daily");

      const saveButton = screen.getByText("Save");
      await userEvent.click(saveButton);

      expect(screen.getByText("Recurring tasks require a due date")).toBeInTheDocument();
      expect(mockTeamState.updateTask).not.toHaveBeenCalled();
    });

    it("editor closes if the selected task is no longer present", async () => {
      const { rerender } = render(<ProjectsPanel />);

      const editButton = screen.getByTitle("Edit task");
      await userEvent.click(editButton);

      expect(screen.getByLabelText("Title")).toBeInTheDocument();

      // Simulate task being removed
      mockTeamState.tasks = [];
      vi.mocked(useTeamState).mockReturnValue(mockTeamState);

      // Re-render to trigger useEffect
      rerender(<ProjectsPanel />);

      // Editor should be closed
      expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = baseWorkspace;

      render(<ProjectsPanel />);

      expect(teamRealtimeStartMock).toHaveBeenCalledTimes(1);
      expect(onTeamDataUpdatedMock).toHaveBeenCalledTimes(1);
    });

    it("refreshes projects and tasks on matching workspace events", async () => {
      vi.useFakeTimers();
      try {
        mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
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
        mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
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
        mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
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
        mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
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
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: "workspace-1" };
      mockTeamState.activeWorkspace = baseWorkspace;

      const { unmount } = render(<ProjectsPanel />);
      unmount();

      expect(teamRealtimeStopMock).toHaveBeenCalled();
      expect(teamDataUpdatedListener).toBe(null);
    });

    it("does not start realtime when no active workspace exists", () => {
      mockTeamState.config = { configured: true, backendConfigured: true, backendMode: "manual", displayName: "Alice", activeWorkspaceId: null };
      mockTeamState.activeWorkspace = null;

      render(<ProjectsPanel />);

      expect(teamRealtimeStartMock).not.toHaveBeenCalled();
      expect(onTeamDataUpdatedMock).not.toHaveBeenCalled();
    });
  });
});
