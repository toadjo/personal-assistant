import type { Note, Reminder, Task } from "../../../shared/types";
import type { AwayBriefItem, AwayBriefReason } from "../../types";

function getTodayStartEnd(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function parseDateSafe(isoString: string): Date | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return null;
  return date;
}

function isOverdue(dueAt: string, now: Date): boolean {
  const dueDate = parseDateSafe(dueAt);
  if (!dueDate) return false;
  const { start } = getTodayStartEnd(now);
  return dueDate < start;
}

function isToday(dueAt: string, now: Date): boolean {
  const dueDate = parseDateSafe(dueAt);
  if (!dueDate) return false;
  const { start, end } = getTodayStartEnd(now);
  return dueDate >= start && dueDate <= end;
}

function getLatestChangeTimestamp(item: Task | Reminder | Note): string {
  if ("updatedAt" in item && typeof item.updatedAt === "string") {
    const date = parseDateSafe(item.updatedAt);
    if (date) return item.updatedAt;
  }
  if ("createdAt" in item && typeof item.createdAt === "string") {
    const date = parseDateSafe(item.createdAt);
    if (date) return item.createdAt;
  }
  return new Date().toISOString();
}

function getTaskReason(task: Task, lastSeenAt: string | null, now: Date): AwayBriefReason | null {
  if (task.status === "done") return null;
  
  const isCurrentlyOverdue = task.dueAt && isOverdue(task.dueAt, now);
  const isCurrentlyDue = task.dueAt && isToday(task.dueAt, now);
  const createdAt = parseDateSafe(task.createdAt);
  const updatedAt = parseDateSafe(task.updatedAt);
  const lastSeen = lastSeenAt ? parseDateSafe(lastSeenAt) : null;

  if (!createdAt || !updatedAt) return null;

  if (isCurrentlyOverdue) return "overdue";
  if (isCurrentlyDue && lastSeen && updatedAt > lastSeen) return "due";
  if (lastSeen && createdAt > lastSeen) return "new";
  if (lastSeen && updatedAt > lastSeen) return "updated";

  return null;
}

function getReminderReason(reminder: Reminder, lastSeenAt: string | null, now: Date): AwayBriefReason | null {
  if (reminder.status === "done") return null;
  
  const isCurrentlyOverdue = isOverdue(reminder.dueAt, now);
  const isCurrentlyDue = isToday(reminder.dueAt, now);
  const lastSeen = lastSeenAt ? parseDateSafe(lastSeenAt) : null;

  if (isCurrentlyOverdue) return "overdue";
  if (isCurrentlyDue && lastSeen) return "due";

  return null;
}

function getNoteReason(note: Note, lastSeenAt: string | null): AwayBriefReason | null {
  const createdAt = parseDateSafe(note.createdAt);
  const updatedAt = parseDateSafe(note.updatedAt);
  const lastSeen = lastSeenAt ? parseDateSafe(lastSeenAt) : null;

  if (!createdAt || !updatedAt) return null;

  if (lastSeen && createdAt > lastSeen) return "new";
  if (lastSeen && updatedAt > lastSeen) return "updated";

  return null;
}

function getReasonPriority(reason: AwayBriefReason): number {
  const priority: Record<AwayBriefReason, number> = {
    overdue: 0,
    due: 1,
    new: 2,
    updated: 3
  };
  return priority[reason];
}

export function deriveAwayBrief(params: {
  tasks: Task[];
  reminders: Reminder[];
  notes: Note[];
  lastSeenAt: string | null;
  now?: Date;
}): AwayBriefItem[] {
  const now = params.now || new Date();
  const items: AwayBriefItem[] = [];

  for (const task of params.tasks) {
    const reason = getTaskReason(task, params.lastSeenAt, now);
    if (reason) {
      const changedAt = getLatestChangeTimestamp(task);
      const dueDate = task.dueAt ? parseDateSafe(task.dueAt) : null;
      items.push({
        kind: "task",
        reason,
        label: task.title,
        detail: dueDate ? dueDate.toLocaleString() : undefined,
        sourceId: task.id,
        changedAt
      });
    }
  }

  for (const reminder of params.reminders) {
    const reason = getReminderReason(reminder, params.lastSeenAt, now);
    if (reason) {
      const changedAt = reminder.dueAt;
      const dueDate = parseDateSafe(reminder.dueAt);
      items.push({
        kind: "reminder",
        reason,
        label: reminder.text,
        detail: dueDate ? dueDate.toLocaleString() : "Unknown time",
        sourceId: reminder.id,
        changedAt
      });
    }
  }

  for (const note of params.notes) {
    const reason = getNoteReason(note, params.lastSeenAt);
    if (reason) {
      const changedAt = getLatestChangeTimestamp(note);
      items.push({
        kind: "note",
        reason,
        label: note.title,
        detail: note.content ? note.content.slice(0, 100) : undefined,
        sourceId: note.id,
        changedAt
      });
    }
  }

  // Sort by reason priority, then by changedAt (newest first)
  items.sort((a, b) => {
    const reasonDiff = getReasonPriority(a.reason) - getReasonPriority(b.reason);
    if (reasonDiff !== 0) return reasonDiff;
    const aDate = parseDateSafe(a.changedAt);
    const bDate = parseDateSafe(b.changedAt);
    if (!aDate || !bDate) return 0;
    return bDate.getTime() - aDate.getTime();
  });

  return items;
}

export function getAwayBriefSummary(items: AwayBriefItem[]): string {
  if (items.length === 0) return "Nothing changed since you last checked.";

  const overdueCount = items.filter((item) => item.reason === "overdue").length;
  const dueCount = items.filter((item) => item.reason === "due").length;
  const newCount = items.filter((item) => item.reason === "new").length;
  const updatedCount = items.filter((item) => item.reason === "updated").length;

  const parts: string[] = [];
  if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
  if (dueCount > 0) parts.push(`${dueCount} due`);
  if (newCount > 0) parts.push(`${newCount} new`);
  if (updatedCount > 0) parts.push(`${updatedCount} updated`);

  return `Since you were away: ${parts.join(", ")}.`;
}
