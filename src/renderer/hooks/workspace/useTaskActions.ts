import { useMemo, useState } from "react";
import type { Task } from "../../../shared/types";
import type { TaskFilter } from "../../types";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";

export type UndoableTaskAction = {
  type: "priority";
  taskId: string;
  previousValue: string;
};

export function useTaskActions(
  tasks: Task[],
  setStatus: (value: string) => void,
  setError: (value: string) => void,
  refreshTasks: () => Promise<void>
) {
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

  async function completeById(id: string): Promise<void> {
    try {
      await window.assistantApi.completeTask(id);
      await refreshTasks();
      setStatus("Task updated.");
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function deleteById(id: string): Promise<void> {
    try {
      await window.assistantApi.deleteTask(id);
      await refreshTasks();
      setStatus("Task deleted.");
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
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
      if (payload.id) {
        await window.assistantApi.updateTask({
          id: payload.id,
          title: payload.title,
          notes: payload.notes,
          dueAt: payload.dueAt,
          priority: payload.priority,
          recurrence: payload.recurrence
        });
        setStatus("Task updated.");
      } else {
        await window.assistantApi.createTask(payload);
        setStatus("Task created.");
      }
      await refreshTasks();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function updateDetailsById(id: string, title: string, notes: string): Promise<void> {
    try {
      await window.assistantApi.updateTask({ id, title, notes });
      await refreshTasks();
      setStatus("Task updated.");
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function bulkComplete(ids: string[]): Promise<void> {
    try {
      await Promise.all(ids.map((id) => window.assistantApi.completeTask(id)));
      await refreshTasks();
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
      await window.assistantApi.updateTask({
        id,
        title: task.title,
        notes: task.notes,
        dueAt: task.dueAt,
        priority,
        recurrence: task.recurrence
      });
      await refreshTasks();
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
        await window.assistantApi.updateTask({
          id: action.taskId,
          title: task.title,
          notes: task.notes,
          dueAt: task.dueAt,
          priority: action.previousValue as "low" | "normal" | "high",
          recurrence: task.recurrence
        });
      }
      setStatus("Priority restored.");
      await refreshTasks();
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
