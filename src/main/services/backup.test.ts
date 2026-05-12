import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/tmp")
  }
}));

vi.mock("../db", () => ({
  getDb: () => testDb
}));

import { exportBackup, importBackup, resetAllData } from "./backup";

describe("backup service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb.close();
  });

  it("exports empty data when no rows exist", () => {
    const result = exportBackup();
    expect(result.version).toBe("1.7.0");
    expect(result.notes).toEqual([]);
    expect(result.reminders).toEqual([]);
    expect(result.tasks).toEqual([]);
    expect(result.automation_rules).toEqual([]);
    expect(result.app_settings).toEqual([]);
  });

  it("exports and imports round-trip", () => {
    testDb
      .prepare(
        "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare("INSERT INTO reminders (id, text, dueAt, recurrence, status, notifyChannel) VALUES (?, ?, ?, ?, ?, ?)")
      .run("r1", "Test", "2026-01-01T00:00:00Z", "none", "pending", "desktop");
    testDb
      .prepare(
        "INSERT INTO tasks (id, title, notes, dueAt, priority, status, recurrence, notifyChannel, createdAt, updatedAt, lastCompletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        "t1",
        "Task",
        "",
        null,
        "normal",
        "open",
        "none",
        "desktop",
        "2026-01-01T00:00:00Z",
        "2026-01-01T00:00:00Z",
        null
      );
    testDb
      .prepare(
        "INSERT INTO automation_rules (id, name, triggerType, triggerConfig, actionType, actionConfig, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("a1", "Rule", "time", '{"at":"08:00"}', "localReminder", '{"text":"hello"}', 1);
    testDb
      .prepare("INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?)")
      .run("assistant.name", "Test", "2026-01-01T00:00:00Z");

    const exported = exportBackup();
    expect(exported.notes).toHaveLength(1);
    expect(exported.reminders).toHaveLength(1);
    expect(exported.tasks).toHaveLength(1);
    expect(exported.automation_rules).toHaveLength(1);
    expect(exported.app_settings).toHaveLength(1);

    // Clear everything
    testDb.prepare("DELETE FROM notes").run();
    testDb.prepare("DELETE FROM reminders").run();
    testDb.prepare("DELETE FROM tasks").run();
    testDb.prepare("DELETE FROM automation_rules").run();
    testDb.prepare("DELETE FROM app_settings").run();

    const imported = importBackup(exported);
    expect(imported.notes).toBe(1);
    expect(imported.reminders).toBe(1);
    expect(imported.tasks).toBe(1);
    expect(imported.automation_rules).toBe(1);
    expect(imported.app_settings).toBe(1);

    const reExported = exportBackup();
    expect(reExported.notes[0]!.id).toBe("n1");
    expect(reExported.reminders[0]!.id).toBe("r1");
    expect(reExported.tasks[0]!.id).toBe("t1");
    expect(reExported.automation_rules[0]!.id).toBe("a1");
    expect(reExported.app_settings[0]!.key).toBe("assistant.name");
  });

  it("resetAllData clears all user tables", () => {
    testDb
      .prepare(
        "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO execution_logs (id, ruleId, status, startedAt, endedAt, error, attemptCount, retryCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("l1", "r1", "success", "2026-01-01T00:00:00Z", "2026-01-01T00:00:01Z", null, 1, 0);
    testDb
      .prepare("INSERT INTO renderer_errors (id, createdAt, message, stack, componentStack) VALUES (?, ?, ?, ?, ?)")
      .run("e1", "2026-01-01T00:00:00Z", "err", null, null);
    testDb
      .prepare(
        "INSERT INTO devices_cache (id, entityId, friendlyName, domain, state, attributes, lastSeenAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("d1", "light.test", "Test", "light", "on", "{}", "2026-01-01T00:00:00Z");

    resetAllData();

    const noteCount = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
    expect(noteCount.c).toBe(0);
    const logCount = testDb.prepare("SELECT COUNT(*) as c FROM execution_logs").get() as { c: number };
    expect(logCount.c).toBe(0);
    const errorCount = testDb.prepare("SELECT COUNT(*) as c FROM renderer_errors").get() as { c: number };
    expect(errorCount.c).toBe(0);
    const deviceCount = testDb.prepare("SELECT COUNT(*) as c FROM devices_cache").get() as { c: number };
    expect(deviceCount.c).toBe(0);
  });
});
