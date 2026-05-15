/**
 * Unified work item model for Personal OS v3.
 *
 * This module provides a unified view across local and team work items:
 * - Local tasks
 * - Local reminders
 * - Local notes
 * - Team tasks
 *
 * The unified model enables a single "Inbox" surface and unified Today view
 * without requiring schema changes or IPC modifications.
 */

import type { Note, Reminder, Task } from "../../../shared/types";
import type { TeamProjectTask } from "../../../shared/team/types";

/**
 * Source of a unified work item.
 */
export type UnifiedWorkSource = "local-task" | "local-reminder" | "local-note" | "team-task";

/**
 * Priority level for unified work items.
 */
export type UnifiedWorkPriority = "overdue" | "today" | "upcoming" | "context";

/**
 * A unified work item that can represent tasks, reminders, notes, or team tasks.
 */
export interface UnifiedWorkItem {
  /** Unique identifier combining source and source ID. */
  id: string;
  /** Source of this work item. */
  source: UnifiedWorkSource;
  /** Original source ID (task ID, reminder ID, note ID, or team task ID). */
  sourceId: string;
  /** Display label (title, text, or name). */
  label: string;
  /** Optional detail (notes, content, or additional context). */
  detail?: string;
  /** Priority level derived from due date and status. */
  priority: UnifiedWorkPriority;
  /** Due date if applicable. */
  dueAt?: string;
  /** Whether the item is completed. */
  isCompleted: boolean;
  /** Creation timestamp. */
  createdAt: string;
  /** Last update timestamp. */
  updatedAt: string;
  /** Optional assignee display name (for team tasks). */
  assigneeDisplayName?: string;
  /** Optional project name (for team tasks). */
  projectName?: string;
}

/**
 * Input data for deriving unified work items.
 */
export interface UnifiedWorkInput {
  localTasks: Task[];
  localReminders: Reminder[];
  localNotes: Note[];
  teamTasks: TeamProjectTask[];
  now?: Date;
}

/**
 * Derives unified work items from local and team data sources.
 */
export function deriveUnifiedWorkItems(input: UnifiedWorkInput): UnifiedWorkItem[] {
  const now = input.now || new Date();
  const items: UnifiedWorkItem[] = [];

  // Local tasks
  for (const task of input.localTasks) {
    const priority = getPriorityForTask(task, now);
    items.push({
      id: `local-task-${task.id}`,
      source: "local-task",
      sourceId: task.id,
      label: task.title,
      detail: task.notes || undefined,
      priority,
      dueAt: task.dueAt || undefined,
      isCompleted: task.status === "done",
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    });
  }

  // Local reminders
  for (const reminder of input.localReminders) {
    const priority = getPriorityForReminder(reminder, now);
    items.push({
      id: `local-reminder-${reminder.id}`,
      source: "local-reminder",
      sourceId: reminder.id,
      label: reminder.text,
      detail: undefined,
      priority,
      dueAt: reminder.dueAt,
      isCompleted: reminder.status === "done",
      createdAt: reminder.dueAt,
      updatedAt: reminder.dueAt
    });
  }

  // Local notes (always context priority)
  for (const note of input.localNotes) {
    items.push({
      id: `local-note-${note.id}`,
      source: "local-note",
      sourceId: note.id,
      label: note.title,
      detail: note.content ? note.content.slice(0, 200) : undefined,
      priority: "context",
      dueAt: undefined,
      isCompleted: false,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    });
  }

  // Team tasks
  for (const teamTask of input.teamTasks) {
    const priority = getPriorityForTeamTask(teamTask, now);
    items.push({
      id: `team-task-${teamTask.id}`,
      source: "team-task",
      sourceId: teamTask.id,
      label: teamTask.title,
      detail: teamTask.notes || undefined,
      priority,
      dueAt: teamTask.dueAt || undefined,
      isCompleted: teamTask.status === "done",
      createdAt: teamTask.createdAt,
      updatedAt: teamTask.updatedAt,
      assigneeDisplayName: teamTask.assigneeDisplayName || undefined,
      projectName: undefined // Project name would need to be looked up from project ID
    });
  }

  // Sort by priority: overdue > today > upcoming > context
  const priorityOrder: Record<UnifiedWorkPriority, number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
    context: 3
  };

  items.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    // Within same priority, sort by due date (if available), then by label
    if (a.dueAt && b.dueAt) {
      const dateDiff = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      if (dateDiff !== 0) return dateDiff;
    }
    return a.label.localeCompare(b.label);
  });

  return items;
}

/**
 * Filters unified work items by source.
 */
export function filterUnifiedWorkItemsBySource(
  items: UnifiedWorkItem[],
  source: UnifiedWorkSource
): UnifiedWorkItem[] {
  return items.filter((item) => item.source === source);
}

/**
 * Filters unified work items by priority.
 */
export function filterUnifiedWorkItemsByPriority(
  items: UnifiedWorkItem[],
  priority: UnifiedWorkPriority
): UnifiedWorkItem[] {
  return items.filter((item) => item.priority === priority);
}

/**
 * Filters unified work items by completion status.
 */
export function filterUnifiedWorkItemsByCompletion(
  items: UnifiedWorkItem[],
  isCompleted: boolean
): UnifiedWorkItem[] {
  return items.filter((item) => item.isCompleted === isCompleted);
}

// Helper functions

function getTodayStartEnd(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function isOverdue(dueAt: string, now: Date): boolean {
  const { start } = getTodayStartEnd(now);
  return new Date(dueAt) < start;
}

function isToday(dueAt: string, now: Date): boolean {
  const { start, end } = getTodayStartEnd(now);
  const date = new Date(dueAt);
  return date >= start && date <= end;
}

function getPriorityForTask(task: Task, now: Date): UnifiedWorkPriority {
  if (task.status === "done") return "context";
  if (!task.dueAt) return "context";
  if (isOverdue(task.dueAt, now)) return "overdue";
  if (isToday(task.dueAt, now)) return "today";
  return "upcoming";
}

function getPriorityForReminder(reminder: Reminder, now: Date): UnifiedWorkPriority {
  if (reminder.status === "done") return "context";
  if (isOverdue(reminder.dueAt, now)) return "overdue";
  if (isToday(reminder.dueAt, now)) return "today";
  return "upcoming";
}

function getPriorityForTeamTask(task: TeamProjectTask, now: Date): UnifiedWorkPriority {
  if (task.status === "done") return "context";
  if (!task.dueAt) return "context";
  if (isOverdue(task.dueAt, now)) return "overdue";
  if (isToday(task.dueAt, now)) return "today";
  return "upcoming";
}
