import type { Reminder } from "../../../shared/types";
import type { CalendarCell } from "../../lib/calendar";

type Props = {
  calendarCursor: Date;
  setCalendarCursor: (d: Date) => void;
  monthCells: CalendarCell[];
  todayKey: string;
  todayAgenda: Reminder[];
};

export function CalendarPanel({ calendarCursor, setCalendarCursor, monthCells, todayKey, todayAgenda }: Props): JSX.Element {
  return (
    <section className="panel">
      <div className="titleRow">
        <h2>Calendar</h2>
        <div className="miniActions">
          <button type="button" className="ghostButton" onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))}>
            Prev
          </button>
          <button type="button" className="ghostButton" onClick={() => setCalendarCursor(new Date())}>
            Today
          </button>
          <button type="button" className="ghostButton" onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))}>
            Next
          </button>
        </div>
      </div>
      <p className="muted">{calendarCursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</p>
      <p className="muted sectionIntro">See upcoming load quickly with day badges and today focus.</p>
      <div className="calendarGrid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="calendarHeader">
            {d}
          </div>
        ))}
        {monthCells.map((cell, idx) => (
          <div
            key={`${cell.dateKey}-${idx}`}
            className={`calendarCell ${cell.isCurrentMonth ? "" : "calendarCellMuted"} ${cell.dateKey === todayKey ? "calendarCellToday" : ""}`}
          >
            <div className="calendarCellTop">
              <span>{cell.dayNumber}</span>
              {cell.count ? <span className="calendarBadge">{cell.count}</span> : null}
            </div>
          </div>
        ))}
      </div>
      <h3 className="subheading">Today agenda</h3>
      <ul className="list">
        {todayAgenda.length ? (
          todayAgenda.map((r) => (
            <li key={r.id}>
              {new Date(r.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {r.text}
            </li>
          ))
        ) : (
          <li className="muted">No pending reminders today.</li>
        )}
      </ul>
    </section>
  );
}
