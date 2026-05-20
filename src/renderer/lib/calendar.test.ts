import { describe, expect, it } from "vitest";
import type { Reminder } from "../../shared/types";
import type { Task } from "../../shared/types";
import { buildCalendarCells, parseLocalDateKey, toLocalDateKey } from "./calendar";

describe("calendar", () => {
  it("buildCalendarCells includes event items from reminders and tasks", () => {
    const monthDate = new Date(2026, 0, 1); // January 2026
    const remindersByDate = new Map<string, Reminder[]>();
    const tasksByDate = new Map<string, Task[]>();
    
    const reminderDateKey = "2026-01-15";
    remindersByDate.set(reminderDateKey, [
      { id: "r1", text: "Test reminder", dueAt: "2026-01-15T10:00:00", recurrence: "none", status: "pending", notifyChannel: "desktop" }
    ]);
    
    const taskDateKey = "2026-01-16";
    tasksByDate.set(taskDateKey, [
      { id: "t1", title: "Test task", notes: "", dueAt: "2026-01-16T10:00:00", priority: "normal", status: "open", recurrence: "none", notifyChannel: "desktop", createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00", lastCompletedAt: null }
    ]);
    
    const cells = buildCalendarCells(monthDate, remindersByDate, tasksByDate);
    
    const reminderCell = cells.find(c => c.dateKey === reminderDateKey);
    expect(reminderCell).toBeDefined();
    expect(reminderCell?.events).toHaveLength(1);
    expect(reminderCell?.events[0].type).toBe("reminder");
    expect(reminderCell?.events[0].text).toBe("Test reminder");
    
    const taskCell = cells.find(c => c.dateKey === taskDateKey);
    expect(taskCell).toBeDefined();
    expect(taskCell?.events).toHaveLength(1);
    expect(taskCell?.events[0].type).toBe("task");
    expect(taskCell?.events[0].text).toBe("Test task");
  });

  it("buildCalendarCells starts week on Monday", () => {
    const monthDate = new Date(2026, 0, 1); // January 1, 2026 is Thursday
    const cells = buildCalendarCells(monthDate, new Map(), new Map());
    
    // First cell should be Monday (Dec 29, 2025)
    expect(cells[0].dayNumber).toBe(29);
    expect(cells[0].isCurrentMonth).toBe(false);
    
    // Thursday (Jan 1) should be at index 3
    const jan1 = cells.find(c => c.dateKey === "2026-01-01");
    expect(jan1).toBeDefined();
    expect(jan1?.dayNumber).toBe(1);
    expect(jan1?.isCurrentMonth).toBe(true);
  });

  it("buildCalendarCells handles multiple events per day", () => {
    const monthDate = new Date(2026, 0, 1);
    const remindersByDate = new Map<string, Reminder[]>();
    const tasksByDate = new Map<string, Task[]>();
    
    const dateKey = "2026-01-15";
    remindersByDate.set(dateKey, [
      { id: "r1", text: "Reminder 1", dueAt: "2026-01-15T10:00:00", recurrence: "none", status: "pending", notifyChannel: "desktop" },
      { id: "r2", text: "Reminder 2", dueAt: "2026-01-15T11:00:00", recurrence: "none", status: "pending", notifyChannel: "desktop" }
    ]);
    tasksByDate.set(dateKey, [
      { id: "t1", title: "Task 1", notes: "", dueAt: "2026-01-15T12:00:00", priority: "normal", status: "open", recurrence: "none", notifyChannel: "desktop", createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00", lastCompletedAt: null }
    ]);
    
    const cells = buildCalendarCells(monthDate, remindersByDate, tasksByDate);
    const cell = cells.find(c => c.dateKey === dateKey);
    
    expect(cell).toBeDefined();
    expect(cell?.events).toHaveLength(3);
    expect(cell?.count).toBe(3);
  });

  it("buildCalendarCells marks completed tasks", () => {
    const monthDate = new Date(2026, 0, 1);
    const remindersByDate = new Map<string, Reminder[]>();
    const tasksByDate = new Map<string, Task[]>();
    
    const dateKey = "2026-01-15";
    tasksByDate.set(dateKey, [
      { id: "t1", title: "Completed task", notes: "", dueAt: "2026-01-15T10:00:00", priority: "normal", status: "done", recurrence: "none", notifyChannel: "desktop", createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00", lastCompletedAt: "2026-01-15T10:00:00" }
    ]);
    
    const cells = buildCalendarCells(monthDate, remindersByDate, tasksByDate);
    const cell = cells.find(c => c.dateKey === dateKey);
    
    expect(cell).toBeDefined();
    expect(cell?.events[0].completed).toBe(true);
  });

  it("buildCalendarCells handles high priority tasks", () => {
    const monthDate = new Date(2026, 0, 1);
    const remindersByDate = new Map<string, Reminder[]>();
    const tasksByDate = new Map<string, Task[]>();
    
    const dateKey = "2026-01-15";
    tasksByDate.set(dateKey, [
      { id: "t1", title: "High priority task", notes: "", dueAt: "2026-01-15T10:00:00", priority: "high", status: "open", recurrence: "none", notifyChannel: "desktop", createdAt: "2026-01-01T00:00:00", updatedAt: "2026-01-01T00:00:00", lastCompletedAt: null }
    ]);
    
    const cells = buildCalendarCells(monthDate, remindersByDate, tasksByDate);
    const cell = cells.find(c => c.dateKey === dateKey);
    
    expect(cell).toBeDefined();
    expect(cell?.events[0].priority).toBe("high");
  });
});

describe("toLocalDateKey", () => {
  it("formats local calendar date as YYYY-MM-DD", () => {
    expect(toLocalDateKey(new Date(2026, 4, 2))).toBe("2026-05-02");
  });
});

describe("parseLocalDateKey", () => {
  it("round-trips with toLocalDateKey in local time", () => {
    const key = "2026-12-31";
    const parsed = parseLocalDateKey(key);
    expect(toLocalDateKey(parsed)).toBe(key);
  });
});

describe("buildCalendarCells", () => {
  it("pads leading/trailing days and counts reminders per cell", () => {
    const month = new Date(2026, 4, 1);
    const key = "2026-05-15";
    const remindersByDate = new Map<string, Reminder[]>([
      [
        key,
        [
          {
            id: "1",
            text: "x",
            dueAt: `${key}T15:00:00.000Z`,
            recurrence: "none",
            status: "pending",
            notifyChannel: "desktop"
          }
        ]
      ]
    ]);
    const cells = buildCalendarCells(month, remindersByDate, new Map());
    expect(cells.length % 7).toBe(0);
    const fifteenth = cells.find((c) => c.dateKey === key && c.isCurrentMonth);
    expect(fifteenth?.count).toBe(1);
  });
});
