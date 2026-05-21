/**
 * Tests for workspace service.
 *
 * We mock the Supabase client, config, and client manager to avoid
 * real network calls and filesystem access.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockClient,
  mockAuth,
  mockGetAuthenticatedSupabaseClient,
  mockGetTeamConfig,
  mockSetTeamActiveWorkspaceId,
  mockInvalidateSupabaseClient
} = vi.hoisted(() => ({
  mockClient: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(),
    rpc: vi.fn()
  },
  mockAuth: {
    getUser: vi.fn()
  },
  mockGetAuthenticatedSupabaseClient: vi.fn(),
  mockGetTeamConfig: vi.fn(),
  mockSetTeamActiveWorkspaceId: vi.fn(),
  mockInvalidateSupabaseClient: vi.fn()
}));

vi.mock("./supabaseClient", () => ({
  getAuthenticatedSupabaseClient: mockGetAuthenticatedSupabaseClient,
  invalidateSupabaseClient: mockInvalidateSupabaseClient
}));

vi.mock("./config", () => ({
  getTeamConfig: mockGetTeamConfig,
  setTeamActiveWorkspaceId: mockSetTeamActiveWorkspaceId
}));

import { createWorkspace, joinWorkspace, listWorkspaces, setActiveWorkspace } from "./workspaces";

function createMockQueryBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(),
    insert: vi.fn(() => builder),
    in: vi.fn(() => builder)
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return builder;
}

describe("workspaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.auth = { getUser: mockAuth.getUser };
  });

  describe("createWorkspace", () => {
    it("creates workspace via RPC with display name", async () => {
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: null });

      mockClient.rpc.mockResolvedValue({
        data: {
          id: "ws-123",
          name: "Test",
          workspace_key: "ABCD1234",
          created_by: "user-123",
          created_at: "2024-01-01T00:00:00Z"
        },
        error: null
      });

      const result = await createWorkspace({ name: "Test", workspaceKey: "ABCD1234" });

      expect(result).toEqual({
        id: "ws-123",
        name: "Test",
        workspaceKey: "ABCD1234",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-123"
      });
      expect(mockClient.rpc).toHaveBeenCalledWith("create_team_workspace", {
        p_name: "Test",
        p_workspace_key: "ABCD1234",
        p_display_name: "Alice"
      });
    });

    it("throws when RPC returns error", async () => {
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });

      mockClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC failed" }
      });

      await expect(createWorkspace({ name: "Test", workspaceKey: "ABCD1234" })).rejects.toThrow();
    });
  });

  describe("joinWorkspace", () => {
    it("joins workspace via RPC with display name", async () => {
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });
      mockGetTeamConfig.mockReturnValue({ configured: true, displayName: "Bob", activeWorkspaceId: null });

      mockClient.rpc.mockResolvedValue({
        data: {
          id: "ws-123",
          name: "Test",
          workspace_key: "ABCD1234",
          created_by: "user-456",
          created_at: "2024-01-01T00:00:00Z"
        },
        error: null
      });

      const result = await joinWorkspace("ABCD1234");

      expect(result).toEqual({
        id: "ws-123",
        name: "Test",
        workspaceKey: "ABCD1234",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-456"
      });
      expect(mockClient.rpc).toHaveBeenCalledWith("join_workspace_by_key", {
        p_workspace_key: "ABCD1234",
        p_display_name: "Bob"
      });
    });

    it("throws when RPC returns error", async () => {
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });

      mockClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "Invalid workspace key" }
      });

      await expect(joinWorkspace("INVALID")).rejects.toThrow("Invalid workspace key");
    });
  });

  describe("listWorkspaces", () => {
    it("returns empty array when no workspaces", async () => {
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq.mockResolvedValue({ data: [], error: null });

      mockClient.from.mockReturnValue(mockQueryBuilder);

      const result = await listWorkspaces();
      expect(result).toEqual([]);
    });

    it("returns list of workspaces", async () => {
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });

      const mockQueryBuilder1 = createMockQueryBuilder();
      mockQueryBuilder1.eq.mockResolvedValue({
        data: [{ workspace_id: "ws-123" }, { workspace_id: "ws-456" }],
        error: null
      });

      const mockQueryBuilder2 = createMockQueryBuilder();
      mockQueryBuilder2.in.mockResolvedValue({
        data: [
          {
            id: "ws-123",
            name: "Workspace 1",
            workspace_key: "KEY1",
            created_by: "user-123",
            created_at: "2024-01-01T00:00:00Z"
          },
          {
            id: "ws-456",
            name: "Workspace 2",
            workspace_key: "KEY2",
            created_by: "user-456",
            created_at: "2024-01-02T00:00:00Z"
          }
        ],
        error: null
      });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mockQueryBuilder1 : mockQueryBuilder2;
      });

      const result = await listWorkspaces();

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("Workspace 1");
      expect(result[1]?.name).toBe("Workspace 2");
    });
  });

  describe("setActiveWorkspace", () => {
    it("throws when not a member of workspace", async () => {
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });

      mockClient.from.mockReturnValue(mockQueryBuilder);

      await expect(setActiveWorkspace("ws-123")).rejects.toThrow("You are not a member of this workspace");
    });

    it("sets active workspace and invalidates client", async () => {
      mockGetAuthenticatedSupabaseClient.mockResolvedValue({
        client: mockClient,
        userId: "user-123"
      });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({
        data: { workspace_id: "ws-123" },
        error: null
      });

      mockClient.from.mockReturnValue(mockQueryBuilder);

      await setActiveWorkspace("ws-123");

      expect(mockSetTeamActiveWorkspaceId).toHaveBeenCalledWith("ws-123");
      expect(mockInvalidateSupabaseClient).toHaveBeenCalled();
    });
  });
});
