import { memo } from "react";
import type { CalendarCell } from "../../lib/calendar";
import { Calendar, ChevronLeft, ChevronRight, ListTodo, Bell } from "lucide-react";
import { parseLocalDateKey, toLocalDateKey } from "../../lib/calendar";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import type { AgendaItem, AgendaFilter } from "../../hooks/workspace/useCalendarState";

type Props = {
  calendarCursor: Date;
  setCalendarCursor: (d: Date) => void;
  monthCells: CalendarCell[];
  todayKey: string;
  selectedDateKey: string;
  onSelectDateKey: (dateKey: string) => void;
  dayAgenda: AgendaItem[];
  agendaFilter: AgendaFilter;
  setAgendaFilter: (f: AgendaFilter) => void;
  onCreateReminder?: (dateKey: string) => void;
  onCreateTask?: (dateKey: string) => void;
};

function selectedDayHeading(selectedKey: string, todayKey: string): string {
  if (selectedKey === todayKey) return "Today";
  const d = parseLocalDateKey(selectedKey);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export const CalendarPanel = memo(function CalendarPanel({
  calendarCursor,
  setCalendarCursor,
  monthCells,
  todayKey,
  selectedDateKey,
  onSelectDateKey,
  dayAgenda,
  agendaFilter,
  setAgendaFilter,
  onCreateReminder,
  onCreateTask
}: Props): JSX.Element {
  return (
    <section className="panel secretaryCalendar" aria-labelledby="calendar-panel-heading">
      <PanelHeader
        icon={Calendar}
        title="Calendar"
        actions={
          <div className="miniActions" role="toolbar" aria-label="Calendar month navigation">
            <IconButton
              icon={ChevronLeft}
              label="Previous month"
              onClick={() =>
                setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))
              }
              variant="ghost"
              size={14}
            />
            <button
              type="button"
              className="ghostButton"
              aria-label="Go to today"
              onClick={() => {
                const now = new Date();
                setCalendarCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                onSelectDateKey(toLocalDateKey(now));
              }}
            >
              Today
            </button>
            <IconButton
              icon={ChevronRight}
              label="Next month"
              onClick={() =>
                setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))
              }
              variant="ghost"
              size={14}
            />
          </div>
        }
      />
      <p className="muted">{calendarCursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</p>
      <div className="calendarGrid" aria-label="Month view">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="calendarHeader">
            {d}
          </div>
        ))}
        {monthCells.map((cell, idx) => {
          const selected = cell.dateKey === selectedDateKey;
          const labelDate = parseLocalDateKey(cell.dateKey).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
          });
          const countLabel = cell.count === 1 ? "1 reminder" : `${cell.count} reminders`;
          const aria = cell.count ? `${labelDate}, ${countLabel}` : `${labelDate}, no reminders`;
          return (
            <button
              key={`${cell.dateKey}-${idx}`}
              type="button"
              aria-label={aria}
              aria-pressed={selected}
              className={`calendarCell calendarCellButton ${cell.isCurrentMonth ? "" : "calendarCellMuted"} ${cell.dateKey === todayKey ? "calendarCellToday" : ""} ${selected ? "calendarCellSelected" : ""}`}
              onClick={() => onSelectDateKey(cell.dateKey)}
            >
              <div className="calendarCellTop">
                <span>{cell.dayNumber}</span>
                {cell.count ? <span className="calendarBadge">{cell.count}</span> : null}
              </div>
            </button>
          );
        })}
      </div>
      <div className="dayFocusTitle">
        <h3 className="subheading">{selectedDayHeading(selectedDateKey, todayKey)}</h3>
        <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          {(["day", "today", "tomorrow", "week"] as AgendaFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`pillButton ${agendaFilter === f ? "pillButtonActive" : ""}`}
              onClick={() => setAgendaFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <ul className="list" aria-label="Agenda for selected day">
        {dayAgenda.length ? (
          dayAgenda.map((item) => (
            <li key={`${item.type}-${item.id}`} className="agendaListItem">
              {item.type === "reminder" ? (
                <>
                  <Bell size={14} className="agendaListItemIcon" />
                  <span className="agendaListItemTime">
                    {new Date(item.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="agendaListItemText">{item.text}</span>
                </>
              ) : (
                <>
                  <ListTodo size={14} className="agendaListItemIcon" />
                  <span className="agendaListItemTime">
                    {item.dueAt ? new Date(item.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                  </span>
                  <span className="agendaListItemText">{item.title}</span>
                  <span className={`pill ${item.priority === "high" ? "pillAttention" : ""}`}>{item.priority}</span>
                </>
              )}
            </li>
          ))
        ) : (
          <li className="muted">Nothing scheduled.</li>
        )}
      </ul>
      <div className="row" style={{ gap: "0.5rem", padding: "var(--space-2) 0" }}>
        {onCreateReminder && (
          <button type="button" className="ghostButton" onClick={() => onCreateReminder(selectedDateKey)}>
            <Bell size={14} /> Add reminder
          </button>
        )}
        {onCreateTask && (
          <button type="button" className="ghostButton" onClick={() => onCreateTask(selectedDateKey)}>
            <ListTodo size={14} /> Add task
          </button>
        )}
      </div>
    </section>
  );
});
