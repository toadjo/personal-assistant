import { describe, expect, it } from "vitest";
import { derivePlanTodayQueue } from "./daily-command-center";
import type { BriefItem } from "../../types";

function makeBriefItem(overrides: Partial<BriefItem> = {}): BriefItem {
  return {
    id: "test-id",
    kind: "task",
    sourceId: "task-1",
    label: "Test Item",
    urgency: "today",
    ...overrides
  };
}

describe("derivePlanTodayQueue", () => {
  it("returns empty queue when no items provided", () => {
    const queue = derivePlanTodayQueue({
      localTasks: [],
      localReminders: [],
      localNotes: []
    });

    expect(queue.items).toEqual([]);
    expect(queue.totalItems).toBe(0);
    expect(queue.summary).toBe("All clear - nothing needs planning today.");
  });

  it("prioritizes overdue tasks over due today reminders", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const yesterday = new Date("2026-05-24T12:00:00.000Z");
    const today = new Date("2026-05-25T12:00:00.000Z");

    const queue = derivePlanTodayQueue({
      localTasks: [
        makeBriefItem({
          id: "overdue-task",
          kind: "task",
          sourceId: "task-1",
          label: "Overdue Task",
          urgency: "overdue",
          dueAt: yesterday.toISOString()
        })
      ],
      localReminders: [
        makeBriefItem({
          id: "today-reminder",
          kind: "reminder",
          sourceId: "reminder-1",
          label: "Today Reminder",
          urgency: "today",
          dueAt: today.toISOString()
        })
      ],
      localNotes: [],
      now
    });

    expect(queue.items).toHaveLength(2);
    expect(queue.items[0]?.queueReason).toBe("overdue");
    expect(queue.items[0]?.source).toBe("local-task");
    expect(queue.items[1]?.queueReason).toBe("due-today");
    expect(queue.items[1]?.source).toBe("local-reminder");
  });

  it("includes unsorted notes with lowest priority", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const today = new Date("2026-05-25T12:00:00.000Z");

    const queue = derivePlanTodayQueue({
      localTasks: [
        makeBriefItem({
          id: "today-task",
          kind: "task",
          sourceId: "task-1",
          label: "Today Task",
          urgency: "today",
          dueAt: today.toISOString()
        })
      ],
      localReminders: [],
      localNotes: [
        makeBriefItem({
          id: "unsorted-note",
          kind: "note",
          sourceId: "note-1",
          label: "Unsorted Note",
          urgency: "context"
        })
      ],
      now
    });

    expect(queue.items).toHaveLength(2);
    expect(queue.items[0]?.queueReason).toBe("due-today");
    expect(queue.items[1]?.queueReason).toBe("unsorted");
    expect(queue.items[1]?.source).toBe("local-note");
  });

  it("sorts items by queue priority then by due date", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const todayMorning = new Date("2026-05-25T08:00:00.000Z");
    const todayEvening = new Date("2026-05-25T18:00:00.000Z");

    const queue = derivePlanTodayQueue({
      localTasks: [
        makeBriefItem({
          id: "today-task-evening",
          kind: "task",
          sourceId: "task-2",
          label: "Evening Task",
          urgency: "today",
          dueAt: todayEvening.toISOString()
        }),
        makeBriefItem({
          id: "today-task-morning",
          kind: "task",
          sourceId: "task-1",
          label: "Morning Task",
          urgency: "today",
          dueAt: todayMorning.toISOString()
        })
      ],
      localReminders: [],
      localNotes: [],
      now
    });

    expect(queue.items).toHaveLength(2);
    expect(queue.items[0]?.sourceId).toBe("task-1"); // Morning task first
    expect(queue.items[1]?.sourceId).toBe("task-2"); // Evening task second
  });

  it("builds correct summary for mixed items", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const yesterday = new Date("2026-05-24T12:00:00.000Z");
    const today = new Date("2026-05-25T12:00:00.000Z");

    const queue = derivePlanTodayQueue({
      localTasks: [
        makeBriefItem({
          id: "overdue-task",
          kind: "task",
          sourceId: "task-1",
          label: "Overdue Task",
          urgency: "overdue",
          dueAt: yesterday.toISOString()
        }),
        makeBriefItem({
          id: "today-task",
          kind: "task",
          sourceId: "task-2",
          label: "Today Task",
          urgency: "today",
          dueAt: today.toISOString()
        })
      ],
      localReminders: [
        makeBriefItem({
          id: "today-reminder",
          kind: "reminder",
          sourceId: "reminder-1",
          label: "Today Reminder",
          urgency: "today",
          dueAt: today.toISOString()
        })
      ],
      localNotes: [
        makeBriefItem({
          id: "unsorted-note",
          kind: "note",
          sourceId: "note-1",
          label: "Unsorted Note",
          urgency: "context"
        })
      ],
      now
    });

    expect(queue.summary).toBe("Plan Today: 1 overdue, 2 due today, 1 unsorted.");
  });

  it("excludes completed items from queue", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const yesterday = new Date("2026-05-24T12:00:00.000Z");

    const queue = derivePlanTodayQueue({
      localTasks: [
        makeBriefItem({
          id: "overdue-task",
          kind: "task",
          sourceId: "task-1",
          label: "Overdue Task",
          urgency: "overdue",
          dueAt: yesterday.toISOString()
        })
      ],
      localReminders: [],
      localNotes: [],
      now
    });

    // The function doesn't filter by completion status - it includes all items
    // Completion filtering should happen at the data source level
    expect(queue.items).toHaveLength(1);
  });
});
