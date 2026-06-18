import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";
import { checkDbHealth, optimizeDatabase } from "./dbHealth";

let testDb: Database.Database;

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/tmp"),
    getVersion: vi.fn(() => "1.7.1")
  }
}));

vi.mock("../db", () => ({
  getDb: () => testDb
}));

describe("db health service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb.close();
  });

  describe("checkDbHealth", () => {
    it("returns healthy status for a clean database", () => {
      const health = checkDbHealth();

      // For in-memory databases, WAL mode might not be enabled, so we accept degraded status
      // as long as it's only due to WAL mode
      if (
        health.overall_health === "degraded" &&
        health.recommendations.length === 1 &&
        health.recommendations[0]?.includes("WAL mode not enabled")
      ) {
        // This is acceptable for in-memory databases
        expect(health.integrity_check.passed).toBe(true);
        expect(health.schema_check.passed).toBe(true);
        expect(health.data_check.orphaned_records).toBe(0);
        return;
      }

      expect(health.overall_health).toBe("healthy");
      expect(health.integrity_check.passed).toBe(true);
      expect(health.schema_check.passed).toBe(true);
      expect(health.data_check.orphaned_records).toBe(0);
      expect(health.recommendations).toEqual([]);
    });

    it("detects missing tables", () => {
      testDb.prepare("DROP TABLE IF EXISTS notes").run();
      const health = checkDbHealth();

      expect(health.overall_health).toBe("degraded");
      expect(health.schema_check.passed).toBe(false);
      expect(health.schema_check.missing_tables).toContain("notes");
      expect(health.recommendations.some((r) => r.includes("Missing tables"))).toBe(true);
    });

    it("detects orphaned records", () => {
      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run(null, "Test", "Content", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const health = checkDbHealth();

      expect(health.overall_health).toBe("degraded");
      expect(health.data_check.orphaned_records).toBeGreaterThan(0);
      expect(health.recommendations.some((r) => r.includes("orphaned records"))).toBe(true);
    });

    it("counts total rows correctly", () => {
      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Test", "Content", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      testDb
        .prepare("INSERT INTO reminders (id, text, dueAt, recurrence, status, notifyChannel) VALUES (?, ?, ?, ?, ?, ?)")
        .run("r1", "Test", "2026-01-01T00:00:00Z", "none", "pending", "desktop");

      const health = checkDbHealth();

      expect(health.data_check.total_rows).toBeGreaterThanOrEqual(2);
    });

    it("reports performance metrics", () => {
      const health = checkDbHealth();

      expect(health.performance_check.page_count).toBeGreaterThan(0);
      expect(health.performance_check.page_size).toBeGreaterThan(0);
      expect(health.performance_check.database_size_bytes).toBeGreaterThan(0);
      expect(typeof health.performance_check.wal_enabled).toBe("boolean");
      expect(typeof health.performance_check.wal_checkpoint_pending).toBe("boolean");
    });

    it("detects extra tables", () => {
      testDb.exec("CREATE TABLE extra_table (id TEXT)");
      const health = checkDbHealth();

      expect(health.schema_check.extra_tables).toContain("extra_table");
    });
  });

  describe("optimizeDatabase", () => {
    it("optimizes database successfully", () => {
      const result = optimizeDatabase();

      expect(result.success).toBe(true);
      expect(result.message).toBe("Database optimized successfully");
    });

    it("handles optimization errors gracefully", () => {
      // Close the database to simulate an error
      testDb.close();

      const result = optimizeDatabase();

      expect(result.success).toBe(false);
      expect(result.message).toContain("Optimization failed");

      // Reopen for cleanup
      testDb = createMemoryDatabase();
    });
  });
});
