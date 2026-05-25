/**
 * Plan Today panel for v2.3.0 workflow improvement.
 * 
 * This panel provides a prioritized queue of items that need attention today:
 * - Overdue tasks
 * - Due today reminders
 * - Unsorted notes
 * 
 * Users can complete, snooze, open details, or send items to Inbox from this queue.
 */

import { memo, useState } from "react";
import { Calendar, Check, Clock, FileText, ListTodo, Bell, Inbox, ArrowRight } from "lucide-react";
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
  onSnoozeReminder?: (id: string, minutes: number) => Promise<void>;
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
  onSnoozeReminder,
  onOpenWorkItem,
  onOpenInbox,
  onShowSuccess,
  onError
}: Props): JSX.Element {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const content = logMetric('plan-today-render', () => {
    if (queue.items.length === 0) {
      return (
        <section className="panel" aria-labelledby="plan-today-heading">
          <PanelHeader icon={Calendar} title="Plan Today" />
          <div className="panelContent">
            <EmptyState
              icon={Calendar}
              title="All clear"
              description="No items need planning today."
            />
          </div>
        </section>
      );
    }

    return (
      <section className="panel" aria-labelledby="plan-today-heading">
        <PanelHeader icon={Calendar} title="Plan Today" />
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
                <div key={item.sourceId} className="planTodayItem">
                  <div className="planTodayItemMain">
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
                          <span className="planTodayItemDue">
                            {new Date(item.dueAt).toLocaleDateString()}
                          </span>
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
              <button
                type="button"
                className="ghostButton"
                onClick={onOpenInbox}
              >
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
