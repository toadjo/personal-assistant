import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { TeamProject } from "../../../shared/team/types";
import type { TeamState } from "../../hooks/team/useTeamState";

type Props = {
  team: TeamState;
  projects: TeamProject[];
  onCancel: () => void;
};

export function TaskCreateForm({ team, projects, onCancel }: Props): JSX.Element {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "normal" | "high">("normal");
  const [taskRecurrence, setTaskRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [taskAssigneeDisplayName, setTaskAssigneeDisplayName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCreateTask = async () => {
    setValidationError(null);
    // Validate required fields
    if (!taskTitle.trim() || !taskProjectId) {
      setValidationError("Task title and project are required");
      return;
    }

    // Validate recurrence requires due date
    if (taskRecurrence !== "none" && !taskDueAt.trim()) {
      setValidationError("Recurring tasks require a due date");
      return;
    }

    // Convert datetime-local to ISO string if provided
    const dueAtIso = taskDueAt.trim() ? new Date(taskDueAt).toISOString() : null;

    const result = await team.createTask({
      projectId: taskProjectId,
      title: taskTitle,
      notes: taskNotes,
      dueAt: dueAtIso,
      priority: taskPriority,
      recurrence: taskRecurrence,
      assigneeDisplayName: taskAssigneeDisplayName || null
    });
    if (result) {
      onCancel();
    }
  };

  return (
    <div className="taskCreateForm">
      <div className="formGroup">
        <label htmlFor="taskProject">Project</label>
        <select
          id="taskProject"
          value={taskProjectId}
          onChange={(e) => setTaskProjectId(e.target.value)}
          className="input"
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      <div className="formGroup">
        <label htmlFor="taskTitle">Title</label>
        <input
          id="taskTitle"
          type="text"
          placeholder="Task title"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          className="input"
        />
      </div>
      <div className="formGroup">
        <label htmlFor="taskNotes">Notes</label>
        <textarea
          id="taskNotes"
          placeholder="Task notes"
          value={taskNotes}
          onChange={(e) => setTaskNotes(e.target.value)}
          className="input"
          rows={3}
        />
      </div>
      <div className="formGroup">
        <label htmlFor="taskDueAt">Due Date (optional)</label>
        <input
          id="taskDueAt"
          type="datetime-local"
          value={taskDueAt}
          onChange={(e) => setTaskDueAt(e.target.value)}
          className="input"
        />
      </div>
      <div className="formGroup">
        <label htmlFor="taskPriority">Priority</label>
        <select
          id="taskPriority"
          value={taskPriority}
          onChange={(e) => setTaskPriority(e.target.value as "low" | "normal" | "high")}
          className="input"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="formGroup">
        <label htmlFor="taskRecurrence">Recurrence</label>
        <select
          id="taskRecurrence"
          value={taskRecurrence}
          onChange={(e) => setTaskRecurrence(e.target.value as "none" | "daily" | "weekly" | "monthly")}
          className="input"
        >
          <option value="none">None</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div className="formGroup">
        <label htmlFor="taskAssigneeDisplayName">Assignee (optional)</label>
        <input
          id="taskAssigneeDisplayName"
          type="text"
          placeholder="Assignee display name"
          value={taskAssigneeDisplayName}
          onChange={(e) => setTaskAssigneeDisplayName(e.target.value)}
          className="input"
        />
      </div>
      {validationError && <div className="formError">{validationError}</div>}
      <div className="formActions">
        <button
          type="button"
          className="button buttonPrimary"
          onClick={handleCreateTask}
          disabled={team.isLoadingTasks}
        >
          {team.isLoadingTasks ? <Loader2 size={16} className="spin" /> : "Create Task"}
        </button>
        <button type="button" className="button buttonSecondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
