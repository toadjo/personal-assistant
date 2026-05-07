import { describe, expect, it } from "vitest";
import { deriveAwayBrief, getAwayBriefSummary } from "./away-brief";

describe("deriveAwayBrief", () => {
  it("empty data returns empty brief", () => {
    const result = deriveAwayBrief({
      tasks: [],
      reminders: [],
      notes: [],
      lastSeenAt: null,
      now: new Date("2026-05-07T12:00:00.000Z")
    });
    expect(result).toEqual([]);
  });

  it("new task since last seen appears", () => {
    const result = deriveAwayBrief({
      tasks: [
        {
          id: "task-1",
          title: "Buy groceries",
          notes: "",
          dueAt: null,
          priority: "normal",
          status: "open",
          recurrence: "none",
          notifyChannel: "desktop",
          createdAt: "2026-05-07T11:00:00.000Z",
          updatedAt: "2026-05-07T11:00:00.000Z",
          lastCompletedAt: null
        }
      ],
      reminders: [],
      notes: [],
      lastSeenAt: "2026-05-07T10:00:00.000Z",
      now: new Date("2026-05-07T12:00:00.000Z")
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("task");
    expect(result[0]?.reason).toBe("new");
    expect(result[0]?.label).toBe("Buy groceries");
  });

  it("updated note since last seen appears", () => {
    const result = deriveAwayBrief({
      tasks: [],
      reminders: [],
      notes: [
        {
          id: "note-1",
          title: "Meeting notes",
          content: "Discuss project timeline",
          tags: [],
          pinned: false,
          createdAt: "2026-05-06T10:00:00.000Z",
          updatedAt: "2026-05-07T11:00:00.000Z"
        }
      ],
      lastSeenAt: "2026-05-07T10:00:00.000Z",
      now: new Date("2026-05-07T12:00:00.000Z")
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("note");
    expect(result[0]?.reason).toBe("updated");
    expect(result[0]?.label).toBe("Meeting notes");
  });

  it("overdue task appears even when older than last seen", () => {
    const result = deriveAwayBrief({
      tasks: [
        {
          id: "task-1",
          title: "Pay bills",
          notes: "",
          dueAt: "2026-05-06T10:00:00.000Z",
          priority: "normal",
          status: "open",
          recurrence: "none",
          notifyChannel: "desktop",
          createdAt: "2026-05-05T10:00:00.000Z",
          updatedAt: "2026-05-05T10:00:00.000Z",
          lastCompletedAt: null
        }
      ],
      reminders: [],
      notes: [],
      lastSeenAt: "2026-05-07T10:00:00.000Z",
      now: new Date("2026-05-07T12:00:00.000Z")
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("task");
    expect(result[0]?.reason).toBe("overdue");
    expect(result[0]?.label).toBe("Pay bills");
  });

  it("reminders due since last seen appear", () => {
    const result = deriveAwayBrief({
      tasks: [],
      reminders: [
        {
          id: "reminder-1",
          text: "Call doctor",
          dueAt: "2026-05-07T14:00:00.000Z",
          recurrence: "none",
          status: "pending",
          notifyChannel: "desktop"
        }
      ],
      notes: [],
      lastSeenAt: "2026-05-07T10:00:00.000Z",
      now: new Date("2026-05-07T12:00:00.000Z")
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("reminder");
    expect(result[0]?.reason).toBe("due");
    expect(result[0]?.label).toBe("Call doctor");
  });

  it("items sort by overdue/due first, then newest change", () => {
    const result = deriveAwayBrief({
      tasks: [
        {
          id: "task-1",
          title: "New task",
          notes: "",
          dueAt: null,
          priority: "normal",
          status: "open",
          recurrence: "none",
          notifyChannel: "desktop",
          createdAt: "2026-05-07T11:30:00.000Z",
          updatedAt: "2026-05-07T11:30:00.000Z",
          lastCompletedAt: null
        },
        {
          id: "task-2",
          title: "Overdue task",
          notes: "",
          dueAt: "2026-05-06T10:00:00.000Z",
          priority: "normal",
          status: "open",
          recurrence: "none",
          notifyChannel: "desktop",
          createdAt: "2026-05-05T10:00:00.000Z",
          updatedAt: "2026-05-05T10:00:00.000Z",
          lastCompletedAt: null
        }
      ],
      reminders: [],
      notes: [],
      lastSeenAt: "2026-05-07T10:00:00.000Z",
      now: new Date("2026-05-07T12:00:00.000Z")
    });
    expect(result).toHaveLength(2);
    expect(result[0]?.reason).toBe("overdue");
    expect(result[1]?.reason).toBe("new");
  });

  it("excludes completed tasks from overdue", () => {
    const result = deriveAwayBrief({
      tasks: [
        {
          id: "task-1",
          title: "Completed overdue task",
          notes: "",
          dueAt: "2026-05-06T10:00:00.000Z",
          priority: "normal",
          status: "done",
          recurrence: "none",
          notifyChannel: "desktop",
          createdAt: "2026-05-05T10:00:00.000Z",
          updatedAt: "2026-05-05T10:00:00.000Z",
          lastCompletedAt: "2026-05-06T10:00:00.000Z"
        }
      ],
      reminders: [],
      notes: [],
      lastSeenAt: "2026-05-07T10:00:00.000Z",
      now: new Date("2026-05-07T12:00:00.000Z")
    });
    expect(result).toHaveLength(0);
  });

  it("excludes done reminders from overdue", () => {
    const result = deriveAwayBrief({
      tasks: [],
      reminders: [
        {
          id: "reminder-1",
          text: "Done reminder",
          dueAt: "2026-05-06T10:00:00.000Z",
          recurrence: "none",
          status: "done",
          notifyChannel: "desktop"
        }
      ],
      notes: [],
      lastSeenAt: "2026-05-07T10:00:00.000Z",
      now: new Date("2026-05-07T12:00:00.000Z")
    });
    expect(result).toHaveLength(0);
  });

  it("handles invalid timestamps gracefully", () => {
    const result = deriveAwayBrief({
      tasks: [
        {
          id: "task-1",
          title: "Task with invalid date",
          notes: "",
          dueAt: null,
          priority: "normal",
          status: "open",
          recurrence: "none",
          notifyChannel: "desktop",
          createdAt: "invalid-date",
          updatedAt: "invalid-date",
          lastCompletedAt: null
        }
      ],
      reminders: [],
      notes: [],
      lastSeenAt: "2026-05-07T10:00:00.000Z",
      now: new Date("2026-05-07T12:00:00.000Z")
    });
    expect(result).toHaveLength(0);
  });

  it("handles invalid lastSeenAt gracefully", () => {
    const result = deriveAwayBrief({
      tasks: [
        {
          id: "task-1",
          title: "New task",
          notes: "",
          dueAt: null,
          priority: "normal",
          status: "open",
          recurrence: "none",
          notifyChannel: "desktop",
          createdAt: "2026-05-07T11:00:00.000Z",
          updatedAt: "2026-05-07T11:00:00.000Z",
          lastCompletedAt: null
        }
      ],
      reminders: [],
      notes: [],
      lastSeenAt: "invalid-date",
      now: new Date("2026-05-07T12:00:00.000Z")
    });
    expect(result).toHaveLength(0);
  });
});

describe("getAwayBriefSummary", () => {
  it("returns empty state message for no items", () => {
    const summary = getAwayBriefSummary([]);
    expect(summary).toBe("Nothing changed since you last checked.");
  });

  it("summarizes overdue items", () => {
    const items = [
      {
        kind: "task" as const,
        reason: "overdue" as const,
        label: "Pay bills",
        sourceId: "task-1",
        changedAt: "2026-05-07T10:00:00.000Z"
      }
    ];
    const summary = getAwayBriefSummary(items);
    expect(summary).toBe("Since you were away: 1 overdue.");
  });

  it("summarizes mixed reasons", () => {
    const items = [
      {
        kind: "task" as const,
        reason: "overdue" as const,
        label: "Pay bills",
        sourceId: "task-1",
        changedAt: "2026-05-07T10:00:00.000Z"
      },
      {
        kind: "note" as const,
        reason: "new" as const,
        label: "Meeting notes",
        sourceId: "note-1",
        changedAt: "2026-05-07T11:00:00.000Z"
      },
      {
        kind: "reminder" as const,
        reason: "due" as const,
        label: "Call doctor",
        sourceId: "reminder-1",
        changedAt: "2026-05-07T12:00:00.000Z"
      }
    ];
    const summary = getAwayBriefSummary(items);
    expect(summary).toBe("Since you were away: 1 overdue, 1 due, 1 new.");
  });
});
