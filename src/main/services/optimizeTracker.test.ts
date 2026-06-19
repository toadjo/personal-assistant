import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";
import { recordWrites, getOptimizeSuggestion, resetWriteCounter } from "./optimizeTracker";

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

describe("optimizeTracker", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
    // Ensure app_settings table exists
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);
    // Clear the writes counter before each test
    testDb.prepare("DELETE FROM app_settings WHERE key = ?").run("db.writesSinceOptimize");
  });

  afterEach(() => {
    testDb.close();
  });

  it("records writes and increments counter", () => {
    recordWrites(10);
    const suggestion = getOptimizeSuggestion();
    expect(suggestion.writesSinceOptimize).toBe(10);
    expect(suggestion.shouldOptimize).toBe(false);

    recordWrites(5);
    const suggestion2 = getOptimizeSuggestion();
    expect(suggestion2.writesSinceOptimize).toBe(15);
  });

  it("returns shouldOptimize true when threshold reached", () => {
    recordWrites(500);
    const suggestion = getOptimizeSuggestion();
    expect(suggestion.shouldOptimize).toBe(true);
    expect(suggestion.writesSinceOptimize).toBe(500);
    expect(suggestion.threshold).toBe(500);
  });

  it("respects custom threshold", () => {
    recordWrites(300);
    const suggestion = getOptimizeSuggestion(300);
    expect(suggestion.shouldOptimize).toBe(true);
    expect(suggestion.threshold).toBe(300);
  });

  it("resets write counter", () => {
    recordWrites(1000);
    resetWriteCounter();
    const suggestion = getOptimizeSuggestion();
    expect(suggestion.writesSinceOptimize).toBe(0);
    expect(suggestion.shouldOptimize).toBe(false);
  });

  it("handles missing counter as zero", () => {
    const suggestion = getOptimizeSuggestion();
    expect(suggestion.writesSinceOptimize).toBe(0);
    expect(suggestion.shouldOptimize).toBe(false);
  });
});
