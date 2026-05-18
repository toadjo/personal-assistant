/**
 * Unified Inbox panel for Personal OS v3.
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
import { Inbox, Plus, FileText, ListTodo, Bell, Users } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import { EmptyState } from "../ui/EmptyState";
import type { UnifiedWorkItem } from "../../lib/derived/unified-work";
import type { LucideIcon } from "lucide-react";
import type { TeamProject } from "../../../shared/team/types";
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
  onOpenItem?: (item: UnifiedWorkItem) => void;
  onShowSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

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
  onOpenItem,
  onShowSuccess,
  onError
}: Props): JSX.Element {
  const [captureMode, setCaptureMode] = useState<"none" | "note" | "task" | "reminder">("none");
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureContent, setCaptureContent] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<Record<string, string>>({});

  async function handleCapture(): Promise<void> {
    if (!captureTitle.trim()) return;

    try {
      if (captureMode === "note") {
        await createQuickNote(captureTitle, captureContent);
      } else if (captureMode === "task") {
        await createQuickTask(captureTitle, captureContent);
      } else if (captureMode === "reminder") {
        await createQuickReminder(captureTitle);
      }
      setCaptureTitle("");
      setCaptureContent("");
      setCaptureMode("none");
      onShowSuccess?.("Item captured.");
    } catch {
      onError?.("Failed to capture item.");
    }
  }

  async function handleSendToTeam(itemId: string, projectId: string): Promise<void> {
    try {
      await sendTaskToTeam(itemId, projectId);
      onShowSuccess?.("Task sent to team.");
    } catch {
      onError?.("Failed to send task to team.");
    }
  }

  function getIconForSource(source: UnifiedWorkItem["source"]): LucideIcon {
    switch (source) {
      case "local-note":
        return FileText;
      case "local-task":
        return ListTodo;
      case "local-reminder":
        return Bell;
      case "team-task":
        return ListTodo;
    }
  }

  function getSourceLabel(source: UnifiedWorkItem["source"]) {
    switch (source) {
      case "local-note":
        return "Note";
      case "local-task":
        return "Task";
      case "local-reminder":
        return "Reminder";
      case "team-task":
        return "Team Task";
    }
  }

  return (
    <section className="panel" aria-labelledby="inbox-panel-heading">
      <PanelHeader icon={Inbox} title="Inbox" />

      {/* Quick Capture */}
      {captureMode === "none" ? (
        <div className="panelContent">
          <div className="captureOptions">
            <button
              type="button"
              className="captureOption"
              onClick={() => setCaptureMode("note")}
            >
              <FileText size={20} />
              <span>Note</span>
            </button>
            <button
              type="button"
              className="captureOption"
              onClick={() => setCaptureMode("task")}
            >
              <ListTodo size={20} />
              <span>Task</span>
            </button>
            <button
              type="button"
              className="captureOption"
              onClick={() => setCaptureMode("reminder")}
            >
              <Bell size={20} />
              <span>Reminder</span>
            </button>
          </div>

          {/* Needs Sorting Queue */}
          {needsSorting.length > 0 && (
            <div className="needsSorting">
              <h3>Needs Sorting ({needsSorting.length})</h3>
              <ul className="itemList">
                {needsSorting.map((item) => {
                  const Icon = getIconForSource(item.source);
                  return (
                    <li key={item.id} className="itemRow">
                      <button
                        type="button"
                        className="itemRowButton"
                        onClick={() => onOpenItem?.(item)}
                      >
                        <div className="itemIcon"><Icon size={16} /></div>
                        <div className="itemContent">
                          <div className="itemLabel">{item.label}</div>
                          <div className="itemMeta">
                            {getSourceLabel(item.source)}
                            {item.projectName && ` | ${item.projectName}`}
                            {item.assigneeDisplayName && ` | ${item.assigneeDisplayName}`}
                          </div>
                        </div>
                      </button>
                      {item.source === "local-note" && (
                        <div className="itemActions">
                          <IconButton
                            icon={ListTodo}
                            label="Convert to task"
                            onClick={() => void convertNoteToTask(item.sourceId)}
                          />
                          <IconButton
                            icon={Bell}
                            label="Convert to reminder"
                            onClick={() => void convertNoteToReminder(item.sourceId)}
                          />
                        </div>
                      )}
                      {item.source === "local-task" && teamProjects.length > 0 && (
                        <div className="itemActions">
                          <select
                            className="projectSelector"
                            value={selectedProjectIds[item.id] || teamProjects[0]?.id || ""}
                            onChange={(e) => {
                              setSelectedProjectIds((prev) => ({
                                ...prev,
                                [item.id]: e.currentTarget.value
                              }));
                            }}
                          >
                            {teamProjects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                          <IconButton
                            icon={Users}
                            label="Send to team"
                            onClick={() => {
                              const projectId = selectedProjectIds[item.id] || teamProjects[0]?.id;
                              if (projectId) {
                                void handleSendToTeam(item.sourceId, projectId);
                              }
                            }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* All Unified Items */}
          {unifiedItems.length > 0 && (
            <div className="allItems">
              <h3>All Items ({unifiedItems.length})</h3>
              <ul className="itemList">
                {unifiedItems.slice(0, 10).map((item) => {
                  const Icon = getIconForSource(item.source);
                  return (
                    <li key={item.id} className="itemRow">
                      <button
                        type="button"
                        className="itemRowButton"
                        onClick={() => onOpenItem?.(item)}
                      >
                        <div className="itemIcon"><Icon size={16} /></div>
                        <div className="itemContent">
                          <div className="itemLabel">{item.label}</div>
                          <div className="itemMeta">
                            {getSourceLabel(item.source)}
                            {item.projectName && ` | ${item.projectName}`}
                            {item.priority !== "context" && ` | ${item.priority}`}
                            {item.dueAt && ` | ${new Date(item.dueAt).toLocaleDateString()}`}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
                {unifiedItems.length > 10 && (
                  <div className="showMore">
                    +{unifiedItems.length - 10} more items
                  </div>
                )}
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
              <IconButton
                icon={Plus}
                label="Capture"
                onClick={() => void handleCapture()}
              />
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
  );
});
