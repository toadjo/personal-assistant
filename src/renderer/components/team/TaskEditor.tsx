import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { StatusBanner } from "../layout/StatusBanner";
import type { TeamProjectTask } from "../../../shared/team/types";
import type { TeamState } from "../../hooks/team/useTeamState";

type Props = {
  task: TeamProjectTask | null;
  team: TeamState;
  onCancel: () => void;
};

export function TaskEditor({ task, team, onCancel }: Props): JSX.Element | null {
  const [editTaskTitle, setEditTaskTitle] = useState(task?.title ?? "");
  const [editTaskNotes, setEditTaskNotes] = useState(task?.notes ?? "");
  const [editTaskDueAt, setEditTaskDueAt] = useState(
    task?.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : ""
  );
  const [editTaskPriority, setEditTaskPriority] = useState<"low" | "normal" | "high">(task?.priority ?? "normal");
  const [editTaskRecurrence, setEditTaskRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">(
    task?.recurrence ?? "none"
  );
  const [editTaskAssigneeDisplayName, setEditTaskAssigneeDisplayName] = useState(task?.assigneeDisplayName ?? "");
  const [editTaskStatus, setEditTaskStatus] = useState<"open" | "done">(task?.status ?? "open");
  const [isSaving, setIsSaving] = useState(false);
  const [editValidationError, setEditValidationError] = useState<string | null>(null);

  const taskId = task?.id;
  useEffect(() => {
    if (!task) return;
    setEditTaskTitle(task.title);
    setEditTaskNotes(task.notes || "");
    setEditTaskDueAt(task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : "");
    setEditTaskPriority(task.priority);
    setEditTaskRecurrence(task.recurrence);
    setEditTaskAssigneeDisplayName(task.assigneeDisplayName || "");
    setEditTaskStatus(task.status);
    setEditValidationError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  if (!task) return null;

  const handleSaveEdit = async () => {
    setEditValidationError(null);

    if (!editTaskTitle.trim()) {
      setEditValidationError("Task title is required");
      return;
    }

    if (editTaskRecurrence !== "none" && !editTaskDueAt.trim()) {
      setEditValidationError("Recurring tasks require a due date");
      return;
    }

    const dueAtIso = editTaskDueAt.trim() ? new Date(editTaskDueAt).toISOString() : null;

    setIsSaving(true);
    try {
      await team.updateTask({
        ...task,
        title: editTaskTitle,
        notes: editTaskNotes,
        dueAt: dueAtIso,
        priority: editTaskPriority,
        recurrence: editTaskRecurrence,
        assigneeDisplayName: editTaskAssigneeDisplayName || null,
        status: editTaskStatus
      });
      onCancel();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="taskEditForm">
      {editValidationError && <StatusBanner status="" error={editValidationError} />}
      <div className="formGroup">
        <label htmlFor="editTaskTitle">Title</label>
        <input
          id="editTaskTitle"
          type="text"
          placeholder="Task title"
          value={editTaskTitle}
          onChange={(e) => setEditTaskTitle(e.target.value)}
          className="input"
        />
      </div>
      <div className="formGroup">
        <label htmlFor="editTaskNotes">Notes</label>
        <textarea
          id="editTaskNotes"
          placeholder="Task notes"
          value={editTaskNotes}
          onChange={(e) => setEditTaskNotes(e.target.value)}
          className="input"
        />
      </div>
      <div className="formGroup">
        <label htmlFor="editTaskDueAt">Due Date</label>
        <input
          id="editTaskDueAt"
          type="datetime-local"
          value={editTaskDueAt}
          onChange={(e) => setEditTaskDueAt(e.target.value)}
          className="input"
        />
      </div>
      <div className="formGroup">
        <label htmlFor="editTaskPriority">Priority</label>
        <select
          id="editTaskPriority"
          value={editTaskPriority}
          onChange={(e) => setEditTaskPriority(e.target.value as "low" | "normal" | "high")}
          className="input"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="formGroup">
        <label htmlFor="editTaskRecurrence">Recurrence</label>
        <select
          id="editTaskRecurrence"
          value={editTaskRecurrence}
          onChange={(e) => setEditTaskRecurrence(e.target.value as "none" | "daily" | "weekly" | "monthly")}
          className="input"
        >
          <option value="none">None</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div className="formGroup">
        <label htmlFor="editTaskAssignee">Assignee</label>
        <input
          id="editTaskAssignee"
          type="text"
          placeholder="Assignee name"
          value={editTaskAssigneeDisplayName}
          onChange={(e) => setEditTaskAssigneeDisplayName(e.target.value)}
          className="input"
        />
      </div>
      <div className="formGroup">
        <label htmlFor="editTaskStatus">Status</label>
        <select
          id="editTaskStatus"
          value={editTaskStatus}
          onChange={(e) => setEditTaskStatus(e.target.value as "open" | "done")}
          className="input"
        >
          <option value="open">Open</option>
          <option value="done">Done</option>
        </select>
      </div>
      <div className="formActions">
        <button type="button" className="button buttonPrimary" onClick={handleSaveEdit} disabled={isSaving}>
          {isSaving ? <Loader2 size={16} className="spin" /> : "Save"}
        </button>
        <button type="button" className="button buttonSecondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
