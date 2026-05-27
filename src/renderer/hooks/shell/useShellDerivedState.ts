import { useEffect, useRef, useState } from "react";
import type { DailyCommandCenter, DailyCommandCenterFilter, PlanTodayQueue } from "../../lib/derived/daily-command-center";
import type { EndOfDayReview } from "../../lib/derived/daily-command-center";
import type { Note, Reminder, Task, AutomationRule } from "../../../shared/types";
import type { AgendaItem } from "../workspace/useCalendarState";
import type { TeamProjectTask, TeamProject } from "../../../shared/team/types";
import type { BriefItem } from "../../types";
import {
  deriveDailyCommandCenter,
  derivePlanTodayQueue,
  deriveEndOfDayReview
} from "../../lib/derived/daily-command-center";
import { deriveFocusBrief } from "../../lib/derived/brief";
import { deriveAwayBrief } from "../../lib/derived/away-brief";
import { getLastSeenAt, setLastSeenAt } from "../../lib/last-seen";

export type ShellDerivedState = {
  dailyCommandCenter: DailyCommandCenter;
  planTodayQueue: PlanTodayQueue;
  endOfDayReview: EndOfDayReview;
  setDailyCommandCenterFilter: (f: DailyCommandCenterFilter) => void;
  markSeen: () => void;
};

export function useShellDerivedState(input: {
  overdueOpenTasks: Task[];
  dueTodayOpenTasks: Task[];
  pendingReminders: Reminder[];
  selectedDayAgenda: AgendaItem[];
  notes: Note[];
  tasks: Task[];
  reminders: Reminder[];
  rules: AutomationRule[];
  teamTasks: TeamProjectTask[];
  teamProjects: TeamProject[];
}): ShellDerivedState {
  const focusBriefRef = useRef<BriefItem[]>([]);

  const [dailyCommandCenter, setDailyCommandCenter] = useState<DailyCommandCenter>({
    nowItems: [],
    attentionItems: [],
    contextItems: [],
    awayItems: [],
    summary: "All clear - nothing needs attention right now.",
    pressure: { overdue: 0, dueToday: 0, upcoming: 0, context: 0 },
    filter: "all"
  });

  const [planTodayQueue, setPlanTodayQueue] = useState<PlanTodayQueue>({
    items: [],
    summary: "All clear - nothing needs planning today.",
    totalItems: 0
  });

  const [endOfDayReview, setEndOfDayReview] = useState<EndOfDayReview>({
    completedTasks: [],
    completedReminders: [],
    unfinishedTasks: [],
    unfinishedReminders: [],
    capturedNotes: [],
    summary: "No activity today.",
    totalCompleted: 0,
    totalUnfinished: 0,
    totalCaptured: 0
  });

  const setDailyCommandCenterFilter = (filter: DailyCommandCenterFilter) => {
    setDailyCommandCenter((prev) => ({ ...prev, filter }));
  };

  // Compute daily command center when data changes
  useEffect(() => {
    const lastSeenAt = getLastSeenAt();
    const focusBrief = deriveFocusBrief({
      overdueTasks: input.overdueOpenTasks,
      dueTodayTasks: input.dueTodayOpenTasks,
      undatedOpenTasks: input.tasks.filter((task) => task.status === "open" && !task.dueAt),
      upcomingReminders: input.pendingReminders,
      selectedDayAgenda: input.selectedDayAgenda
        .filter(
          (item): item is AgendaItem & { type: "reminder" } => item.type === "reminder"
        )
        .map((item) => ({
          id: item.id,
          text: item.text,
          dueAt: item.dueAt,
          recurrence: "none" as const,
          status: "pending" as const,
          notifyChannel: "desktop" as const
        })),
      pinnedNotes: input.notes.filter((note) => note.pinned),
      teamTasks: input.teamTasks.filter((t) => t.status === "open"),
      teamProjects: input.teamProjects,
      automationRules: input.rules
    });
    const awayBrief = deriveAwayBrief({
      tasks: input.tasks,
      reminders: input.reminders,
      notes: input.notes,
      lastSeenAt,
      now: new Date()
    });
    focusBriefRef.current = focusBrief;
    const dcc = deriveDailyCommandCenter({ focusBrief, awayBrief, filter: dailyCommandCenter.filter });
    setDailyCommandCenter(dcc);

    // Derive Plan Today queue for Personal OS
    // Convert raw data to BriefItem format
    const localTasks: BriefItem[] = input.tasks.map((task) => ({
      id: `local-task-${task.id}`,
      kind: "task",
      label: task.title,
      detail: task.dueAt ? new Date(task.dueAt).toLocaleString() : undefined,
      urgency: task.dueAt
        ? new Date(task.dueAt) < new Date(new Date().setHours(0, 0, 0, 0))
          ? "overdue"
          : "today"
        : "context",
      sourceId: task.id,
      dueAt: task.dueAt || undefined
    }));

    const localReminders: BriefItem[] = input.reminders.map((reminder) => ({
      id: `local-reminder-${reminder.id}`,
      kind: "reminder",
      label: reminder.text,
      detail: reminder.dueAt ? new Date(reminder.dueAt).toLocaleString() : undefined,
      urgency: reminder.dueAt
        ? new Date(reminder.dueAt) < new Date(new Date().setHours(0, 0, 0, 0))
          ? "overdue"
          : "today"
        : "context",
      sourceId: reminder.id,
      dueAt: reminder.dueAt || undefined
    }));

    const localNotes: BriefItem[] = input.notes.map((note) => ({
      id: `local-note-${note.id}`,
      kind: "note",
      label: note.title,
      detail: note.content ? note.content.substring(0, 50) : undefined,
      urgency: "context",
      sourceId: note.id
    }));

    const planToday = derivePlanTodayQueue({
      localTasks,
      localReminders,
      localNotes,
      now: new Date()
    });
    setPlanTodayQueue(planToday);

    const endOfDay = deriveEndOfDayReview({
      localTasks,
      localReminders,
      localNotes,
      now: new Date()
    });
    setEndOfDayReview(endOfDay);
  }, [
    input.overdueOpenTasks,
    input.dueTodayOpenTasks,
    input.pendingReminders,
    input.selectedDayAgenda,
    input.notes,
    input.rules,
    input.reminders,
    input.tasks,
    input.teamTasks,
    input.teamProjects,
    dailyCommandCenter.filter
  ]);

  const markSeen = () => {
    setLastSeenAt(new Date().toISOString());
    setDailyCommandCenter(
      deriveDailyCommandCenter({
        focusBrief: focusBriefRef.current,
        awayBrief: [],
        filter: dailyCommandCenter.filter
      })
    );
  };

  return {
    dailyCommandCenter,
    planTodayQueue,
    endOfDayReview,
    setDailyCommandCenterFilter,
    markSeen
  };
}
