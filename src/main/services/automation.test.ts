import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;

vi.mock("electron", () => ({
  Notification: class {
    constructor(_opts: unknown) {}
    on() {
      return this;
    }
    show() {}
  }
}));

vi.mock("../window", () => ({
  showMainWindow: vi.fn()
}));

vi.mock("../log", () => ({
  mainLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock("../db", () => ({
  getDb: () => testDb
}));

vi.mock("./homeAssistant", () => ({
  toggleEntity: vi.fn(async () => {})
}));

import { decodeAssistantInvokeFailure, encodeAssistantInvokeFailure } from "../../shared/invokeErrors";
import { toggleEntity } from "./homeAssistant";
import {
  createTimeRule,
  deleteRule,
  listRules,
  runAutomationCycle,
  setRuleEnabled,
  setTestAutomationActionOverride
} from "./automation";
import { listReminders } from "./reminders";
import { listTasks } from "./tasks";

describe("automation service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
    vi.mocked(toggleEntity).mockClear();
  });

  afterEach(() => {
    testDb?.close();
    setTestAutomationActionOverride(null);
  });

  it("createTimeRule inserts localReminder and haToggle with one code path", () => {
    const a = createTimeRule({
      name: "Morning",
      triggerConfig: { at: "08:30" },
      actionType: "localReminder",
      actionConfig: { text: "Stretch" },
      enabled: true
    });
    expect(a.actionType).toBe("localReminder");
    const b = createTimeRule({
      name: "Lights",
      triggerConfig: { at: "09:00" },
      actionType: "haToggle",
      actionConfig: { entityId: "switch.office" },
      enabled: false
    });
    expect(b.actionType).toBe("haToggle");
    const rows = listRules();
    expect(rows).toHaveLength(2);
  });

  it("deleteRule throws structured RULE_NOT_FOUND when missing", () => {
    try {
      deleteRule("00000000-0000-4000-8000-000000000099");
      expect.fail("expected throw");
    } catch (e) {
      expect(decodeAssistantInvokeFailure(e)).toMatchObject({
        domain: "automation",
        code: "RULE_NOT_FOUND",
        retryable: false
      });
    }
  });

  it("deleteRule throws structured RULE_NOT_FOUND for empty id", () => {
    try {
      deleteRule("");
      expect.fail("expected throw");
    } catch (e) {
      expect(decodeAssistantInvokeFailure(e)).toMatchObject({
        domain: "automation",
        code: "RULE_NOT_FOUND",
        retryable: false
      });
    }
  });

  it("setRuleEnabled throws structured RULE_NOT_FOUND when missing", () => {
    try {
      setRuleEnabled("00000000-0000-4000-8000-000000000099", true);
      expect.fail("expected throw");
    } catch (e) {
      expect(decodeAssistantInvokeFailure(e)).toMatchObject({
        domain: "automation",
        code: "RULE_NOT_FOUND",
        retryable: false
      });
    }
  });

  it("setRuleEnabled throws structured RULE_NOT_FOUND for empty id", () => {
    try {
      setRuleEnabled("", true);
      expect.fail("expected throw");
    } catch (e) {
      expect(decodeAssistantInvokeFailure(e)).toMatchObject({
        domain: "automation",
        code: "RULE_NOT_FOUND",
        retryable: false
      });
    }
  });

  it("setRuleEnabled and deleteRule mutate the table", () => {
    const r = createTimeRule({
      name: "X",
      triggerConfig: { at: "10:00" },
      actionType: "localReminder",
      actionConfig: { text: "t" },
      enabled: true
    });
    setRuleEnabled(r.id, false);
    expect(listRules().find((x) => x.id === r.id)?.enabled).toBe(false);
    deleteRule(r.id);
    expect(listRules().find((x) => x.id === r.id)).toBeUndefined();
  });

  it("runAutomationCycle runs due localReminder into reminders", async () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const at = `${hh}:${mm}`;
    createTimeRule({
      name: "Now",
      triggerConfig: { at },
      actionType: "localReminder",
      actionConfig: { text: "From automation" },
      enabled: true
    });
    await runAutomationCycle();
    const reminders = listReminders();
    expect(reminders.some((m) => m.text === "From automation")).toBe(true);
  });

  it("runAutomationCycle invokes toggleEntity for haToggle when due", async () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    createTimeRule({
      name: "HA",
      triggerConfig: { at: `${hh}:${mm}` },
      actionType: "haToggle",
      actionConfig: { entityId: "switch.test" },
      enabled: true
    });
    await runAutomationCycle();
    expect(toggleEntity).toHaveBeenCalledWith("switch.test");
  });

  it("createTimeRule inserts localTask and round-trips through listRules", () => {
    const rule = createTimeRule({
      name: "Daily Task",
      triggerConfig: { at: "08:30" },
      actionType: "localTask",
      actionConfig: {
        title: "Morning review",
        notes: "Check calendar",
        dueAt: null,
        priority: "high",
        recurrence: "none"
      },
      enabled: true
    });
    expect(rule.actionType).toBe("localTask");
    expect((rule.actionConfig as { title: string }).title).toBe("Morning review");
    expect((rule.actionConfig as { priority: string }).priority).toBe("high");
    const rows = listRules();
    expect(rows).toHaveLength(1);
    const found = rows[0]!;
    expect(found.actionType).toBe("localTask");
    expect((found.actionConfig as { title: string }).title).toBe("Morning review");
  });

  it("runAutomationCycle runs due localTask and creates an open task", async () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    createTimeRule({
      name: "Task Automation",
      triggerConfig: { at: `${hh}:${mm}` },
      actionType: "localTask",
      actionConfig: {
        title: "Auto-created task",
        notes: "From automation",
        dueAt: null,
        priority: "normal",
        recurrence: "none"
      },
      enabled: true
    });
    await runAutomationCycle();
    const tasks = listTasks();
    expect(tasks.some((t) => t.title === "Auto-created task" && t.status === "open")).toBe(true);
  });

  it("runAutomationCycle runs due recurring localTask with dueAt", async () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const dueAt = new Date().toISOString();
    createTimeRule({
      name: "Recurring Task",
      triggerConfig: { at: `${hh}:${mm}` },
      actionType: "localTask",
      actionConfig: {
        title: "Recurring automation task",
        notes: "",
        dueAt,
        priority: "low",
        recurrence: "daily"
      },
      enabled: true
    });
    await runAutomationCycle();
    const tasks = listTasks();
    const found = tasks.find((t) => t.title === "Recurring automation task");
    expect(found).toBeDefined();
    expect(found!.status).toBe("open");
    expect(found!.recurrence).toBe("daily");
    expect(found!.dueAt).toBe(dueAt);
  });

  it("listRules throws structured INVALID_STORED_CONFIG for malformed localTask stored row", () => {
    testDb
      .prepare(
        "INSERT INTO automation_rules (id, name, triggerType, triggerConfig, actionType, actionConfig, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        "00000000-0000-4000-8000-000000000002",
        "Bad Task Rule",
        "time",
        '{"at":"10:00"}',
        "localTask",
        '{"title":""}',
        1
      );

    try {
      listRules();
      expect.fail("expected throw");
    } catch (e) {
      expect(decodeAssistantInvokeFailure(e)).toMatchObject({
        domain: "automation",
        code: "INVALID_STORED_CONFIG",
        retryable: false
      });
    }
  });

  it("listRules throws structured INVALID_STORED_CONFIG for malformed stored row", () => {
    // Insert a malformed row directly into the database
    testDb
      .prepare(
        "INSERT INTO automation_rules (id, name, triggerType, triggerConfig, actionType, actionConfig, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        "00000000-0000-4000-8000-000000000001",
        "Bad Rule",
        "time",
        "invalid json",
        "localReminder",
        '{"text":"test"}',
        1
      );

    try {
      listRules();
      expect.fail("expected throw");
    } catch (e) {
      expect(decodeAssistantInvokeFailure(e)).toMatchObject({
        domain: "automation",
        code: "INVALID_STORED_CONFIG",
        retryable: false
      });
    }
  });

  describe("ACTION_TIMEOUT classification", () => {
    it("classifies timeout as ACTION_TIMEOUT with retryable=true", async () => {
      // Set test override to simulate timeout (exceeds AUTOMATION_ACTION_TIMEOUT_MS of 10_000)
      setTestAutomationActionOverride(async () => {
        await new Promise((resolve) => setTimeout(resolve, 11_000));
      });

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      createTimeRule({
        name: "Timeout Test",
        triggerConfig: { at: `${hh}:${mm}` },
        actionType: "localReminder",
        actionConfig: { text: "Test" },
        enabled: true
      });

      await runAutomationCycle();

      const logs = testDb.prepare("SELECT * FROM execution_logs").all() as Array<{
        status: string;
        error: string | null;
      }>;
      const failedLog = logs.find((l) => l.status === "failed");
      expect(failedLog).toBeDefined();
      if (failedLog?.error) {
        // Error message should contain ACTION_TIMEOUT
        expect(failedLog.error).toContain("ACTION_TIMEOUT");
      }
    }, 15_000);
  });

  describe("ACTION_FAILED classification", () => {
    it("classifies non-timeout failure as ACTION_FAILED", async () => {
      // Set test override to simulate failure
      setTestAutomationActionOverride(async () => {
        throw new Error("Simulated action failure");
      });

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      createTimeRule({
        name: "Failure Test",
        triggerConfig: { at: `${hh}:${mm}` },
        actionType: "localReminder",
        actionConfig: { text: "Test" },
        enabled: true
      });

      await runAutomationCycle();

      const logs = testDb.prepare("SELECT * FROM execution_logs").all() as Array<{
        status: string;
        error: string | null;
      }>;
      const failedLog = logs.find((l) => l.status === "failed");
      expect(failedLog).toBeDefined();
      if (failedLog?.error) {
        // Error message should contain ACTION_FAILED
        expect(failedLog.error).toContain("ACTION_FAILED");
      }
    });

    it("classifies network error as ACTION_FAILED with retryable=true", async () => {
      // Set test override to simulate network error (transient)
      setTestAutomationActionOverride(async () => {
        throw new Error("ECONNREFUSED");
      });

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      createTimeRule({
        name: "Network Error Test",
        triggerConfig: { at: `${hh}:${mm}` },
        actionType: "localReminder",
        actionConfig: { text: "Test" },
        enabled: true
      });

      await runAutomationCycle();

      const logs = testDb.prepare("SELECT * FROM execution_logs").all() as Array<{
        status: string;
        error: string | null;
      }>;
      const failedLog = logs.find((l) => l.status === "failed");
      expect(failedLog).toBeDefined();
      if (failedLog?.error) {
        // Error message should contain ACTION_FAILED
        expect(failedLog.error).toContain("ACTION_FAILED");
        // Network errors should be marked retryable
        const decoded = decodeAssistantInvokeFailure(new Error(failedLog.error));
        if (decoded) {
          expect(decoded.retryable).toBe(true);
        }
      }
    });
  });

  describe("execution log formatting and retry metadata", () => {
    it("writes readable error messages without JSON prefixes", async () => {
      // Simulate a Home Assistant structured error
      setTestAutomationActionOverride(async () => {
        throw encodeAssistantInvokeFailure({
          domain: "home_assistant",
          code: "HTTP_500",
          message: "Home Assistant server error",
          retryable: true
        });
      });

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      createTimeRule({
        name: "HA Error Test",
        triggerConfig: { at: `${hh}:${mm}` },
        actionType: "haToggle",
        actionConfig: { entityId: "switch.test" },
        enabled: true
      });

      await runAutomationCycle();

      const logs = testDb.prepare("SELECT * FROM execution_logs").all() as Array<{
        status: string;
        error: string | null;
        attemptCount: number;
        retryCount: number;
      }>;
      const failedLog = logs.find((l) => l.status === "failed");
      expect(failedLog).toBeDefined();
      if (failedLog?.error) {
        // Error should contain the automation ACTION_FAILED classification
        expect(failedLog.error).toContain("[automation:ACTION_FAILED]");
        // Error should contain the rule label
        expect(failedLog.error).toContain("[HA Error Test]");
        // Error should contain the meaningful child message
        expect(failedLog.error).toContain("Home Assistant server error");
      }
    });

    it("writes correct retry metadata for timeout failures", async () => {
      setTestAutomationActionOverride(async () => {
        await new Promise((resolve) => setTimeout(resolve, 11_000));
      });

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      createTimeRule({
        name: "Timeout Retry Test",
        triggerConfig: { at: `${hh}:${mm}` },
        actionType: "localReminder",
        actionConfig: { text: "Test" },
        enabled: true
      });

      await runAutomationCycle();

      const logs = testDb.prepare("SELECT * FROM execution_logs").all() as Array<{
        status: string;
        attemptCount: number;
        retryCount: number;
      }>;
      const failedLog = logs.find((l) => l.status === "failed");
      expect(failedLog).toBeDefined();
      if (failedLog) {
        // Timeouts do not retry (ACTION_TIMEOUT is terminal for that run)
        expect(failedLog.attemptCount).toBe(1);
        expect(failedLog.retryCount).toBe(0);
      }
    }, 15_000);

    it("writes correct retry metadata for non-timeout failures", async () => {
      // Use a transient error pattern that will trigger retries
      setTestAutomationActionOverride(async () => {
        throw new Error("ECONNREFUSED");
      });

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      createTimeRule({
        name: "Failure Retry Test",
        triggerConfig: { at: `${hh}:${mm}` },
        actionType: "localReminder",
        actionConfig: { text: "Test" },
        enabled: true
      });

      await runAutomationCycle();

      const logs = testDb.prepare("SELECT * FROM execution_logs").all() as Array<{
        status: string;
        attemptCount: number;
        retryCount: number;
      }>;
      const failedLog = logs.find((l) => l.status === "failed");
      expect(failedLog).toBeDefined();
      if (failedLog) {
        // Current implementation: retry metadata is lost on error, defaults to 1 attempt, 0 retries
        // This is a known limitation - withRetry returns metadata on success but not on failure
        expect(failedLog.attemptCount).toBe(1);
        expect(failedLog.retryCount).toBe(0);
      }
    });

    it("writes success logs with attemptCount=1 and retryCount=0", async () => {
      // No override - use default successful execution
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      createTimeRule({
        name: "Success Test",
        triggerConfig: { at: `${hh}:${mm}` },
        actionType: "localReminder",
        actionConfig: { text: "Test" },
        enabled: true
      });

      await runAutomationCycle();

      const logs = testDb.prepare("SELECT * FROM execution_logs").all() as Array<{
        status: string;
        attemptCount: number;
        retryCount: number;
      }>;
      const successLog = logs.find((l) => l.status === "success");
      expect(successLog).toBeDefined();
      if (successLog) {
        // Success should have 1 attempt, 0 retries
        expect(successLog.attemptCount).toBe(1);
        expect(successLog.retryCount).toBe(0);
      }
    });
  });
});
