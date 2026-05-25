/**
 * Plan Today panel for v2.5.0 smarter workflow.
 *
 * This panel provides a prioritized queue of items that need attention today:
 * - Overdue tasks
 * - Due today reminders
 * - Unsorted notes
 *
 * Users can complete, snooze, reschedule, open details, or send items to Inbox from this queue.
 * v2.5.0 adds batch selection, quick reschedule, and batch snooze capabilities.
 */

import { memo, useState } from "react";
import { Calendar, Check, Clock, FileText, ListTodo, Bell, Inbox, ArrowRight, ChevronDown } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import { EmptyState } from "../ui/EmptyState";
import type { PlanTodayQueue, PlanTodayItem } from "../../lib/derived/daily-command-center";
import type { BriefItem } from "../../types";
import { logMetric } from "../../lib/performance";
import "./PlanTodayPanel.css";

type Props = {
  queue: PlanTodayQueue;
  onCompleteTask?: (id: string) => Promise<void>;
  onCompleteReminder?: (id: string) => Promise<void>;
  onBulkCompleteTasks?: (ids: string[]) => Promise<void>;
  onSnoozeReminder?: (id: string, minutes: number) => Promise<void>;
  onUpdateTaskDueAt?: (id: string, dueAt: string | null) => Promise<void>;
  onUpdateReminderDueAt?: (id: string, dueAt: string) => Promise<void>;
  onOpenWorkItem?: (item: BriefItem) => void;
  onOpenInbox?: () => void;
  onShowSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

function getIconForSource(source: PlanTodayItem["source"]) {
  switch (source) {
    case "local-task":
      return ListTodo;
    case "local-reminder":
      return Bell;
    case "local-note":
      return FileText;
  }
}

function getReasonLabel(reason: PlanTodayItem["queueReason"]): string {
  switch (reason) {
    case "overdue":
      return "Overdue";
    case "due-today":
      return "Due Today";
    case "unsorted":
      return "Unsorted";
  }
}

function getReasonIcon(reason: PlanTodayItem["queueReason"]) {
  switch (reason) {
    case "overdue":
      return Clock;
    case "due-today":
      return Calendar;
    case "unsorted":
      return FileText;
  }
}

export const PlanTodayPanel = memo(function PlanTodayPanel({
  queue,
  onCompleteTask,
  onCompleteReminder,
  onBulkCompleteTasks,
  onSnoozeReminder,
  onUpdateTaskDueAt,
  onUpdateReminderDueAt,
  onOpenWorkItem,
  onOpenInbox,
  onShowSuccess,
  onError
}: Props): JSX.Element {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [rescheduleDropdownId, setRescheduleDropdownId] = useState<string | null>(null);
  const [snoozeDropdownId, setSnoozeDropdownId] = useState<string | null>(null);

  // Helper to check if an item is completable (tasks and reminders, not notes)
  const isCompletable = (item: PlanTodayItem): boolean => {
    return item.source === "local-task" || item.source === "local-reminder";
  };

  // Get completable items for selection logic
  const completableItems = queue.items.filter(isCompletable);
  const selectedCompletableIds = Array.from(selectedIds).filter((id) =>
    completableItems.some((item) => item.id === id)
  );

  const allCompletableSelected =
    completableItems.length > 0 && completableItems.every((item) => selectedIds.has(item.id));

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllCompletable = () => {
    if (allCompletableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(completableItems.map((item) => item.id)));
    }
  };

  // Helper functions for date calculations
  const getTodayDate = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  };

  const getTomorrowDate = () => {
    const tomorrow = getTodayDate();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  const getNextWeekDate = () => {
    const nextWeek = getTodayDate();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleQuickReschedule = async (item: PlanTodayItem, preset: string) => {
    let newDueAt: string | null = null;
    const now = new Date();

    switch (preset) {
      case "today":
        newDueAt = formatDateForInput(getTodayDate());
        break;
      case "tomorrow":
        newDueAt = formatDateForInput(getTomorrowDate());
        break;
      case "next-week":
        newDueAt = formatDateForInput(getNextWeekDate());
        break;
      case "custom": {
        // Let the user select a custom date via a date picker
        const input = document.createElement("input");
        input.type = "datetime-local";
        input.value = item.dueAt ? formatDateForInput(new Date(item.dueAt)) : formatDateForInput(now);
        input.showPicker();
        input.onchange = async (e) => {
          const target = e.target as HTMLInputElement;
          if (target.value) {
            try {
              if (item.source === "local-task" && onUpdateTaskDueAt) {
                await onUpdateTaskDueAt(item.sourceId, new Date(target.value).toISOString());
                onShowSuccess?.("Task rescheduled.");
              } else if (item.source === "local-reminder" && onUpdateReminderDueAt) {
                await onUpdateReminderDueAt(item.sourceId, new Date(target.value).toISOString());
                onShowSuccess?.("Reminder rescheduled.");
              }
            } catch {
              onError?.("Failed to reschedule item.");
            }
          }
          setRescheduleDropdownId(null);
        };
        return;
      }
      default:
        return;
    }

    try {
      if (item.source === "local-task" && onUpdateTaskDueAt) {
        await onUpdateTaskDueAt(item.sourceId, new Date(newDueAt!).toISOString());
        onShowSuccess?.("Task rescheduled.");
      } else if (item.source === "local-reminder" && onUpdateReminderDueAt) {
        await onUpdateReminderDueAt(item.sourceId, new Date(newDueAt!).toISOString());
        onShowSuccess?.("Reminder rescheduled.");
      }
    } catch {
      onError?.("Failed to reschedule item.");
    } finally {
      setRescheduleDropdownId(null);
    }
  };

  const handleBatchSnooze = async (preset: string) => {
    const selectedReminderIds = selectedCompletableIds
      .filter((id) => queue.items.find((item) => item.id === id && item.source === "local-reminder"))
      .map((id) => queue.items.find((item) => item.id === id)?.sourceId)
      .filter((id): id is string => id !== undefined);

    if (selectedReminderIds.length === 0) {
      onError?.("No reminders selected for snooze.");
      return;
    }

    let minutes = 0;
    switch (preset) {
      case "10m":
        minutes = 10;
        break;
      case "1h":
        minutes = 60;
        break;
      case "tomorrow":
        minutes = 24 * 60;
        break;
      case "next-week":
        minutes = 7 * 24 * 60;
        break;
      default:
        return;
    }

    setIsBatchProcessing(true);
    try {
      await Promise.all(selectedReminderIds.map((id) => onSnoozeReminder?.(id, minutes)));
      onShowSuccess?.(`Snoozed ${selectedReminderIds.length} reminder${selectedReminderIds.length > 1 ? "s" : ""}.`);
      setSelectedIds(new Set());
    } catch {
      onError?.("Failed to snooze reminders.");
    } finally {
      setIsBatchProcessing(false);
      setSnoozeDropdownId(null);
    }
  };

  const handleBulkComplete = async () => {
    if (selectedCompletableIds.length === 0) return;

    setIsBatchProcessing(true);
    try {
      // Separate tasks and reminders, extracting sourceIds
      const taskSourceIds = selectedCompletableIds
        .filter((id) => queue.items.find((item) => item.id === id && item.source === "local-task"))
        .map((id) => queue.items.find((item) => item.id === id)?.sourceId)
        .filter((id): id is string => id !== undefined);

      const reminderSourceIds = selectedCompletableIds
        .filter((id) => queue.items.find((item) => item.id === id && item.source === "local-reminder"))
        .map((id) => queue.items.find((item) => item.id === id)?.sourceId)
        .filter((id): id is string => id !== undefined);

      // Complete tasks in bulk
      if (taskSourceIds.length > 0 && onBulkCompleteTasks) {
        await onBulkCompleteTasks(taskSourceIds);
      }

      // Complete reminders individually
      if (reminderSourceIds.length > 0 && onCompleteReminder) {
        await Promise.all(reminderSourceIds.map((id) => onCompleteReminder(id)));
      }

      onShowSuccess?.(`Completed ${selectedCompletableIds.length} items.`);
      setSelectedIds(new Set());
    } catch {
      onError?.("Failed to complete selected items.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const content = logMetric("plan-today-render", () => {
    if (queue.items.length === 0) {
      return (
        <section className="panel" aria-labelledby="plan-today-heading">
          <PanelHeader icon={Calendar} title="Plan Today" />
          <div className="panelContent">
            <EmptyState icon={Calendar} title="All clear" description="No items need planning today." />
          </div>
        </section>
      );
    }

    return (
      <section className="panel" aria-labelledby="plan-today-heading">
        <PanelHeader
          icon={Calendar}
          title="Plan Today"
          actions={
            completableItems.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <label className="appearanceToggle" style={{ fontSize: "0.875rem" }}>
                  <input
                    type="checkbox"
                    checked={allCompletableSelected}
                    onChange={toggleAllCompletable}
                    aria-label="Select all"
                  />
                  All
                </label>
                {selectedCompletableIds.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="commandAction"
                      onClick={handleBulkComplete}
                      disabled={isBatchProcessing}
                    >
                      Complete {selectedCompletableIds.length} Selected
                    </button>
                    {selectedCompletableIds.some((id) =>
                      queue.items.find((item) => item.id === id && item.source === "local-reminder")
                    ) && (
                      <div style={{ position: "relative" }}>
                        <button
                          type="button"
                          className="commandAction"
                          onClick={() => setSnoozeDropdownId(snoozeDropdownId === null ? "batch" : null)}
                          disabled={isBatchProcessing}
                        >
                          Snooze
                          <ChevronDown size={14} style={{ marginLeft: "0.25rem" }} />
                        </button>
                        {snoozeDropdownId === "batch" && (
                          <div
                            className="dropdownMenu"
                            style={{
                              position: "absolute",
                              top: "100%",
                              right: 0,
                              zIndex: 1000,
                              background: "white",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                              padding: "0.5rem",
                              minWidth: "150px"
                            }}
                          >
                            <button type="button" className="dropdownItem" onClick={() => handleBatchSnooze("10m")}>
                              10 minutes
                            </button>
                            <button type="button" className="dropdownItem" onClick={() => handleBatchSnooze("1h")}>
                              1 hour
                            </button>
                            <button
                              type="button"
                              className="dropdownItem"
                              onClick={() => handleBatchSnooze("tomorrow")}
                            >
                              Tomorrow
                            </button>
                            <button
                              type="button"
                              className="dropdownItem"
                              onClick={() => handleBatchSnooze("next-week")}
                            >
                              Next week
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          }
        />
        <div className="panelContent">
          <div className="planTodaySummary">
            <p>{queue.summary}</p>
          </div>

          <div className="planTodayQueue">
            {queue.items.map((item) => {
              const Icon = getIconForSource(item.source);
              const ReasonIcon = getReasonIcon(item.queueReason);
              const isProcessing = processingId === item.id;

              return (
                <div key={item.id} className="planTodayItem">
                  <div className="planTodayItemMain">
                    {isCompletable(item) && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        aria-label={`Select item: ${item.label}`}
                        disabled={isBatchProcessing}
                        style={{ marginRight: "0.5rem" }}
                      />
                    )}
                    <div className="planTodayItemIcon">
                      <Icon size={18} />
                    </div>
                    <div className="planTodayItemContent">
                      <div className="planTodayItemLabel">{item.label}</div>
                      <div className="planTodayItemMeta">
                        <span className="planTodayItemReason">
                          <ReasonIcon size={14} />
                          {getReasonLabel(item.queueReason)}
                        </span>
                        {item.dueAt && (
                          <span className="planTodayItemDue">{new Date(item.dueAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="planTodayItemActions">
                    <IconButton
                      icon={Check}
                      label="Complete"
                      onClick={async () => {
                        setProcessingId(item.sourceId);
                        try {
                          if (item.source === "local-task" && onCompleteTask) {
                            await onCompleteTask(item.sourceId);
                            onShowSuccess?.("Task completed.");
                          } else if (item.source === "local-reminder" && onCompleteReminder) {
                            await onCompleteReminder(item.sourceId);
                            onShowSuccess?.("Reminder completed.");
                          }
                        } catch {
                          onError?.("Failed to complete item.");
                        } finally {
                          setProcessingId(null);
                        }
                      }}
                      disabled={isProcessing}
                      variant="ghost"
                      size={16}
                    />
                    {(item.source === "local-task" || item.source === "local-reminder") && (
                      <div style={{ position: "relative" }}>
                        <IconButton
                          icon={Calendar}
                          label="Reschedule"
                          onClick={() => setRescheduleDropdownId(rescheduleDropdownId === item.id ? null : item.id)}
                          disabled={isProcessing}
                          variant="ghost"
                          size={16}
                        />
                        {rescheduleDropdownId === item.id && (
                          <div
                            className="dropdownMenu"
                            style={{
                              position: "absolute",
                              top: "100%",
                              right: 0,
                              zIndex: 1000,
                              background: "white",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                              padding: "0.5rem",
                              minWidth: "150px"
                            }}
                          >
                            <button
                              type="button"
                              className="dropdownItem"
                              onClick={() => handleQuickReschedule(item, "today")}
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              className="dropdownItem"
                              onClick={() => handleQuickReschedule(item, "tomorrow")}
                            >
                              Tomorrow
                            </button>
                            <button
                              type="button"
                              className="dropdownItem"
                              onClick={() => handleQuickReschedule(item, "next-week")}
                            >
                              Next week
                            </button>
                            <button
                              type="button"
                              className="dropdownItem"
                              onClick={() => handleQuickReschedule(item, "custom")}
                            >
                              Custom...
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {item.source === "local-reminder" && onSnoozeReminder && (
                      <IconButton
                        icon={Clock}
                        label="Snooze 10m"
                        onClick={async () => {
                          setProcessingId(item.sourceId);
                          try {
                            await onSnoozeReminder(item.sourceId, 10);
                            onShowSuccess?.("Reminder snoozed 10 minutes.");
                          } catch {
                            onError?.("Failed to snooze reminder.");
                          } finally {
                            setProcessingId(null);
                          }
                        }}
                        disabled={isProcessing}
                        variant="ghost"
                        size={16}
                      />
                    )}
                    <IconButton
                      icon={ArrowRight}
                      label="Details"
                      onClick={() => onOpenWorkItem?.(item)}
                      disabled={isProcessing}
                      variant="ghost"
                      size={16}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {onOpenInbox && (
            <div className="planTodayFooter">
              <button type="button" className="ghostButton" onClick={onOpenInbox}>
                <Inbox size={16} />
                Open Inbox
              </button>
            </div>
          )}
        </div>
      </section>
    );
  });

  return content;
});
