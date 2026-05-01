import { useEffect, useMemo, useRef, useState } from "react";
import type { ReminderFilter } from "../types";
import { executeAssistantCommand } from "../command/executeAssistantCommand";
import { MAX_COMMAND_HISTORY, COMMAND_HINT_SAMPLES } from "../constants/command";
import { STORAGE_ONBOARDED } from "../constants/storageKeys";
import { buildCalendarCells, toLocalDateKey } from "../lib/calendar";
import { normalizeCommandAlias } from "../lib/commands";
import { homeAssistantUi } from "../lib/derived/homeAssistantUi";
import {
  overduePending,
  pendingReminders as remindersPending,
  remindersGroupedByLocalDate,
  todayAgendaFor,
  visibleReminders as remindersVisible
} from "../lib/derived/reminders";
import { proactiveTipText } from "../lib/derived/proactiveTip";
import { getErrorMessage } from "../lib/errors";
import { persistCommandHistory, loadCommandHistory } from "../lib/storage/commandHistory";
import { useAssistantData } from "./data/useAssistantData";
import { useHomeAssistantCredentials } from "./homeAssistant/useHomeAssistantCredentials";
import { useDeviceToggle } from "./homeAssistant/useDeviceToggle";
import { useThemePreference } from "./ui/useThemePreference";
import { useWorkspaceMessages } from "./ui/useWorkspaceMessages";

export function useAssistantWorkspace() {
  const { status, setStatus, error, setError, reportError } = useWorkspaceMessages();
  const { theme, setTheme } = useThemePreference();

  const { query, setQuery, notes, reminders, devices, logs, rules, isRefreshing, refreshAll } = useAssistantData(setError);

  const ha = useHomeAssistantCredentials({ setStatus, setError });
  const { isEntityTogglePending, runDeviceToggle } = useDeviceToggle(refreshAll, setStatus, setError);

  const haUi = useMemo(() => homeAssistantUi(ha.haUrl, ha.haToken, ha.hasHaToken), [ha.haUrl, ha.haToken, ha.hasHaToken]);

  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState(loadCommandHistory);
  const [historyCursor, setHistoryCursor] = useState(-1);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const [isRunningCommand, setIsRunningCommand] = useState(false);
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>("all");
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [showOnboarding, setShowOnboarding] = useState(() => !window.localStorage.getItem(STORAGE_ONBOARDED));

  const pendingList = useMemo(() => remindersPending(reminders), [reminders]);
  const overdueReminders = useMemo(() => overduePending(pendingList), [pendingList]);
  const visibleReminders = useMemo(() => remindersVisible(reminders, reminderFilter), [reminders, reminderFilter]);
  const remindersByDate = useMemo(() => remindersGroupedByLocalDate(reminders), [reminders]);
  const monthCells = useMemo(() => buildCalendarCells(calendarCursor, remindersByDate), [calendarCursor, remindersByDate]);
  const todayKey = toLocalDateKey(new Date());
  const todayAgenda = useMemo(() => todayAgendaFor(reminders, todayKey), [reminders, todayKey]);
  const recentNotes = useMemo(() => notes.slice(0, 5), [notes]);

  const commandHints = useMemo(
    () => COMMAND_HINT_SAMPLES.filter((c) => c.includes(commandInput.toLowerCase())),
    [commandInput]
  );

  const proactiveTip = useMemo(
    () =>
      proactiveTipText({
        haReady: haUi.haReady,
        overdueCount: overdueReminders.length,
        todayAgendaCount: todayAgenda.length,
        commandHistoryLength: commandHistory.length
      }),
    [haUi.haReady, overdueReminders.length, todayAgenda.length, commandHistory.length]
  );

  useEffect(() => {
    persistCommandHistory(commandHistory);
  }, [commandHistory]);

  useEffect(() => {
    const off = window.assistantApi.onCommand((_, command) => {
      setCommandInput(command === "new note" ? "new note " : command);
      commandInputRef.current?.focus();
      setStatus(`Tray command: ${command}`);
    });
    return off;
  }, [setStatus]);

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        commandInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!showOnboarding) return;
    if (!haUi.haReady || commandHistory.length === 0) return;
    window.localStorage.setItem(STORAGE_ONBOARDED, "1");
    setShowOnboarding(false);
    setStatus("Onboarding completed. You can reopen tips anytime by clearing local storage.");
  }, [showOnboarding, haUi.haReady, commandHistory.length, setStatus]);

  async function runCommandInternal(rawInput: string): Promise<void> {
    const trimmed = rawInput.trim();
    if (!trimmed) return;
    const normalized = normalizeCommandAlias(trimmed);
    try {
      setError("");
      setIsRunningCommand(true);
      await executeAssistantCommand({
        rawInput: trimmed,
        devices,
        haReady: haUi.haReady,
        setQuery,
        setReminderFilter,
        setStatus,
        refreshHomeAssistantEntities: () => window.assistantApi.refreshHomeAssistantEntities(),
        runDeviceToggle
      });
      setCommandHistory((prev) => {
        const next = [normalized, ...prev.filter((item) => item.toLowerCase() !== normalized.toLowerCase())];
        return next.slice(0, MAX_COMMAND_HISTORY);
      });
      setHistoryCursor(-1);
      setCommandInput("");
      await refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsRunningCommand(false);
    }
  }

  function runPresetCommand(command: string): void {
    setCommandInput(command);
    void runCommandInternal(command);
  }

  function focusCommandInput(): void {
    commandInputRef.current?.focus();
    setStatus("Command input focused. Type an action and press Enter.");
  }

  async function deleteNote(id: string, title: string): Promise<void> {
    if (!window.confirm(`Delete note "${title}"?`)) return;
    try {
      await window.assistantApi.deleteNote(id);
      setStatus("Note deleted.");
      await refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function snoozeReminderMinutes(id: string, minutes: number, okMessage: string): Promise<void> {
    try {
      await window.assistantApi.snoozeReminder(id, minutes);
      setStatus(okMessage);
      await refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function completeReminderById(id: string): Promise<void> {
    try {
      await window.assistantApi.completeReminder(id);
      setStatus("Reminder marked as done.");
      await refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteReminderById(id: string): Promise<void> {
    if (!window.confirm("Delete this reminder?")) return;
    try {
      await window.assistantApi.deleteReminder(id);
      setStatus("Reminder deleted.");
      await refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function clearCommandHistory(): void {
    setCommandHistory([]);
    setHistoryCursor(-1);
    setStatus("Command history cleared.");
  }

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
    commandInput,
    setCommandInput,
    commandHistory,
    setCommandHistory,
    historyCursor,
    setHistoryCursor,
    status,
    setStatus,
    error,
    isRefreshingHa: ha.isRefreshingHa,
    isSavingHa: ha.isSavingHa,
    isRefreshing,
    reminderFilter,
    setReminderFilter,
    isRunningCommand,
    calendarCursor,
    setCalendarCursor,
    theme,
    setTheme,
    commandInputRef,
    showOnboarding,
    setShowOnboarding,
    refreshAll,
    runPresetCommand,
    focusCommandInput,
    runDeviceToggle,
    runCommandInternal,
    deleteNote,
    snoozeReminderMinutes,
    completeReminderById,
    deleteReminderById,
    saveHomeAssistantConfig: ha.saveHomeAssistantConfig,
    testHomeAssistant: ha.testHomeAssistant,
    refreshHomeAssistantEntities: () => void ha.refreshHomeAssistantEntities(refreshAll),
    clearCommandHistory,
    reportError,
    commandHints,
    pendingReminders: pendingList,
    overdueReminders,
    visibleReminders,
    haReady: haUi.haReady,
    hasHaUrl: haUi.hasHaUrl,
    canSaveHa: haUi.canSaveHa,
    isEntityTogglePending,
    haStatusText: haUi.haStatusText,
    monthCells,
    todayKey,
    todayAgenda,
    recentNotes,
    proactiveTip
  };
}
