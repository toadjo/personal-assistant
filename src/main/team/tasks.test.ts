/**
 * Tests for tasks service.
 *
 * We mock the Supabase client, config, and client manager to avoid
 * real network calls and filesystem access.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClient, mockAuth, mockGetAuthenticatedSupabaseClient, mockGetTeamConfig } = vi.hoisted(() => ({
  mockClient: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  },
  mockAuth: {
    getUser: vi.fn()
  },
  mockGetAuthenticatedSupabaseClient: vi.fn(),
  mockGetTeamConfig: vi.fn()
}));

vi.mock("./supabaseClient", () => ({
  getAuthenticatedSupabaseClient: mockGetAuthenticatedSupabaseClient
}));

vi.mock("./config", () => ({
  getTeamConfig: mockGetTeamConfig
}));

import { createTask, updateTask, listTasks } from "./tasks";

function createMockQueryBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder)
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return builder;
}

describe("tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.auth = { getUser: mockAuth.getUser };
  });

  describe("createTask", () => {
    it("throws when no active workspace", async () => {
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: null });
      await expect(
        createTask({
          projectId: "proj-123",
          title: "Test Task",
          notes: "",
          dueAt: null,
          priority: "normal",
          status: "open",
          recurrence: "none",
          assigneeDisplayName: null
        })
      ).rejects.toThrow("No active workspace selected");
    });

    it("creates task and returns it", async () => {
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: "ws-123" });
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({
        data: {
          id: "task-123",
          workspace_id: "ws-123",
          project_id: "proj-123",
          title: "Test Task",
          notes: "",
          due_at: null,
          priority: "normal",
          status: "open",
          recurrence: "none",
          assignee_display_name: null,
          created_by: "user-123",
          created_at: "2024-01-01T00:00:00Z",
          updated_by: "user-123",
          updated_at: "2024-01-01T00:00:00Z"
        },
        error: null
      });

      mockClient.from.mockReturnValue(mockQueryBuilder);

      const result = await createTask({
        projectId: "proj-123",
        title: "Test Task",
        notes: "",
        dueAt: null,
        priority: "normal",
        status: "open",
        recurrence: "none",
        assigneeDisplayName: null
      });

      expect(result).toEqual({
        id: "task-123",
        workspaceId: "ws-123",
        projectId: "proj-123",
        title: "Test Task",
        notes: "",
        dueAt: null,
        priority: "normal",
        status: "open",
        recurrence: "none",
        assigneeDisplayName: null,
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-123",
        updatedAt: "2024-01-01T00:00:00Z",
        updatedBy: "user-123"
      });
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });
  });

  describe("updateTask", () => {
    it("throws when no active workspace", async () => {
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: null });
      await expect(updateTask({ taskId: "task-123", status: "done" })).rejects.toThrow("No active workspace selected");
    });

    it("updates task and returns it", async () => {
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: "ws-123" });
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({
        data: {
          id: "task-123",
          workspace_id: "ws-123",
          project_id: "proj-123",
          title: "Test Task",
          notes: "",
          due_at: null,
          priority: "normal",
          status: "done",
          recurrence: "none",
          assignee_display_name: null,
          created_by: "user-123",
          created_at: "2024-01-01T00:00:00Z",
          updated_by: "user-123",
          updated_at: "2024-01-01T01:00:00Z"
        },
        error: null
      });

      mockClient.from.mockReturnValue(mockQueryBuilder);

      const result = await updateTask({ taskId: "task-123", status: "done" });

      expect(result.status).toBe("done");
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe("listTasks", () => {
    it("throws when no active workspace", async () => {
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: null });
      await expect(listTasks()).rejects.toThrow("No active workspace selected");
    });

    it("returns empty array when no tasks", async () => {
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: "ws-123" });
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq.mockResolvedValue({ data: [], error: null });

      mockClient.from.mockReturnValue(mockQueryBuilder);

      const result = await listTasks();
      expect(result).toEqual([]);
    });

    it("returns list of tasks", async () => {
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: "ws-123" });
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq.mockResolvedValue({
        data: [
          {
            id: "task-123",
            workspace_id: "ws-123",
            project_id: "proj-123",
            title: "Task 1",
            notes: "",
            due_at: null,
            priority: "high",
            status: "open",
            recurrence: "none",
            assignee_display_name: null,
            created_by: "user-123",
            created_at: "2024-01-01T00:00:00Z",
            updated_by: "user-123",
            updated_at: "2024-01-01T00:00:00Z"
          }
        ],
        error: null
      });

      mockClient.from.mockReturnValue(mockQueryBuilder);

      const result = await listTasks();

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Task 1");
    });
  });
});
