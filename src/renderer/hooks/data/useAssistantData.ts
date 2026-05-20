import { useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Note, ExecutionLog } from "../../../shared/types";
import { QUERY_REFRESH_DEBOUNCE_MS } from "../../constants/timing";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { getAssistantApi } from "../../lib/assistantApi";
type SetError = (message: string) => void;

export function useAssistantData(setError: SetError) {
  const {
    query,
    setQuery,
    notes,
    reminders,
    tasks,
    devices,
    logs,
    rules,
    isRefreshing,
    setNotes,
    setReminders,
    setTasks,
    setDevices,
    setLogs,
    setRules
  } = useWorkspaceStore(
    useShallow((s) => ({
      query: s.query,
      setQuery: s.setQuery,
      notes: s.notes,
      reminders: s.reminders,
      tasks: s.tasks,
      devices: s.devices,
      logs: s.logs,
      rules: s.rules,
      isRefreshing: s.isRefreshing,
      setNotes: s.setNotes,
      setReminders: s.setReminders,
      setTasks: s.setTasks,
      setDevices: s.setDevices,
      setLogs: s.setLogs,
      setRules: s.setRules
    }))
  );
  const setFromFullRefresh = useWorkspaceStore((s) => s.setFromFullRefresh);
  const setIsRefreshing = useWorkspaceStore((s) => s.setIsRefreshing);

  const queryRef = useRef(query);
  queryRef.current = query;

  const refreshNotes = useCallback(async (): Promise<void> => {
    const api = getAssistantApi();
    if (!api?.listNotes) return;
    try {
      setNotes(await api.listNotes(queryRef.current));
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }, [setError, setNotes]);

  const refreshReminders = useCallback(async (): Promise<void> => {
    const api = getAssistantApi();
    if (!api?.listReminders) return;
    try {
      setReminders(await api.listReminders());
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }, [setError, setReminders]);

  const refreshTasks = useCallback(async (): Promise<void> => {
    const api = getAssistantApi();
    if (!api?.listTasks) return;
    try {
      setTasks(await api.listTasks());
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }, [setError, setTasks]);

  const refreshDevices = useCallback(async (): Promise<void> => {
    const api = getAssistantApi();
    if (!api?.listDevices) return;
    try {
      setDevices(await api.listDevices());
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }, [setError, setDevices]);

  const refreshLogs = useCallback(async (): Promise<void> => {
    const api = getAssistantApi();
    if (!api?.listExecutionLogs) return;
    try {
      const rows = await api.listExecutionLogs();
      const transformed: ExecutionLog[] = rows.map(
        (l: {
          id: string;
          ruleId: string;
          status: string;
          startedAt: string;
          endedAt: string;
          error?: string;
          attemptCount: number;
          retryCount: number;
          ruleName?: string;
          actionLabel?: string;
        }) => ({
          id: l.id,
          ruleId: l.ruleId,
          status: l.status as "success" | "failed",
          startedAt: l.startedAt,
          endedAt: l.endedAt,
          error: l.error,
          attemptCount: l.attemptCount,
          retryCount: l.retryCount,
          ruleName: l.ruleName,
          actionLabel: l.actionLabel
        })
      );
      setLogs(transformed);
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }, [setError, setLogs]);

  const refreshRules = useCallback(async (): Promise<void> => {
    const api = getAssistantApi();
    if (!api?.listRules) return;
    try {
      setRules(await api.listRules());
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }, [setError, setRules]);

  const refreshAll = useCallback(async () => {
    const api = getAssistantApi();
    if (!api?.listNotes) return;
    try {
      setError("");
      setIsRefreshing(true);
      const [noteRows, rems, taskRows, devs, logRows, ruleRows] = await Promise.all([
        api.listNotes(queryRef.current),
        api.listReminders(),
        api.listTasks(),
        api.listDevices(),
        api.listExecutionLogs(),
        api.listRules()
      ]);
      // Transform log rows to match ExecutionLogRow type
      const transformedLogs: ExecutionLog[] = logRows.map(
        (l: {
          id: string;
          ruleId: string;
          status: string;
          startedAt: string;
          endedAt: string;
          error?: string;
          attemptCount: number;
          retryCount: number;
          ruleName?: string;
          actionLabel?: string;
        }) => ({
          id: l.id,
          ruleId: l.ruleId,
          status: l.status as "success" | "failed",
          startedAt: l.startedAt,
          endedAt: l.endedAt,
          error: l.error,
          attemptCount: l.attemptCount,
          retryCount: l.retryCount,
          ruleName: l.ruleName,
          actionLabel: l.actionLabel
        })
      );
      setFromFullRefresh({
        notes: noteRows,
        reminders: rems,
        tasks: taskRows,
        devices: devs,
        logs: transformedLogs,
        rules: ruleRows
      });
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  }, [setError, setFromFullRefresh, setIsRefreshing]);

  const refreshRef = useRef(refreshAll);
  refreshRef.current = refreshAll;

  useEffect(() => {
    const api = getAssistantApi();
    if (!api?.onRemindersUpdated) {
      // Don't show scary warning on initial passive load
      // Only user-triggered actions should fail with the bridge missing message
      return;
    }
    void refreshRef.current();
    return api.onRemindersUpdated(() => {
      void (async () => {
        try {
          setReminders(await api.listReminders());
        } catch (err) {
          setError(getAssistantInvokeErrorMessage(err));
        }
      })();
    });
  }, [setError, setReminders]);

  useEffect(() => {
    const id = window.setTimeout(() => void refreshNotes(), QUERY_REFRESH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query, refreshNotes]);

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
    tasks,
    devices,
    logs,
    rules,
    isRefreshing,
    refreshAll,
    refreshNotes,
    refreshReminders,
    refreshTasks,
    refreshDevices,
    refreshLogs,
    refreshRules,
    mergeNote,
    removeNoteById,
    setTasks
  };
}
