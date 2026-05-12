import { useState } from "react";
import type { HaDeviceRow } from "../../types";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";

type Props = {
  devices: HaDeviceRow[];
  onDone: () => Promise<void>;
  onError: (message: string) => void;
  onShowSuccess?: (message: string) => void;
};

export function RuleForm({ devices, onDone, onError, onShowSuccess }: Props): JSX.Element {
  const [name, setName] = useState("Morning check");
  const [at, setAt] = useState("08:00");
  const [actionType, setActionType] = useState<"localReminder" | "localTask" | "haToggle">("localReminder");
  const [text, setText] = useState("Check your agenda");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "normal" | "high">("normal");
  const [taskRecurrence, setTaskRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [entityId, setEntityId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setName("Morning check");
    setAt("08:00");
    setActionType("localReminder");
    setText("Check your agenda");
    setTaskTitle("");
    setTaskNotes("");
    setTaskDueAt("");
    setTaskPriority("normal");
    setTaskRecurrence("none");
    setEntityId("");
  }

  function getActionConfig() {
    switch (actionType) {
      case "localReminder":
        return { text: text.trim() };
      case "localTask":
        return {
          title: taskTitle.trim(),
          notes: taskNotes.trim(),
          dueAt: taskDueAt ? new Date(taskDueAt).toISOString() : null,
          priority: taskPriority,
          recurrence: taskRecurrence
        };
      case "haToggle":
        return { entityId };
    }
  }

  function validate(): string | null {
    if (!name.trim()) return "Name is required.";
    if (!at) return "Time is required.";
    if (actionType === "localReminder" && !text.trim()) return "Reminder text is required.";
    if (actionType === "localTask") {
      if (!taskTitle.trim()) return "Task title is required.";
      if (taskRecurrence !== "none" && !taskDueAt) return "Recurring tasks need a due date.";
    }
    if (actionType === "haToggle" && !entityId) return "Select a device.";
    return null;
  }

  return (
    <div className="row">
      <input aria-label="Rule name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" />
      <input aria-label="Rule trigger time" type="time" value={at} onChange={(e) => setAt(e.target.value)} />
      <select
        aria-label="Rule action type"
        value={actionType}
        onChange={(e) => setActionType(e.target.value as "localReminder" | "localTask" | "haToggle")}
      >
        <option value="localReminder">Create reminder</option>
        <option value="localTask">Create task</option>
        <option value="haToggle">Toggle device</option>
      </select>

      {actionType === "localReminder" && (
        <input
          aria-label="Reminder text to create"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Reminder text"
        />
      )}

      {actionType === "localTask" && (
        <div className="column" style={{ gap: "0.5rem" }}>
          <input
            aria-label="Task title"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Task title"
          />
          <textarea
            aria-label="Task notes"
            value={taskNotes}
            onChange={(e) => setTaskNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
          />
          <input
            aria-label="Task due date"
            type="datetime-local"
            value={taskDueAt}
            onChange={(e) => setTaskDueAt(e.target.value)}
          />
          <select
            aria-label="Task priority"
            value={taskPriority}
            onChange={(e) => setTaskPriority(e.target.value as "low" | "normal" | "high")}
          >
            <option value="low">Low priority</option>
            <option value="normal">Normal priority</option>
            <option value="high">High priority</option>
          </select>
          <select
            aria-label="Task recurrence"
            value={taskRecurrence}
            onChange={(e) => setTaskRecurrence(e.target.value as "none" | "daily" | "weekly" | "monthly")}
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      )}

      {actionType === "haToggle" && (
        <select aria-label="Device to toggle" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
          <option value="">Select device</option>
          {devices.map((d) => (
            <option key={d.entityId} value={d.entityId}>
              {d.friendlyName}
            </option>
          ))}
        </select>
      )}

      <button
        disabled={isSubmitting}
        onClick={async () => {
          try {
            setIsSubmitting(true);
            const error = validate();
            if (error) throw new Error(error);
            await window.assistantApi.createRule({
              name: name.trim(),
              triggerConfig: { at },
              actionType,
              actionConfig: getActionConfig(),
              enabled: true
            } as Parameters<typeof window.assistantApi.createRule>[0]);
            resetForm();
            await onDone();
            // v1.2.7 persistent success feedback
            onShowSuccess?.("Rule created");
          } catch (err) {
            onError(getAssistantInvokeErrorMessage(err));
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        {isSubmitting ? "Adding..." : "Add"}
      </button>
    </div>
  );
}
