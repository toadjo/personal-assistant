/**
 * Unified Inbox panel for Personal OS.
 *
 * This panel provides a single surface for uncategorized or incoming work:
 * - Quick note capture
 * - Quick task capture
 * - Quick reminder capture
 * - Team task mentions or assigned tasks
 * - "Needs sorting" queue
 * - Convert actions (note to task, note to reminder, task to team)
 */

import { memo, useState } from "react";
import { Inbox, Plus, FileText, ListTodo, Bell, Users, Check, Trash2, ArrowRight } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import { EmptyState } from "../ui/EmptyState";
import type { UnifiedWorkItem } from "../../lib/derived/unified-work";
import type { TeamProject } from "../../../shared/team/types";
import { logMetric } from "../../lib/performance";
import "./InboxPanel.css";

type Props = {
  unifiedItems: UnifiedWorkItem[];
  needsSorting: UnifiedWorkItem[];
  teamProjects: TeamProject[];
  createQuickNote: (title: string, content: string) => Promise<void>;
  createQuickTask: (title: string, notes: string) => Promise<void>;
  createQuickReminder: (text: string) => Promise<void>;
  convertNoteToTask: (noteId: string) => Promise<void>;
  convertNoteToReminder: (noteId: string) => Promise<void>;
  sendTaskToTeam: (taskId: string, projectId: string) => Promise<void>;
  completeTask?: (id: string) => Promise<void>;
  completeReminder?: (id: string) => Promise<void>;
  deleteTask?: (id: string) => Promise<void>;
  deleteReminder?: (id: string) => Promise<void>;
  deleteNote?: (id: string) => Promise<void>;
  onOpenItem?: (item: UnifiedWorkItem) => void;
  onOpenToday?: () => void;
  onShowSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

type UnifiedItemRowProps = {
  item: UnifiedWorkItem;
  section: "needsSorting" | "allItems";
  teamProjects: TeamProject[];
  selectedProjectIds: Record<string, string>;
  onSelectedProjectChange: (itemId: string, projectId: string) => void;
  onOpenItem?: (item: UnifiedWorkItem) => void;
  onShowSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  completeTask?: (id: string) => Promise<void>;
  completeReminder?: (id: string) => Promise<void>;
  deleteTask?: (id: string) => Promise<void>;
  deleteReminder?: (id: string) => Promise<void>;
  deleteNote?: (id: string) => Promise<void>;
  convertNoteToTask: (noteId: string) => Promise<void>;
  convertNoteToReminder: (noteId: string) => Promise<void>;
  sendTaskToTeam: (taskId: string, projectId: string) => Promise<void>;
};

function UnifiedItemRow({
  item,
  section,
  teamProjects,
  selectedProjectIds,
  onSelectedProjectChange,
  onOpenItem,
  onShowSuccess,
  onError,
  completeTask,
  completeReminder,
  deleteTask,
  deleteReminder,
  deleteNote,
  convertNoteToTask,
  convertNoteToReminder,
  sendTaskToTeam
}: UnifiedItemRowProps): JSX.Element {
  const Icon = (() => {
    switch (item.source) {
      case "local-note":
        return FileText;
      case "local-task":
        return ListTodo;
      case "local-reminder":
        return Bell;
      case "team-task":
        return ListTodo;
    }
  })();

  const sourceLabel = (() => {
    switch (item.source) {
      case "local-note":
        return "Note";
      case "local-task":
        return "Task";
      case "local-reminder":
        return "Reminder";
      case "team-task":
        return "Team Task";
    }
  })();

  const showComplete = (item.source === "local-task" || item.source === "local-reminder") && !item.isCompleted;
  const showDelete =
    section === "allItems" &&
    (item.source === "local-task" || item.source === "local-reminder" || item.source === "local-note");
  const showConvert = item.source === "local-note";
  const showSendToTeam = section === "needsSorting" && item.source === "local-task" && teamProjects.length > 0;

  async function handleComplete(): Promise<void> {
    try {
      if (item.source === "local-task") {
        await completeTask?.(item.sourceId);
      } else {
        await completeReminder?.(item.sourceId);
      }
      onShowSuccess?.(`${sourceLabel} completed.`);
    } catch {
      onError?.("Failed to complete item.");
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      if (item.source === "local-task") {
        await deleteTask?.(item.sourceId);
      } else if (item.source === "local-reminder") {
        await deleteReminder?.(item.sourceId);
      } else {
        await deleteNote?.(item.sourceId);
      }
      onShowSuccess?.(`${sourceLabel} deleted.`);
    } catch {
      onError?.("Failed to delete item.");
    }
  }

  async function handleSendToTeam(): Promise<void> {
    const projectId = selectedProjectIds[item.id] || teamProjects[0]?.id;
    if (projectId) {
      try {
        await sendTaskToTeam(item.sourceId, projectId);
        onShowSuccess?.("Task sent to team.");
      } catch {
        onError?.("Failed to send task to team.");
      }
    }
  }

  return (
    <li className="itemRow">
      <button type="button" className="itemRowButton" onClick={() => onOpenItem?.(item)}>
        <div className="itemIcon">
          <Icon size={16} />
        </div>
        <div className="itemContent">
          <div className="itemLabel">{item.label}</div>
          <div className="itemMeta">
            {sourceLabel}
            {item.projectName && ` | ${item.projectName}`}
            {item.assigneeDisplayName && ` | ${item.assigneeDisplayName}`}
            {section === "allItems" && item.priority !== "context" && ` | ${item.priority}`}
            {section === "allItems" && item.dueAt && ` | ${new Date(item.dueAt).toLocaleDateString()}`}
          </div>
        </div>
      </button>
      <div className="itemActions">
        {showComplete && (
          <IconButton icon={Check} label={`Complete ${sourceLabel.toLowerCase()}`} onClick={handleComplete} />
        )}
        {showConvert && (
          <>
            <IconButton icon={ListTodo} label="Convert to task" onClick={() => void convertNoteToTask(item.sourceId)} />
            <IconButton
              icon={Bell}
              label="Convert to reminder"
              onClick={() => void convertNoteToReminder(item.sourceId)}
            />
          </>
        )}
        {showSendToTeam && (
          <>
            <select
              className="projectSelector"
              value={selectedProjectIds[item.id] || teamProjects[0]?.id || ""}
              onChange={(e) => onSelectedProjectChange(item.id, e.currentTarget.value)}
            >
              {teamProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <IconButton icon={Users} label="Send to team" onClick={handleSendToTeam} />
          </>
        )}
        {showDelete && (
          <IconButton icon={Trash2} label={`Delete ${sourceLabel.toLowerCase()}`} onClick={handleDelete} />
        )}
      </div>
    </li>
  );
}

export const InboxPanel = memo(function InboxPanel({
  unifiedItems,
  needsSorting,
  teamProjects = [],
  createQuickNote,
  createQuickTask,
  createQuickReminder,
  convertNoteToTask,
  convertNoteToReminder,
  sendTaskToTeam,
  completeTask,
  completeReminder,
  deleteTask,
  deleteReminder,
  deleteNote,
  onOpenItem,
  onOpenToday,
  onShowSuccess,
  onError
}: Props): JSX.Element {
  const [captureMode, setCaptureMode] = useState<"none" | "note" | "task" | "reminder">("none");
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureContent, setCaptureContent] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<Record<string, string>>({});
  const [lastCaptureType, setLastCaptureType] = useState<"task" | "reminder" | "note" | null>(null);

  async function handleCapture(): Promise<void> {
    if (!captureTitle.trim()) return;

    try {
      if (captureMode === "note") {
        await createQuickNote(captureTitle, captureContent);
        setLastCaptureType("note");
      } else if (captureMode === "task") {
        await createQuickTask(captureTitle, captureContent);
        setLastCaptureType("task");
      } else if (captureMode === "reminder") {
        await createQuickReminder(captureTitle);
        setLastCaptureType("reminder");
      }
      setCaptureTitle("");
      setCaptureContent("");
      setCaptureMode("none");
      onShowSuccess?.("Item captured.");
    } catch {
      onError?.("Failed to capture item.");
    }
  }

  function handleSelectedProjectChange(itemId: string, projectId: string): void {
    setSelectedProjectIds((prev) => ({
      ...prev,
      [itemId]: projectId
    }));
  }

  const content = logMetric("inbox-render", () => (
    <section className="panel" aria-labelledby="inbox-panel-heading">
      <PanelHeader icon={Inbox} title="Inbox" />

      {/* Quick Capture */}
      {captureMode === "none" ? (
        <div className="panelContent">
          {/* Post-capture success guidance */}
          {lastCaptureType && (lastCaptureType === "task" || lastCaptureType === "reminder") && onOpenToday && (
            <div className="captureSuccess">
              <p className="captureSuccessText">
                {lastCaptureType === "task" ? "Task captured." : "Reminder captured."}
              </p>
              <button type="button" className="ghostButton captureSuccessAction" onClick={onOpenToday}>
                Open Today
                <ArrowRight size={14} />
              </button>
              <button type="button" className="textButton" onClick={() => setLastCaptureType(null)}>
                Dismiss
              </button>
            </div>
          )}

          <div className="captureOptions">
            <button type="button" className="captureOption" onClick={() => setCaptureMode("note")}>
              <FileText size={20} />
              <span>Note</span>
            </button>
            <button type="button" className="captureOption" onClick={() => setCaptureMode("task")}>
              <ListTodo size={20} />
              <span>Task</span>
            </button>
            <button type="button" className="captureOption" onClick={() => setCaptureMode("reminder")}>
              <Bell size={20} />
              <span>Reminder</span>
            </button>
          </div>

          {/* Needs Sorting Queue */}
          {needsSorting.length > 0 && (
            <div className="needsSorting">
              <h3>Needs Sorting ({needsSorting.length})</h3>
              <ul className="itemList">
                {needsSorting.map((item) => (
                  <UnifiedItemRow
                    key={item.id}
                    item={item}
                    section="needsSorting"
                    teamProjects={teamProjects}
                    selectedProjectIds={selectedProjectIds}
                    onSelectedProjectChange={handleSelectedProjectChange}
                    onOpenItem={onOpenItem}
                    onShowSuccess={onShowSuccess}
                    onError={onError}
                    completeTask={completeTask}
                    completeReminder={completeReminder}
                    deleteTask={deleteTask}
                    deleteReminder={deleteReminder}
                    deleteNote={deleteNote}
                    convertNoteToTask={convertNoteToTask}
                    convertNoteToReminder={convertNoteToReminder}
                    sendTaskToTeam={sendTaskToTeam}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* All Unified Items */}
          {unifiedItems.length > 0 && (
            <div className="allItems">
              <h3>All Items ({unifiedItems.length})</h3>
              <ul className="itemList">
                {unifiedItems.slice(0, 10).map((item) => (
                  <UnifiedItemRow
                    key={item.id}
                    item={item}
                    section="allItems"
                    teamProjects={teamProjects}
                    selectedProjectIds={selectedProjectIds}
                    onSelectedProjectChange={handleSelectedProjectChange}
                    onOpenItem={onOpenItem}
                    onShowSuccess={onShowSuccess}
                    onError={onError}
                    completeTask={completeTask}
                    completeReminder={completeReminder}
                    deleteTask={deleteTask}
                    deleteReminder={deleteReminder}
                    deleteNote={deleteNote}
                    convertNoteToTask={convertNoteToTask}
                    convertNoteToReminder={convertNoteToReminder}
                    sendTaskToTeam={sendTaskToTeam}
                  />
                ))}
                {unifiedItems.length > 10 && <div className="showMore">+{unifiedItems.length - 10} more items</div>}
              </ul>
            </div>
          )}

          {unifiedItems.length === 0 && needsSorting.length === 0 && (
            <EmptyState
              icon={Inbox}
              title="Inbox is clear"
              description="Capture a note, task, or reminder to get started."
            />
          )}
        </div>
      ) : (
        <div className="panelContent">
          <form className="captureForm" onSubmit={(_e) => void handleCapture()}>
            <div className="formRow">
              <input
                type="text"
                className="input"
                placeholder={captureMode === "reminder" ? "Reminder text" : "Title"}
                value={captureTitle}
                onChange={(event) => setCaptureTitle(event.currentTarget.value)}
                autoFocus
              />
              <IconButton icon={Plus} label="Capture" onClick={() => void handleCapture()} />
            </div>
            {captureMode !== "reminder" && (
              <textarea
                className="textarea"
                placeholder={captureMode === "note" ? "Content" : "Notes"}
                value={captureContent}
                onChange={(e) => setCaptureContent(e.target.value)}
                rows={3}
              />
            )}
            <div className="formActions">
              <button
                type="button"
                className="textButton"
                onClick={() => {
                  setCaptureMode("none");
                  setCaptureTitle("");
                  setCaptureContent("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  ));

  return content;
});
