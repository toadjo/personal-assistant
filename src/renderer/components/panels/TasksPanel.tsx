import { memo, useState } from "react";
import type { Task } from "../../../shared/types";
import type { TaskFilter } from "../../types";
import { Check, ListTodo, Trash2, RotateCcw } from "lucide-react";
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
  onBulkComplete?: (ids: string[]) => Promise<void>;
  onUpdatePriority?: (id: string, priority: "low" | "normal" | "high") => Promise<void>;
  onUndo?: () => Promise<void>;
  canUndo?: boolean;
};

export const TasksPanel = memo(function TasksPanel({
  filter,
  setFilter,
  tasks,
  onSaveTask,
  onComplete,
  onDelete,
  onBulkComplete,
  onUpdatePriority,
  onUndo,
  canUndo
}: Props): JSX.Element {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAtLocal, setDueAtLocal] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = tasks.length > 0 && tasks.every((t) => selectedIds.has(t.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(tasks.map((t) => t.id)));
  };

  const handleBulkComplete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length > 0 && onBulkComplete) {
      void onBulkComplete(ids);
      setSelectedIds(new Set());
    }
  };

  const cyclePriority = (task: Task) => {
    const next: "low" | "normal" | "high" =
      task.priority === "low" ? "normal" : task.priority === "normal" ? "high" : "low";
    void onUpdatePriority?.(task.id, next);
  };

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
        {tasks.length > 0 && (
          <div className="row" style={{ gap: "0.5rem", padding: "0 var(--space-3)" }}>
            <label className="appearanceToggle">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              All
            </label>
            {selectedIds.size > 0 && onBulkComplete && (
              <button type="button" className="commandAction" onClick={handleBulkComplete}>
                Complete {selectedIds.size}
              </button>
            )}
            {canUndo && onUndo && (
              <IconButton icon={RotateCcw} label="Undo last action" onClick={() => void onUndo()} variant="ghost" size={14} />
            )}
          </div>
        )}
        {tasks.length ? (
          tasks.map((task) => (
            <article key={task.id} className={`noteCard ${task.status === "open" ? "" : "noteCardPinned"}`}>
              <div className="noteCardContent" style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(task.id)}
                  onChange={() => toggleSelection(task.id)}
                  aria-label={`Select task: ${task.title}`}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>{task.title}</h3>
                  <p>{task.notes || "No notes"}</p>
                  <p className="reminderCardMeta">
                    {task.dueAt ? new Date(task.dueAt).toLocaleString() : "No due date"} •{" "}
                    <button
                      type="button"
                      className="pill"
                      onClick={() => cyclePriority(task)}
                      title="Click to change priority"
                    >
                      {task.priority}
                    </button>{" "}
                    • {task.recurrence}
                  </p>
                  <span className={`pill ${task.status === "open" ? "" : "graphitePill"}`}>{task.status}</span>
                </div>
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
            description="Create tasks to organize your work."
          />
        )}
      </div>
    </section>
  );
});
