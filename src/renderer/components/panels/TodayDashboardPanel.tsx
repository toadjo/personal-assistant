import type { Note, Reminder, Task } from "../../../shared/types";
import { PanelHeader } from "../ui/PanelHeader";
import { LayoutDashboard } from "lucide-react";

type Props = {
  overdueTasks: Task[];
  dueTodayTasks: Task[];
  upcomingReminders: Reminder[];
  selectedDayAgenda: Reminder[];
  pinnedNotes: Note[];
};

function renderTaskLine(task: Task): string {
  if (!task.dueAt) return task.title;
  return `${task.title} (${new Date(task.dueAt).toLocaleString()})`;
}

export function TodayDashboardPanel({
  overdueTasks,
  dueTodayTasks,
  upcomingReminders,
  selectedDayAgenda,
  pinnedNotes
}: Props): JSX.Element {
  return (
    <section className="panel" aria-labelledby="today-dashboard-heading">
      <PanelHeader icon={LayoutDashboard} title="Today" />
      <div className="notesGrid">
        <article className="noteCard">
          <h3>Overdue tasks ({overdueTasks.length})</h3>
          <p>{overdueTasks.slice(0, 3).map(renderTaskLine).join(" • ") || "No overdue tasks."}</p>
        </article>
        <article className="noteCard">
          <h3>Due today ({dueTodayTasks.length})</h3>
          <p>{dueTodayTasks.slice(0, 3).map(renderTaskLine).join(" • ") || "No tasks due today."}</p>
        </article>
        <article className="noteCard">
          <h3>Upcoming reminders ({upcomingReminders.length})</h3>
          <p>
            {upcomingReminders
              .slice(0, 3)
              .map((reminder) => `${reminder.text} (${new Date(reminder.dueAt).toLocaleString()})`)
              .join(" • ") || "No upcoming reminders."}
          </p>
        </article>
        <article className="noteCard">
          <h3>Selected day agenda ({selectedDayAgenda.length})</h3>
          <p>{selectedDayAgenda.slice(0, 3).map((reminder) => reminder.text).join(" • ") || "No agenda items."}</p>
        </article>
        <article className="noteCard">
          <h3>Pinned notes ({pinnedNotes.length})</h3>
          <p>{pinnedNotes.slice(0, 3).map((note) => note.title).join(" • ") || "No pinned notes."}</p>
        </article>
      </div>
    </section>
  );
}
