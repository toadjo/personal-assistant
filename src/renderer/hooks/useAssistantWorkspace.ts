/**
 * Stable facade for desk workspace composition.
 *
 * This hook is a thin assembler over domain-level composition hooks. It does not
 * own any logic directly - all behavior is delegated to:
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
import { STORAGE_ONBOARDED, STORAGE_ONBOARDING_DEFERRED } from "../constants/storageKeys";
import { useDeskUiState } from "./composition/useDeskUiState";
import { useDeskDataState } from "./composition/useDeskDataState";
import { useDeskHomeAssistantState } from "./composition/useDeskHomeAssistantState";
import { useDeskProductivityState } from "./composition/useDeskProductivityState";
import { useDeskCommandState } from "./composition/useDeskCommandState";
import type { AssistantWorkspace } from "./workspace/workspaceTypes";
export type { AssistantWorkspace } from "./workspace/workspaceTypes";

export function useAssistantWorkspace(): AssistantWorkspace {
  // UI state - no dependencies, created first
  const ui = useDeskUiState();

  // Data state - depends on setError from UI
  const data = useDeskDataState(ui.setError);

  // HA state - depends on setStatus/setError from UI, refreshAll for entity sync, refreshDevices for toggle
  const ha = useDeskHomeAssistantState(ui.setStatus, ui.setError, data.refreshAll, data.refreshDevices);

  // Productivity state - depends on data slices and callbacks from UI and data
  const productivity = useDeskProductivityState({
    notes: data.notes,
    reminders: data.reminders,
    tasks: data.tasks,
    rules: data.rules,
    setStatus: ui.setStatus,
    setError: ui.setError,
    refreshAll: data.refreshAll,
    refreshNotes: data.refreshNotes,
    refreshReminders: data.refreshReminders,
    refreshTasks: data.refreshTasks,
    refreshDevices: data.refreshDevices,
    refreshLogs: data.refreshLogs,
    refreshRules: data.refreshRules,
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
      ui.setStatus("Nice - first command received. I will stay out of your way unless you need me.");
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
      refreshNotes: data.refreshNotes,
      refreshReminders: data.refreshReminders,
      refreshTasks: data.refreshTasks
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
