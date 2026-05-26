/**
 * End-of-Day Review panel for Personal OS.
 *
 * This panel shows what was completed today, what remains unfinished, and what was captured.
 * It provides carry-over actions for unfinished items.
 */

import { memo, useState } from "react";
import { Check, Clock, FileText, ListTodo, Bell, Calendar, ArrowRight } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import { EmptyState } from "../ui/EmptyState";
import type { EndOfDayReview, EndOfDayReviewItem } from "../../lib/derived/daily-command-center";
import type { BriefItem } from "../../types";
import "./EndOfDayReviewPanel.css";

type Props = {
  review: EndOfDayReview;
  onUpdateTaskDueAt?: (id: string, dueAt: string | null) => Promise<void>;
  onSnoozeReminder?: (id: string, minutes: number) => Promise<void>;
  onOpenWorkItem?: (item: BriefItem) => void;
  onShowSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

function getCategoryLabel(category: EndOfDayReviewItem["reviewCategory"]): string {
  switch (category) {
    case "completed-task":
      return "Completed Task";
    case "completed-reminder":
      return "Completed Reminder";
    case "unfinished-task":
      return "Unfinished Task";
    case "unfinished-reminder":
      return "Unfinished Reminder";
    case "captured-note":
      return "Captured Note";
    default:
      return "Item";
  }
}

function getCategoryIcon(category: EndOfDayReviewItem["reviewCategory"]) {
  switch (category) {
    case "completed-task":
    case "completed-reminder":
      return Check;
    case "unfinished-task":
    case "unfinished-reminder":
      return Clock;
    case "captured-note":
      return FileText;
    default:
      return FileText;
  }
}

function getItemIcon(category: EndOfDayReviewItem["reviewCategory"]) {
  switch (category) {
    case "completed-task":
    case "unfinished-task":
      return ListTodo;
    case "completed-reminder":
    case "unfinished-reminder":
      return Bell;
    case "captured-note":
      return FileText;
    default:
      return FileText;
  }
}

export const EndOfDayReviewPanel = memo(function EndOfDayReviewPanel({
  review,
  onUpdateTaskDueAt,
  onSnoozeReminder,
  onOpenWorkItem,
  onShowSuccess,
  onError
}: Props): JSX.Element {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleCarryOverTask = async (item: EndOfDayReviewItem) => {
    if (!onUpdateTaskDueAt) return;

    setProcessingId(item.id);
    try {
      // Carry over to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow

      await onUpdateTaskDueAt(item.sourceId, tomorrow.toISOString());
      onShowSuccess?.("Task rescheduled to tomorrow.");
    } catch {
      onError?.("Failed to reschedule task.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCarryOverReminder = async (item: EndOfDayReviewItem) => {
    if (!onSnoozeReminder) return;

    setProcessingId(item.id);
    try {
      // Carry over to tomorrow (24 hours)
      await onSnoozeReminder(item.sourceId, 24 * 60);
      onShowSuccess?.("Reminder snoozed to tomorrow.");
    } catch {
      onError?.("Failed to snooze reminder.");
    } finally {
      setProcessingId(null);
    }
  };

  const renderSection = (title: string, items: EndOfDayReviewItem[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <div className="review-section">
          <h3 className="review-section-title">{title}</h3>
          <p className="review-section-empty">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="review-section">
        <h3 className="review-section-title">{title}</h3>
        <div className="review-items">
          {items.map((item) => (
            <div key={item.id} className="review-item">
              <div className="review-item-header">
                <div className="review-item-icon">
                  {(() => {
                    const IconComponent = getItemIcon(item.reviewCategory);
                    return <IconComponent size={16} />;
                  })()}
                </div>
                <div className="review-item-info">
                  <span className="review-item-label">{item.label}</span>
                  <span className="review-item-category">
                    {(() => {
                      const IconComponent = getCategoryIcon(item.reviewCategory);
                      return <IconComponent size={12} />;
                    })()}
                    {getCategoryLabel(item.reviewCategory)}
                  </span>
                </div>
              </div>
              <div className="review-item-actions">
                {item.reviewCategory === "unfinished-task" && onUpdateTaskDueAt && (
                  <IconButton
                    icon={ArrowRight}
                    label="Carry over to tomorrow"
                    onClick={() => handleCarryOverTask(item)}
                    disabled={processingId === item.id}
                  />
                )}
                {item.reviewCategory === "unfinished-reminder" && onSnoozeReminder && (
                  <IconButton
                    icon={ArrowRight}
                    label="Carry over to tomorrow"
                    onClick={() => handleCarryOverReminder(item)}
                    disabled={processingId === item.id}
                  />
                )}
                {onOpenWorkItem && <IconButton icon={Calendar} label="Details" onClick={() => onOpenWorkItem(item)} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    return (
      <EmptyState
        icon={Check}
        title="No activity today"
        description="You haven't completed any tasks, reminders, or captured notes today."
      />
    );
  };

  const hasActivity = review.totalCompleted > 0 || review.totalUnfinished > 0 || review.totalCaptured > 0;

  return (
    <div className="end-of-day-review">
      <PanelHeader title="End-of-Day Review" />
      {hasActivity ? (
        <>
          <div className="review-summary">
            <p className="review-summary-text">{review.summary}</p>
          </div>
          {renderSection("Completed Tasks", review.completedTasks, "No tasks completed today")}
          {renderSection("Completed Reminders", review.completedReminders, "No reminders completed today")}
          {renderSection("Unfinished Tasks", review.unfinishedTasks, "No unfinished tasks")}
          {renderSection("Unfinished Reminders", review.unfinishedReminders, "No unfinished reminders")}
          {renderSection("Notes Captured", review.capturedNotes, "No notes captured today")}
        </>
      ) : (
        renderEmptyState()
      )}
    </div>
  );
});
