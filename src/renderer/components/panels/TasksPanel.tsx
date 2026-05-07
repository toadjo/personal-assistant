import { memo, useState } from "react";
import type { Task } from "../../../shared/types";
import type { TaskFilter } from "../../types";
import { Check, ListTodo, Trash2 } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import { EmptyState } from "../ui/EmptyState";

type Props = {
  filter: TaskFilter;
  setFilter: (value: TaskFilter) => void;
  tasks: Task[];
  onSaveTask: (payload: {
    title: string;
    notes: string;
    dueAt: string | null;
    priority: "low" | "normal" | "high";
    recurrence: "none" | "daily" | "weekly" | "monthly";
  }) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export const TasksPanel = memo(function TasksPanel({
  filter,
  setFilter,
  tasks,
  onSaveTask,
  onComplete,
  onDelete
}: Props): JSX.Element {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAtLocal, setDueAtLocal] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none");

  async function onSubmit(): Promise<void> {
    const trimmed = title.trim();
    if (!trimmed) return;
    await onSaveTask({
      title: trimmed,
      notes: notes.trim(),
      dueAt: dueAtLocal ? new Date(dueAtLocal).toISOString() : null,
      priority,
      recurrence
    });
    setTitle("");
    setNotes("");
    setDueAtLocal("");
    setPriority("normal");
    setRecurrence("none");
  }

  return (
    <section className="panel" aria-labelledby="tasks-panel-heading">
      <PanelHeader
        icon={ListTodo}
        title="Tasks"
        actions={
          <select
            aria-label="Filter tasks"
            className="themeSelect themeSelectWide"
            value={filter}
            onChange={(event) => setFilter(event.target.value as TaskFilter)}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="done">Done</option>
            <option value="overdue">Overdue</option>
          </select>
        }
      />
      <div className="notesGrid">
        <div className="noteCard">
          <input
            className="fullWidth"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="fullWidth"
            placeholder="Notes (optional)"
            value={notes}
            rows={2}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="row" style={{ gap: "0.5rem" }}>
            <input
              type="datetime-local"
              className="fullWidth"
              aria-label="Task due date"
              value={dueAtLocal}
              onChange={(e) => setDueAtLocal(e.target.value)}
            />
            <select value={priority} onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high")}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as "none" | "daily" | "weekly" | "monthly")}
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button type="button" className="commandAction" onClick={() => void onSubmit()}>
              Add
            </button>
          </div>
        </div>
        {tasks.length ? (
          tasks.map((task) => (
            <article key={task.id} className={`noteCard ${task.status === "open" ? "" : "noteCardPinned"}`}>
              <div className="noteCardContent">
                <h3>{task.title}</h3>
                <p>{task.notes || "No notes"}</p>
                <p className="reminderCardMeta">
                  {task.dueAt ? new Date(task.dueAt).toLocaleString() : "No due date"} • {task.priority} •{" "}
                  {task.recurrence}
                </p>
                <span className={`pill ${task.status === "open" ? "" : "graphitePill"}`}>{task.status}</span>
              </div>
              <div className="noteCardActions">
                {task.status === "open" ? (
                  <IconButton
                    icon={Check}
                    label={`Complete task ${task.title}`}
                    onClick={() => void onComplete(task.id)}
                    variant="ghost"
                    size={14}
                  />
                ) : null}
                <IconButton
                  icon={Trash2}
                  label={`Delete task ${task.title}`}
                  onClick={() => void onDelete(task.id)}
                  variant="danger"
                  size={14}
                />
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            icon={ListTodo}
            title="No tasks yet"
            description="Create tasks to drive your day, even without Home Assistant."
          />
        )}
      </div>
    </section>
  );
});
