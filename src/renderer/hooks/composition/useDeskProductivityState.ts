/**
 * Productivity state composition hook.
 *
 * Ownership:
 * - Reminder filtering and derived views (pending, overdue, visible)
 * - Calendar state and agenda views
 * - Note actions (delete, update)
 * - Automation rule actions (delete, set enabled)
 * - Profile settings (user preferred name)
 * - Inbox state (unified work items)
 *
 * Dependencies:
 * - Data slices: notes, reminders, rules from useDeskDataState
 * - Feedback callbacks: setStatus, setError for UI feedback
 * - Refresh callbacks: refreshAll, fetchNotesOnly, fetchRemindersOnly for data sync
 * - Data helpers: mergeNote, removeNoteById for optimistic updates
 *
 * This hook receives data slices and feedback callbacks explicitly instead of
 * reaching across the whole workspace. It does not depend on command or
 * onboarding state.
 */
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { Note, Reminder, AutomationRule, Task } from "../../../shared/types";
import type { TeamProjectTask } from "../../../shared/team/types";
import type { TeamProject } from "../../../shared/team/types";
import type { ReminderFilter, TaskFilter } from "../../types";
import type { CalendarCell } from "../../lib/calendar";
import {
  overduePending,
  pendingReminders as remindersPending,
  visibleReminders as remindersVisible
} from "../../lib/derived/reminders";
import { useCalendarState } from "../workspace/useCalendarState";
import type { AgendaItem, AgendaFilter } from "../workspace/useCalendarState";
import { useNoteActions } from "../workspace/useNoteActions";
import { useAutomationRuleActions } from "../workspace/useAutomationRuleActions";
import { useReminderActions } from "../workspace/useReminderActions";
import { useTaskActions } from "../workspace/useTaskActions";
import { useUserProfileSettings } from "../workspace/useUserProfileSettings";
import { useInboxState } from "../workspace/useInboxState";

export type DeskProductivityState = {
  calendar: {
    calendarCursor: Date;
    setCalendarCursor: Dispatch<SetStateAction<Date>>;
    monthCells: CalendarCell[];
    todayKey: string;
    calendarSelectedKey: string;
    setCalendarSelectedKey: Dispatch<SetStateAction<string>>;
    agendaFilter: AgendaFilter;
    setAgendaFilter: Dispatch<SetStateAction<AgendaFilter>>;
    selectedDayAgenda: AgendaItem[];
  };
  reminders: {
    filter: ReminderFilter;
    setFilter: Dispatch<SetStateAction<ReminderFilter>>;
    pending: Reminder[];
    overdue: Reminder[];
    visible: Reminder[];
    snoozeMinutes: (id: string, minutes: number, okMessage: string) => Promise<void>;
    completeById: (id: string) => Promise<void>;
    deleteById: (id: string) => Promise<void>;
    updateById: (id: string, text?: string, dueAt?: string) => Promise<void>;
  };
  tasks: {
    filter: TaskFilter;
    setFilter: Dispatch<SetStateAction<TaskFilter>>;
    visible: Task[];
    overdueOpen: Task[];
    dueTodayOpen: Task[];
    completeById: (id: string) => Promise<void>;
    deleteById: (id: string) => Promise<void>;
    saveTask: (payload: {
      id?: string;
      title: string;
      notes: string;
      dueAt: string | null;
      priority: "low" | "normal" | "high";
      recurrence: "none" | "daily" | "weekly" | "monthly";
    }) => Promise<void>;
    bulkComplete: (ids: string[]) => Promise<void>;
    updateDetailsById: (id: string, title: string, notes: string) => Promise<void>;
    updatePriority: (id: string, priority: "low" | "normal" | "high") => Promise<void>;
    undo: () => Promise<void>;
    canUndo: boolean;
  };
  automation: {
    deleteRuleById: (id: string, name: string) => Promise<void>;
    setRuleEnabledById: (id: string, enabled: boolean) => Promise<void>;
    duplicateRuleById: (id: string) => Promise<void>;
    testRunRuleById: (id: string) => Promise<void>;
  };
  memos: {
    deleteNote: (id: string, title: string) => Promise<void>;
    updateNote: (payload: {
      id: string;
      title?: string;
      content?: string;
      tags?: string[];
      pinned?: boolean;
    }) => Promise<void>;
  };
  profile: {
    userPreferredName: string;
    userPreferredNameIsSet: boolean;
    persistUserPreferredName: (name: string) => Promise<void>;
  };
  inbox: {
    unifiedItems: import("../../lib/derived/unified-work").UnifiedWorkItem[];
    needsSorting: import("../../lib/derived/unified-work").UnifiedWorkItem[];
    createQuickNote: (title: string, content: string) => Promise<void>;
    createQuickTask: (title: string, notes: string) => Promise<void>;
    createQuickReminder: (text: string) => Promise<void>;
    convertNoteToTask: (noteId: string) => Promise<void>;
    convertNoteToReminder: (noteId: string) => Promise<void>;
    sendTaskToTeam: (taskId: string, projectId: string) => Promise<void>;
  };
};

export function useDeskProductivityState(args: {
  notes: Note[];
  reminders: Reminder[];
  tasks: Task[];
  rules: AutomationRule[];
  setStatus: (value: string) => void;
  setError: (value: string) => void;
  refreshAll: () => Promise<void>;
  refreshNotes: () => Promise<void>;
  refreshReminders: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  refreshRules: () => Promise<void>;
  mergeNote: (note: Note) => void;
  removeNoteById: (id: string) => void;
  teamTasks?: TeamProjectTask[];
  teamProjects?: TeamProject[];
  mergeTask?: (task: Task) => void;
  mergeReminder?: (reminder: Reminder) => void;
  mergeTeamTask?: (task: TeamProjectTask) => void;
  refreshTeamTasks?: () => Promise<void>;
}): DeskProductivityState {
  const {
    reminders,
    tasks,
    notes,
    setStatus,
    setError,
    refreshAll: _refreshAll,
    refreshNotes,
    refreshReminders,
    refreshTasks,
    refreshDevices: _refreshDevices,
    refreshLogs,
    refreshRules,
    mergeNote,
    removeNoteById,
    teamTasks = [],
    teamProjects = [],
    mergeTask,
    mergeReminder,
    mergeTeamTask,
    refreshTeamTasks
  } = args;

  const [reminderFilter, setReminderFilterState] = useState<ReminderFilter>("all");

  const calendar = useCalendarState(reminders, tasks, notes);
  const { deleteNote, updateNote } = useNoteActions(setStatus, setError, {
    mergeNote,
    removeNoteById,
    refreshNotes
  });
  const { deleteRuleById, setRuleEnabledById, duplicateRuleById, testRunRuleById } = useAutomationRuleActions(
    refreshRules,
    refreshLogs,
    setStatus,
    setError
  );
  const { snoozeReminderMinutes, completeReminderById, deleteReminderById, updateReminderById } = useReminderActions(
    setStatus,
    setError,
    refreshReminders
  );
  const taskActions = useTaskActions(tasks, setStatus, setError, refreshTasks);
  const profile = useUserProfileSettings(setError, setStatus);

  const inbox = useInboxState(setStatus, setError, {
    notes: args.notes,
    tasks,
    reminders,
    teamTasks,
    teamProjects,
    mergeNote,
    mergeTask: mergeTask || (() => {}),
    mergeReminder: mergeReminder || (() => {}),
    mergeTeamTask: mergeTeamTask || (() => {}),
    refreshNotes,
    refreshTasks,
    refreshReminders,
    refreshTeamTasks: refreshTeamTasks || (async () => {})
  });

  const pendingList = useMemo(() => remindersPending(reminders), [reminders]);
  const overdueReminders = useMemo(() => overduePending(pendingList), [pendingList]);
  const visibleReminders = useMemo(() => remindersVisible(reminders, reminderFilter), [reminders, reminderFilter]);

  return {
    calendar: {
      calendarCursor: calendar.calendarCursor,
      setCalendarCursor: calendar.setCalendarCursor,
      monthCells: calendar.monthCells,
      todayKey: calendar.todayKey,
      calendarSelectedKey: calendar.calendarSelectedKey,
      setCalendarSelectedKey: calendar.setCalendarSelectedKey,
      agendaFilter: calendar.agendaFilter,
      setAgendaFilter: calendar.setAgendaFilter,
      selectedDayAgenda: calendar.selectedDayAgenda
    },
    reminders: {
      filter: reminderFilter,
      setFilter: setReminderFilterState,
      pending: pendingList,
      overdue: overdueReminders,
      visible: visibleReminders,
      snoozeMinutes: snoozeReminderMinutes,
      completeById: completeReminderById,
      deleteById: deleteReminderById,
      updateById: updateReminderById
    },
    tasks: {
      filter: taskActions.taskFilter,
      setFilter: taskActions.setTaskFilter,
      visible: taskActions.visible,
      overdueOpen: taskActions.overdueOpen,
      dueTodayOpen: taskActions.dueTodayOpen,
      completeById: taskActions.completeById,
      deleteById: taskActions.deleteById,
      saveTask: taskActions.saveTask,
      bulkComplete: taskActions.bulkComplete,
      updateDetailsById: taskActions.updateDetailsById,
      updatePriority: taskActions.updatePriority,
      undo: taskActions.undo,
      canUndo: taskActions.canUndo
    },
    automation: {
      deleteRuleById,
      setRuleEnabledById,
      duplicateRuleById,
      testRunRuleById
    },
    memos: {
      deleteNote,
      updateNote
    },
    profile: {
      userPreferredName: profile.userPreferredName,
      userPreferredNameIsSet: profile.userPreferredNameIsSet,
      persistUserPreferredName: profile.persistUserPreferredName
    },
    inbox: {
      unifiedItems: inbox.unifiedItems,
      needsSorting: inbox.needsSorting,
      createQuickNote: inbox.createQuickNote,
      createQuickTask: inbox.createQuickTask,
      createQuickReminder: inbox.createQuickReminder,
      convertNoteToTask: inbox.convertNoteToTask,
      convertNoteToReminder: inbox.convertNoteToReminder,
      sendTaskToTeam: inbox.sendTaskToTeam
    }
  };
}
