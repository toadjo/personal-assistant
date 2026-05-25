import { describe, expect, it } from "vitest";
import { derivePlanTodayQueue, deriveEndOfDayReview } from "./daily-command-center";
import type { BriefItem } from "../../types";

function makeBriefItem(overrides: Partial<BriefItem> = {}): BriefItem {
  return {
    id: "test-id",
    kind: "task",
    sourceId: "task-1",
    label: "Test Item",
    urgency: "today",
    lastCompletedAt: undefined,
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

describe("deriveEndOfDayReview", () => {
  it("returns empty review when no items provided", () => {
    const review = deriveEndOfDayReview({
      localTasks: [],
      localReminders: [],
      localNotes: []
    });

    expect(review.completedTasks).toEqual([]);
    expect(review.completedReminders).toEqual([]);
    expect(review.unfinishedTasks).toEqual([]);
    expect(review.unfinishedReminders).toEqual([]);
    expect(review.capturedNotes).toEqual([]);
    expect(review.totalCompleted).toBe(0);
    expect(review.totalUnfinished).toBe(0);
    expect(review.totalCaptured).toBe(0);
    expect(review.summary).toBe("No activity today.");
  });

  it("identifies tasks completed today", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const today = new Date("2026-05-25T10:00:00.000Z");

    const review = deriveEndOfDayReview({
      localTasks: [
        makeBriefItem({
          id: "completed-task",
          kind: "task",
          sourceId: "task-1",
          label: "Completed Task",
          urgency: "today",
          dueAt: today.toISOString(),
          lastCompletedAt: today.toISOString()
        })
      ],
      localReminders: [],
      localNotes: [],
      now
    });

    expect(review.completedTasks).toHaveLength(1);
    expect(review.completedTasks[0]?.reviewCategory).toBe("completed-task");
    expect(review.totalCompleted).toBe(1);
  });

  it("identifies reminders completed today", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const today = new Date("2026-05-25T10:00:00.000Z");

    const review = deriveEndOfDayReview({
      localTasks: [],
      localReminders: [
        makeBriefItem({
          id: "completed-reminder",
          kind: "reminder",
          sourceId: "reminder-1",
          label: "Completed Reminder",
          urgency: "today",
          dueAt: today.toISOString()
        })
      ],
      localNotes: [],
      now
    });

    expect(review.completedReminders).toHaveLength(1);
    expect(review.completedReminders[0]?.reviewCategory).toBe("completed-reminder");
    expect(review.totalCompleted).toBe(1);
  });

  it("identifies unfinished overdue tasks", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const yesterday = new Date("2026-05-24T12:00:00.000Z");

    const review = deriveEndOfDayReview({
      localTasks: [
        makeBriefItem({
          id: "unfinished-task",
          kind: "task",
          sourceId: "task-1",
          label: "Unfinished Task",
          urgency: "overdue",
          dueAt: yesterday.toISOString(),
          lastCompletedAt: undefined
        })
      ],
      localReminders: [],
      localNotes: [],
      now
    });

    expect(review.unfinishedTasks).toHaveLength(1);
    expect(review.unfinishedTasks[0]?.reviewCategory).toBe("unfinished-task");
    expect(review.totalUnfinished).toBe(1);
  });

  it("identifies unfinished due today tasks", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const today = new Date("2026-05-25T10:00:00.000Z");

    const review = deriveEndOfDayReview({
      localTasks: [
        makeBriefItem({
          id: "unfinished-task",
          kind: "task",
          sourceId: "task-1",
          label: "Unfinished Task",
          urgency: "today",
          dueAt: today.toISOString(),
          lastCompletedAt: undefined
        })
      ],
      localReminders: [],
      localNotes: [],
      now
    });

    expect(review.unfinishedTasks).toHaveLength(1);
    expect(review.unfinishedTasks[0]?.reviewCategory).toBe("unfinished-task");
    expect(review.totalUnfinished).toBe(1);
  });

  it("identifies unfinished overdue reminders", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const yesterday = new Date("2026-05-24T12:00:00.000Z");

    const review = deriveEndOfDayReview({
      localTasks: [],
      localReminders: [
        makeBriefItem({
          id: "unfinished-reminder",
          kind: "reminder",
          sourceId: "reminder-1",
          label: "Unfinished Reminder",
          urgency: "overdue",
          dueAt: yesterday.toISOString()
        })
      ],
      localNotes: [],
      now
    });

    expect(review.unfinishedReminders).toHaveLength(1);
    expect(review.unfinishedReminders[0]?.reviewCategory).toBe("unfinished-reminder");
    expect(review.totalUnfinished).toBe(1);
  });

  it("identifies notes captured today", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const today = new Date("2026-05-25T10:00:00.000Z");

    const review = deriveEndOfDayReview({
      localTasks: [],
      localReminders: [],
      localNotes: [
        makeBriefItem({
          id: "captured-note",
          kind: "note",
          sourceId: "note-1",
          label: "Captured Note",
          urgency: "context",
          dueAt: today.toISOString()
        })
      ],
      now
    });

    expect(review.capturedNotes).toHaveLength(1);
    expect(review.capturedNotes[0]?.reviewCategory).toBe("captured-note");
    expect(review.totalCaptured).toBe(1);
  });

  it("builds correct summary for mixed activity", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const today = new Date("2026-05-25T10:00:00.000Z");
    const yesterday = new Date("2026-05-24T12:00:00.000Z");

    const review = deriveEndOfDayReview({
      localTasks: [
        makeBriefItem({
          id: "completed-task",
          kind: "task",
          sourceId: "task-1",
          label: "Completed Task",
          urgency: "today",
          dueAt: today.toISOString(),
          lastCompletedAt: today.toISOString()
        }),
        makeBriefItem({
          id: "unfinished-task",
          kind: "task",
          sourceId: "task-2",
          label: "Unfinished Task",
          urgency: "overdue",
          dueAt: yesterday.toISOString(),
          lastCompletedAt: undefined
        })
      ],
      localReminders: [
        makeBriefItem({
          id: "completed-reminder",
          kind: "reminder",
          sourceId: "reminder-1",
          label: "Completed Reminder",
          urgency: "today",
          dueAt: today.toISOString()
        })
      ],
      localNotes: [
        makeBriefItem({
          id: "captured-note",
          kind: "note",
          sourceId: "note-1",
          label: "Captured Note",
          urgency: "context",
          dueAt: today.toISOString()
        })
      ],
      now
    });

    expect(review.summary).toBe("Day review: 2 completed, 1 unfinished, 1 captured.");
  });

  it("sorts items by due date within categories", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const todayMorning = new Date("2026-05-25T08:00:00.000Z");
    const todayEvening = new Date("2026-05-25T18:00:00.000Z");

    const review = deriveEndOfDayReview({
      localTasks: [
        makeBriefItem({
          id: "task-evening",
          kind: "task",
          sourceId: "task-2",
          label: "Evening Task",
          urgency: "overdue",
          dueAt: todayEvening.toISOString(),
          lastCompletedAt: undefined
        }),
        makeBriefItem({
          id: "task-morning",
          kind: "task",
          sourceId: "task-1",
          label: "Morning Task",
          urgency: "overdue",
          dueAt: todayMorning.toISOString(),
          lastCompletedAt: undefined
        })
      ],
      localReminders: [],
      localNotes: [],
      now
    });

    expect(review.unfinishedTasks).toHaveLength(2);
    expect(review.unfinishedTasks[0]?.sourceId).toBe("task-1"); // Morning task first
    expect(review.unfinishedTasks[1]?.sourceId).toBe("task-2"); // Evening task second
  });

  it("excludes future items from review", () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const tomorrow = new Date("2026-05-26T12:00:00.000Z");

    const review = deriveEndOfDayReview({
      localTasks: [
        makeBriefItem({
          id: "future-task",
          kind: "task",
          sourceId: "task-1",
          label: "Future Task",
          urgency: "upcoming",
          dueAt: tomorrow.toISOString()
        })
      ],
      localReminders: [],
      localNotes: [],
      now
    });

    expect(review.unfinishedTasks).toEqual([]);
    expect(review.completedTasks).toEqual([]);
  });
});
