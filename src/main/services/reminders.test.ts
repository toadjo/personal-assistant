import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;

vi.mock("../db", () => ({
  getDb: () => testDb
}));

vi.mock("../window", () => ({
  showMainWindow: vi.fn()
}));

vi.mock("electron", () => ({
  Notification: class {
    constructor(_opts: unknown) {}
    on() {
      return this;
    }
    show() {}
  }
}));

import { completeReminder, createReminder, deleteReminder, listReminders, snoozeReminder } from "./reminders";

describe("reminders service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb?.close();
  });

  it("create list complete delete flow", () => {
    const due = new Date(Date.now() + 60_000).toISOString();
    const r = createReminder({ text: "Buy milk", dueAt: due, recurrence: "none" });
    expect(listReminders().find((x) => x.id === r.id)?.text).toBe("Buy milk");
    completeReminder(r.id);
    expect(listReminders().find((x) => x.id === r.id)?.status).toBe("done");
    deleteReminder(r.id);
    expect(listReminders().find((x) => x.id === r.id)).toBeUndefined();
  });

  it("snoozeReminder advances pending dueAt", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const r = createReminder({ text: "Wake", dueAt: past, recurrence: "none" });
    snoozeReminder(r.id, 5);
    const updated = listReminders().find((x) => x.id === r.id);
    expect(updated?.status).toBe("pending");
    expect(new Date(updated!.dueAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("snoozeReminder rejects invalid minutes", () => {
    const r = createReminder({
      text: "x",
      dueAt: new Date(Date.now() + 120_000).toISOString(),
      recurrence: "none"
    });
    expect(() => snoozeReminder(r.id, 0)).toThrow();
    expect(() => snoozeReminder(r.id, 999999)).toThrow();
  });
});
