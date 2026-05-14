import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

import {
  clearTeamConfig,
  getTeamConfig,
  getTeamCredentials,
  isTeamConfigured,
  setTeamActiveWorkspaceId,
  setTeamConfig
} from "./config";

let testDb: Database.Database;

vi.mock("../db", () => ({
  getDb: () => testDb
}));

describe("team config", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb?.close();
  });

  describe("getTeamConfig / isTeamConfigured", () => {
    it("returns not configured when URL and key are missing", () => {
      const config = getTeamConfig();
      expect(config.configured).toBe(false);
      expect(config.displayName).toBeNull();
      expect(config.activeWorkspaceId).toBeNull();
      expect(isTeamConfigured()).toBe(false);
    });

    it("returns not configured when only URL is set", () => {
      setTeamConfig({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "a".repeat(20), displayName: "Alice" });
      testDb.prepare("DELETE FROM app_settings WHERE key = 'team.supabaseAnonKey'").run();
      expect(getTeamConfig().configured).toBe(false);
      expect(isTeamConfigured()).toBe(false);
    });

    it("returns configured when URL and key are present", () => {
      setTeamConfig({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "a".repeat(20), displayName: "Alice" });
      const config = getTeamConfig();
      expect(config.configured).toBe(true);
      expect(config.displayName).toBe("Alice");
      expect(config.activeWorkspaceId).toBeNull();
      expect(isTeamConfigured()).toBe(true);
    });

    it("includes active workspace ID when set", () => {
      setTeamConfig({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "a".repeat(20), displayName: "Alice" });
      setTeamActiveWorkspaceId("ws-123");
      const config = getTeamConfig();
      expect(config.activeWorkspaceId).toBe("ws-123");
    });
  });

  describe("setTeamConfig", () => {
    it("persists URL, anon key, and display name", () => {
      setTeamConfig({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "a".repeat(20), displayName: "Bob" });
      const creds = getTeamCredentials();
      expect(creds).toEqual({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "a".repeat(20) });
      expect(getTeamConfig().displayName).toBe("Bob");
    });

    it("trims whitespace from URL, key, and display name", () => {
      setTeamConfig({
        supabaseUrl: "  https://example.supabase.co  ",
        supabaseAnonKey: "  " + "a".repeat(20) + "  ",
        displayName: "  Carol  "
      });
      const creds = getTeamCredentials();
      expect(creds?.supabaseUrl).toBe("https://example.supabase.co");
      expect(creds?.supabaseAnonKey).toBe("a".repeat(20));
      expect(getTeamConfig().displayName).toBe("Carol");
    });

    it("rejects HTTP URLs (must be HTTPS)", () => {
      expect(() =>
        setTeamConfig({ supabaseUrl: "http://example.supabase.co", supabaseAnonKey: "a".repeat(20), displayName: "Dave" })
      ).toThrow("Invalid Supabase URL");
    });

    it("rejects URLs with trailing slash", () => {
      expect(() =>
        setTeamConfig({ supabaseUrl: "https://example.supabase.co/", supabaseAnonKey: "a".repeat(20), displayName: "Dave" })
      ).toThrow("Invalid Supabase URL");
    });

    it("rejects invalid URL formats", () => {
      expect(() =>
        setTeamConfig({ supabaseUrl: "not-a-url", supabaseAnonKey: "a".repeat(20), displayName: "Dave" })
      ).toThrow("Invalid Supabase URL");
    });

    it("rejects empty display name", () => {
      expect(() =>
        setTeamConfig({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "a".repeat(20), displayName: "  " })
      ).toThrow("Display name must be between 1 and 60 characters.");
    });

    it("rejects display name longer than 60 characters", () => {
      expect(() =>
        setTeamConfig({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "a".repeat(20), displayName: "a".repeat(61) })
      ).toThrow("Display name must be between 1 and 60 characters.");
    });
  });

  describe("clearTeamConfig", () => {
    it("removes all team config keys", () => {
      setTeamConfig({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "a".repeat(20), displayName: "Eve" });
      setTeamActiveWorkspaceId("ws-456");
      clearTeamConfig();
      expect(getTeamCredentials()).toBeNull();
      expect(getTeamConfig().configured).toBe(false);
      expect(getTeamConfig().displayName).toBeNull();
      expect(getTeamConfig().activeWorkspaceId).toBeNull();
    });
  });

  describe("setTeamActiveWorkspaceId", () => {
    it("sets the active workspace ID", () => {
      setTeamConfig({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "a".repeat(20), displayName: "Frank" });
      setTeamActiveWorkspaceId("ws-789");
      expect(getTeamConfig().activeWorkspaceId).toBe("ws-789");
    });

    it("clears the active workspace ID when passed null", () => {
      setTeamConfig({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "a".repeat(20), displayName: "Frank" });
      setTeamActiveWorkspaceId("ws-789");
      setTeamActiveWorkspaceId(null);
      expect(getTeamConfig().activeWorkspaceId).toBeNull();
    });
  });

  describe("getTeamCredentials", () => {
    it("returns null when not configured", () => {
      expect(getTeamCredentials()).toBeNull();
    });

    it("returns URL and anon key when configured", () => {
      setTeamConfig({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "xyz".repeat(20), displayName: "Grace" });
      const creds = getTeamCredentials();
      expect(creds).toEqual({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "xyz".repeat(20) });
    });
  });
});
