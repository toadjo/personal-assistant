import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Note, Task } from "../../../shared/types";
import { QUERY_REFRESH_DEBOUNCE_MS } from "../../constants/timing";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { getAssistantApi } from "../../lib/assistantApi";
import { workspaceQueryKeys } from "../../lib/query/keys";
import { fetchDevices, fetchLogs, fetchNotes, fetchReminders, fetchRules, fetchTasks } from "../../lib/query/workspace";
type SetError = (message: string) => void;

export function useAssistantData(setError: SetError) {
  const queryClient = useQueryClient();
  const query = useWorkspaceStore((s) => s.query);
  const setQuery = useWorkspaceStore((s) => s.setQuery);
  const api = getAssistantApi();
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query), QUERY_REFRESH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const notesQuery = useQuery({
    queryKey: workspaceQueryKeys.notes(debouncedQuery),
    queryFn: () => fetchNotes(debouncedQuery),
    enabled: Boolean(api?.listNotes)
  });
  const remindersQuery = useQuery({
    queryKey: workspaceQueryKeys.reminders(),
    queryFn: fetchReminders,
    enabled: Boolean(api?.listReminders)
  });
  const tasksQuery = useQuery({
    queryKey: workspaceQueryKeys.tasks(),
    queryFn: fetchTasks,
    enabled: Boolean(api?.listTasks)
  });
  const devicesQuery = useQuery({
    queryKey: workspaceQueryKeys.devices(),
    queryFn: fetchDevices,
    enabled: Boolean(api?.listDevices)
  });
  const logsQuery = useQuery({
    queryKey: workspaceQueryKeys.logs(),
    queryFn: fetchLogs,
    enabled: Boolean(api?.listExecutionLogs)
  });
  const rulesQuery = useQuery({
    queryKey: workspaceQueryKeys.rules(),
    queryFn: fetchRules,
    enabled: Boolean(api?.listRules)
  });

  useEffect(() => {
    if (!api?.onRemindersUpdated) {
      // Don't show scary warning on initial passive load
      // Only user-triggered actions should fail with the bridge missing message
      return;
    }
    return api.onRemindersUpdated(() => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.reminders() });
    });
  }, [api, queryClient]);

  useEffect(() => {
    const firstError =
      notesQuery.error ??
      remindersQuery.error ??
      tasksQuery.error ??
      devicesQuery.error ??
      logsQuery.error ??
      rulesQuery.error;
    if (firstError) {
      setError(getAssistantInvokeErrorMessage(firstError));
    }
  }, [
    notesQuery.error,
    remindersQuery.error,
    tasksQuery.error,
    devicesQuery.error,
    logsQuery.error,
    rulesQuery.error,
    setError
  ]);

  const refreshNotes = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === workspaceQueryKeys.root[0] && q.queryKey[1] === "notes"
    });
  }, [queryClient]);
  const refreshReminders = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.reminders() });
  }, [queryClient]);
  const refreshTasks = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.tasks() });
  }, [queryClient]);
  const refreshDevices = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.devices() });
  }, [queryClient]);
  const refreshLogs = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.logs() });
  }, [queryClient]);
  const refreshRules = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.rules() });
  }, [queryClient]);
  const refreshAll = useCallback(async (): Promise<void> => {
    setError("");
    await Promise.all([
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === workspaceQueryKeys.root[0] && q.queryKey[1] === "notes"
      }),
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.reminders() }),
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.tasks() }),
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.devices() }),
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.logs() }),
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.rules() })
    ]);
  }, [queryClient, setError]);

  const mergeNote = useCallback(
    (note: Note) => {
      queryClient.setQueriesData(
        {
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === workspaceQueryKeys.root[0] && q.queryKey[1] === "notes"
        },
        (prev: Note[] | undefined) => (prev ? prev.map((x) => (x.id === note.id ? note : x)) : prev)
      );
    },
    [queryClient]
  );

  const removeNoteById = useCallback(
    (id: string) => {
      queryClient.setQueriesData(
        {
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === workspaceQueryKeys.root[0] && q.queryKey[1] === "notes"
        },
        (prev: Note[] | undefined) => (prev ? prev.filter((x) => x.id !== id) : prev)
      );
    },
    [queryClient]
  );

  const setTasks = useCallback(
    (value: Task[] | ((prev: Task[]) => Task[])) => {
      queryClient.setQueryData(workspaceQueryKeys.tasks(), (prev: Task[] | undefined) => {
        const safePrev = prev ?? [];
        return typeof value === "function" ? value(safePrev) : value;
      });
    },
    [queryClient]
  );

  return {
    query,
    setQuery,
    notes: notesQuery.data ?? [],
    reminders: remindersQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    devices: devicesQuery.data ?? [],
    logs: logsQuery.data ?? [],
    rules: rulesQuery.data ?? [],
    isLoading:
      notesQuery.isLoading ||
      remindersQuery.isLoading ||
      tasksQuery.isLoading ||
      devicesQuery.isLoading ||
      logsQuery.isLoading ||
      rulesQuery.isLoading,
    isFetching:
      notesQuery.isFetching ||
      remindersQuery.isFetching ||
      tasksQuery.isFetching ||
      devicesQuery.isFetching ||
      logsQuery.isFetching ||
      rulesQuery.isFetching,
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
