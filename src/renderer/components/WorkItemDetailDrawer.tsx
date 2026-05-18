import { memo, useState } from "react";
import { X, Check, Trash2, Clock, FileText, ListTodo, Bell } from "lucide-react";
import type { UnifiedWorkItem } from "../lib/derived/unified-work";
import { IconButton } from "./ui/IconButton";
import "./WorkItemDetailDrawer.css";

type Props = {
  item: UnifiedWorkItem | null;
  onClose: () => void;
  onCompleteTask?: (id: string) => Promise<void>;
  onCompleteReminder?: (id: string) => Promise<void>;
  onSnoozeReminder?: (id: string, minutes: number) => Promise<void>;
  onDeleteTask?: (id: string) => Promise<void>;
  onDeleteReminder?: (id: string) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
  onUpdateNote?: (id: string, title: string, content: string) => Promise<void>;
  onUpdateTask?: (id: string, title: string, notes: string) => Promise<void>;
  onUpdateReminder?: (id: string, text?: string, dueAt?: string) => Promise<void>;
  onUpdateTeamTask?: (id: string, patch: Partial<TeamProjectTaskFields>) => Promise<void>;
  onConvertNoteToTask?: (noteId: string) => Promise<void>;
  onConvertNoteToReminder?: (noteId: string) => Promise<void>;
  onShowSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

type TeamProjectTaskFields = {
  title: string;
  notes: string;
  dueAt: string | null;
  priority: "low" | "normal" | "high";
  recurrence: "none" | "daily" | "weekly" | "monthly";
  assigneeDisplayName: string | null;
  status: "open" | "done";
};

export const WorkItemDetailDrawer = memo(function WorkItemDetailDrawer({
  item,
  onClose,
  onCompleteTask,
  onCompleteReminder,
  onSnoozeReminder,
  onDeleteTask,
  onDeleteReminder,
  onDeleteNote,
  onUpdateNote,
  onUpdateTask,
  onUpdateReminder,
  onUpdateTeamTask,
  onConvertNoteToTask,
  onConvertNoteToReminder,
  onShowSuccess,
  onError
}: Props): JSX.Element | null {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "normal" | "high">("normal");
  const [editRecurrence, setEditRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [editAssignee, setEditAssignee] = useState("");
  const [editStatus, setEditStatus] = useState<"open" | "done">("open");

  if (!item) return null;

  const handleEdit = () => {
    setIsEditing(true);
    setEditTitle(item.label);
    setEditContent(item.detail || "");
    if (item.dueAt) {
      setEditDueAt(new Date(item.dueAt).toISOString().slice(0, 16));
    } else {
      setEditDueAt("");
    }
    // Reset team task fields to defaults for non-team items
    setEditPriority("normal");
    setEditRecurrence("none");
    setEditAssignee("");
    setEditStatus("open");
  };

  const handleSave = async () => {
    if (!item.source) return;

    try {
      if (item.source === "local-note" && onUpdateNote) {
        await onUpdateNote(item.sourceId, editTitle, editContent);
        onShowSuccess?.("Note updated.");
        onClose();
      } else if (item.source === "local-task" && onUpdateTask) {
        await onUpdateTask(item.sourceId, editTitle, editContent);
        onShowSuccess?.("Task updated.");
        onClose();
      } else if (item.source === "local-reminder" && onUpdateReminder) {
        const dueAt = editDueAt ? new Date(editDueAt).toISOString() : item.dueAt || null;
        if (dueAt) {
          await onUpdateReminder(item.sourceId, editTitle, dueAt);
          onShowSuccess?.("Reminder updated.");
          onClose();
        }
      } else if (item.source === "team-task" && onUpdateTeamTask) {
        const dueAt = editDueAt ? new Date(editDueAt).toISOString() : null;
        const patch: Partial<TeamProjectTaskFields> = {
          title: editTitle,
          notes: editContent,
          dueAt,
          priority: editPriority,
          recurrence: editRecurrence,
          assigneeDisplayName: editAssignee || null,
          status: editStatus
        };
        await onUpdateTeamTask(item.sourceId, patch);
        onShowSuccess?.("Team task updated.");
        onClose();
      }
    } catch {
      onError?.("Failed to update item.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditTitle("");
    setEditContent("");
    setEditDueAt("");
    setEditPriority("normal");
    setEditRecurrence("none");
    setEditAssignee("");
    setEditStatus("open");
  };

  const getIcon = () => {
    switch (item.source) {
      case "local-note":
        return FileText;
      case "local-task":
        return ListTodo;
      case "local-reminder":
        return Bell;
      case "team-task":
        return ListTodo;
      default:
        return FileText;
    }
  };

  const Icon = getIcon();

  return (
    <div className="drawerOverlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => void e.stopPropagation()}>
        <div className="drawerHeader">
          <div className="drawerTitle">
            <Icon size={20} />
            <h2>Work Item Details</h2>
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} variant="ghost" />
        </div>

        <div className="drawerContent">
          {isEditing ? (
            <div className="editForm">
              <div className="formGroup">
                <label htmlFor="edit-title">Title</label>
                <input
                  id="edit-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input"
                  autoFocus
                />
              </div>
              {item.source !== "local-reminder" && (
                <div className="formGroup">
                  <label htmlFor="edit-content">Content</label>
                  <textarea
                    id="edit-content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="textarea"
                    rows={4}
                  />
                </div>
              )}
              {item.source === "local-reminder" && (
                <div className="formGroup">
                  <label htmlFor="edit-dueAt">Due Date</label>
                  <input
                    id="edit-dueAt"
                    type="datetime-local"
                    value={editDueAt}
                    onChange={(e) => setEditDueAt(e.target.value)}
                    className="input"
                  />
                </div>
              )}
              {item.source === "team-task" && (
                <>
                  <div className="formGroup">
                    <label htmlFor="edit-dueAt">Due Date</label>
                    <input
                      id="edit-dueAt"
                      type="datetime-local"
                      value={editDueAt}
                      onChange={(e) => setEditDueAt(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div className="formGroup">
                    <label htmlFor="edit-priority">Priority</label>
                    <select
                      id="edit-priority"
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as "low" | "normal" | "high")}
                      className="input"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="formGroup">
                    <label htmlFor="edit-recurrence">Recurrence</label>
                    <select
                      id="edit-recurrence"
                      value={editRecurrence}
                      onChange={(e) => setEditRecurrence(e.target.value as "none" | "daily" | "weekly" | "monthly")}
                      className="input"
                    >
                      <option value="none">None</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="formGroup">
                    <label htmlFor="edit-assignee">Assignee</label>
                    <input
                      id="edit-assignee"
                      type="text"
                      value={editAssignee}
                      onChange={(e) => setEditAssignee(e.target.value)}
                      className="input"
                      placeholder="Optional assignee name"
                    />
                  </div>
                  <div className="formGroup">
                    <label htmlFor="edit-status">Status</label>
                    <select
                      id="edit-status"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as "open" | "done")}
                      className="input"
                    >
                      <option value="open">Open</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </>
              )}
              <div className="formActions">
                <button type="button" className="textButton" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="button" className="primaryButton" onClick={() => void handleSave()}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="itemDetails">
              <h3>{item.label}</h3>
              {item.detail && <p className="itemDetail">{item.detail}</p>}
              <div className="itemMeta">
                <span className="metaLabel">Source:</span>
                <span className="metaValue">{item.source}</span>
              </div>
              {item.projectName && (
                <div className="itemMeta">
                  <span className="metaLabel">Project:</span>
                  <span className="metaValue">{item.projectName}</span>
                </div>
              )}
              {item.assigneeDisplayName && (
                <div className="itemMeta">
                  <span className="metaLabel">Assignee:</span>
                  <span className="metaValue">{item.assigneeDisplayName}</span>
                </div>
              )}
              <div className="itemMeta">
                <span className="metaLabel">Priority:</span>
                <span className="metaValue">{item.priority}</span>
              </div>
              {item.dueAt && (
                <div className="itemMeta">
                  <span className="metaLabel">Due:</span>
                  <span className="metaValue">{new Date(item.dueAt).toLocaleString()}</span>
                </div>
              )}
              <div className="itemMeta">
                <span className="metaLabel">Status:</span>
                <span className="metaValue">{item.isCompleted ? "Completed" : "Active"}</span>
              </div>
            </div>
          )}
        </div>

        <div className="drawerFooter">
          {!isEditing && (
            <>
              <div className="drawerActions">
                {item.source === "local-task" && (
                  <>
                    <IconButton
                      icon={Check}
                      label="Complete task"
                      onClick={async () => {
                        await onCompleteTask?.(item.sourceId);
                        onShowSuccess?.("Task completed.");
                        onClose();
                      }}
                      variant="ghost"
                    />
                    <IconButton
                      icon={Trash2}
                      label="Delete task"
                      onClick={async () => {
                        await onDeleteTask?.(item.sourceId);
                        onShowSuccess?.("Task deleted.");
                        onClose();
                      }}
                      variant="ghost"
                    />
                  </>
                )}
                {item.source === "local-reminder" && (
                  <>
                    <IconButton
                      icon={Clock}
                      label="Snooze 10m"
                      onClick={async () => {
                        await onSnoozeReminder?.(item.sourceId, 10);
                        onShowSuccess?.("Reminder snoozed 10m.");
                      }}
                      variant="ghost"
                    />
                    <IconButton
                      icon={Check}
                      label="Complete reminder"
                      onClick={async () => {
                        await onCompleteReminder?.(item.sourceId);
                        onShowSuccess?.("Reminder completed.");
                        onClose();
                      }}
                      variant="ghost"
                    />
                    <IconButton
                      icon={Trash2}
                      label="Delete reminder"
                      onClick={async () => {
                        await onDeleteReminder?.(item.sourceId);
                        onShowSuccess?.("Reminder deleted.");
                        onClose();
                      }}
                      variant="ghost"
                    />
                  </>
                )}
                {item.source === "team-task" && (
                  <>
                    {!item.isCompleted && (
                      <IconButton
                        icon={Check}
                        label="Complete team task"
                        onClick={async () => {
                          await onUpdateTeamTask?.(item.sourceId, { status: "done" });
                          onShowSuccess?.("Team task completed.");
                          onClose();
                        }}
                        variant="ghost"
                      />
                    )}
                    {item.isCompleted && (
                      <IconButton
                        icon={Clock}
                        label="Reopen team task"
                        onClick={async () => {
                          await onUpdateTeamTask?.(item.sourceId, { status: "open" });
                          onShowSuccess?.("Team task reopened.");
                          onClose();
                        }}
                        variant="ghost"
                      />
                    )}
                  </>
                )}
                {item.source === "local-note" && (
                  <>
                    <IconButton
                      icon={ListTodo}
                      label="Convert to task"
                      onClick={async () => {
                        await onConvertNoteToTask?.(item.sourceId);
                        onShowSuccess?.("Note converted to task.");
                        onClose();
                      }}
                      variant="ghost"
                    />
                    <IconButton
                      icon={Bell}
                      label="Convert to reminder"
                      onClick={async () => {
                        await onConvertNoteToReminder?.(item.sourceId);
                        onShowSuccess?.("Note converted to reminder.");
                        onClose();
                      }}
                      variant="ghost"
                    />
                    <IconButton
                      icon={Trash2}
                      label="Delete note"
                      onClick={async () => {
                        await onDeleteNote?.(item.sourceId);
                        onShowSuccess?.("Note deleted.");
                        onClose();
                      }}
                      variant="ghost"
                    />
                  </>
                )}
              </div>
              <button
                type="button"
                className="primaryButton"
                onClick={handleEdit}
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
