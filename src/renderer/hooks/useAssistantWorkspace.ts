/**
 * Stable facade for desk workspace composition.
 *
 * This hook is a thin assembler over domain-level composition hooks. It does not
 * own any logic directly—all behavior is delegated to:
 * - {@link useDeskUiState}: status/error, theme, onboarding, desk window actions
 * - {@link useDeskDataState}: fetched entities and refresh flows
 * - {@link useDeskHomeAssistantState}: HA credentials, readiness UI, device toggling
 * - {@link useDeskProductivityState}: reminders, notes, automation, calendar, profile
 * - {@link useDeskCommandState}: command input/history/hints and execution wiring
 *
 * The public {@link AssistantWorkspace} shape is stable. Keep new cross-cutting
 * logic in a dedicated composition hook before adding it here.
 */
import { useEffect } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { AutomationRule, Note, Reminder, Task } from "../../shared/types";
import type { ReminderFilter, TaskFilter, ExecutionLogRow, HaDeviceRow } from "../types";
import type { ThemeMode, ThemeTokenKey, CustomTheme } from "../lib/theme/tokens";
import type { Density, PanelRadius, DisplayPreferences } from "../lib/display/types";
import type { CalendarCell } from "../lib/calendar";
import type { OnboardingState, OnboardingStep } from "../types/onboarding";
import type { SuccessMessage } from "./ui/usePersistentSuccess";
import { STORAGE_ONBOARDED, STORAGE_ONBOARDING_DEFERRED } from "../constants/storageKeys";
import { useDeskUiState } from "./composition/useDeskUiState";
import { useDeskDataState } from "./composition/useDeskDataState";
import { useDeskHomeAssistantState } from "./composition/useDeskHomeAssistantState";
import { useDeskProductivityState } from "./composition/useDeskProductivityState";
import { useDeskCommandState } from "./composition/useDeskCommandState";

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
    // v1.2.7 persistent success feedback
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
    fetchNotesOnly: () => Promise<void>;
    fetchRemindersOnly: () => Promise<void>;
    fetchTasksOnly: () => Promise<void>;
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
    selectedDayAgenda: Reminder[];
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
  };
  automation: {
    deleteRuleById: (id: string, name: string) => Promise<void>;
    setRuleEnabledById: (id: string, enabled: boolean) => Promise<void>;
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
  onboarding: {
    show: boolean;
    setShow: (value: boolean) => void;
    // v1.2.7 guided onboarding
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
  };
};

export function useAssistantWorkspace(): AssistantWorkspace {
  // UI state - no dependencies, created first
  const ui = useDeskUiState();

  // Data state - depends on setError from UI
  const data = useDeskDataState(ui.setError);

  // HA state - depends on setStatus/setError from UI and refreshAll from data
  const ha = useDeskHomeAssistantState(ui.setStatus, ui.setError, data.refreshAll);

  // Productivity state - depends on data slices and callbacks from UI and data
  const productivity = useDeskProductivityState({
    notes: data.notes,
    reminders: data.reminders,
    tasks: data.tasks,
    rules: data.rules,
    setStatus: ui.setStatus,
    setError: ui.setError,
    refreshAll: data.refreshAll,
    fetchNotesOnly: data.fetchNotesOnly,
    fetchRemindersOnly: data.fetchRemindersOnly,
    fetchTasksOnly: data.fetchTasksOnly,
    mergeNote: data.mergeNote,
    removeNoteById: data.removeNoteById
  });

  // Command state - depends on data, ha, productivity, and callbacks from UI
  const command = useDeskCommandState({
    devices: data.devices,
    haReady: ha.haReady,
    setQuery: data.setQuery,
    setReminderFilter: productivity.reminders.setFilter,
    setTaskFilter: productivity.tasks.setFilter,
    setStatus: ui.setStatus,
    setError: ui.setError,
    refreshAll: data.refreshAll,
    runDeviceToggle: ha.runDeviceToggle
  });

  // Effect to dismiss onboarding after first command
  // This is the single place where onboarding dismissal is handled
  useEffect(() => {
    if (command.commandHistory.length > 0 && ui.onboarding.show) {
      window.localStorage.setItem(STORAGE_ONBOARDED, "1");
      window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
      ui.onboarding.setShow(false);
      ui.setStatus("Nice—first command received. I will stay out of your way unless you need me.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command.commandHistory.length, ui.onboarding.show, ui.onboarding.setShow, ui.setStatus]);

  return {
    ui: {
      theme: ui.theme,
      custom: ui.custom,
      setTheme: ui.setTheme,
      setCustomOverride: ui.setCustomOverride,
      resetCustomOverrides: ui.resetCustomOverrides,
      status: ui.status,
      setStatus: ui.setStatus,
      error: ui.error,
      reportError: ui.reportError,
      // v1.2.7 persistent success feedback
      successes: ui.successes,
      showSuccess: ui.showSuccess,
      dismissSuccess: ui.dismissSuccess,
      dismissAllSuccesses: ui.dismissAllSuccesses
    },
    display: {
      ...ui.display,
      setDensity: ui.display.setDensity,
      setPanelRadius: ui.display.setPanelRadius,
      setShadows: ui.display.setShadows,
      setGlassBlur: ui.display.setGlassBlur,
      setDccShowAllSecondary: ui.display.setDccShowAllSecondary,
      resetDisplay: ui.display.resetDisplay
    },
    data: {
      query: data.query,
      setQuery: data.setQuery,
      notes: data.notes,
      reminders: data.reminders,
      tasks: data.tasks,
      devices: data.devices,
      logs: data.logs,
      rules: data.rules,
      isRefreshing: data.isRefreshing,
      refreshAll: data.refreshAll,
      fetchNotesOnly: data.fetchNotesOnly,
      fetchRemindersOnly: data.fetchRemindersOnly,
      fetchTasksOnly: data.fetchTasksOnly
    },
    ha: {
      haUrl: ha.haUrl,
      setHaUrl: ha.setHaUrl,
      haToken: ha.haToken,
      setHaToken: ha.setHaToken,
      hasHaToken: ha.hasHaToken,
      isRefreshingHa: ha.isRefreshingHa,
      isSavingHa: ha.isSavingHa,
      saveHomeAssistantConfig: ha.saveHomeAssistantConfig,
      testHomeAssistant: ha.testHomeAssistant,
      refreshHomeAssistantEntities: ha.refreshHomeAssistantEntities,
      haReady: ha.haReady,
      hasHaUrl: ha.hasHaUrl,
      canSaveHa: ha.canSaveHa,
      haStatusText: ha.haStatusText,
      isEntityTogglePending: ha.isEntityTogglePending,
      runDeviceToggle: ha.runDeviceToggle
    },
    command: {
      commandInput: command.commandInput,
      setCommandInput: command.setCommandInput,
      commandHistory: command.commandHistory,
      setCommandHistory: command.setCommandHistory,
      historyCursor: command.historyCursor,
      setHistoryCursor: command.setHistoryCursor,
      commandHints: command.commandHints,
      isRunningCommand: command.isRunningCommand,
      commandInputRef: command.commandInputRef,
      runPresetCommand: command.runPresetCommand,
      runCommandInternal: command.runCommandInternal,
      clearCommandHistory: command.clearCommandHistory
    },
    calendar: productivity.calendar,
    reminders: productivity.reminders,
    tasks: productivity.tasks,
    automation: productivity.automation,
    memos: productivity.memos,
    profile: productivity.profile,
    onboarding: ui.onboarding,
    desk: ui.desk
  };
}
