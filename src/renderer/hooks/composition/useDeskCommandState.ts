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
 * - setStatus, setError: for UI feedback during execution
 * - refreshAll: for syncing after command execution
 * - runDeviceToggle: for device toggle commands
 *
 * This hook depends only on the minimal dependencies it needs and does not
 * depend on broader workspace state like onboarding or productivity actions.
 */
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { ReminderFilter, TaskFilter, HaDeviceRow } from "../../types";
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
};

export function useDeskCommandState(args: {
  devices: HaDeviceRow[];
  haReady: boolean;
  setQuery: (value: string) => void;
  setReminderFilter: (value: ReminderFilter) => void;
  setTaskFilter: (value: TaskFilter) => void;
  setStatus: (value: string) => void;
  setError: (value: string) => void;
  refreshAll: () => Promise<void>;
  runDeviceToggle: (entityId: string, friendlyName: string) => Promise<void>;
}): DeskCommandState {
  const {
    devices,
    haReady,
    setQuery,
    setReminderFilter,
    setTaskFilter,
    setStatus,
    setError,
    refreshAll,
    runDeviceToggle
  } = args;

  const command = useCommandExecution({
    devices,
    haReady,
    setQuery,
    setReminderFilter,
    setTaskFilter,
    setStatus,
    setError,
    refreshAll,
    runDeviceToggle
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
    clearCommandHistory: command.clearCommandHistory
  };
}
