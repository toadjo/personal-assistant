/**
 * Tests for Supabase client manager.
 *
 * We mock the Supabase client, auth module, and config module to avoid
 * real network calls and filesystem access.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateClient, mockAuth, mockSafeStorage, mockGetTeamCredentials, mockMainLog } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockAuth: {
    signInAnonymously: vi.fn(),
    getUser: vi.fn()
  },
  mockSafeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn(),
    decryptString: vi.fn()
  },
  mockGetTeamCredentials: vi.fn(),
  mockMainLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient
}));

vi.mock("electron", () => ({
  safeStorage: mockSafeStorage
}));

vi.mock("./config", () => ({
  getTeamCredentials: mockGetTeamCredentials
}));

vi.mock("./sessionStorage", () => ({
  teamSessionStorage: {}
}));

vi.mock("../log", () => ({
  mainLog: mockMainLog
}));

import { getSupabaseClient, invalidateSupabaseClient, getAuthenticatedSupabaseClient } from "./supabaseClient";

describe("supabaseClient", () => {
  beforeEach(() => {
    mockCreateClient.mockReturnValue({ auth: mockAuth });
    vi.clearAllMocks();
    invalidateSupabaseClient();
  });

  describe("getSupabaseClient", () => {
    beforeEach(() => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
    });

    it("returns null when team config is missing", () => {
      mockGetTeamCredentials.mockReturnValue(null);
      expect(getSupabaseClient()).toBeNull();
    });

    it("creates client on first call with credentials", () => {
      mockGetTeamCredentials.mockReturnValue({
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key-123"
      });
      mockAuth.signInAnonymously.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null
      });
      const client = getSupabaseClient();
      expect(client).not.toBeNull();
      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://example.supabase.co",
        "anon-key-123",
        expect.objectContaining({
          auth: expect.objectContaining({
            persistSession: true,
            storage: expect.any(Object),
            autoRefreshToken: true,
            detectSessionInUrl: false
          })
        })
      );
    });

    it("does not perform anonymous sign-in (only getAuthenticatedSupabaseClient does)", () => {
      mockGetTeamCredentials.mockReturnValue({
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key-123"
      });
      getSupabaseClient();
      expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
    });

    it("returns cached client on subsequent calls", () => {
      mockGetTeamCredentials.mockReturnValue({
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key-123"
      });
      mockAuth.signInAnonymously.mockResolvedValue({
        data: { user: { id: "user-789" } },
        error: null
      });
      const client1 = getSupabaseClient();
      const client2 = getSupabaseClient();
      expect(client1).toBe(client2);
      expect(mockCreateClient).toHaveBeenCalledTimes(1);
    });

    it("throws SecureStorageUnavailableError when safeStorage encryption is not available", () => {
      mockGetTeamCredentials.mockReturnValue({
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key-123"
      });
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      expect(() => getSupabaseClient()).toThrow("Secure storage (OS encryption) is required");
      expect(mockMainLog.error).toHaveBeenCalledWith(expect.stringContaining("safeStorage encryption"));
    });
  });

  describe("invalidateSupabaseClient", () => {
    beforeEach(() => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
    });

    it("clears the cached client", () => {
      mockGetTeamCredentials.mockReturnValue({
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key-123"
      });
      mockAuth.signInAnonymously.mockResolvedValue({
        data: { user: { id: "user-111" } },
        error: null
      });
      getSupabaseClient();
      invalidateSupabaseClient();
      mockGetTeamCredentials.mockReturnValue({
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key-123"
      });
      const _clientAfter = getSupabaseClient();
      expect(mockCreateClient).toHaveBeenCalledTimes(2);
    });
  });

  describe("getAuthenticatedSupabaseClient", () => {
    beforeEach(() => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
    });

    it("throws when team config is missing", async () => {
      mockGetTeamCredentials.mockReturnValue(null);
      await expect(getAuthenticatedSupabaseClient()).rejects.toThrow("Team mode is not configured");
    });

    it("throws when sign-in fails", async () => {
      mockGetTeamCredentials.mockReturnValue({
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key-123"
      });
      mockAuth.signInAnonymously.mockResolvedValue({
        data: null,
        error: new Error("Sign-in failed")
      });
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });
      await expect(getAuthenticatedSupabaseClient()).rejects.toThrow("Sign-in failed");
    });

    it("throws when getUser returns error", async () => {
      mockGetTeamCredentials.mockReturnValue({
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key-123"
      });
      mockAuth.signInAnonymously.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null
      });
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Auth error")
      });
      await expect(getAuthenticatedSupabaseClient()).rejects.toThrow("Authentication failed");
    });

    it("reuses existing user from persisted session without signing in", async () => {
      mockGetTeamCredentials.mockReturnValue({
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key-123"
      });
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null
      });
      const result = await getAuthenticatedSupabaseClient();
      expect(result.client).not.toBeNull();
      expect(result.userId).toBe("user-123");
      expect(mockAuth.getUser).toHaveBeenCalled();
      expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
    });

    it("signs in when no existing user in persisted session", async () => {
      mockGetTeamCredentials.mockReturnValue({
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key-123"
      });
      // First call to getUser returns no user
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null
      });
      mockAuth.signInAnonymously.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null
      });
      // Second call to getUser (after sign-in) returns the user
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null
      });
      const result = await getAuthenticatedSupabaseClient();
      expect(result.client).not.toBeNull();
      expect(result.userId).toBe("user-123");
      expect(mockAuth.getUser).toHaveBeenCalledTimes(2);
      expect(mockAuth.signInAnonymously).toHaveBeenCalled();
    });

    it("returns client and userId after successful authentication", async () => {
      mockGetTeamCredentials.mockReturnValue({
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key-123"
      });
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null
      });
      const result = await getAuthenticatedSupabaseClient();
      expect(result.client).not.toBeNull();
      expect(result.userId).toBe("user-123");
      expect(mockAuth.getUser).toHaveBeenCalled();
    });
  });
});
