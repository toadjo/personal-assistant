import { memo } from "react";
import type { Reminder } from "../../../shared/types";
import type { ReminderFilter } from "../../types";
import { ReminderForm } from "../forms/ReminderForm";

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
      <div className="titleRow">
        <h2 id="reminders-panel-heading">Follow-ups</h2>
        <select
          aria-label="Filter reminders by status"
          value={reminderFilter}
          onChange={(e) => setReminderFilter(e.target.value as ReminderFilter)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>
      </div>
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
                <span className={`pill ${r.status === "pending" ? "pill" : "graphitePill"}`}>
                  {r.status}
                </span>
              </div>
              {r.status === "pending" ? (
                <div className="reminderCardActions">
                  <button
                    type="button"
                    className="ghostButton"
                    onClick={() => void onSnooze10(r.id)}
                    aria-label={`Snooze reminder ten minutes: ${r.text}`}
                  >
                    +10m
                  </button>
                  <button
                    type="button"
                    className="ghostButton"
                    onClick={() => void onSnooze60(r.id)}
                    aria-label={`Snooze reminder one hour: ${r.text}`}
                  >
                    +1h
                  </button>
                  <button
                    type="button"
                    className="ghostButton"
                    onClick={() => void onComplete(r.id)}
                    aria-label={`Mark reminder done: ${r.text}`}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    className="dangerButton"
                    onClick={() => void onDelete(r.id)}
                    aria-label={`Delete reminder: ${r.text}`}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="emptyState">
            <p className="emptyStateTitle">No reminders yet</p>
            <p className="emptyStateDescription">
              Reminders help you stay on top of tasks. Use the form above to create your first reminder with a due time.
            </p>
          </div>
        )}
      </div>
    </section>
  );
});
