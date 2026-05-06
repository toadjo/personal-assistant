import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;

vi.mock("../db", () => ({
  getDb: () => testDb
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

vi.mock("../log", () => ({
  mainLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock("../window", () => ({
  showMainWindow: vi.fn()
}));

import { completeTask, createTask, deleteTask, listOverdueOpenTasks, listTasks, updateTask } from "./tasks";

describe("tasks service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb?.close();
  });

  it("create/list/update/delete flow", () => {
    const created = createTask({
      title: "pay bills",
      notes: "electricity",
      dueAt: null,
      priority: "normal",
      recurrence: "none"
    });
    expect(listTasks().some((task) => task.id === created.id)).toBe(true);

    const updated = updateTask({ id: created.id, notes: "electricity + water", priority: "high" });
    expect(updated.notes).toContain("water");
    expect(updated.priority).toBe("high");

    deleteTask(created.id);
    expect(listTasks().some((task) => task.id === created.id)).toBe(false);
  });

  it("complete non-repeating task marks done", () => {
    const created = createTask({
      title: "read report",
      notes: "",
      dueAt: new Date(Date.now() + 60_000).toISOString(),
      priority: "low",
      recurrence: "none"
    });
    const completed = completeTask(created.id);
    expect(completed.status).toBe("done");
    expect(completed.lastCompletedAt).toBeTruthy();
  });

  it("complete repeating task advances dueAt and keeps open", () => {
    const dueAt = new Date(Date.now() - 60_000).toISOString();
    const daily = createTask({
      title: "daily stretch",
      notes: "",
      dueAt,
      priority: "normal",
      recurrence: "daily"
    });
    const updatedDaily = completeTask(daily.id);
    expect(updatedDaily.status).toBe("open");
    expect(new Date(updatedDaily.dueAt ?? 0).getTime()).toBeGreaterThan(Date.now());

    const weekly = createTask({
      title: "weekly review",
      notes: "",
      dueAt,
      priority: "normal",
      recurrence: "weekly"
    });
    const updatedWeekly = completeTask(weekly.id);
    expect(updatedWeekly.status).toBe("open");

    const monthly = createTask({
      title: "monthly budget",
      notes: "",
      dueAt,
      priority: "normal",
      recurrence: "monthly"
    });
    const updatedMonthly = completeTask(monthly.id);
    expect(updatedMonthly.status).toBe("open");
  });

  it("recurrence without dueAt is rejected", () => {
    expect(() =>
      createTask({
        title: "invalid recurring",
        notes: "",
        dueAt: null,
        priority: "normal",
        recurrence: "weekly"
      })
    ).toThrow(/require dueAt/i);
  });

  it("overdue selection returns only open overdue tasks", () => {
    createTask({
      title: "overdue open",
      notes: "",
      dueAt: new Date(Date.now() - 600_000).toISOString(),
      priority: "normal",
      recurrence: "none"
    });
    const done = createTask({
      title: "done task",
      notes: "",
      dueAt: new Date(Date.now() - 600_000).toISOString(),
      priority: "normal",
      recurrence: "none"
    });
    completeTask(done.id);
    const rows = listOverdueOpenTasks();
    expect(rows.length).toBe(1);
    expect(rows[0]?.title).toBe("overdue open");
  });
});
