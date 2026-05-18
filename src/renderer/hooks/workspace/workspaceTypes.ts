import type { Dispatch, RefObject, SetStateAction } from "react";
import type { AutomationRule, Note, Reminder, Task } from "../../../shared/types";
import type { ReminderFilter, TaskFilter, ExecutionLogRow, HaDeviceRow } from "../../types";
import type { ThemeMode, ThemeTokenKey, CustomTheme } from "../../lib/theme/tokens";
import type { Density, PanelRadius, DisplayPreferences } from "../../lib/display/types";
import type { CalendarCell } from "../../lib/calendar";
import type { AgendaItem, AgendaFilter } from "../workspace/useCalendarState";
import type { OnboardingState, OnboardingStep } from "../../types/onboarding";
import type { SuccessMessage } from "../ui/usePersistentSuccess";
import type { DailyCommandCenterFilter } from "../../lib/derived/daily-command-center";
import type { UnifiedWorkItem } from "../../lib/derived/unified-work";

export type DeskMode = "personal" | "projects";

export type AssistantWorkspace = {
  ui: {
    theme: ThemeMode;
    custom: CustomTheme | undefined;
    setTheme: (preset: ThemeMode) => void;
    setCustomOverride: (key: ThemeTokenKey, value: string | undefined) => void;
    resetCustomOverrides: (preset?: ThemeMode) => void;
    status: string;
    setStatus: (value: string) => void;
    error: string;
    reportError: (err: unknown) => void;
    successes: SuccessMessage[];
    showSuccess: (message: string) => void;
    dismissSuccess: (id: string) => void;
    dismissAllSuccesses: () => void;
  };
  display: DisplayPreferences & {
    setDensity: (density: Density) => void;
    setPanelRadius: (radius: PanelRadius) => void;
    setShadows: (value: boolean) => void;
    setGlassBlur: (value: boolean) => void;
    setDccShowAllSecondary: (value: boolean) => void;
    resetDisplay: () => void;
  };
  data: {
    query: string;
    setQuery: (value: string) => void;
    notes: Note[];
    reminders: Reminder[];
    tasks: Task[];
    devices: HaDeviceRow[];
    logs: ExecutionLogRow[];
    rules: AutomationRule[];
    isRefreshing: boolean;
    refreshAll: () => Promise<void>;
    refreshNotes: () => Promise<void>;
    refreshReminders: () => Promise<void>;
    refreshTasks: () => Promise<void>;
    setDailyCommandCenterFilter?: (value: DailyCommandCenterFilter) => void;
  };
  ha: {
    haUrl: string;
    setHaUrl: (value: string) => void;
    haToken: string;
    setHaToken: (value: string) => void;
    hasHaToken: boolean;
    isRefreshingHa: boolean;
    isSavingHa: boolean;
    saveHomeAssistantConfig: () => Promise<void>;
    testHomeAssistant: () => Promise<void>;
    refreshHomeAssistantEntities: () => void;
    haReady: boolean;
    hasHaUrl: boolean;
    canSaveHa: boolean;
    haStatusText: string;
    isEntityTogglePending: (entityId: string) => boolean;
    runDeviceToggle: (entityId: string, friendlyName: string) => Promise<void>;
  };
  command: {
    commandInput: string;
    setCommandInput: (value: string) => void;
    commandHistory: string[];
    setCommandHistory: Dispatch<SetStateAction<string[]>>;
    historyCursor: number;
    setHistoryCursor: Dispatch<SetStateAction<number>>;
    commandHints: string[];
    isRunningCommand: boolean;
    commandInputRef: RefObject<HTMLInputElement | null>;
    runPresetCommand: (command: string) => void;
    runCommandInternal: (rawInput: string) => Promise<void>;
    clearCommandHistory: () => void;
  };
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
    setFilter: (value: ReminderFilter) => void;
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
    setFilter: (value: TaskFilter) => void;
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
    unifiedItems: UnifiedWorkItem[];
    needsSorting: UnifiedWorkItem[];
    createQuickNote: (title: string, content: string) => Promise<void>;
    createQuickTask: (title: string, notes: string) => Promise<void>;
    createQuickReminder: (text: string) => Promise<void>;
    convertNoteToTask: (noteId: string) => Promise<void>;
    convertNoteToReminder: (noteId: string) => Promise<void>;
    sendTaskToTeam: (taskId: string, projectId: string) => Promise<void>;
  };
  onboarding: {
    show: boolean;
    setShow: (value: boolean) => void;
    guidedState: OnboardingState;
    currentStep: OnboardingStep | null;
    isComplete: boolean;
    markNoteCreated: () => void;
    markReminderCreated: () => void;
    markHomeAssistantConnected: () => void;
    skipHomeAssistant: () => void;
  };
  desk: {
    hideWindow: () => void;
    mode: DeskMode;
    setMode: (mode: DeskMode) => void;
  };
};
