import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Reminder } from "../../../shared/types";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { requireAssistantApi } from "../../lib/assistantApi";
import { workspaceQueryKeys } from "../../lib/query/keys";

type SetStatus = (value: string) => void;
type SetError = (message: string) => void;

export function useReminderActions(setStatus: SetStatus, setError: SetError) {
  const queryClient = useQueryClient();
  const updateReminderCache = (
    updater: (prev: Reminder[]) => Reminder[],
    fallback: Reminder[] | undefined = []
  ): Reminder[] => {
    const previous = queryClient.getQueryData<Reminder[]>(workspaceQueryKeys.reminders()) ?? fallback;
    queryClient.setQueryData<Reminder[]>(workspaceQueryKeys.reminders(), (prev = []) => updater(prev));
    return previous;
  };

  const completeMutation = useMutation({
    mutationFn: async (id: string) => requireAssistantApi().completeReminder(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: workspaceQueryKeys.reminders() });
      const previousReminders = updateReminderCache((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "done" } : r))
      );
      return { previousReminders };
    },
    onError: (err, _id, context) => {
      queryClient.setQueryData(workspaceQueryKeys.reminders(), context?.previousReminders ?? []);
      setError(getAssistantInvokeErrorMessage(err));
    },
    onSuccess: () => setStatus("Marked that follow-up as done."),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.reminders() });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => requireAssistantApi().deleteReminder(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: workspaceQueryKeys.reminders() });
      const previousReminders = updateReminderCache((prev) => prev.filter((r) => r.id !== id));
      return { previousReminders };
    },
    onError: (err, _id, context) => {
      queryClient.setQueryData(workspaceQueryKeys.reminders(), context?.previousReminders ?? []);
      setError(getAssistantInvokeErrorMessage(err));
    },
    onSuccess: () => setStatus("Follow-up deleted."),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.reminders() });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; text?: string; dueAt?: string }) => requireAssistantApi().updateReminder(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: workspaceQueryKeys.reminders() });
      const previousReminders = updateReminderCache((prev) =>
        prev.map((r) => (r.id === payload.id ? { ...r, ...payload } : r))
      );
      return { previousReminders };
    },
    onError: (err, _payload, context) => {
      queryClient.setQueryData(workspaceQueryKeys.reminders(), context?.previousReminders ?? []);
      setError(getAssistantInvokeErrorMessage(err));
    },
    onSuccess: () => setStatus("Reminder updated."),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.reminders() });
    }
  });

  const snoozeMutation = useMutation({
    mutationFn: async (payload: { id: string; minutes: number }) => requireAssistantApi().snoozeReminder(payload.id, payload.minutes),
    onMutate: async ({ id, minutes }) => {
      await queryClient.cancelQueries({ queryKey: workspaceQueryKeys.reminders() });
      const previousReminders = updateReminderCache((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                dueAt: new Date(new Date(r.dueAt).getTime() + minutes * 60_000).toISOString()
              }
            : r
        )
      );
      return { previousReminders };
    },
    onError: (err, _payload, context) => {
      queryClient.setQueryData(workspaceQueryKeys.reminders(), context?.previousReminders ?? []);
      setError(getAssistantInvokeErrorMessage(err));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.reminders() });
    }
  });

  async function snoozeReminderMinutes(id: string, minutes: number, okMessage: string): Promise<void> {
    try {
      await snoozeMutation.mutateAsync({ id, minutes });
      setStatus(okMessage);
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function completeReminderById(id: string): Promise<void> {
    try {
      await completeMutation.mutateAsync(id);
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function deleteReminderById(id: string): Promise<void> {
    if (!window.confirm("Delete this reminder?")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function updateReminderById(id: string, text?: string, dueAt?: string): Promise<void> {
    try {
      await updateMutation.mutateAsync({ id, text, dueAt });
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  return { snoozeReminderMinutes, completeReminderById, deleteReminderById, updateReminderById };
}
