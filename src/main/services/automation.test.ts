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

import { toggleEntity } from "./homeAssistant";
import { createTimeRule, deleteRule, listRules, runAutomationCycle, setRuleEnabled } from "./automation";
import { listReminders } from "./reminders";

describe("automation service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
    vi.mocked(toggleEntity).mockClear();
  });

  afterEach(() => {
    testDb?.close();
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
});
