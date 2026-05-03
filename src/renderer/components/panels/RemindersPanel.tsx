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
  onSnooze10: (id: string) => void;
  onSnooze60: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
};

export const RemindersPanel = memo(function RemindersPanel({
  isRefreshing,
  reminderFilter,
  setReminderFilter,
  visibleReminders,
  onRefresh,
  onError,
  onSnooze10,
  onSnooze60,
  onComplete,
  onDelete
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
      <ReminderForm onDone={onRefresh} onError={onError} />
      <ul className="list" aria-label="Reminders list">
        {isRefreshing ? (
          <li className="muted">Loading…</li>
        ) : visibleReminders.length ? (
          visibleReminders.map((r) => (
            <li key={r.id} className="listRow">
              <span>
                {r.text} ({r.status}) — {new Date(r.dueAt).toLocaleString()}
                {r.status === "pending" && new Date(r.dueAt).getTime() < Date.now() ? (
                  <strong className="overdueBadge">Overdue</strong>
                ) : null}
              </span>
              {r.status === "pending" ? (
                <div className="miniActions">
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
            </li>
          ))
        ) : (
          <li className="muted">Nothing for this filter.</li>
        )}
      </ul>
    </section>
  );
});
