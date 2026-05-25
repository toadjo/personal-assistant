/**
 * Quick Capture Dialog for v2.7.0 Capture Everywhere.
 *
 * A focused capture surface that can be opened from:
 * - Global shortcut (Cmd/Ctrl+Alt+N)
 * - Tray menu (Quick Capture)
 * - Command (capture <text>)
 *
 * Supports routing to Note, Task, Reminder, or Inbox.
 */

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { X, FileText, ListTodo, Bell, Inbox } from "lucide-react";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { requireAssistantApi } from "../../lib/assistantApi";

type CaptureType = "note" | "task" | "reminder" | "inbox";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialType?: CaptureType;
  initialText?: string;
  onShowSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

function getTypeIcon(type: CaptureType) {
  switch (type) {
    case "note":
      return FileText;
    case "task":
      return ListTodo;
    case "reminder":
      return Bell;
    case "inbox":
      return Inbox;
  }
}

function getTypeLabel(type: CaptureType): string {
  switch (type) {
    case "note":
      return "Note";
    case "task":
      return "Task";
    case "reminder":
      return "Reminder";
    case "inbox":
      return "Inbox";
  }
}

export const QuickCaptureDialog = memo(function QuickCaptureDialog({
  isOpen,
  onClose,
  initialType = "inbox",
  initialText = "",
  onShowSuccess,
  onError
}: Props): JSX.Element | null {
  const [captureType, setCaptureType] = useState<CaptureType>(initialType);
  const [text, setText] = useState(initialText);
  const [taskDueAt, setTaskDueAt] = useState<string>("");
  const [taskPriority, setTaskPriority] = useState<"low" | "normal" | "high">("normal");
  const [reminderDueAt, setReminderDueAt] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setCaptureType(initialType);
      setText(initialText);
      setTaskDueAt("");
      setTaskPriority("normal");
      setReminderDueAt("");
      // Focus input after a short delay to allow dialog to render
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialType, initialText]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) {
      onError?.("Please enter some text to capture.");
      return;
    }

    setIsSubmitting(true);
    try {
      const api = requireAssistantApi();

      switch (captureType) {
        case "note": {
          await api.createNote({
            title: text.trim().slice(0, 160),
            content: text.trim(),
            tags: [],
            pinned: false
          });
          onShowSuccess?.("Note created.");
          break;
        }
        case "task": {
          const dueDate = taskDueAt ? new Date(taskDueAt).toISOString() : null;
          await api.createTask({
            title: text.trim(),
            notes: "",
            dueAt: dueDate,
            priority: taskPriority,
            recurrence: "none"
          });
          onShowSuccess?.("Task created.");
          break;
        }
        case "reminder": {
          const dueDate = reminderDueAt 
            ? new Date(reminderDueAt).toISOString()
            : new Date(Date.now() + 60 * 1000).toISOString(); // Default to 1 minute from now
          await api.createReminder({
            text: text.trim(),
            dueAt: dueDate,
            recurrence: "none"
          });
          onShowSuccess?.("Reminder created.");
          break;
        }
        case "inbox": {
          // Inbox creates a note by default (safest option)
          await api.createNote({
            title: text.trim().slice(0, 160),
            content: text.trim(),
            tags: [],
            pinned: false
          });
          onShowSuccess?.("Captured to Inbox.");
          break;
        }
      }

      // Reset and close
      setText("");
      setTaskDueAt("");
      setTaskPriority("normal");
      setReminderDueAt("");
      onClose();
    } catch (err) {
      onError?.(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [text, captureType, taskDueAt, taskPriority, reminderDueAt, onShowSuccess, onError, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleSubmit, onClose]);

  if (!isOpen) return null;

  return (
    <div className="quick-capture-overlay" onClick={onClose}>
      <div className="quick-capture-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="quick-capture-header">
          <h2>Quick Capture</h2>
          <button
            type="button"
            className="quick-capture-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="quick-capture-type-selector">
          {(["note", "task", "reminder", "inbox"] as CaptureType[]).map((type) => {
            const IconComponent = getTypeIcon(type);
            return (
              <button
                key={type}
                type="button"
                className={`quick-capture-type-button ${captureType === type ? "active" : ""}`}
                onClick={() => setCaptureType(type)}
              >
                <IconComponent size={16} />
                <span>{getTypeLabel(type)}</span>
              </button>
            );
          })}
        </div>

        <form className="quick-capture-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <input
            ref={inputRef}
            type="text"
            className="quick-capture-input"
            placeholder="What do you want to capture?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isSubmitting}
            autoFocus
          />

          {captureType === "task" && (
            <div className="quick-capture-options">
              <div className="quick-capture-option">
                <label htmlFor="task-due-at">Due date (optional):</label>
                <input
                  id="task-due-at"
                  type="datetime-local"
                  value={taskDueAt}
                  onChange={(e) => setTaskDueAt(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="quick-capture-option">
                <label htmlFor="task-priority">Priority:</label>
                <select
                  id="task-priority"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as "low" | "normal" | "high")}
                  disabled={isSubmitting}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          )}

          {captureType === "reminder" && (
            <div className="quick-capture-options">
              <div className="quick-capture-option">
                <label htmlFor="reminder-due-at">Due date:</label>
                <input
                  id="reminder-due-at"
                  type="datetime-local"
                  value={reminderDueAt}
                  onChange={(e) => setReminderDueAt(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          <div className="quick-capture-actions">
            <button
              type="button"
              className="quick-capture-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="quick-capture-submit"
              disabled={isSubmitting || !text.trim()}
            >
              {isSubmitting ? "Capturing..." : "Capture"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
