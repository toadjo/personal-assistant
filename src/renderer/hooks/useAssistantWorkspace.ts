import { useEffect, useMemo, useState } from "react";
import type { ReminderFilter } from "../types";
import { STORAGE_ONBOARDED, STORAGE_ONBOARDING_DEFERRED } from "../constants/storageKeys";
import { homeAssistantUi } from "../lib/derived/homeAssistantUi";
import {
  overduePending,
  pendingReminders as remindersPending,
  visibleReminders as remindersVisible
} from "../lib/derived/reminders";
import { useAssistantData } from "./data/useAssistantData";
import { useHomeAssistantCredentials } from "./homeAssistant/useHomeAssistantCredentials";
import { useDeviceToggle } from "./homeAssistant/useDeviceToggle";
import { useThemePreference } from "./ui/useThemePreference";
import { useWorkspaceMessages } from "./ui/useWorkspaceMessages";
import { useCalendarState } from "./workspace/useCalendarState";
import { useCommandExecution } from "./workspace/useCommandExecution";
import { useAutomationRuleActions } from "./workspace/useAutomationRuleActions";
import { useNoteActions } from "./workspace/useNoteActions";
import { useReminderActions } from "./workspace/useReminderActions";
import { useUserProfileSettings } from "./workspace/useUserProfileSettings";

export function useAssistantWorkspace() {
  const { status, setStatus, error, setError, reportError } = useWorkspaceMessages();
  const { theme, setTheme } = useThemePreference();

  const { query, setQuery, notes, reminders, devices, logs, rules, isRefreshing, refreshAll } =
    useAssistantData(setError);

  const ha = useHomeAssistantCredentials({ setStatus, setError });
  const { isEntityTogglePending, runDeviceToggle } = useDeviceToggle(refreshAll, setStatus, setError);

  const haUi = useMemo(
    () => homeAssistantUi(ha.haUrl, ha.haToken, ha.hasHaToken),
    [ha.haUrl, ha.haToken, ha.hasHaToken]
  );

  const [reminderFilter, setReminderFilterState] = useState<ReminderFilter>("all");

  const command = useCommandExecution({
    devices,
    haReady: haUi.haReady,
    setQuery,
    setReminderFilter: setReminderFilterState,
    setStatus,
    setError,
    refreshAll,
    runDeviceToggle
  });

  const calendar = useCalendarState(reminders);
  const { deleteNote, updateNote } = useNoteActions(refreshAll, setStatus, setError);
  const { deleteRuleById, setRuleEnabledById } = useAutomationRuleActions(refreshAll, setStatus, setError);
  const { snoozeReminderMinutes, completeReminderById, deleteReminderById } = useReminderActions(
    refreshAll,
    setStatus,
    setError
  );
  const profile = useUserProfileSettings(setError, setStatus);

  const [showOnboarding, setShowOnboarding] = useState(
    () => !window.localStorage.getItem(STORAGE_ONBOARDED) && !window.localStorage.getItem(STORAGE_ONBOARDING_DEFERRED)
  );

  const pendingList = useMemo(() => remindersPending(reminders), [reminders]);
  const overdueReminders = useMemo(() => overduePending(pendingList), [pendingList]);
  const visibleReminders = useMemo(() => remindersVisible(reminders, reminderFilter), [reminders, reminderFilter]);

  useEffect(() => {
    if (!showOnboarding) return;
    if (command.commandHistory.length === 0) return;
    window.localStorage.setItem(STORAGE_ONBOARDED, "1");
    window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
    setShowOnboarding(false);
    setStatus("Nice—first command received. I will stay out of your way unless you need me.");
  }, [showOnboarding, command.commandHistory.length, setStatus]);

  return {
    query,
    setQuery,
    notes,
    reminders,
    haUrl: ha.haUrl,
    setHaUrl: ha.setHaUrl,
    haToken: ha.haToken,
    setHaToken: ha.setHaToken,
    hasHaToken: ha.hasHaToken,
    devices,
    logs,
    rules,
    commandInput: command.commandInput,
    setCommandInput: command.setCommandInput,
    commandHistory: command.commandHistory,
    setCommandHistory: command.setCommandHistory,
    historyCursor: command.historyCursor,
    setHistoryCursor: command.setHistoryCursor,
    status,
    setStatus,
    error,
    isRefreshingHa: ha.isRefreshingHa,
    isSavingHa: ha.isSavingHa,
    isRefreshing,
    reminderFilter,
    setReminderFilter: setReminderFilterState,
    isRunningCommand: command.isRunningCommand,
    calendarCursor: calendar.calendarCursor,
    setCalendarCursor: calendar.setCalendarCursor,
    theme,
    setTheme,
    commandInputRef: command.commandInputRef,
    showOnboarding,
    setShowOnboarding,
    refreshAll,
    runPresetCommand: command.runPresetCommand,
    runDeviceToggle,
    runCommandInternal: command.runCommandInternal,
    deleteNote,
    updateNote,
    deleteRuleById,
    setRuleEnabledById,
    snoozeReminderMinutes,
    completeReminderById,
    deleteReminderById,
    saveHomeAssistantConfig: ha.saveHomeAssistantConfig,
    testHomeAssistant: ha.testHomeAssistant,
    refreshHomeAssistantEntities: () => void ha.refreshHomeAssistantEntities(refreshAll),
    clearCommandHistory: command.clearCommandHistory,
    reportError,
    commandHints: command.commandHints,
    pendingReminders: pendingList,
    overdueReminders,
    visibleReminders,
    haReady: haUi.haReady,
    hasHaUrl: haUi.hasHaUrl,
    canSaveHa: haUi.canSaveHa,
    isEntityTogglePending,
    haStatusText: haUi.haStatusText,
    monthCells: calendar.monthCells,
    todayKey: calendar.todayKey,
    calendarSelectedKey: calendar.calendarSelectedKey,
    setCalendarSelectedKey: calendar.setCalendarSelectedKey,
    selectedDayAgenda: calendar.selectedDayAgenda,
    userPreferredName: profile.userPreferredName,
    userPreferredNameIsSet: profile.userPreferredNameIsSet,
    persistUserPreferredName: profile.persistUserPreferredName,
    hideDeskWindow: () => {
      void window.assistantApi.hideDeskWindow();
    }
  };
}
