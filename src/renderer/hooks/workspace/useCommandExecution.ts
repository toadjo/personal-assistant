import { useEffect, useMemo, useRef, useState } from "react";
import type { ReminderFilter, TaskFilter } from "../../types";
import type { DailyCommandCenterFilter } from "../../lib/derived/daily-command-center";
import { executeAssistantCommand } from "../../command/executeAssistantCommand";
import { MAX_COMMAND_HISTORY, COMMAND_HINT_SAMPLES } from "../../constants/command";
import { COMMAND_HISTORY_PERSIST_DEBOUNCE_MS } from "../../constants/timing";
import { normalizeCommandAlias } from "../../lib/commands";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { persistCommandHistory, loadCommandHistory } from "../../lib/storage/commandHistory";
import type { AiActionDraft } from "../../../shared/ai/types";
import type { HaDeviceRow } from "../../types";
import { getAssistantApi, requireAssistantApi } from "../../lib/assistantApi";

type SetStatus = (value: string) => void;
type SetError = (value: string) => void;

type RunDeviceToggle = (entityId: string, friendlyName: string) => Promise<void>;
const UNKNOWN_COMMAND_MESSAGE = "I do not recognize that yet. Type help for ideas, or rephrase.";

export function useCommandExecution(args: {
  devices: HaDeviceRow[];
  haReady: boolean;
  setQuery: (value: string) => void;
  setReminderFilter: (value: ReminderFilter) => void;
  setTaskFilter: (value: TaskFilter) => void;
  setDailyCommandCenterFilter?: (value: DailyCommandCenterFilter) => void;
  setStatus: SetStatus;
  setError: SetError;
  refreshAll: () => Promise<void>;
  runDeviceToggle: RunDeviceToggle;
  notesCount: number;
  tasksCount: number;
  remindersCount: number;
  aiConfigured: boolean;
  onReviewDay?: () => void;
  onQuickCapture?: (type: "note" | "task" | "reminder" | "inbox", text: string) => void;
}) {
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
    onReviewDay,
    onQuickCapture
  } = args;

  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState(loadCommandHistory);
  const [historyCursor, setHistoryCursor] = useState(-1);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const [isRunningCommand, setIsRunningCommand] = useState(false);
  const [aiDraft, setAiDraft] = useState<AiActionDraft | null>(null);
  const [aiReply, setAiReply] = useState<string | null>(null);

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
    const api = getAssistantApi();
    if (!api?.onCommand) {
      return;
    }
    const off = api.onCommand((_event: unknown, command: string) => {
      // Handle quick capture commands
      if (command === "quick capture" || command === "capture") {
        onQuickCapture?.("inbox", "");
        setStatus("Quick capture opened.");
        return;
      }
      
      // Handle typed quick capture commands
      if (command.startsWith("capture note ")) {
        const text = command.replace("capture note ", "");
        onQuickCapture?.("note", text);
        setStatus("Quick capture opened.");
        return;
      }
      if (command.startsWith("capture task ")) {
        const text = command.replace("capture task ", "");
        onQuickCapture?.("task", text);
        setStatus("Quick capture opened.");
        return;
      }
      if (command.startsWith("capture reminder ")) {
        const text = command.replace("capture reminder ", "");
        onQuickCapture?.("reminder", text);
        setStatus("Quick capture opened.");
        return;
      }
      if (command.startsWith("capture ")) {
        const text = command.replace("capture ", "");
        onQuickCapture?.("inbox", text);
        setStatus("Quick capture opened.");
        return;
      }

      // Default behavior for other commands
      setCommandInput(command === "new note" ? "new note " : command);
      commandInputRef.current?.focus();
      setStatus(`Quick command: "${command}" - tell me if you want anything else.`);
    });
    return off;
  }, [setStatus, onQuickCapture]);

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      return target.isContentEditable;
    }

    function onKey(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        commandInputRef.current?.focus();
        return;
      }
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (isEditableTarget(event.target)) return;
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
      const result = await executeAssistantCommand({
        rawInput: trimmed,
        devices,
        haReady,
        setQuery,
        setReminderFilter,
        setTaskFilter,
        setDailyCommandCenterFilter,
        setStatus,
        refreshHomeAssistantEntities: async () => {
          const api = getAssistantApi();
          await api?.refreshHomeAssistantEntities?.();
        },
        runDeviceToggle,
        onReviewDay,
        onQuickCapture
      });
      setCommandHistory((prev) => {
        const next = [normalized, ...prev.filter((item) => item.toLowerCase() !== normalized.toLowerCase())];
        return next.slice(0, MAX_COMMAND_HISTORY);
      });
      setHistoryCursor(-1);
      setCommandInput("");
      if (result.mutated) {
        await Promise.race([
          refreshAll(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Refresh timeout")), 10000))
        ]).catch(() => {
          console.error("Refresh failed or timed out, but continuing");
        });
      }
    } catch (err) {
      const errorMessage = getAssistantInvokeErrorMessage(err);
      if (errorMessage === UNKNOWN_COMMAND_MESSAGE) {
        await tryAiFallback(trimmed);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsRunningCommand(false);
    }
  }

  async function tryAiFallback(command: string): Promise<void> {
    if (!aiConfigured) {
      setError(UNKNOWN_COMMAND_MESSAGE);
      return;
    }

    try {
      const api = requireAssistantApi();
      if (!api?.aiChat) {
        setError("AI chat is unavailable. Restart the app and try again.");
        return;
      }
      const response = await api.aiChat({
        message: command,
        context: {
          notesCount,
          tasksCount,
          remindersCount,
          devicesCount: devices.length
        }
      });
      setAiReply(response.reply);
      if (response.actionDraft) {
        setAiDraft(response.actionDraft);
      } else {
        setStatus(response.reply);
      }
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function confirmAiDraft(): Promise<void> {
    if (!aiDraft) return;
    try {
      setIsRunningCommand(true);
      const api = requireAssistantApi();
      switch (aiDraft.type) {
        case "create_note": {
          await api?.createNote({
            title: aiDraft.title,
            content: aiDraft.content || "",
            tags: [],
            pinned: false
          });
          setStatus("Created note.");
          break;
        }
        case "create_task": {
          await api?.createTask({
            title: aiDraft.title,
            notes: aiDraft.notes || "",
            dueAt: aiDraft.dueAt || null,
            priority: aiDraft.priority === "low" ? "low" : aiDraft.priority === "high" ? "high" : "normal",
            recurrence: "none"
          });
          setStatus("Created task.");
          break;
        }
        case "create_reminder": {
          await api?.createReminder({
            text: aiDraft.text,
            dueAt: aiDraft.dueAt,
            recurrence: "none"
          });
          setStatus("Created reminder.");
          break;
        }
        case "toggle_device": {
          await runDeviceToggle(aiDraft.entityId, aiDraft.friendlyName || aiDraft.entityId);
          setStatus("Toggled device.");
          break;
        }
      }
      setAiDraft(null);
      setAiReply(null);
      setCommandInput("");
      await refreshAll();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsRunningCommand(false);
    }
  }

  function cancelAiDraft(): void {
    setAiDraft(null);
    setAiReply(null);
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
    clearCommandHistory,
    aiDraft,
    aiReply,
    confirmAiDraft,
    cancelAiDraft
  };
}
