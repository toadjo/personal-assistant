import type { Note, Reminder, Task } from "../../../shared/types";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import { LayoutDashboard, AlertCircle, Clock, Pin, Calendar, Check, Clock as Snooze } from "lucide-react";
import { deriveFocusBrief, getBriefSummary } from "../../lib/derived/brief";
import type { BriefItem } from "../../types";
import "./TodayDashboardPanel.css";

type Props = {
  overdueTasks: Task[];
  dueTodayTasks: Task[];
  upcomingReminders: Reminder[];
  selectedDayAgenda: Reminder[];
  pinnedNotes: Note[];
  onCompleteTask: (id: string) => void;
  onCompleteReminder: (id: string) => void;
  onSnoozeReminder: (id: string) => void;
};

function getIconForUrgency(urgency: BriefItem["urgency"]) {
  switch (urgency) {
    case "overdue":
      return AlertCircle;
    case "today":
      return Clock;
    case "upcoming":
      return Calendar;
    case "context":
      return Pin;
  }
}

function getUrgencyLabel(urgency: BriefItem["urgency"]): string {
  switch (urgency) {
    case "overdue":
      return "Overdue";
    case "today":
      return "Today";
    case "upcoming":
      return "Upcoming";
    case "context":
      return "Context";
  }
}

export function TodayDashboardPanel({
  overdueTasks,
  dueTodayTasks,
  upcomingReminders,
  selectedDayAgenda,
  pinnedNotes,
  onCompleteTask,
  onCompleteReminder,
  onSnoozeReminder
}: Props): JSX.Element {
  const briefItems = deriveFocusBrief({
    overdueTasks,
    dueTodayTasks,
    upcomingReminders,
    selectedDayAgenda,
    pinnedNotes
  });

  const summary = getBriefSummary(briefItems);
  const topItems = briefItems.slice(0, 3);

  return (
    <section className="panel" aria-labelledby="today-dashboard-heading">
      <PanelHeader icon={LayoutDashboard} title="Focus Brief" />
      <div className="notesGrid">
        <article className="noteCard">
          <h3>Summary</h3>
          <p>{summary}</p>
        </article>
        {topItems.length > 0 ? (
          <article className="noteCard">
            <h3>Top priorities</h3>
            <ul className="briefList">
              {topItems.map((item) => {
                const Icon = getIconForUrgency(item.urgency);
                return (
                  <li key={item.sourceId} className="briefListItem">
                    <Icon size={16} className="briefListItemIcon" />
                    <div className="briefListItemContent">
                      <div className={`briefItemLabel ${item.urgency === "overdue" ? "briefItemLabelOverdue" : ""}`}>
                        {item.label}
                      </div>
                      {item.detail && <div className="briefItemDetail">{item.detail}</div>}
                      <div className="briefItemMeta">
                        {getUrgencyLabel(item.urgency)} • {item.kind}
                      </div>
                    </div>
                    <div className="briefItemActions">
                      {item.kind === "task" && (
                        <IconButton
                          icon={Check}
                          size={16}
                          onClick={() => onCompleteTask(item.sourceId)}
                          label="Complete task"
                          className="briefActionButton"
                        />
                      )}
                      {(item.kind === "reminder" || item.kind === "agenda") && (
                        <>
                          <IconButton
                            icon={Check}
                            size={16}
                            onClick={() => onCompleteReminder(item.sourceId)}
                            label="Complete reminder"
                            className="briefActionButton"
                          />
                          <IconButton
                            icon={Snooze}
                            size={16}
                            onClick={() => onSnoozeReminder(item.sourceId)}
                            label="Snooze 10 minutes"
                            className="briefActionButton"
                          />
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>
        ) : (
          <article className="noteCard">
            <h3>Top priorities</h3>
            <p className="briefEmptyState">No items to show. Add tasks, reminders, or pin notes to see them here.</p>
          </article>
        )}
        <article className="noteCard">
          <h3>Pressure</h3>
          <p>
            {briefItems.filter((item) => item.urgency === "overdue").length} overdue •{" "}
            {briefItems.filter((item) => item.urgency === "today").length} due today
          </p>
        </article>
      </div>
    </section>
  );
}
