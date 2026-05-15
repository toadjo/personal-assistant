/**
 * Hook for managing unified inbox state.
 *
 * This hook provides access to the unified work item model and
 * actions for quick capture and item conversion.
 */

import { useMemo } from "react";
import { deriveUnifiedWorkItems } from "../../lib/derived/unified-work";
import type { Note, Reminder, Task } from "../../../shared/types";
import type { TeamProjectTask } from "../../../shared/team/types";

type SetStatus = (value: string) => void;
type SetError = (message: string) => void;

type InboxHelpers = {
  notes: Note[];
  tasks: Task[];
  reminders: Reminder[];
  teamTasks: TeamProjectTask[];
  mergeNote: (note: Note) => void;
  mergeTask: (task: Task) => void;
  mergeReminder: (reminder: Reminder) => void;
  mergeTeamTask: (task: TeamProjectTask) => void;
  refreshNotes: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshReminders: () => Promise<void>;
  refreshTeamTasks: () => Promise<void>;
};

export function useInboxState(setStatus: SetStatus, setError: SetError, helpers: InboxHelpers) {
  const {
    notes,
    tasks,
    reminders,
    teamTasks,
    mergeNote,
    mergeTask,
    mergeReminder,
    mergeTeamTask,
    refreshNotes,
    refreshTasks,
    refreshReminders,
    refreshTeamTasks
  } = helpers;

  // Derive unified work items from all sources
  const unifiedItems = useMemo(() => {
    return deriveUnifiedWorkItems({
      localTasks: tasks,
      localReminders: reminders,
      localNotes: notes,
      teamTasks: teamTasks
    });
  }, [notes, tasks, reminders, teamTasks]);

  // Filter for "needs sorting" - items without due dates or context items
  const needsSorting = useMemo(() => {
    return unifiedItems.filter((item) => item.priority === "context" && !item.isCompleted);
  }, [unifiedItems]);

  // Quick capture actions
  async function createQuickNote(title: string, content: string): Promise<void> {
    try {
      const note = await window.assistantApi.createNote({
        title: title.trim(),
        content: content.trim(),
        tags: [],
        pinned: false
      });
      mergeNote(note);
      setStatus("Note captured.");
      await refreshNotes();
    } catch {
      setError("Failed to capture note.");
      await refreshNotes();
    }
  }

  async function createQuickTask(title: string, notes: string): Promise<void> {
    try {
      const task = await window.assistantApi.createTask({
        title: title.trim(),
        notes: notes.trim(),
        dueAt: null,
        priority: "normal",
        recurrence: "none"
      });
      mergeTask(task);
      setStatus("Task captured.");
      await refreshTasks();
    } catch {
      setError("Failed to capture task.");
      await refreshTasks();
    }
  }

  async function createQuickReminder(text: string): Promise<void> {
    try {
      const reminder = await window.assistantApi.createReminder({
        text: text.trim(),
        dueAt: new Date(Date.now() + 60_000).toISOString(),
        recurrence: "none"
      });
      mergeReminder(reminder);
      setStatus("Reminder captured.");
      await refreshReminders();
    } catch {
      setError("Failed to capture reminder.");
      await refreshReminders();
    }
  }

  // Convert actions
  async function convertNoteToTask(noteId: string): Promise<void> {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    try {
      const task = await window.assistantApi.createTask({
        title: note.title,
        notes: note.content,
        dueAt: null,
        priority: "normal",
        recurrence: "none"
      });
      mergeTask(task);
      await window.assistantApi.deleteNote(noteId);
      setStatus("Note converted to task.");
      await Promise.all([refreshNotes(), refreshTasks()]);
    } catch {
      setError("Failed to convert note to task.");
      await Promise.all([refreshNotes(), refreshTasks()]);
    }
  }

  async function convertNoteToReminder(noteId: string): Promise<void> {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    try {
      const reminder = await window.assistantApi.createReminder({
        text: note.title,
        dueAt: new Date(Date.now() + 60_000).toISOString(),
        recurrence: "none"
      });
      mergeReminder(reminder);
      await window.assistantApi.deleteNote(noteId);
      setStatus("Note converted to reminder.");
      await Promise.all([refreshNotes(), refreshReminders()]);
    } catch {
      setError("Failed to convert note to reminder.");
      await Promise.all([refreshNotes(), refreshReminders()]);
    }
  }

  async function sendTaskToTeam(taskId: string, projectId: string): Promise<void> {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    try {
      const teamTask = await window.assistantApi.teamTasksCreate({
        projectId,
        title: task.title,
        notes: task.notes,
        dueAt: task.dueAt,
        priority: task.priority,
        recurrence: task.recurrence,
        assigneeDisplayName: null
      });
      mergeTeamTask(teamTask);
      await window.assistantApi.deleteTask(taskId);
      setStatus("Task sent to team.");
      await Promise.all([refreshTasks(), refreshTeamTasks()]);
    } catch {
      setError("Failed to send task to team.");
      await Promise.all([refreshTasks(), refreshTeamTasks()]);
    }
  }

  return {
    unifiedItems,
    needsSorting,
    createQuickNote,
    createQuickTask,
    createQuickReminder,
    convertNoteToTask,
    convertNoteToReminder,
    sendTaskToTeam
  };
}
