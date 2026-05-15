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
  onUpdateReminder?: (id: string, text: string, dueAt: string) => Promise<void>;
  onConvertNoteToTask?: (noteId: string) => Promise<void>;
  onConvertNoteToReminder?: (noteId: string) => Promise<void>;
  onShowSuccess?: (message: string) => void;
  onError?: (message: string) => void;
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
  onConvertNoteToTask,
  onConvertNoteToReminder,
  onShowSuccess,
  onError
}: Props): JSX.Element | null {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editDueAt, setEditDueAt] = useState("");

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
  };

  const getIcon = () => {
    switch (item.source) {
      case "local-note":
        return FileText;
      case "local-task":
        return ListTodo;
      case "local-reminder":
        return Bell;
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
                disabled={item.source === "local-reminder"}
                title={item.source === "local-reminder" ? "Reminder editing not yet supported" : undefined}
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
