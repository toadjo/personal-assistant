/**
 * Tests for projects service.
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

import { createProject, listProjects } from "./projects";

function createMockQueryBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(),
    insert: vi.fn(() => builder)
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return builder;
}

describe("projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.auth = { getUser: mockAuth.getUser };
  });

  describe("createProject", () => {
    it("throws when no active workspace", async () => {
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: null });
      await expect(createProject({ name: "Test Project" })).rejects.toThrow("No active workspace selected");
    });

    it("creates project and returns it", async () => {
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: "ws-123" });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({
        data: {
          id: "proj-123",
          workspace_id: "ws-123",
          name: "Test Project",
          created_by: "user-123",
          created_at: "2024-01-01T00:00:00Z"
        },
        error: null
      });

      mockClient.from.mockReturnValue(mockQueryBuilder);

      const result = await createProject({ name: "Test Project" });

      expect(result).toEqual({
        id: "proj-123",
        workspaceId: "ws-123",
        name: "Test Project",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-123"
      });
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });
  });

  describe("listProjects", () => {
    it("throws when no active workspace", async () => {
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: null });
      await expect(listProjects()).rejects.toThrow("No active workspace selected");
    });

    it("returns empty array when no projects", async () => {
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: "ws-123" });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq.mockResolvedValue({ data: [], error: null });

      mockClient.from.mockReturnValue(mockQueryBuilder);

      const result = await listProjects();
      expect(result).toEqual([]);
    });

    it("returns list of projects", async () => {
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: "ws-123" });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq.mockResolvedValue({
        data: [
          {
            id: "proj-123",
            workspace_id: "ws-123",
            name: "Project 1",
            created_by: "user-123",
            created_at: "2024-01-01T00:00:00Z"
          },
          {
            id: "proj-456",
            workspace_id: "ws-123",
            name: "Project 2",
            created_by: "user-456",
            created_at: "2024-01-02T00:00:00Z"
          }
        ],
        error: null
      });

      mockClient.from.mockReturnValue(mockQueryBuilder);

      const result = await listProjects();

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("Project 1");
      expect(result[1]?.name).toBe("Project 2");
    });
  });
});
