import { describe, it, expect } from "vitest";
import { deriveFocusBrief, getBriefSummary } from "./brief";
import type { Note, Reminder, Task } from "../../../shared/types";

describe("deriveFocusBrief", () => {
  const now = new Date("2024-01-15T12:00:00Z");

  it("should return empty array when all inputs are empty", () => {
    const result = deriveFocusBrief({
      overdueTasks: [],
      dueTodayTasks: [],
      upcomingReminders: [],
      selectedDayAgenda: [],
      pinnedNotes: [],
      now
    });
    expect(result).toEqual([]);
  });

  it("should prioritize overdue tasks", () => {
    const overdueTask: Task = {
      id: "1",
      title: "Overdue task",
      notes: "",
      dueAt: "2024-01-01T00:00:00Z",
      priority: "normal",
      status: "open",
      recurrence: "none",
      notifyChannel: "desktop",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      lastCompletedAt: null
    };

    const result = deriveFocusBrief({
      overdueTasks: [overdueTask],
      dueTodayTasks: [],
      upcomingReminders: [],
      selectedDayAgenda: [],
      pinnedNotes: [],
      now
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("task");
    expect(result[0]?.urgency).toBe("overdue");
    expect(result[0]?.label).toBe("Overdue task");
  });

  it("should include due today tasks with today urgency", () => {
    const todayTask: Task = {
      id: "1",
      title: "Today task",
      notes: "",
      dueAt: "2024-01-15T12:00:00Z",
      priority: "normal",
      status: "open",
      recurrence: "none",
      notifyChannel: "desktop",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      lastCompletedAt: null
    };

    const result = deriveFocusBrief({
      overdueTasks: [],
      dueTodayTasks: [todayTask],
      upcomingReminders: [],
      selectedDayAgenda: [],
      pinnedNotes: [],
      now
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.urgency).toBe("today");
  });

  it("should include pinned notes with context urgency", () => {
    const note: Note = {
      id: "1",
      title: "Pinned note",
      content: "Important context",
      tags: [],
      pinned: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z"
    };

    const result = deriveFocusBrief({
      overdueTasks: [],
      dueTodayTasks: [],
      upcomingReminders: [],
      selectedDayAgenda: [],
      pinnedNotes: [note],
      now
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("note");
    expect(result[0]?.urgency).toBe("context");
  });

  it("should sort items by urgency: overdue > today > upcoming > context", () => {
    const overdueTask: Task = {
      id: "1",
      title: "Overdue",
      notes: "",
      dueAt: "2024-01-01T00:00:00Z",
      priority: "normal",
      status: "open",
      recurrence: "none",
      notifyChannel: "desktop",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      lastCompletedAt: null
    };

    const todayTask: Task = {
      id: "2",
      title: "Today",
      notes: "",
      dueAt: "2024-01-15T12:00:00Z",
      priority: "normal",
      status: "open",
      recurrence: "none",
      notifyChannel: "desktop",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      lastCompletedAt: null
    };

    const note: Note = {
      id: "3",
      title: "Context",
      content: "",
      tags: [],
      pinned: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z"
    };

    const result = deriveFocusBrief({
      overdueTasks: [overdueTask],
      dueTodayTasks: [todayTask],
      upcomingReminders: [],
      selectedDayAgenda: [],
      pinnedNotes: [note],
      now
    });

    expect(result).toHaveLength(3);
    expect(result[0]?.urgency).toBe("overdue");
    expect(result[1]?.urgency).toBe("today");
    expect(result[2]?.urgency).toBe("context");
  });

  it("should include upcoming reminders", () => {
    const reminder: Reminder = {
      id: "1",
      text: "Upcoming reminder",
      dueAt: "2024-01-16T12:00:00Z",
      recurrence: "none",
      status: "pending",
      notifyChannel: "desktop"
    };

    const result = deriveFocusBrief({
      overdueTasks: [],
      dueTodayTasks: [],
      upcomingReminders: [reminder],
      selectedDayAgenda: [],
      pinnedNotes: [],
      now
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("reminder");
    expect(result[0]?.urgency).toBe("upcoming");
  });

  it("should include selected day agenda items", () => {
    const reminder: Reminder = {
      id: "1",
      text: "Agenda item",
      dueAt: "2024-01-15T12:00:00Z",
      recurrence: "none",
      status: "pending",
      notifyChannel: "desktop"
    };

    const result = deriveFocusBrief({
      overdueTasks: [],
      dueTodayTasks: [],
      upcomingReminders: [],
      selectedDayAgenda: [reminder],
      pinnedNotes: [],
      now
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("agenda");
    expect(result[0]?.urgency).toBe("today");
  });

  it("should deduplicate items by source id", () => {
    const reminder: Reminder = {
      id: "1",
      text: "Same reminder",
      dueAt: "2024-01-15T12:00:00Z",
      recurrence: "none",
      status: "pending",
      notifyChannel: "desktop"
    };

    const result = deriveFocusBrief({
      overdueTasks: [],
      dueTodayTasks: [],
      upcomingReminders: [reminder],
      selectedDayAgenda: [reminder],
      pinnedNotes: [],
      now
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.sourceId).toBe("1");
  });
});

describe("getBriefSummary", () => {
  it("should return all clear message when no items", () => {
    const result = getBriefSummary([]);
    expect(result).toBe("All clear - no urgent items.");
  });

  it("should count overdue items", () => {
    const items = [
      { kind: "task" as const, label: "Task", urgency: "overdue" as const, sourceId: "1" },
      { kind: "reminder" as const, label: "Reminder", urgency: "overdue" as const, sourceId: "2" }
    ];
    const result = getBriefSummary(items);
    expect(result).toBe("Focus: 2 overdue.");
  });

  it("should count today items", () => {
    const items = [
      { kind: "task" as const, label: "Task", urgency: "today" as const, sourceId: "1" },
      { kind: "reminder" as const, label: "Reminder", urgency: "today" as const, sourceId: "2" }
    ];
    const result = getBriefSummary(items);
    expect(result).toBe("Focus: 2 due today.");
  });

  it("should count context items", () => {
    const items = [{ kind: "note" as const, label: "Note", urgency: "context" as const, sourceId: "1" }];
    const result = getBriefSummary(items);
    expect(result).toBe("Focus: 1 context items.");
  });

  it("should combine multiple urgency counts", () => {
    const items = [
      { kind: "task" as const, label: "Overdue", urgency: "overdue" as const, sourceId: "1" },
      { kind: "task" as const, label: "Today", urgency: "today" as const, sourceId: "2" },
      { kind: "note" as const, label: "Context", urgency: "context" as const, sourceId: "3" }
    ];
    const result = getBriefSummary(items);
    expect(result).toBe("Focus: 1 overdue, 1 due today, 1 context items.");
  });
});
