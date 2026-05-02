import type { Reminder } from "../../../shared/types";
import type { CalendarCell } from "../../lib/calendar";
import { parseLocalDateKey, toLocalDateKey } from "../../lib/calendar";

type Props = {
  calendarCursor: Date;
  setCalendarCursor: (d: Date) => void;
  monthCells: CalendarCell[];
  todayKey: string;
  selectedDateKey: string;
  onSelectDateKey: (dateKey: string) => void;
  dayAgenda: Reminder[];
};

function selectedDayHeading(selectedKey: string, todayKey: string): string {
  if (selectedKey === todayKey) return "Today";
  const d = parseLocalDateKey(selectedKey);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function CalendarPanel({
  calendarCursor,
  setCalendarCursor,
  monthCells,
  todayKey,
  selectedDateKey,
  onSelectDateKey,
  dayAgenda
}: Props): JSX.Element {
  return (
    <section className="panel secretaryCalendar">
      <div className="titleRow">
        <h2>Calendar</h2>
        <div className="miniActions">
          <button
            type="button"
            className="ghostButton"
            onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))}
          >
            Prev
          </button>
          <button
            type="button"
            className="ghostButton"
            onClick={() => {
              const now = new Date();
              setCalendarCursor(new Date(now.getFullYear(), now.getMonth(), 1));
              onSelectDateKey(toLocalDateKey(now));
            }}
          >
            Today
          </button>
          <button
            type="button"
            className="ghostButton"
            onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))}
          >
            Next
          </button>
        </div>
      </div>
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
        <p className="muted plannerHeading">Pending reminders for this day.</p>
      </div>
      <ul className="list">
        {dayAgenda.length ? (
          dayAgenda.map((r) => (
            <li key={r.id}>
              {new Date(r.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — {r.text}
            </li>
          ))
        ) : (
          <li className="muted">Nothing scheduled.</li>
        )}
      </ul>
    </section>
  );
}
