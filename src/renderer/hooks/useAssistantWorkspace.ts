import { useEffect, useMemo, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { AutomationRule, Note, Reminder } from "../../shared/types";
import type { ReminderFilter, ExecutionLogRow, HaDeviceRow, ThemeMode } from "../types";
import type { CalendarCell } from "../lib/calendar";
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
  const { status, setStatus, error, setError, reportError } = useWorkspaceMessages();
  const { theme, setTheme } = useThemePreference();

  const {
    query,
    setQuery,
    notes,
    reminders,
    devices,
    logs,
    rules,
    isRefreshing,
    refreshAll,
    fetchNotesOnly,
    fetchRemindersOnly,
    mergeNote,
    removeNoteById
  } = useAssistantData(setError);

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
  const { deleteNote, updateNote } = useNoteActions(setStatus, setError, {
    mergeNote,
    removeNoteById,
    fetchNotesOnly
  });
  const { deleteRuleById, setRuleEnabledById } = useAutomationRuleActions(refreshAll, setStatus, setError);
  const { snoozeReminderMinutes, completeReminderById, deleteReminderById } = useReminderActions(
    setStatus,
    setError,
    fetchRemindersOnly
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
    ui: {
      theme,
      setTheme,
      status,
      setStatus,
      error,
      reportError
    },
    data: {
      query,
      setQuery,
      notes,
      reminders,
      devices,
      logs,
      rules,
      isRefreshing,
      refreshAll,
      fetchNotesOnly,
      fetchRemindersOnly
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
      refreshHomeAssistantEntities: () => void ha.refreshHomeAssistantEntities(refreshAll),
      haReady: haUi.haReady,
      hasHaUrl: haUi.hasHaUrl,
      canSaveHa: haUi.canSaveHa,
      haStatusText: haUi.haStatusText,
      isEntityTogglePending,
      runDeviceToggle
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
    calendar: {
      calendarCursor: calendar.calendarCursor,
      setCalendarCursor: calendar.setCalendarCursor,
      monthCells: calendar.monthCells,
      todayKey: calendar.todayKey,
      calendarSelectedKey: calendar.calendarSelectedKey,
      setCalendarSelectedKey: calendar.setCalendarSelectedKey,
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
      deleteById: deleteReminderById
    },
    automation: {
      deleteRuleById,
      setRuleEnabledById
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
    onboarding: {
      show: showOnboarding,
      setShow: setShowOnboarding
    },
    desk: {
      hideWindow: () => {
        void window.assistantApi.hideDeskWindow();
      }
    }
  };
}
