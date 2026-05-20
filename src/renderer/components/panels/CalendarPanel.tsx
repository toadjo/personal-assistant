import { memo, useState } from "react";
import type { CalendarCell, CalendarEventItem } from "../../lib/calendar";
import { Calendar, ChevronLeft, ChevronRight, ListTodo, Bell, X } from "lucide-react";
import { parseLocalDateKey, toLocalDateKey, getHourlyEventsForDate, getAllDayEventsForDate, getWeekDaysForDate, getWorkWeekDaysForDate, getUpcomingDays, getOverdueEvents } from "../../lib/calendar";
import { getDefaultTimeForDate } from "../../lib/calendar-default-time";
import { parseLocalDateTimeInput } from "../../lib/dateTime";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import type { AgendaItem, AgendaFilter } from "../../hooks/workspace/useCalendarState";
import "./CalendarPanel.css";

const MAX_EVENTS_PER_CELL = 3;

function getEventBackgroundColor(event: CalendarEventItem): string {
  const isCompleted = event.status === "completed" || event.status === "done";
  if (isCompleted) return "var(--cal-completed-bg)";
  if (event.source === "task" && event.priority === "high") return "var(--cal-task-high-bg)";
  if (event.source === "task") return "var(--cal-task-bg)";
  if (event.source === "note") return "var(--cal-memo-bg)";
  return "var(--cal-reminder-bg)";
}

type CalendarView = "day" | "workWeek" | "week" | "upcoming" | "month" | "agenda";

type Props = {
  calendarCursor: Date;
  setCalendarCursor: (d: Date) => void;
  monthCells: CalendarCell[];
  todayKey: string;
  selectedDateKey: string;
  onSelectDateKey: (dateKey: string) => void;
  dayAgenda: AgendaItem[];
  agendaFilter: AgendaFilter;
  setAgendaFilter: (filter: AgendaFilter) => void;
  onCreateReminder?: (payload: { text: string; dueAt: string; recurrence: "none" | "daily" }) => void;
  onCreateTask?: (payload: {
    title: string;
    notes: string;
    dueAt: string | null;
    priority: "low" | "normal" | "high";
    recurrence: "none" | "daily" | "weekly" | "monthly";
  }) => void;
};

const START_HOUR = 6;
const END_HOUR = 22;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

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
  const [createMode, setCreateMode] = useState<"none" | "reminder" | "task">("none");
  const [reminderText, setReminderText] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "normal" | "high">("normal");
  const [taskRecurrence, setTaskRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [calendarView, setCalendarView] = useState<CalendarView>("month");

  const selectedDate = parseLocalDateKey(selectedDateKey);

  function handleOpenReminder(): void {
    setCreateMode("reminder");
    setReminderText("");
    setReminderTime(getDefaultTimeForDate(selectedDate));
  }

  function handleOpenTask(): void {
    setCreateMode("task");
    setTaskTitle("");
    setTaskNotes("");
    setTaskTime(getDefaultTimeForDate(selectedDate));
    setTaskPriority("normal");
    setTaskRecurrence("none");
  }

  function handleCloseForm(): void {
    setCreateMode("none");
    setReminderText("");
    setReminderTime("");
    setTaskTitle("");
    setTaskNotes("");
    setTaskTime("");
    setTaskPriority("normal");
    setTaskRecurrence("none");
  }

  function handleSaveReminder(): void {
    if (!reminderText.trim() || !reminderTime) return;
    const localDateTime = `${selectedDateKey}T${reminderTime}`;
    const dueAt = parseLocalDateTimeInput(localDateTime);
    onCreateReminder?.({ text: reminderText, dueAt, recurrence: "none" });
    handleCloseForm();
  }

  function handleSaveTask(): void {
    if (!taskTitle.trim()) return;
    const dueAt = taskTime ? parseLocalDateTimeInput(`${selectedDateKey}T${taskTime}`) : null;
    onCreateTask?.({ title: taskTitle, notes: taskNotes, dueAt, priority: taskPriority, recurrence: taskRecurrence });
    handleCloseForm();
  }
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
      <div className="calendarToolbar" role="toolbar" aria-label="Calendar view">
        {(["day", "workWeek", "week", "upcoming", "month", "agenda"] as CalendarView[]).map((view) => (
          <button
            key={view}
            type="button"
            className={`calendarToolbarButton ${calendarView === view ? "calendarToolbarButtonActive" : ""}`}
            onClick={() => setCalendarView(view)}
          >
            {view === "day" && "Day"}
            {view === "workWeek" && "Work Week"}
            {view === "week" && "Week"}
            {view === "upcoming" && "Upcoming"}
            {view === "month" && "Month"}
            {view === "agenda" && "Agenda"}
          </button>
        ))}
      </div>
      {calendarView === "month" && (
        <div className="calendarGrid" aria-label="Month view">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
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
            const visibleEvents = cell.events.slice(0, MAX_EVENTS_PER_CELL);
            const overflowCount = cell.events.length - MAX_EVENTS_PER_CELL;
            const aria = cell.count ? `${labelDate}, ${cell.count} events` : `${labelDate}, no events`;
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
                </div>
                <div className="calendarCellEvents">
                  {visibleEvents.map((event) => (
                    <div
                      key={event.id}
                      className="calendarEventBar"
                      style={{ backgroundColor: getEventBackgroundColor(event) }}
                      title={event.title}
                    />
                  ))}
                  {overflowCount > 0 && (
                    <span className="calendarOverflow">+{overflowCount}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {calendarView === "day" && (
        <div className="calendarDayView" aria-label="Day view">
          <div className="calendarDayHeader">
            <h3>{selectedDayHeading(selectedDateKey, todayKey)}</h3>
            <button
              type="button"
              className="ghostButton"
              onClick={() => setCalendarView("month")}
            >
              Back to month
            </button>
          </div>
          <div className="calendarAllDayStrip">
            {getAllDayEventsForDate(selectedDateKey, monthCells.find(c => c.dateKey === selectedDateKey)?.events || []).map((event) => (
              <div key={event.id} className="calendarAllDayEvent" style={{ backgroundColor: getEventBackgroundColor(event) }}>
                {event.title}
              </div>
            ))}
          </div>
          <div className="calendarHourlyGrid">
            {HOURS.map((hour) => {
              const selectedDate = monthCells.find(c => c.dateKey === selectedDateKey);
              const eventsForHour = selectedDate ? getHourlyEventsForDate(selectedDateKey, selectedDate.events, START_HOUR, END_HOUR).filter(he => he.hour === hour) : [];
              return (
                <div key={hour} className="calendarHourRow">
                  <div className="calendarHourLabel">{hour}:00</div>
                  <div className="calendarHourContent">
                    {eventsForHour.map(({ event }) => (
                      <div key={event.id} className="calendarHourEvent" style={{ backgroundColor: getEventBackgroundColor(event) }}>
                        {event.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {(calendarView === "workWeek" || calendarView === "week") && (
        <div className="calendarWeekView" aria-label={`${calendarView} view`}>
          <div className="calendarWeekHeader">
            <h3>{calendarView === "workWeek" ? "Work Week" : "Week"}</h3>
            <button
              type="button"
              className="ghostButton"
              onClick={() => setCalendarView("month")}
            >
              Back to month
            </button>
          </div>
          <div className="calendarWeekGrid">
            {["Time", ...(calendarView === "workWeek" ? getWorkWeekDaysForDate(selectedDateKey) : getWeekDaysForDate(selectedDateKey))].map((header, idx) => (
              <div key={header} className={`calendarWeekHeaderCell ${idx === 0 ? "calendarWeekTimeHeader" : ""}`}>
                {idx === 0 ? header : parseLocalDateKey(header).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </div>
            ))}
            {HOURS.map((hour) => (
              <div key={hour} className="calendarWeekRow">
                <div className="calendarWeekTimeCell">{hour}:00</div>
                {(calendarView === "workWeek" ? getWorkWeekDaysForDate(selectedDateKey) : getWeekDaysForDate(selectedDateKey)).map((dayKey) => {
                  const dayCell = monthCells.find(c => c.dateKey === dayKey);
                  const eventsForHour = dayCell ? getHourlyEventsForDate(dayKey, dayCell.events, START_HOUR, END_HOUR).filter(he => he.hour === hour) : [];
                  return (
                    <div key={dayKey} className="calendarWeekDayCell">
                      {eventsForHour.map(({ event }) => (
                        <div key={event.id} className="calendarWeekEvent" style={{ backgroundColor: getEventBackgroundColor(event) }}>
                          {event.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      {calendarView === "agenda" && (
        <div className="calendarAgendaView" aria-label="Agenda view">
          <div className="calendarAgendaHeader">
            <h3>{selectedDayHeading(selectedDateKey, todayKey)}</h3>
            <button
              type="button"
              className="ghostButton"
              onClick={() => setCalendarView("month")}
            >
              Back to month
            </button>
          </div>
          <ul className="agendaList">
            {dayAgenda.length > 0 ? (
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
                  ) : item.type === "task" ? (
                    <>
                      <ListTodo size={14} className="agendaListItemIcon" />
                      <span className="agendaListItemTime">
                        {item.dueAt
                          ? new Date(item.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </span>
                      <span className="agendaListItemText">{item.title}</span>
                      <span className={`pill ${item.priority === "high" ? "pillAttention" : ""}`}>{item.priority}</span>
                    </>
                  ) : (
                    <>
                      <span className="agendaListItemIcon">📝</span>
                      <span className="agendaListItemText">{item.title}</span>
                    </>
                  )}
                </li>
              ))
            ) : (
              <li className="muted">Nothing scheduled.</li>
            )}
          </ul>
        </div>
      )}
      {calendarView === "upcoming" && (
        <div className="calendarUpcomingView" aria-label="Upcoming view">
          <div className="calendarUpcomingHeader">
            <h3>Upcoming (Next 14 Days)</h3>
            <button
              type="button"
              className="ghostButton"
              onClick={() => setCalendarView("month")}
            >
              Back to month
            </button>
          </div>
          {(() => {
            const allEvents = monthCells.flatMap(c => c.events);
            const overdue = getOverdueEvents(allEvents, todayKey);
            const upcomingDays = getUpcomingDays(todayKey, 14);
            return (
              <div className="calendarUpcomingList">
                {overdue.length > 0 && (
                  <div className="calendarUpcomingSection">
                    <h4 className="calendarUpcomingSectionTitle">Overdue</h4>
                    <ul className="agendaList">
                      {overdue.map((event) => (
                        <li key={event.id} className="agendaListItem">
                          <span className={`agendaListItemIcon ${event.source === "reminder" ? "" : event.source === "task" ? "" : ""}`}>
                            {event.source === "reminder" && <Bell size={14} />}
                            {event.source === "task" && <ListTodo size={14} />}
                            {event.source === "note" && <span>📝</span>}
                          </span>
                          <span className="agendaListItemText">{event.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {upcomingDays.map((dayKey) => {
                  const dayCell = monthCells.find(c => c.dateKey === dayKey);
                  if (!dayCell || dayCell.events.length === 0) return null;
                  return (
                    <div key={dayKey} className="calendarUpcomingSection">
                      <h4 className="calendarUpcomingSectionTitle">
                        {dayKey === todayKey ? "Today" : parseLocalDateKey(dayKey).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                      </h4>
                      <ul className="agendaList">
                        {dayCell.events.map((event) => (
                          <li key={event.id} className="agendaListItem">
                            <span className={`agendaListItemIcon ${event.source === "reminder" ? "" : event.source === "task" ? "" : ""}`}>
                              {event.source === "reminder" && <Bell size={14} />}
                              {event.source === "task" && <ListTodo size={14} />}
                              {event.source === "note" && <span>📝</span>}
                            </span>
                            <span className="agendaListItemText">{event.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
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
              ) : item.type === "task" ? (
                <>
                  <ListTodo size={14} className="agendaListItemIcon" />
                  <span className="agendaListItemTime">
                    {item.dueAt
                      ? new Date(item.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "-"}
                  </span>
                  <span className="agendaListItemText">{item.title}</span>
                  <span className={`pill ${item.priority === "high" ? "pillAttention" : ""}`}>{item.priority}</span>
                </>
              ) : (
                <>
                  <span className="agendaListItemIcon">📝</span>
                  <span className="agendaListItemText">{item.title}</span>
                </>
              )}
            </li>
          ))
        ) : (
          <li className="muted">Nothing scheduled.</li>
        )}
      </ul>
      <div className="row" style={{ gap: "0.5rem", padding: "var(--space-2) 0" }}>
        {onCreateReminder && createMode === "none" && (
          <button type="button" className="ghostButton" onClick={handleOpenReminder}>
            <Bell size={14} /> Add reminder
          </button>
        )}
        {onCreateTask && createMode === "none" && (
          <button type="button" className="ghostButton" onClick={handleOpenTask}>
            <ListTodo size={14} /> Add task
          </button>
        )}
      </div>
      {createMode === "reminder" && (
        <div className="calendarCreateForm">
          <div className="calendarCreateFormHeader">
            <span className="calendarCreateFormTitle">Add reminder for {selectedDayHeading(selectedDateKey, todayKey)}</span>
            <IconButton icon={X} label="Cancel" onClick={handleCloseForm} variant="ghost" size={14} />
          </div>
          <div className="calendarCreateFormBody">
            <input
              type="text"
              className="calendarCreateFormInput"
              placeholder="Reminder text..."
              value={reminderText}
              onChange={(e) => setReminderText(e.currentTarget.value)}
              autoFocus
            />
            <input
              type="time"
              className="calendarCreateFormInput"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.currentTarget.value)}
            />
            <div className="calendarCreateFormActions">
              <button type="button" className="ghostButton" onClick={handleCloseForm}>
                Cancel
              </button>
              <button
                type="button"
                className="primaryButton"
                onClick={handleSaveReminder}
                disabled={!reminderText.trim() || !reminderTime}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {createMode === "task" && (
        <div className="calendarCreateForm">
          <div className="calendarCreateFormHeader">
            <span className="calendarCreateFormTitle">Add task for {selectedDayHeading(selectedDateKey, todayKey)}</span>
            <IconButton icon={X} label="Cancel" onClick={handleCloseForm} variant="ghost" size={14} />
          </div>
          <div className="calendarCreateFormBody">
            <input
              type="text"
              className="calendarCreateFormInput"
              placeholder="Task title..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.currentTarget.value)}
              autoFocus
            />
            <textarea
              className="calendarCreateFormInput"
              placeholder="Notes (optional)..."
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.currentTarget.value)}
              rows={2}
            />
            <input
              type="time"
              className="calendarCreateFormInput"
              value={taskTime}
              onChange={(e) => setTaskTime(e.currentTarget.value)}
            />
            <div className="calendarCreateFormRow">
              <select
                className="calendarCreateFormSelect"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.currentTarget.value as "low" | "normal" | "high")}
              >
                <option value="low">Low priority</option>
                <option value="normal">Normal priority</option>
                <option value="high">High priority</option>
              </select>
              <select
                className="calendarCreateFormSelect"
                value={taskRecurrence}
                onChange={(e) => setTaskRecurrence(e.currentTarget.value as "none" | "daily" | "weekly" | "monthly")}
              >
                <option value="none">No repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="calendarCreateFormActions">
              <button type="button" className="ghostButton" onClick={handleCloseForm}>
                Cancel
              </button>
              <button
                type="button"
                className="primaryButton"
                onClick={handleSaveTask}
                disabled={!taskTitle.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});
