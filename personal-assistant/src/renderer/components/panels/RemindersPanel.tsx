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

export function RemindersPanel({
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
    <section className="panel">
      <div className="titleRow">
        <h2>Reminders</h2>
        <select aria-label="Filter reminders by status" value={reminderFilter} onChange={(e) => setReminderFilter(e.target.value as ReminderFilter)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>
      </div>
      <p className="muted sectionIntro">Schedule tasks, then track pending and completed items.</p>
      <ReminderForm onDone={onRefresh} onError={onError} />
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading reminders...</li>
        ) : visibleReminders.length ? (
          visibleReminders.map((r) => (
            <li key={r.id} className="listRow">
              <span>
                {r.text} ({r.status}) - {new Date(r.dueAt).toLocaleString()}
                {r.status === "pending" && new Date(r.dueAt).getTime() < Date.now() ? <strong className="overdueBadge">Overdue</strong> : null}
              </span>
              {r.status === "pending" ? (
                <div className="miniActions">
                  <button className="ghostButton" onClick={() => void onSnooze10(r.id)}>
                    Snooze 10m
                  </button>
                  <button className="ghostButton" onClick={() => void onSnooze60(r.id)}>
                    Snooze 1h
                  </button>
                  <button className="ghostButton" onClick={() => void onComplete(r.id)}>
                    Mark done
                  </button>
                  <button className="dangerButton" onClick={() => void onDelete(r.id)}>
                    Delete
                  </button>
                </div>
              ) : null}
            </li>
          ))
        ) : (
          <li className="muted">No reminders for this filter.</li>
        )}
      </ul>
    </section>
  );
}
