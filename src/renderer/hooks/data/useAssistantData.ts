import { useCallback, useEffect, useRef, useState } from "react";
import type { AutomationRule, Note, Reminder } from "../../../shared/types";
import { QUERY_REFRESH_DEBOUNCE_MS } from "../../constants/timing";
import { getErrorMessage } from "../../lib/errors";
import type { ExecutionLogRow, HaDeviceRow } from "../../types";

type SetError = (message: string) => void;

export function useAssistantData(setError: SetError) {
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [devices, setDevices] = useState<HaDeviceRow[]>([]);
  const [logs, setLogs] = useState<ExecutionLogRow[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(true);

  const queryRef = useRef(query);
  queryRef.current = query;

  const fetchNotesOnly = useCallback(async (): Promise<void> => {
    const api = window.assistantApi;
    if (!api?.listNotes) return;
    try {
      setNotes(await api.listNotes(queryRef.current));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [setError]);

  const refreshAll = useCallback(async () => {
    const api = window.assistantApi;
    if (!api?.listNotes) return;
    try {
      setError("");
      setIsRefreshing(true);
      const [noteRows, rems, devs, logRows, ruleRows] = await Promise.all([
        api.listNotes(queryRef.current),
        api.listReminders(),
        api.listDevices(),
        api.listExecutionLogs(),
        api.listRules()
      ]);
      setNotes(noteRows);
      setReminders(rems);
      setDevices(devs);
      setLogs(logRows);
      setRules(ruleRows);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  }, [setError]);

  const refreshRef = useRef(refreshAll);
  refreshRef.current = refreshAll;

  useEffect(() => {
    const api = window.assistantApi;
    if (!api?.onRemindersUpdated) {
      setError(
        "This window is not running inside the Electron app (preload bridge missing). Open the app from the tray or use npm run dev."
      );
      return;
    }
    void refreshRef.current();
    return api.onRemindersUpdated(() => {
      void (async () => {
        try {
          setReminders(await api.listReminders());
        } catch (err) {
          setError(getErrorMessage(err));
        }
      })();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void fetchNotesOnly(), QUERY_REFRESH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query, fetchNotesOnly]);

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
