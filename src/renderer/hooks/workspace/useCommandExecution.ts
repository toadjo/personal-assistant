import { useEffect, useMemo, useRef, useState } from "react";
import type { ReminderFilter } from "../../types";
import { executeAssistantCommand } from "../../command/executeAssistantCommand";
import { MAX_COMMAND_HISTORY, COMMAND_HINT_SAMPLES } from "../../constants/command";
import { COMMAND_HISTORY_PERSIST_DEBOUNCE_MS } from "../../constants/timing";
import { normalizeCommandAlias } from "../../lib/commands";
import { getErrorMessage } from "../../lib/errors";
import { persistCommandHistory, loadCommandHistory } from "../../lib/storage/commandHistory";
import type { HaDeviceRow } from "../../types";

type SetStatus = (value: string) => void;
type SetError = (value: string) => void;

type RunDeviceToggle = (entityId: string, friendlyName: string) => Promise<void>;

export function useCommandExecution(args: {
  devices: HaDeviceRow[];
  haReady: boolean;
  setQuery: (value: string) => void;
  setReminderFilter: (value: ReminderFilter) => void;
  setStatus: SetStatus;
  setError: SetError;
  refreshAll: () => Promise<void>;
  runDeviceToggle: RunDeviceToggle;
}) {
  const { devices, haReady, setQuery, setReminderFilter, setStatus, setError, refreshAll, runDeviceToggle } = args;

  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState(loadCommandHistory);
  const [historyCursor, setHistoryCursor] = useState(-1);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const [isRunningCommand, setIsRunningCommand] = useState(false);

  const commandHints = useMemo(
    () => COMMAND_HINT_SAMPLES.filter((c) => c.includes(commandInput.toLowerCase())),
    [commandInput]
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      persistCommandHistory(commandHistory);
    }, COMMAND_HISTORY_PERSIST_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [commandHistory]);

  useEffect(() => {
    const api = window.assistantApi;
    if (!api?.onCommand) {
      return;
    }
    const off = api.onCommand((_, command) => {
      setCommandInput(command === "new note" ? "new note " : command);
      commandInputRef.current?.focus();
      setStatus(`From the tray: “${command}”—tell me if you want anything else.`);
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
        haReady,
        setQuery,
        setReminderFilter,
        setStatus,
        refreshHomeAssistantEntities: async () => {
          await window.assistantApi?.refreshHomeAssistantEntities?.();
        },
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

  function clearCommandHistory(): void {
    setCommandHistory([]);
    setHistoryCursor(-1);
    setStatus("Cleared your recent commands from this desk.");
  }

  return {
    commandInput,
    setCommandInput,
    commandHistory,
    setCommandHistory,
    historyCursor,
    setHistoryCursor,
    commandInputRef,
    isRunningCommand,
    commandHints,
    runCommandInternal,
    runPresetCommand,
    clearCommandHistory
  };
}
