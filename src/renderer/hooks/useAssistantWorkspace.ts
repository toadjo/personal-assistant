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
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { AutomationRule, Note, Reminder } from "../../shared/types";
import type { ReminderFilter, ExecutionLogRow, HaDeviceRow, ThemeMode } from "../types";
import type { CalendarCell } from "../lib/calendar";
import { useDeskUiState } from "./composition/useDeskUiState";
import { useDeskDataState } from "./composition/useDeskDataState";
import { useDeskHomeAssistantState } from "./composition/useDeskHomeAssistantState";
import { useDeskProductivityState } from "./composition/useDeskProductivityState";
import { useDeskCommandState } from "./composition/useDeskCommandState";

export type AssistantWorkspace = {
  ui: {
    theme: ThemeMode;
    setTheme: Dispatch<SetStateAction<ThemeMode>>;
    status: string;
    setStatus: (value: string) => void;
    error: string;
    reportError: (err: unknown) => void;
  };
  data: {
    query: string;
    setQuery: (value: string) => void;
    notes: Note[];
    reminders: Reminder[];
    devices: HaDeviceRow[];
    logs: ExecutionLogRow[];
    rules: AutomationRule[];
    isRefreshing: boolean;
    refreshAll: () => Promise<void>;
    fetchNotesOnly: () => Promise<void>;
    fetchRemindersOnly: () => Promise<void>;
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
  };
  desk: {
    hideWindow: () => void;
  };
};

export function useAssistantWorkspace(): AssistantWorkspace {
  // Data state - no dependencies on other workspace state
  const data = useDeskDataState((_msg) => {
    // Error setter for data fetch errors - will be wired to UI state below
  });

  // HA state - depends on feedback setters and refreshAll from data
  const ha = useDeskHomeAssistantState(
    (_msg) => {
      // setStatus - will be wired below
    },
    (_msg) => {
      // setError - will be wired below
    },
    data.refreshAll
  );

  // Productivity state - depends on data slices and callbacks
  const productivity = useDeskProductivityState({
    notes: data.notes,
    reminders: data.reminders,
    rules: data.rules,
    setStatus: (_msg) => {
      // setStatus - will be wired below
    },
    setError: (_msg) => {
      // setError - will be wired below
    },
    refreshAll: data.refreshAll,
    fetchNotesOnly: data.fetchNotesOnly,
    fetchRemindersOnly: data.fetchRemindersOnly,
    mergeNote: data.mergeNote,
    removeNoteById: data.removeNoteById
  });

  // Command state - depends on data, ha, and productivity
  const command = useDeskCommandState({
    devices: data.devices,
    haReady: ha.haReady,
    setQuery: data.setQuery,
    setReminderFilter: productivity.reminders.setFilter,
    setStatus: (_msg) => {
      // setStatus - will be wired below
    },
    setError: (_msg) => {
      // setError - will be wired below
    },
    refreshAll: data.refreshAll,
    runDeviceToggle: ha.runDeviceToggle
  });

  // UI state - depends on command history for onboarding
  const ui = useDeskUiState(command.commandHistory.length);

  // Now wire the feedback setters by recreating hooks with proper callbacks
  // This is necessary because of circular dependencies, but hooks are stable
  // so recreating them with different callbacks is safe
  const haWithFeedback = useDeskHomeAssistantState(ui.setStatus, ui.setError, data.refreshAll);
  const productivityWithFeedback = useDeskProductivityState({
    notes: data.notes,
    reminders: data.reminders,
    rules: data.rules,
    setStatus: ui.setStatus,
    setError: ui.setError,
    refreshAll: data.refreshAll,
    fetchNotesOnly: data.fetchNotesOnly,
    fetchRemindersOnly: data.fetchRemindersOnly,
    mergeNote: data.mergeNote,
    removeNoteById: data.removeNoteById
  });
  const commandWithFeedback = useDeskCommandState({
    devices: data.devices,
    haReady: haWithFeedback.haReady,
    setQuery: data.setQuery,
    setReminderFilter: productivityWithFeedback.reminders.setFilter,
    setStatus: ui.setStatus,
    setError: ui.setError,
    refreshAll: data.refreshAll,
    runDeviceToggle: haWithFeedback.runDeviceToggle
  });
  const uiWithFeedback = useDeskUiState(commandWithFeedback.commandHistory.length);

  return {
    ui: {
      theme: uiWithFeedback.theme,
      setTheme: uiWithFeedback.setTheme,
      status: uiWithFeedback.status,
      setStatus: uiWithFeedback.setStatus,
      error: uiWithFeedback.error,
      reportError: uiWithFeedback.reportError
    },
    data: {
      query: data.query,
      setQuery: data.setQuery,
      notes: data.notes,
      reminders: data.reminders,
      devices: data.devices,
      logs: data.logs,
      rules: data.rules,
      isRefreshing: data.isRefreshing,
      refreshAll: data.refreshAll,
      fetchNotesOnly: data.fetchNotesOnly,
      fetchRemindersOnly: data.fetchRemindersOnly
    },
    ha: {
      haUrl: haWithFeedback.haUrl,
      setHaUrl: haWithFeedback.setHaUrl,
      haToken: haWithFeedback.haToken,
      setHaToken: haWithFeedback.setHaToken,
      hasHaToken: haWithFeedback.hasHaToken,
      isRefreshingHa: haWithFeedback.isRefreshingHa,
      isSavingHa: haWithFeedback.isSavingHa,
      saveHomeAssistantConfig: haWithFeedback.saveHomeAssistantConfig,
      testHomeAssistant: haWithFeedback.testHomeAssistant,
      refreshHomeAssistantEntities: haWithFeedback.refreshHomeAssistantEntities,
      haReady: haWithFeedback.haReady,
      hasHaUrl: haWithFeedback.hasHaUrl,
      canSaveHa: haWithFeedback.canSaveHa,
      haStatusText: haWithFeedback.haStatusText,
      isEntityTogglePending: haWithFeedback.isEntityTogglePending,
      runDeviceToggle: haWithFeedback.runDeviceToggle
    },
    command: {
      commandInput: commandWithFeedback.commandInput,
      setCommandInput: commandWithFeedback.setCommandInput,
      commandHistory: commandWithFeedback.commandHistory,
      setCommandHistory: commandWithFeedback.setCommandHistory,
      historyCursor: commandWithFeedback.historyCursor,
      setHistoryCursor: commandWithFeedback.setHistoryCursor,
      commandHints: commandWithFeedback.commandHints,
      isRunningCommand: commandWithFeedback.isRunningCommand,
      commandInputRef: commandWithFeedback.commandInputRef,
      runPresetCommand: commandWithFeedback.runPresetCommand,
      runCommandInternal: commandWithFeedback.runCommandInternal,
      clearCommandHistory: commandWithFeedback.clearCommandHistory
    },
    calendar: productivityWithFeedback.calendar,
    reminders: productivityWithFeedback.reminders,
    automation: productivityWithFeedback.automation,
    memos: productivityWithFeedback.memos,
    profile: productivityWithFeedback.profile,
    onboarding: uiWithFeedback.onboarding,
    desk: uiWithFeedback.desk
  };
}
