import type { Note, Reminder, Task } from "../../../shared/types";
import type { BriefItem, BriefItemUrgency } from "../../types";
import type { TeamProjectTask, TeamProject } from "../../../shared/team/types";

function getTodayStartEnd(now: Date = new Date()): { start: Date; end: Date } {
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

function getUrgencyForReminder(reminder: Reminder, now: Date): BriefItemUrgency {
  if (reminder.status === "done") return "context";
  if (isOverdue(reminder.dueAt, now)) return "overdue";
  if (isToday(reminder.dueAt, now)) return "today";
  return "upcoming";
}

function getUrgencyForTask(task: Task, now: Date): BriefItemUrgency {
  if (!task.dueAt) return "context";
  if (isOverdue(task.dueAt, now)) return "overdue";
  if (isToday(task.dueAt, now)) return "today";
  return "upcoming";
}

function getUrgencyForTeamTask(teamTask: TeamProjectTask, now: Date): BriefItemUrgency {
  if (teamTask.status === "done") return "context";
  if (!teamTask.dueAt) return "context";
  if (isOverdue(teamTask.dueAt, now)) return "overdue";
  if (isToday(teamTask.dueAt, now)) return "today";
  return "upcoming";
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString();
}

export function deriveFocusBrief(params: {
  overdueTasks: Task[];
  dueTodayTasks: Task[];
  upcomingReminders: Reminder[];
  selectedDayAgenda: Reminder[];
  pinnedNotes: Note[];
  teamTasks?: TeamProjectTask[];
  teamProjects?: TeamProject[];
  now?: Date;
}): BriefItem[] {
  const now = params.now || new Date();
  const items: BriefItem[] = [];
  const seenSourceIds = new Set<string>();
  const teamTasks = params.teamTasks || [];
  const teamProjects = params.teamProjects || [];

  // Helper to create source-aware dedupe key
  const getDedupeKey = (kind: string, sourceId: string): string => `${kind}:${sourceId}`;

  // Overdue tasks (highest priority)
  for (const task of params.overdueTasks) {
    const key = getDedupeKey("task", task.id);
    if (seenSourceIds.has(key)) continue;
    seenSourceIds.add(key);
    items.push({
      kind: "task",
      label: task.title,
      detail: task.dueAt ? formatDateTime(task.dueAt) : undefined,
      urgency: getUrgencyForTask(task, now),
      sourceId: task.id
    });
  }

  // Due today tasks
  for (const task of params.dueTodayTasks) {
    const key = getDedupeKey("task", task.id);
    if (seenSourceIds.has(key)) continue;
    seenSourceIds.add(key);
    items.push({
      kind: "task",
      label: task.title,
      detail: task.dueAt ? formatDateTime(task.dueAt) : undefined,
      urgency: getUrgencyForTask(task, now),
      sourceId: task.id
    });
  }

  // Open team tasks (integrated with local tasks by urgency)
  for (const teamTask of teamTasks) {
    if (teamTask.status === "done") continue;
    const key = getDedupeKey("team-task", teamTask.id);
    if (seenSourceIds.has(key)) continue;
    seenSourceIds.add(key);
    
    const project = teamProjects.find(p => p.id === teamTask.projectId);
    const urgency = getUrgencyForTeamTask(teamTask, now);
    
    const detailParts: string[] = [];
    if (teamTask.dueAt) {
      detailParts.push(formatDateTime(teamTask.dueAt));
    }
    if (project?.name) {
      detailParts.push(project.name);
    }
    if (teamTask.assigneeDisplayName) {
      detailParts.push(teamTask.assigneeDisplayName);
    }
    
    items.push({
      kind: "team-task",
      label: teamTask.title,
      detail: detailParts.length > 0 ? detailParts.join(" | ") : undefined,
      urgency,
      sourceId: teamTask.id
    });
  }

  // Upcoming reminders
  for (const reminder of params.upcomingReminders) {
    if (reminder.status === "pending") {
      const key = getDedupeKey("reminder", reminder.id);
      if (seenSourceIds.has(key)) continue;
      seenSourceIds.add(key);
      items.push({
        kind: "reminder",
        label: reminder.text,
        detail: formatDateTime(reminder.dueAt),
        urgency: getUrgencyForReminder(reminder, now),
        sourceId: reminder.id
      });
    }
  }

  // Selected day agenda
  for (const reminder of params.selectedDayAgenda) {
    const key = getDedupeKey("agenda", reminder.id);
    if (seenSourceIds.has(key)) continue;
    seenSourceIds.add(key);
    items.push({
      kind: "agenda",
      label: reminder.text,
      detail: formatDateTime(reminder.dueAt),
      urgency: "today",
      sourceId: reminder.id
    });
  }

  // Pinned notes (context, lowest priority)
  for (const note of params.pinnedNotes) {
    const key = getDedupeKey("note", note.id);
    if (seenSourceIds.has(key)) continue;
    seenSourceIds.add(key);
    items.push({
      kind: "note",
      label: note.title,
      detail: note.content ? note.content.slice(0, 100) : undefined,
      urgency: "context",
      sourceId: note.id
    });
  }

  // Sort by urgency priority: overdue > today > upcoming > context
  const urgencyOrder: Record<BriefItemUrgency, number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
    context: 3
  };

  items.sort((a, b) => {
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    return a.label.localeCompare(b.label);
  });

  return items;
}

export function getBriefSummary(items: BriefItem[]): string {
  const overdueCount = items.filter((item) => item.urgency === "overdue").length;
  const todayCount = items.filter((item) => item.urgency === "today").length;
  const contextCount = items.filter((item) => item.urgency === "context").length;

  const parts: string[] = [];
  if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
  if (todayCount > 0) parts.push(`${todayCount} due today`);
  if (contextCount > 0) parts.push(`${contextCount} context items`);

  if (parts.length === 0) return "All clear - no urgent items.";
  return `Focus: ${parts.join(", ")}.`;
}
