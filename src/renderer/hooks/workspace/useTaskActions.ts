import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "../../../shared/types";
import type { TaskFilter } from "../../types";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { requireAssistantApi } from "../../lib/assistantApi";
import { workspaceQueryKeys } from "../../lib/query/keys";

export type UndoableTaskAction = {
  type: "priority";
  taskId: string;
  previousValue: string;
};

export function useTaskActions(
  tasks: Task[],
  setStatus: (value: string) => void,
  setError: (value: string) => void
) {
  const queryClient = useQueryClient();
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [undoStack, setUndoStack] = useState<UndoableTaskAction[]>([]);

  const overdueOpen = useMemo(
    () => tasks.filter((task) => task.status === "open" && task.dueAt && new Date(task.dueAt).getTime() < Date.now()),
    [tasks]
  );
  const dueTodayOpen = useMemo(() => {
    const now = new Date();
    return tasks.filter((task) => {
      if (task.status !== "open" || !task.dueAt) return false;
      const due = new Date(task.dueAt);
      return (
        due.getFullYear() === now.getFullYear() &&
        due.getMonth() === now.getMonth() &&
        due.getDate() === now.getDate() &&
        due.getTime() >= now.getTime()
      );
    });
  }, [tasks]);
  const visible = useMemo(() => {
    if (taskFilter === "all") return tasks;
    if (taskFilter === "open") return tasks.filter((task) => task.status === "open");
    if (taskFilter === "done") return tasks.filter((task) => task.status === "done");
    if (taskFilter === "overdue") return overdueOpen;
    return tasks;
  }, [taskFilter, tasks, overdueOpen]);

  const completeTaskMutation = useMutation({
    mutationFn: async (id: string) => requireAssistantApi().completeTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: workspaceQueryKeys.tasks() });
      const previousTasks = queryClient.getQueryData<Task[]>(workspaceQueryKeys.tasks()) ?? [];
      queryClient.setQueryData<Task[]>(workspaceQueryKeys.tasks(), (prev = []) =>
        prev.map((task) =>
          task.id === id ? { ...task, status: "done", lastCompletedAt: new Date().toISOString() } : task
        )
      );
      return { previousTasks };
    },
    onError: (err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(workspaceQueryKeys.tasks(), context.previousTasks);
      }
      setError(getAssistantInvokeErrorMessage(err));
    },
    onSuccess: () => {
      setStatus("Task updated.");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.tasks() });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => requireAssistantApi().deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: workspaceQueryKeys.tasks() });
      const previousTasks = queryClient.getQueryData<Task[]>(workspaceQueryKeys.tasks()) ?? [];
      queryClient.setQueryData<Task[]>(workspaceQueryKeys.tasks(), (prev = []) => prev.filter((task) => task.id !== id));
      return { previousTasks };
    },
    onError: (err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(workspaceQueryKeys.tasks(), context.previousTasks);
      }
      setError(getAssistantInvokeErrorMessage(err));
    },
    onSuccess: () => {
      setStatus("Task deleted.");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.tasks() });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      title?: string;
      notes?: string;
      dueAt?: string | null;
      priority?: "low" | "normal" | "high";
      recurrence?: "none" | "daily" | "weekly" | "monthly";
      status?: "open" | "done";
    }) => requireAssistantApi().updateTask(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: workspaceQueryKeys.tasks() });
      const previousTasks = queryClient.getQueryData<Task[]>(workspaceQueryKeys.tasks()) ?? [];
      queryClient.setQueryData<Task[]>(workspaceQueryKeys.tasks(), (prev = []) =>
        prev.map((task) => (task.id === payload.id ? { ...task, ...payload } : task))
      );
      return { previousTasks };
    },
    onError: (err, _payload, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(workspaceQueryKeys.tasks(), context.previousTasks);
      }
      setError(getAssistantInvokeErrorMessage(err));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.tasks() });
    }
  });

  async function completeById(id: string): Promise<void> {
    await completeTaskMutation.mutateAsync(id);
  }

  async function deleteById(id: string): Promise<void> {
    await deleteTaskMutation.mutateAsync(id);
  }

  async function saveTask(payload: {
    id?: string;
    title: string;
    notes: string;
    dueAt: string | null;
    priority: "low" | "normal" | "high";
    recurrence: "none" | "daily" | "weekly" | "monthly";
  }): Promise<void> {
    try {
      const api = requireAssistantApi();
      if (payload.id) {
        await api.updateTask({
          id: payload.id,
          title: payload.title,
          notes: payload.notes,
          dueAt: payload.dueAt,
          priority: payload.priority,
          recurrence: payload.recurrence
        });
        setStatus("Task updated.");
      } else {
        await api.createTask(payload);
        setStatus("Task created.");
      }
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.tasks() });
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function updateDetailsById(id: string, title: string, notes: string): Promise<void> {
    try {
      await updateTaskMutation.mutateAsync({ id, title, notes });
      setStatus("Task updated.");
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function bulkComplete(ids: string[]): Promise<void> {
    try {
      const api = requireAssistantApi();
      await Promise.all(ids.map((id) => api.completeTask(id)));
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.tasks() });
      setStatus(`${ids.length} task${ids.length > 1 ? "s" : ""} completed.`);
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function updatePriority(id: string, priority: "low" | "normal" | "high"): Promise<void> {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const previousPriority = task.priority;
    try {
      setUndoStack((prev) => [...prev, { type: "priority" as const, taskId: id, previousValue: previousPriority }]);
      await updateTaskMutation.mutateAsync({
        id,
        title: task.title,
        notes: task.notes,
        dueAt: task.dueAt,
        priority,
        recurrence: task.recurrence
      });
      setStatus("Priority updated.");
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function undo(): Promise<void> {
    const action = undoStack[undoStack.length - 1];
    if (!action) return;

    try {
      const task = tasks.find((t) => t.id === action.taskId);
      if (task) {
        const api = requireAssistantApi();
        await api.updateTask({
          id: action.taskId,
          title: task.title,
          notes: task.notes,
          dueAt: task.dueAt,
          priority: action.previousValue as "low" | "normal" | "high",
          recurrence: task.recurrence
        });
      }
      setStatus("Priority restored.");
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.tasks() });
      setUndoStack((prev) => prev.slice(0, -1));
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  return {
    taskFilter,
    setTaskFilter,
    overdueOpen,
    dueTodayOpen,
    visible,
    completeById,
    deleteById,
    saveTask,
    bulkComplete,
    updateDetailsById,
    updatePriority,
    undo,
    canUndo: undoStack.length > 0
  };
}
