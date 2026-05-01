import { useCallback, useEffect, useRef, useState } from "react";
import type { Note, Reminder } from "../../../shared/types";
import { QUERY_REFRESH_DEBOUNCE_MS } from "../../constants/timing";
import { getErrorMessage } from "../../lib/errors";
import type { AutomationRuleListItem, ExecutionLogRow, HaDeviceRow } from "../../types";

type SetError = (message: string) => void;

export function useAssistantData(setError: SetError) {
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [devices, setDevices] = useState<HaDeviceRow[]>([]);
  const [logs, setLogs] = useState<ExecutionLogRow[]>([]);
  const [rules, setRules] = useState<AutomationRuleListItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      setError("");
      setIsRefreshing(true);
      setNotes(await window.assistantApi.listNotes(query));
      setReminders(await window.assistantApi.listReminders());
      setDevices(await window.assistantApi.listDevices());
      setLogs(await window.assistantApi.listExecutionLogs());
      setRules(await window.assistantApi.listRules());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  }, [query, setError]);

  const refreshRef = useRef(refreshAll);
  refreshRef.current = refreshAll;

  useEffect(() => {
    void refreshRef.current();
    return window.assistantApi.onRemindersUpdated(() => void refreshRef.current());
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void refreshRef.current(), QUERY_REFRESH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  return {
    query,
    setQuery,
    notes,
    reminders,
    devices,
    logs,
    rules,
    isRefreshing,
    refreshAll
  };
}
