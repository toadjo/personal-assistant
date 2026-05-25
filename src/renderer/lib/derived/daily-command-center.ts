import type { BriefItem, AwayBriefItem } from "../../types";

export type DailyCommandCenterAction = "complete-task" | "complete-reminder" | "snooze-reminder";

export type DailyCommandCenterFilter = "all" | "personal" | "team" | "household";

export type DailyCommandCenterNowItem = BriefItem & {
  action: DailyCommandCenterAction;
};

export type DailyCommandCenter = {
  nowItems: DailyCommandCenterNowItem[];
  attentionItems: BriefItem[];
  contextItems: BriefItem[];
  awayItems: AwayBriefItem[];
  summary: string;
  pressure: {
    overdue: number;
    dueToday: number;
    upcoming: number;
    context: number;
  };
  filter: DailyCommandCenterFilter;
};

/**
 * Plan Today queue item for v2.3.0 workflow improvement.
 */
export type PlanTodayItem = BriefItem & {
  source: "local-task" | "local-reminder" | "local-note";
  queueReason: "overdue" | "due-today" | "unsorted";
  queuePriority: number; // Lower number = higher priority
  id: string; // Unique identifier for the queue item
};

export type PlanTodayQueue = {
  items: PlanTodayItem[];
  summary: string;
  totalItems: number;
};

/**
 * End-of-Day Review item for v2.6.0 workflow.
 */
export type EndOfDayReviewItem = BriefItem & {
  source: "local-task" | "local-reminder" | "local-note";
  reviewCategory: "completed-task" | "completed-reminder" | "unfinished-task" | "unfinished-reminder" | "captured-note";
  id: string; // Unique identifier for the review item
};

export type EndOfDayReview = {
  completedTasks: EndOfDayReviewItem[];
  completedReminders: EndOfDayReviewItem[];
  unfinishedTasks: EndOfDayReviewItem[];
  unfinishedReminders: EndOfDayReviewItem[];
  capturedNotes: EndOfDayReviewItem[];
  summary: string;
  totalCompleted: number;
  totalUnfinished: number;
  totalCaptured: number;
};

/**
 * Derives the End-of-Day Review from local tasks, reminders, and notes.
 * 
 * The review shows:
 * - Tasks completed today (status === "done" and lastCompletedAt is today)
 * - Reminders completed today (status === "done" and updatedAt is today)
 * - Unfinished overdue or today tasks (status !== "done" and dueAt is overdue or today)
 * - Unfinished overdue or today reminders (status !== "done" and dueAt is overdue or today)
 * - Notes captured today (createdAt is today)
 */
export function deriveEndOfDayReview(params: {
  localTasks: BriefItem[];
  localReminders: BriefItem[];
  localNotes: BriefItem[];
  now?: Date;
}): EndOfDayReview {
  const now = params.now || new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const completedTasks: EndOfDayReviewItem[] = [];
  const completedReminders: EndOfDayReviewItem[] = [];
  const unfinishedTasks: EndOfDayReviewItem[] = [];
  const unfinishedReminders: EndOfDayReviewItem[] = [];
  const capturedNotes: EndOfDayReviewItem[] = [];

  // Find tasks completed today
  for (const task of params.localTasks) {
    if (task.kind === "task" && task.lastCompletedAt) {
      const completedDate = new Date(task.lastCompletedAt);
      if (completedDate >= todayStart && completedDate <= todayEnd) {
        completedTasks.push({
          ...task,
          source: "local-task",
          reviewCategory: "completed-task",
          id: `local-task-${task.sourceId}`
        });
      }
    }
  }

  // Find reminders completed today (using updatedAt as proxy since reminders don't have lastCompletedAt)
  for (const reminder of params.localReminders) {
    if (reminder.kind === "reminder" && reminder.dueAt) {
      const completedDate = new Date(reminder.dueAt);
      if (completedDate >= todayStart && completedDate <= todayEnd) {
        completedReminders.push({
          ...reminder,
          source: "local-reminder",
          reviewCategory: "completed-reminder",
          id: `local-reminder-${reminder.sourceId}`
        });
      }
    }
  }

  // Find unfinished overdue or today tasks
  for (const task of params.localTasks) {
    if (task.kind === "task" && task.dueAt) {
      const dueDate = new Date(task.dueAt);
      if (dueDate <= todayEnd) {
        // Assume task is unfinished if it's not in completed tasks
        const isCompleted = completedTasks.some(ct => ct.sourceId === task.sourceId);
        if (!isCompleted) {
          unfinishedTasks.push({
            ...task,
            source: "local-task",
            reviewCategory: "unfinished-task",
            id: `local-task-${task.sourceId}`
          });
        }
      }
    }
  }

  // Find unfinished overdue or today reminders
  for (const reminder of params.localReminders) {
    if (reminder.kind === "reminder" && reminder.dueAt) {
      const dueDate = new Date(reminder.dueAt);
      if (dueDate <= todayEnd) {
        // Assume reminder is unfinished if it's not in completed reminders
        const isCompleted = completedReminders.some(cr => cr.sourceId === reminder.sourceId);
        if (!isCompleted) {
          unfinishedReminders.push({
            ...reminder,
            source: "local-reminder",
            reviewCategory: "unfinished-reminder",
            id: `local-reminder-${reminder.sourceId}`
          });
        }
      }
    }
  }

  // Find notes captured today (using dueAt as proxy for createdAt since BriefItem doesn't have it)
  for (const note of params.localNotes) {
    if (note.kind === "note" && note.dueAt) {
      const createdDate = new Date(note.dueAt);
      if (createdDate >= todayStart && createdDate <= todayEnd) {
        capturedNotes.push({
          ...note,
          source: "local-note",
          reviewCategory: "captured-note",
          id: `local-note-${note.sourceId}`
        });
      }
    }
  }

  // Sort each category by due date (if available) or label
  const sortItems = (items: EndOfDayReviewItem[]) => {
    return items.sort((a, b) => {
      if (a.dueAt && b.dueAt) {
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }
      return a.label.localeCompare(b.label);
    });
  };

  const totalCompleted = completedTasks.length + completedReminders.length;
  const totalUnfinished = unfinishedTasks.length + unfinishedReminders.length;
  const totalCaptured = capturedNotes.length;
  const summary = buildEndOfDaySummary(totalCompleted, totalUnfinished, totalCaptured);

  return {
    completedTasks: sortItems(completedTasks),
    completedReminders: sortItems(completedReminders),
    unfinishedTasks: sortItems(unfinishedTasks),
    unfinishedReminders: sortItems(unfinishedReminders),
    capturedNotes: sortItems(capturedNotes),
    summary,
    totalCompleted,
    totalUnfinished,
    totalCaptured
  };
}

function buildEndOfDaySummary(completed: number, unfinished: number, captured: number): string {
  const parts: string[] = [];
  
  if (completed > 0) parts.push(`${completed} completed`);
  if (unfinished > 0) parts.push(`${unfinished} unfinished`);
  if (captured > 0) parts.push(`${captured} captured`);
  
  if (parts.length === 0) {
    return "No activity today.";
  }
  
  return `Day review: ${parts.join(", ")}.`;
}

/**
 * Derives the Plan Today queue from local tasks, reminders, and notes.
 * 
 * The queue prioritizes:
 * 1. Overdue tasks (priority 0)
 * 2. Due today reminders (priority 1) 
 * 3. Overdue reminders (priority 2)
 * 4. Due today tasks (priority 3)
 * 5. Unsorted notes (priority 4)
 */
export function derivePlanTodayQueue(params: {
  localTasks: BriefItem[];
  localReminders: BriefItem[];
  localNotes: BriefItem[];
  now?: Date;
}): PlanTodayQueue {
  const now = params.now || new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const items: PlanTodayItem[] = [];

  // Overdue tasks (highest priority)
  for (const task of params.localTasks) {
    if (task.kind === "task" && task.dueAt && new Date(task.dueAt) < todayStart) {
      items.push({
        ...task,
        source: "local-task",
        queueReason: "overdue",
        queuePriority: 0,
        id: `local-task-${task.sourceId}`
      });
    }
  }

  // Due today reminders
  for (const reminder of params.localReminders) {
    if (reminder.kind === "reminder" && reminder.dueAt) {
      const dueDate = new Date(reminder.dueAt);
      if (dueDate >= todayStart && dueDate <= todayEnd) {
        items.push({
          ...reminder,
          source: "local-reminder",
          queueReason: "due-today",
          queuePriority: 1,
          id: `local-reminder-${reminder.sourceId}`
        });
      }
    }
  }

  // Overdue reminders
  for (const reminder of params.localReminders) {
    if (reminder.kind === "reminder" && reminder.dueAt && new Date(reminder.dueAt) < todayStart) {
      items.push({
        ...reminder,
        source: "local-reminder",
        queueReason: "overdue",
        queuePriority: 2,
        id: `local-reminder-${reminder.sourceId}`
      });
    }
  }

  // Due today tasks
  for (const task of params.localTasks) {
    if (task.kind === "task" && task.dueAt) {
      const dueDate = new Date(task.dueAt);
      if (dueDate >= todayStart && dueDate <= todayEnd) {
        items.push({
          ...task,
          source: "local-task",
          queueReason: "due-today",
          queuePriority: 3,
          id: `local-task-${task.sourceId}`
        });
      }
    }
  }

  // Unsorted notes (notes without due dates or priorities)
  for (const note of params.localNotes) {
    if (note.kind === "note") {
      items.push({
        ...note,
        source: "local-note",
        queueReason: "unsorted",
        queuePriority: 4,
        id: `local-note-${note.sourceId}`
      });
    }
  }

  // Sort by queue priority, then by due date (if available)
  const sortedItems = items.sort((a, b) => {
    if (a.queuePriority !== b.queuePriority) {
      return a.queuePriority - b.queuePriority;
    }
    
    // Secondary sort by due date for items with due dates
    if (a.dueAt && b.dueAt) {
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    
    // Tertiary sort by label
    return a.label.localeCompare(b.label);
  });

  const totalItems = sortedItems.length;
  const summary = buildPlanTodaySummary(sortedItems);

  return {
    items: sortedItems,
    summary,
    totalItems
  };
}

function buildPlanTodaySummary(items: PlanTodayItem[]): string {
  if (items.length === 0) {
    return "All clear - nothing needs planning today.";
  }

  const overdueCount = items.filter(item => item.queueReason === "overdue").length;
  const dueTodayCount = items.filter(item => item.queueReason === "due-today").length;
  const unsortedCount = items.filter(item => item.queueReason === "unsorted").length;

  const parts: string[] = [];
  if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
  if (dueTodayCount > 0) parts.push(`${dueTodayCount} due today`);
  if (unsortedCount > 0) parts.push(`${unsortedCount} unsorted`);

  return `Plan Today: ${parts.join(", ")}.`;
}

function getActionForItem(item: BriefItem): DailyCommandCenterAction {
  if (item.kind === "task" || item.kind === "team-task") return "complete-task";
  return "complete-reminder";
}

function filterBySource(items: BriefItem[], filter: DailyCommandCenterFilter): BriefItem[] {
  if (filter === "all") return items;

  return items.filter((item) => {
    if (filter === "personal") {
      return item.kind === "task" || item.kind === "reminder" || item.kind === "note";
    }
    if (filter === "team") {
      return item.kind === "team-task";
    }
    if (filter === "household") {
      return item.kind === "automation";
    }
    return true;
  });
}

export function deriveDailyCommandCenter(params: {
  focusBrief: BriefItem[];
  awayBrief: AwayBriefItem[];
  filter?: DailyCommandCenterFilter;
}): DailyCommandCenter {
  const filter = params.filter || "all";
  const focusBrief = filterBySource(params.focusBrief, filter);
  const awayBrief = params.awayBrief;

  const urgencyOrder: Record<BriefItem["urgency"], number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
    context: 3
  };

  const sortedFocusBrief = [...focusBrief].sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || a.label.localeCompare(b.label)
  );

  const attentionItems = sortedFocusBrief.filter((item) => item.urgency === "overdue" || item.urgency === "today");

  const contextItems = sortedFocusBrief.filter((item) => item.urgency === "upcoming" || item.urgency === "context");

  const nowItems: DailyCommandCenterNowItem[] = attentionItems
    .slice(0, 3)
    .map((item) => ({ ...item, action: getActionForItem(item) }));

  const nowSourceIds = new Set(nowItems.map((item) => item.sourceId));
  const dedupedAttentionItems = attentionItems.filter((item) => !nowSourceIds.has(item.sourceId));

  const summary = buildSummary(dedupedAttentionItems, contextItems, awayBrief, filter);

  const pressure = {
    overdue: focusBrief.filter((item) => item.urgency === "overdue").length,
    dueToday: focusBrief.filter((item) => item.urgency === "today").length,
    upcoming: focusBrief.filter((item) => item.urgency === "upcoming").length,
    context: focusBrief.filter((item) => item.urgency === "context").length
  };

  return {
    nowItems,
    attentionItems: dedupedAttentionItems,
    contextItems,
    awayItems: awayBrief,
    summary,
    pressure,
    filter
  };
}

function buildSummary(
  attentionItems: BriefItem[],
  contextItems: BriefItem[],
  awayItems: AwayBriefItem[],
  filter: DailyCommandCenterFilter
): string {
  const overdueCount = attentionItems.filter((item) => item.urgency === "overdue").length;
  const dueTodayCount = attentionItems.filter((item) => item.urgency === "today").length;
  const contextCount = contextItems.length;
  const awayCount = awayItems.length;

  const parts: string[] = [];

  if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
  if (dueTodayCount > 0) parts.push(`${dueTodayCount} due today`);
  if (awayCount > 0) parts.push(`${awayCount} since you were away`);
  if (contextCount > 0) parts.push(`${contextCount} context`);

  if (parts.length === 0) {
    if (filter === "all") return "All clear - nothing needs attention right now.";
    if (filter === "personal") return "Personal: All clear.";
    if (filter === "team") return "Team: All clear.";
    if (filter === "household") return "Household: All clear.";
    return "All clear.";
  }

  const prefix = filter === "all" ? "Now" : filter.charAt(0).toUpperCase() + filter.slice(1);
  return `${prefix}: ${parts.join(", ")}.`;
}

export function getDailyCommandCenterPressureLabel(pressure: DailyCommandCenter["pressure"]): string {
  const parts: string[] = [];
  if (pressure.overdue > 0) parts.push(`${pressure.overdue} overdue`);
  if (pressure.dueToday > 0) parts.push(`${pressure.dueToday} due today`);
  if (pressure.upcoming > 0) parts.push(`${pressure.upcoming} upcoming`);
  if (pressure.context > 0) parts.push(`${pressure.context} context`);

  if (parts.length === 0) return "Nothing on your plate.";
  return parts.join(" / ");
}
