import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDeskProductivityState } from "./useDeskProductivityState";
import type { Note, Task } from "../../../shared/types";
import { createQueryTestWrapper } from "../../test/queryTestUtils";

describe("useDeskProductivityState inbox integration", () => {
  it("includes inbox state with required properties", () => {
    const setStatus = vi.fn();
    const setError = vi.fn();
    const refreshAll = vi.fn().mockResolvedValue(undefined);
    const refreshNotes = vi.fn().mockResolvedValue(undefined);
    const refreshReminders = vi.fn().mockResolvedValue(undefined);
    const refreshTasks = vi.fn().mockResolvedValue(undefined);
    const refreshDevices = vi.fn().mockResolvedValue(undefined);
    const refreshLogs = vi.fn().mockResolvedValue(undefined);
    const refreshRules = vi.fn().mockResolvedValue(undefined);
    const mergeNote = vi.fn();
    const removeNoteById = vi.fn();

    const { result } = renderHook(
      () =>
        useDeskProductivityState({
          notes: [],
          reminders: [],
          tasks: [],
          rules: [],
          setStatus,
          setError,
          refreshAll,
          refreshNotes,
          refreshReminders,
          refreshTasks,
          refreshDevices,
          refreshLogs,
          refreshRules,
          mergeNote,
          removeNoteById,
          teamTasks: [],
          mergeTask: undefined,
          mergeReminder: undefined,
          mergeTeamTask: undefined,
          refreshTeamTasks: undefined
        }),
      { wrapper: createQueryTestWrapper() }
    );

    expect(result.current.inbox).toBeDefined();
    expect(result.current.inbox.unifiedItems).toEqual([]);
    expect(result.current.inbox.needsSorting).toEqual([]);
    expect(typeof result.current.inbox.createQuickNote).toBe("function");
    expect(typeof result.current.inbox.createQuickTask).toBe("function");
    expect(typeof result.current.inbox.createQuickReminder).toBe("function");
    expect(typeof result.current.inbox.convertNoteToTask).toBe("function");
    expect(typeof result.current.inbox.convertNoteToReminder).toBe("function");
    expect(typeof result.current.inbox.sendTaskToTeam).toBe("function");
  });

  it("inbox state derives unified items from local data", () => {
    const setStatus = vi.fn();
    const setError = vi.fn();
    const refreshAll = vi.fn().mockResolvedValue(undefined);
    const refreshNotes = vi.fn().mockResolvedValue(undefined);
    const refreshReminders = vi.fn().mockResolvedValue(undefined);
    const refreshTasks = vi.fn().mockResolvedValue(undefined);
    const refreshDevices = vi.fn().mockResolvedValue(undefined);
    const refreshLogs = vi.fn().mockResolvedValue(undefined);
    const refreshRules = vi.fn().mockResolvedValue(undefined);
    const mergeNote = vi.fn();
    const removeNoteById = vi.fn();

    const notes: Note[] = [
      {
        id: "1",
        title: "Note 1",
        content: "Content",
        tags: [],
        pinned: false,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z"
      }
    ];
    const tasks: Task[] = [
      {
        id: "2",
        title: "Task 1",
        notes: "",
        dueAt: null,
        priority: "normal",
        recurrence: "none",
        status: "open",
        notifyChannel: "desktop",
        lastCompletedAt: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z"
      }
    ];

    const { result } = renderHook(
      () =>
        useDeskProductivityState({
          notes,
          reminders: [],
          tasks,
          rules: [],
          setStatus,
          setError,
          refreshAll,
          refreshNotes,
          refreshReminders,
          refreshTasks,
          refreshDevices,
          refreshLogs,
          refreshRules,
          mergeNote,
          removeNoteById,
          teamTasks: [],
          mergeTask: undefined,
          mergeReminder: undefined,
          mergeTeamTask: undefined,
          refreshTeamTasks: undefined
        }),
      { wrapper: createQueryTestWrapper() }
    );

    expect(result.current.inbox.unifiedItems.length).toBeGreaterThan(0);
  });
});
