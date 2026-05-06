import { memo } from "react";
import type { Reminder } from "../../../shared/types";
import type { ReminderFilter } from "../../types";
import { Bell, Clock, Check, Trash2 } from "lucide-react";
import { ReminderForm } from "../forms/ReminderForm";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import { EmptyState } from "../ui/EmptyState";

type Props = {
  isRefreshing: boolean;
  reminderFilter: ReminderFilter;
  setReminderFilter: (value: ReminderFilter) => void;
  visibleReminders: Reminder[];
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onShowSuccess?: (message: string) => void;
  onSnooze10: (id: string) => void;
  onSnooze60: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onReminderCreated?: () => void;
};

export const RemindersPanel = memo(function RemindersPanel({
  isRefreshing,
  reminderFilter,
  setReminderFilter,
  visibleReminders,
  onRefresh,
  onError,
  onShowSuccess,
  onSnooze10,
  onSnooze60,
  onComplete,
  onDelete,
  onReminderCreated
}: Props): JSX.Element {
  return (
    <section className="panel" aria-labelledby="reminders-panel-heading">
      <PanelHeader
        icon={Bell}
        title="Follow-ups"
        actions={
          <select
            aria-label="Filter reminders by status"
            value={reminderFilter}
            onChange={(e) => setReminderFilter(e.target.value as ReminderFilter)}
            className="themeSelect themeSelectWide"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
          </select>
        }
      />
      <ReminderForm onDone={onRefresh} onError={onError} onShowSuccess={onShowSuccess} onCreated={onReminderCreated} />
      <div className="remindersGrid" aria-label="Reminders list">
        {isRefreshing ? (
          <p className="muted">Loading…</p>
        ) : visibleReminders.length ? (
          visibleReminders.map((r) => (
            <article
              key={r.id}
              className={`reminderCard ${r.status === "pending" && new Date(r.dueAt).getTime() < Date.now() ? "reminderCardOverdue" : ""}`}
            >
              <div className="reminderCardContent">
                <h3>{r.text}</h3>
                <p className="reminderCardMeta">
                  {new Date(r.dueAt).toLocaleString()}
                  {r.status === "pending" && new Date(r.dueAt).getTime() < Date.now() ? (
                    <span className="overdueBadge">Overdue</span>
                  ) : null}
                </p>
                <span className={`pill ${r.status === "pending" ? "pill" : "graphitePill"}`}>{r.status}</span>
              </div>
              {r.status === "pending" ? (
                <div className="reminderCardActions">
                  <IconButton
                    icon={Clock}
                    label={`Snooze reminder ten minutes: ${r.text}`}
                    onClick={() => void onSnooze10(r.id)}
                    variant="ghost"
                    size={14}
                  />
                  <IconButton
                    icon={Clock}
                    label={`Snooze reminder one hour: ${r.text}`}
                    onClick={() => void onSnooze60(r.id)}
                    variant="ghost"
                    size={14}
                  />
                  <IconButton
                    icon={Check}
                    label={`Mark reminder done: ${r.text}`}
                    onClick={() => void onComplete(r.id)}
                    variant="ghost"
                    size={14}
                  />
                  <IconButton
                    icon={Trash2}
                    label={`Delete reminder: ${r.text}`}
                    onClick={() => void onDelete(r.id)}
                    variant="danger"
                    size={14}
                  />
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <EmptyState
            icon={Bell}
            title="No reminders yet"
            description="Reminders help you stay on top of tasks. Use the form above to create your first reminder with a due time."
          />
        )}
      </div>
    </section>
  );
});
