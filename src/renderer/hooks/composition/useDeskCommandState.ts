/**
 * Command state composition hook.
 *
 * Ownership:
 * - Command input and history state
 * - Command hints
 * - Command execution wiring
 * - Keyboard shortcuts and external command handling
 *
 * Dependencies:
 * - devices: for device-related commands
 * - haReady: for HA availability in commands
 * - setQuery: for query updates from commands
 * - setReminderFilter: for reminder filter updates from commands
 * - setTaskFilter: for task filter updates from commands
 * - setDailyCommandCenterFilter: for DCC filter updates from commands
 * - setStatus, setError: for UI feedback during execution
 * - refreshAll: for syncing after command execution
 * - runDeviceToggle: for device toggle commands
 *
 * This hook depends only on the minimal dependencies it needs and does not
 * depend on broader workspace state like onboarding or productivity actions.
 */
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { ReminderFilter, TaskFilter, HaDeviceRow } from "../../types";
import type { DailyCommandCenterFilter } from "../../lib/derived/daily-command-center";
import type { AiActionDraft } from "../../../shared/ai/types";
import type { Note, Task, Reminder, AutomationRule } from "../../../shared/types";
import type { TeamProjectTask, TeamProject } from "../../../shared/team/types";
import { useCommandExecution } from "../workspace/useCommandExecution";

export type DeskCommandState = {
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
  aiDraft: AiActionDraft | null;
  aiReply: string | null;
  confirmAiDraft: () => Promise<void>;
  cancelAiDraft: () => void;
  onQuickCapture?: (type: "note" | "task" | "reminder" | "inbox", text: string) => void;
  onShowRecent?: () => void;
  onShowSavedSearches?: () => void;
};

export function useDeskCommandState(args: {
  devices: HaDeviceRow[];
  haReady: boolean;
  setQuery: (value: string) => void;
  setReminderFilter: (value: ReminderFilter) => void;
  setTaskFilter: (value: TaskFilter) => void;
  setDailyCommandCenterFilter?: (value: DailyCommandCenterFilter) => void;
  setStatus: (value: string) => void;
  setError: (value: string) => void;
  refreshAll: () => Promise<void>;
  runDeviceToggle: (entityId: string, friendlyName: string) => Promise<void>;
  notesCount: number;
  tasksCount: number;
  remindersCount: number;
  aiConfigured: boolean;
  onQuickCapture?: (type: "note" | "task" | "reminder" | "inbox", text: string) => void;
  onShowRecent?: () => void;
  onShowSavedSearches?: () => void;
  notes?: Note[];
  tasks?: Task[];
  reminders?: Reminder[];
  rules?: AutomationRule[];
  teamTasks?: TeamProjectTask[];
  teamProjects?: TeamProject[];
  onOpenNote?: (noteId: string) => void;
  onOpenTask?: (taskId: string) => void;
  onOpenReminder?: (reminderId: string) => void;
  onOpenTeamTask?: (teamTaskId: string) => void;
}): DeskCommandState {
  const {
    devices,
    haReady,
    setQuery,
    setReminderFilter,
    setTaskFilter,
    setDailyCommandCenterFilter,
    setStatus,
    setError,
    refreshAll,
    runDeviceToggle,
    notesCount,
    tasksCount,
    remindersCount,
    aiConfigured,
    onQuickCapture,
    onShowRecent,
    onShowSavedSearches,
    notes,
    tasks,
    reminders,
    rules,
    teamTasks,
    teamProjects,
    onOpenNote,
    onOpenTask,
    onOpenReminder,
    onOpenTeamTask
  } = args;

  const command = useCommandExecution({
    devices,
    haReady,
    setQuery,
    setReminderFilter,
    setTaskFilter,
    setDailyCommandCenterFilter,
    setStatus,
    setError,
    refreshAll,
    runDeviceToggle,
    notesCount,
    tasksCount,
    remindersCount,
    aiConfigured,
    onQuickCapture,
    onShowRecent,
    onShowSavedSearches,
    notes,
    tasks,
    reminders,
    rules,
    teamTasks,
    teamProjects,
    onOpenNote,
    onOpenTask,
    onOpenReminder,
    onOpenTeamTask
  });

  return {
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
    clearCommandHistory: command.clearCommandHistory,
    aiDraft: command.aiDraft,
    aiReply: command.aiReply,
    confirmAiDraft: command.confirmAiDraft,
    cancelAiDraft: command.cancelAiDraft,
    onQuickCapture: args.onQuickCapture,
    onShowRecent: args.onShowRecent,
    onShowSavedSearches: args.onShowSavedSearches
  };
}
