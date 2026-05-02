import { useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Note } from "../../../shared/types";
import { QUERY_REFRESH_DEBOUNCE_MS } from "../../constants/timing";
import { getErrorMessage } from "../../lib/errors";
import { useWorkspaceStore } from "../../stores/workspaceStore";
type SetError = (message: string) => void;

export function useAssistantData(setError: SetError) {
  const { query, setQuery, notes, reminders, devices, logs, rules, isRefreshing, setNotes, setReminders } =
    useWorkspaceStore(
      useShallow((s) => ({
        query: s.query,
        setQuery: s.setQuery,
        notes: s.notes,
        reminders: s.reminders,
        devices: s.devices,
        logs: s.logs,
        rules: s.rules,
        isRefreshing: s.isRefreshing,
        setNotes: s.setNotes,
        setReminders: s.setReminders
      }))
    );
  const setFromFullRefresh = useWorkspaceStore((s) => s.setFromFullRefresh);
  const setIsRefreshing = useWorkspaceStore((s) => s.setIsRefreshing);

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
  }, [setError, setNotes]);

  const fetchRemindersOnly = useCallback(async (): Promise<void> => {
    const api = window.assistantApi;
    if (!api?.listReminders) return;
    try {
      setReminders(await api.listReminders());
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [setError, setReminders]);

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
      setFromFullRefresh({
        notes: noteRows,
        reminders: rems,
        devices: devs,
        logs: logRows,
        rules: ruleRows
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  }, [setError, setFromFullRefresh, setIsRefreshing]);

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

  const mergeNote = useCallback(
    (note: Note) => {
      setNotes((prev) => prev.map((x) => (x.id === note.id ? note : x)));
    },
    [setNotes]
  );

  const removeNoteById = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((x) => x.id !== id));
    },
    [setNotes]
  );

  return {
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
  };
}
