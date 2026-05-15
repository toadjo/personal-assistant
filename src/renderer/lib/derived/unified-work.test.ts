import { describe, expect, it } from "vitest";
import {
  deriveUnifiedWorkItems,
  filterUnifiedWorkItemsBySource,
  filterUnifiedWorkItemsByPriority,
  filterUnifiedWorkItemsByCompletion
} from "./unified-work";
import type { Task, Reminder, Note } from "../../../shared/types";
import type { TeamProjectTask } from "../../../shared/team/types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Math.random()}`,
    title: "Task",
    notes: "",
    dueAt: null,
    priority: "normal",
    status: "open",
    recurrence: "none",
    notifyChannel: "desktop",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    lastCompletedAt: null,
    ...overrides
  };
}

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: `reminder-${Math.random()}`,
    text: "Reminder",
    dueAt: "2024-01-01T12:00:00Z",
    recurrence: "none",
    status: "pending",
    notifyChannel: "desktop",
    ...overrides
  };
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: `note-${Math.random()}`,
    title: "Note",
    content: "",
    tags: [],
    pinned: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function makeTeamTask(overrides: Partial<TeamProjectTask> = {}): TeamProjectTask {
  return {
    id: `team-task-${Math.random()}`,
    workspaceId: "ws-1",
    projectId: "proj-1",
    title: "Team Task",
    notes: "",
    dueAt: null,
    priority: "normal",
    status: "open",
    recurrence: "none",
    assigneeDisplayName: null,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "user-1",
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: "user-1",
    ...overrides
  };
}

describe("deriveUnifiedWorkItems", () => {
  it("returns empty array when all inputs are empty", () => {
    const result = deriveUnifiedWorkItems({
      localTasks: [],
      localReminders: [],
      localNotes: [],
      teamTasks: []
    });

    expect(result).toEqual([]);
  });

  it("includes local tasks with correct mapping", () => {
    const task = makeTask({ title: "Buy groceries", dueAt: "2024-01-15T12:00:00Z" });

    const result = deriveUnifiedWorkItems({
      localTasks: [task],
      localReminders: [],
      localNotes: [],
      teamTasks: []
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe("local-task");
    expect(result[0]?.label).toBe("Buy groceries");
    expect(result[0]?.sourceId).toBe(task.id);
  });

  it("includes local reminders with correct mapping", () => {
    const reminder = makeReminder({ text: "Call mom" });

    const result = deriveUnifiedWorkItems({
      localTasks: [],
      localReminders: [reminder],
      localNotes: [],
      teamTasks: []
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe("local-reminder");
    expect(result[0]?.label).toBe("Call mom");
    expect(result[0]?.sourceId).toBe(reminder.id);
  });

  it("includes local notes with context priority", () => {
    const note = makeNote({ title: "Meeting notes", content: "Discuss Q1 goals" });

    const result = deriveUnifiedWorkItems({
      localTasks: [],
      localReminders: [],
      localNotes: [note],
      teamTasks: []
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe("local-note");
    expect(result[0]?.label).toBe("Meeting notes");
    expect(result[0]?.priority).toBe("context");
  });

  it("includes team tasks with correct mapping", () => {
    const teamTask = makeTeamTask({ title: "Review PR", assigneeDisplayName: "Alice" });

    const result = deriveUnifiedWorkItems({
      localTasks: [],
      localReminders: [],
      localNotes: [],
      teamTasks: [teamTask]
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe("team-task");
    expect(result[0]?.label).toBe("Review PR");
    expect(result[0]?.assigneeDisplayName).toBe("Alice");
  });

  it("sorts items by priority: overdue > today > upcoming > context", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const overdueTask = makeTask({ title: "Overdue", dueAt: "2024-01-14T12:00:00Z" });
    const todayTask = makeTask({ title: "Today", dueAt: "2024-01-15T12:00:00Z" });
    const upcomingTask = makeTask({ title: "Upcoming", dueAt: "2024-01-16T12:00:00Z" });
    const note = makeNote({ title: "Note" });

    const result = deriveUnifiedWorkItems({
      localTasks: [upcomingTask, todayTask, overdueTask],
      localReminders: [],
      localNotes: [note],
      teamTasks: [],
      now
    });

    expect(result[0]?.priority).toBe("overdue");
    expect(result[1]?.priority).toBe("today");
    expect(result[2]?.priority).toBe("upcoming");
    expect(result[3]?.priority).toBe("context");
  });

  it("marks completed items as context priority", () => {
    const doneTask = makeTask({ status: "done", dueAt: "2024-01-15T12:00:00Z" });
    const doneReminder = makeReminder({ status: "done", dueAt: "2024-01-15T12:00:00Z" });
    const doneTeamTask = makeTeamTask({ status: "done", dueAt: "2024-01-15T12:00:00Z" });

    const result = deriveUnifiedWorkItems({
      localTasks: [doneTask],
      localReminders: [doneReminder],
      localNotes: [],
      teamTasks: [doneTeamTask]
    });

    expect(result.every((item) => item.priority === "context")).toBe(true);
  });

  it("sets isCompleted flag correctly", () => {
    const openTask = makeTask({ status: "open" });
    const doneTask = makeTask({ status: "done" });
    const openReminder = makeReminder({ status: "pending" });
    const doneReminder = makeReminder({ status: "done" });

    const result = deriveUnifiedWorkItems({
      localTasks: [openTask, doneTask],
      localReminders: [openReminder, doneReminder],
      localNotes: [],
      teamTasks: []
    });

    const openTaskItem = result.find((item) => item.sourceId === openTask.id);
    const doneTaskItem = result.find((item) => item.sourceId === doneTask.id);
    const openReminderItem = result.find((item) => item.sourceId === openReminder.id);
    const doneReminderItem = result.find((item) => item.sourceId === doneReminder.id);

    expect(openTaskItem?.isCompleted).toBe(false);
    expect(doneTaskItem?.isCompleted).toBe(true);
    expect(openReminderItem?.isCompleted).toBe(false);
    expect(doneReminderItem?.isCompleted).toBe(true);
  });

  it("generates unique IDs for each item", () => {
    const task = makeTask({ id: "task-1" });
    const reminder = makeReminder({ id: "reminder-1" });
    const note = makeNote({ id: "note-1" });
    const teamTask = makeTeamTask({ id: "team-task-1" });

    const result = deriveUnifiedWorkItems({
      localTasks: [task],
      localReminders: [reminder],
      localNotes: [note],
      teamTasks: [teamTask]
    });

    const ids = new Set(result.map((item) => item.id));
    expect(ids.size).toBe(4);
    expect(ids.has("local-task-task-1")).toBe(true);
    expect(ids.has("local-reminder-reminder-1")).toBe(true);
    expect(ids.has("local-note-note-1")).toBe(true);
    expect(ids.has("team-task-team-task-1")).toBe(true);
  });
});

describe("filterUnifiedWorkItemsBySource", () => {
  it("filters items by source", () => {
    const task = makeTask({ title: "Task" });
    const reminder = makeReminder({ text: "Reminder" });
    const note = makeNote({ title: "Note" });
    const teamTask = makeTeamTask({ title: "Team Task" });

    const items = deriveUnifiedWorkItems({
      localTasks: [task],
      localReminders: [reminder],
      localNotes: [note],
      teamTasks: [teamTask]
    });

    expect(filterUnifiedWorkItemsBySource(items, "local-task")).toHaveLength(1);
    expect(filterUnifiedWorkItemsBySource(items, "local-reminder")).toHaveLength(1);
    expect(filterUnifiedWorkItemsBySource(items, "local-note")).toHaveLength(1);
    expect(filterUnifiedWorkItemsBySource(items, "team-task")).toHaveLength(1);
  });

  it("returns empty array when no items match source", () => {
    const items = deriveUnifiedWorkItems({
      localTasks: [],
      localReminders: [],
      localNotes: [],
      teamTasks: []
    });

    expect(filterUnifiedWorkItemsBySource(items, "local-task")).toHaveLength(0);
  });
});

describe("filterUnifiedWorkItemsByPriority", () => {
  it("filters items by priority", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const overdueTask = makeTask({ dueAt: "2024-01-14T12:00:00Z" });
    const todayTask = makeTask({ dueAt: "2024-01-15T12:00:00Z" });
    const upcomingTask = makeTask({ dueAt: "2024-01-16T12:00:00Z" });
    const note = makeNote();

    const items = deriveUnifiedWorkItems({
      localTasks: [overdueTask, todayTask, upcomingTask],
      localReminders: [],
      localNotes: [note],
      teamTasks: [],
      now
    });

    expect(filterUnifiedWorkItemsByPriority(items, "overdue")).toHaveLength(1);
    expect(filterUnifiedWorkItemsByPriority(items, "today")).toHaveLength(1);
    expect(filterUnifiedWorkItemsByPriority(items, "upcoming")).toHaveLength(1);
    expect(filterUnifiedWorkItemsByPriority(items, "context")).toHaveLength(1);
  });
});

describe("filterUnifiedWorkItemsByCompletion", () => {
  it("filters items by completion status", () => {
    const openTask = makeTask({ status: "open" });
    const doneTask = makeTask({ status: "done" });

    const items = deriveUnifiedWorkItems({
      localTasks: [openTask, doneTask],
      localReminders: [],
      localNotes: [],
      teamTasks: []
    });

    expect(filterUnifiedWorkItemsByCompletion(items, false)).toHaveLength(1);
    expect(filterUnifiedWorkItemsByCompletion(items, true)).toHaveLength(1);
  });
});
