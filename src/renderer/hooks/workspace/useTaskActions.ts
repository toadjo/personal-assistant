import { useMemo, useState } from "react";
import type { Task } from "../../../shared/types";
import type { TaskFilter } from "../../types";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";

export function useTaskActions(
  tasks: Task[],
  setStatus: (value: string) => void,
  setError: (value: string) => void,
  fetchTasksOnly: () => Promise<void>
) {
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");

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
    return overdueOpen;
  }, [taskFilter, tasks, overdueOpen]);

  async function completeById(id: string): Promise<void> {
    try {
      await window.assistantApi.completeTask(id);
      await fetchTasksOnly();
      setStatus("Task updated.");
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function deleteById(id: string): Promise<void> {
    try {
      await window.assistantApi.deleteTask(id);
      await fetchTasksOnly();
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
      await fetchTasksOnly();
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
    saveTask
  };
}
