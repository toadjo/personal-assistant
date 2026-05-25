import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

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

vi.mock("./secureSecrets", () => ({
  encryptSecret: vi.fn((data: string) => `encrypted:${data}`),
  decryptSecret: vi.fn((encrypted: string) => encrypted.replace("encrypted:", "")),
  SecureStorageUnavailableError: class extends Error {
    constructor() {
      super("Secure storage unavailable");
      this.name = "SecureStorageUnavailableError";
    }
  },
  isEncrypted: vi.fn(() => false)
}));

vi.mock("../security/policy", () => ({
  isCorporateMode: vi.fn(() => false)
}));

import { exportBackup, importBackup, previewBackup, resetAllData } from "./backup";
import { encryptSecret, SecureStorageUnavailableError } from "./secureSecrets";
import { isCorporateMode } from "../security/policy";

describe("backup service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb.close();
  });

  it("exports empty data when no rows exist", () => {
    const result = exportBackup();
    expect(result.version).toBe("1.7.1");
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
    expect(reExported.notes?.[0]?.id).toBe("n1");
    expect(reExported.reminders?.[0]?.id).toBe("r1");
    expect(reExported.tasks?.[0]?.id).toBe("t1");
    expect(reExported.automation_rules?.[0]?.id).toBe("a1");
    expect(reExported.app_settings?.[0]?.key).toBe("assistant.name");
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

  describe("backup preview", () => {
    beforeEach(() => {
      testDb = createMemoryDatabase();
    });

    it("valid backup shows correct counts", () => {
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
      const preview = previewBackup(exported);

      expect(preview.valid).toBe(true);
      expect(preview.notes).toBe(1);
      expect(preview.reminders).toBe(1);
      expect(preview.tasks).toBe(1);
      expect(preview.automation_rules).toBe(1);
      expect(preview.app_settings).toBe(1);
      expect(preview.unsupported_sections).toEqual([]);
      expect(preview.has_encrypted_content).toBe(false);
      expect(preview.version).toBe("1.7.1");
      expect(preview.exportedAt).toBeDefined();
    });

    it("malformed backup is rejected", () => {
      const invalidPayload = { invalid: "data" } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(invalidPayload);

      expect(preview.valid).toBe(false);
      expect(preview.error).toBe("Invalid backup: missing version or exportedAt field");
      expect(preview.notes).toBe(0);
      expect(preview.reminders).toBe(0);
      expect(preview.tasks).toBe(0);
      expect(preview.automation_rules).toBe(0);
      expect(preview.app_settings).toBe(0);
    });

    it("backup with missing version is rejected", () => {
      const invalidPayload = {
        exportedAt: "2026-01-01T00:00:00Z",
        notes: []
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(invalidPayload);

      expect(preview.valid).toBe(false);
      expect(preview.error).toBe("Invalid backup: missing version or exportedAt field");
    });

    it("backup with invalid notes array is rejected", () => {
      const invalidPayload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: "not an array" as any // eslint-disable-line @typescript-eslint/no-explicit-any
      };
      const preview = previewBackup(invalidPayload);

      expect(preview.valid).toBe(false);
      expect(preview.error).toBe("Invalid backup: notes field is not an array");
    });

    it("backup with unsupported fields reports them", () => {
      const payload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: [],
        unsupportedField: "data"
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(payload);

      expect(preview.valid).toBe(true);
      expect(preview.unsupported_sections).toContain("unsupportedField");
    });

    it("encrypted backup shows metadata only", () => {
      const encryptedPayload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        _encrypted: "encrypted:data"
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(encryptedPayload);

      expect(preview.valid).toBe(true);
      expect(preview.has_encrypted_content).toBe(true);
      expect(preview.notes).toBe(0);
      expect(preview.reminders).toBe(0);
      expect(preview.tasks).toBe(0);
      expect(preview.automation_rules).toBe(0);
      expect(preview.app_settings).toBe(0);
    });

    it("empty backup shows zero counts", () => {
      const emptyPayload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: [],
        reminders: [],
        tasks: [],
        automation_rules: [],
        app_settings: []
      };
      const preview = previewBackup(emptyPayload);

      expect(preview.valid).toBe(true);
      expect(preview.notes).toBe(0);
      expect(preview.reminders).toBe(0);
      expect(preview.tasks).toBe(0);
      expect(preview.automation_rules).toBe(0);
      expect(preview.app_settings).toBe(0);
    });
  });

  describe("backup import security", () => {
    beforeEach(() => {
      testDb = createMemoryDatabase();
    });

    it("secret fields remain rejected during import", () => {
      const payloadWithSecrets = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: [],
        reminders: [],
        tasks: [],
        automation_rules: [],
        app_settings: [
          { key: "assistant.name", value: "Test", updatedAt: "2026-01-01T00:00:00Z" },
          { key: "ha.token", value: "secret123", updatedAt: "2026-01-01T00:00:00Z" }
        ]
      };

      const imported = importBackup(payloadWithSecrets);
      expect(imported.rejected_secret_settings).toBe(1);
      expect(imported.app_settings).toBe(1); // Only non-secret settings imported
    });

    it("cancel path performs no import", () => {
      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const noteCountBefore = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
      expect(noteCountBefore.c).toBe(1);

      // Preview should not modify database
      const exported = exportBackup();
      const preview = previewBackup(exported);
      expect(preview.valid).toBe(true);

      const noteCountAfter = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
      expect(noteCountAfter.c).toBe(1); // Should still be 1, not deleted
    });
  });

  describe("encrypted backup security", () => {
    beforeEach(() => {
      testDb = createMemoryDatabase();
    });

    it("corporate export returns no plaintext arrays when encrypted", () => {
      vi.mocked(isCorporateMode).mockReturnValue(true);

      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const exported = exportBackup({ encrypt: true });

      expect(exported.version).toBe("1.7.1");
      expect(exported.exportedAt).toBeDefined();
      expect(exported._encrypted).toBeDefined();
      expect(exported.notes).toBeUndefined();
      expect(exported.reminders).toBeUndefined();
      expect(exported.tasks).toBeUndefined();
      expect(exported.automation_rules).toBeUndefined();
      expect(exported.app_settings).toBeUndefined();
    });

    it("corporate export fails when secure storage is unavailable", () => {
      vi.mocked(isCorporateMode).mockReturnValue(true);
      vi.mocked(encryptSecret).mockImplementation(() => {
        throw new SecureStorageUnavailableError();
      });

      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      expect(() => exportBackup({ encrypt: true })).toThrow(
        "Corporate mode requires encrypted backup, but secure storage is unavailable"
      );
    });

    it("personal mode falls back to unencrypted when secure storage unavailable", () => {
      vi.mocked(isCorporateMode).mockReturnValue(false);
      vi.mocked(encryptSecret).mockImplementation(() => {
        throw new SecureStorageUnavailableError();
      });

      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const exported = exportBackup({ encrypt: true });

      expect(exported._encrypted).toBeUndefined();
      expect(exported.notes).toBeDefined();
      expect(exported.notes?.length).toBe(1);
    });

    it("encrypted import decrypts and restores data", () => {
      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const exported = exportBackup({ encrypt: true });

      // Clear the database
      testDb.prepare("DELETE FROM notes").run();

      // Import encrypted backup
      const imported = importBackup(exported);
      expect(imported.notes).toBe(1);

      // Verify data was restored
      const noteCount = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
      expect(noteCount.c).toBe(1);
    });

    it("plaintext import still works in personal mode", () => {
      const plaintextPayload = {
        version: "1.7.1",
        exportedAt: new Date().toISOString(),
        notes: [
          {
            id: "n1",
            title: "Hello",
            content: "World",
            tags: "[]",
            pinned: 0,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z"
          }
        ],
        reminders: [],
        tasks: [],
        automation_rules: [],
        app_settings: []
      };

      const imported = importBackup(plaintextPayload);
      expect(imported.notes).toBe(1);

      const noteCount = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
      expect(noteCount.c).toBe(1);
    });
  });

  describe("backup preview", () => {
    beforeEach(() => {
      testDb = createMemoryDatabase();
    });

    it("valid backup shows correct counts", () => {
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
      const preview = previewBackup(exported);

      expect(preview.valid).toBe(true);
      expect(preview.notes).toBe(1);
      expect(preview.reminders).toBe(1);
      expect(preview.tasks).toBe(1);
      expect(preview.automation_rules).toBe(1);
      expect(preview.app_settings).toBe(1);
      expect(preview.unsupported_sections).toEqual([]);
      expect(preview.has_encrypted_content).toBe(false);
      expect(preview.version).toBe("1.7.1");
      expect(preview.exportedAt).toBeDefined();
    });

    it("malformed backup is rejected", () => {
      const invalidPayload = { invalid: "data" } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(invalidPayload);

      expect(preview.valid).toBe(false);
      expect(preview.error).toBe("Invalid backup: missing version or exportedAt field");
      expect(preview.notes).toBe(0);
      expect(preview.reminders).toBe(0);
      expect(preview.tasks).toBe(0);
      expect(preview.automation_rules).toBe(0);
      expect(preview.app_settings).toBe(0);
    });

    it("backup with missing version is rejected", () => {
      const invalidPayload = {
        exportedAt: "2026-01-01T00:00:00Z",
        notes: []
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(invalidPayload);

      expect(preview.valid).toBe(false);
      expect(preview.error).toBe("Invalid backup: missing version or exportedAt field");
    });

    it("backup with invalid notes array is rejected", () => {
      const invalidPayload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: "not an array" as any // eslint-disable-line @typescript-eslint/no-explicit-any
      };
      const preview = previewBackup(invalidPayload);

      expect(preview.valid).toBe(false);
      expect(preview.error).toBe("Invalid backup: notes field is not an array");
    });

    it("backup with unsupported fields reports them", () => {
      const payload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: [],
        unsupportedField: "data"
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(payload);

      expect(preview.valid).toBe(true);
      expect(preview.unsupported_sections).toContain("unsupportedField");
    });

    it("encrypted backup shows metadata only", () => {
      const encryptedPayload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        _encrypted: "encrypted:data"
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(encryptedPayload);

      expect(preview.valid).toBe(true);
      expect(preview.has_encrypted_content).toBe(true);
      expect(preview.notes).toBe(0);
      expect(preview.reminders).toBe(0);
      expect(preview.tasks).toBe(0);
      expect(preview.automation_rules).toBe(0);
      expect(preview.app_settings).toBe(0);
    });

    it("empty backup shows zero counts", () => {
      const emptyPayload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: [],
        reminders: [],
        tasks: [],
        automation_rules: [],
        app_settings: []
      };
      const preview = previewBackup(emptyPayload);

      expect(preview.valid).toBe(true);
      expect(preview.notes).toBe(0);
      expect(preview.reminders).toBe(0);
      expect(preview.tasks).toBe(0);
      expect(preview.automation_rules).toBe(0);
      expect(preview.app_settings).toBe(0);
    });
  });

  describe("backup import security", () => {
    beforeEach(() => {
      testDb = createMemoryDatabase();
    });

    it("secret fields remain rejected during import", () => {
      const payloadWithSecrets = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: [],
        reminders: [],
        tasks: [],
        automation_rules: [],
        app_settings: [
          { key: "assistant.name", value: "Test", updatedAt: "2026-01-01T00:00:00Z" },
          { key: "ha.token", value: "secret123", updatedAt: "2026-01-01T00:00:00Z" }
        ]
      };

      const imported = importBackup(payloadWithSecrets);
      expect(imported.rejected_secret_settings).toBe(1);
      expect(imported.app_settings).toBe(1); // Only non-secret settings imported
    });

    it("cancel path performs no import", () => {
      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const noteCountBefore = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
      expect(noteCountBefore.c).toBe(1);

      // Preview should not modify database
      const exported = exportBackup();
      const preview = previewBackup(exported);
      expect(preview.valid).toBe(true);

      const noteCountAfter = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
      expect(noteCountAfter.c).toBe(1); // Should still be 1, not deleted
    });
  });
});
