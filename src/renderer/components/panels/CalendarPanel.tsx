import { memo, useState } from "react";
import type { CalendarCell, CalendarEventItem, CalendarSourceFilter } from "../../lib/calendar";
import { Calendar, ChevronLeft, ChevronRight, ExternalLink, ListTodo, Bell, Lock, X } from "lucide-react";
import {
  parseLocalDateKey,
  toLocalDateKey,
  getHourlyEventsForDate,
  getAllDayEventsForDate,
  getWeekDaysForDate,
  getWorkWeekDaysForDate,
  getUpcomingDays,
  getOverdueEvents
} from "../../lib/calendar";
import { getDefaultTimeForDate } from "../../lib/calendar-default-time";
import { parseLocalDateTimeInput } from "../../lib/dateTime";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import type { AgendaItem } from "../../hooks/workspace/useCalendarState";
import "./CalendarPanel.css";

const MAX_EVENTS_PER_CELL = 3;

function getEventBackgroundColor(event: CalendarEventItem): string {
  const isCompleted = event.status === "completed" || event.status === "done";
  if (isCompleted) return "var(--cal-completed-bg)";
  if (event.source === "google") return "var(--cal-google-bg, #e8f0fe)";
  if (event.source === "teams") return "var(--cal-teams-bg, #ede7f6)";
  if (event.source === "microsoft") return "var(--cal-microsoft-bg, #e8f4fc)";
  if (event.source === "task" && event.priority === "high") return "var(--cal-task-high-bg)";
  if (event.source === "task") return "var(--cal-task-bg)";
  if (event.source === "note") return "var(--cal-memo-bg)";
  return "var(--cal-reminder-bg)";
}

function providerBadgeLabel(event: CalendarEventItem): string | null {
  if (event.source === "google") return "Google";
  if (event.source === "teams") return "Teams";
  if (event.source === "microsoft") return "Outlook";
  return null;
}

function externalEventActionLink(event: CalendarEventItem): { href: string; label: string } | null {
  if (event.source === "teams" && event.onlineMeetingUrl) {
    return { href: event.onlineMeetingUrl, label: "Join Teams meeting" };
  }
  if (event.htmlLink) {
    const label =
      event.source === "teams" ? "Open in Teams/Outlook" : event.source === "microsoft" ? "Open in Outlook" : "Open in provider";
    return { href: event.htmlLink, label };
  }
  return null;
}

const SOURCE_FILTERS: { id: CalendarSourceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "local", label: "Local" },
  { id: "google", label: "Google" },
  { id: "microsoft", label: "Outlook" },
  { id: "teams", label: "Teams" }
];

type CalendarView = "day" | "workWeek" | "week" | "upcoming" | "month" | "agenda";

type Props = {
  calendarCursor: Date;
  setCalendarCursor: (d: Date) => void;
  monthCells: CalendarCell[];
  todayKey: string;
  selectedDateKey: string;
  onSelectDateKey: (dateKey: string) => void;
  dayAgenda: AgendaItem[];
  selectedDayExternalEvents?: CalendarEventItem[];
  calendarSourceFilter?: CalendarSourceFilter;
  onCalendarSourceFilterChange?: (filter: CalendarSourceFilter) => void;
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

function selectedDayHeading(selectedKey: string, todayKey: string): string {
  if (selectedKey === todayKey) return "Today";
  const d = parseLocalDateKey(selectedKey);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export const CalendarPanel = memo(function CalendarPanel({
  calendarCursor,
  setCalendarCursor,
  monthCells,
  todayKey,
  selectedDateKey,
  onSelectDateKey,
  dayAgenda,
  selectedDayExternalEvents = [],
  calendarSourceFilter = "all",
  onCalendarSourceFilterChange,
  onCreateReminder,
  onCreateTask
}: Props): JSX.Element {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
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
      <p className="muted">{calendarCursor.toLocaleString("en-US", { month: "long", year: "numeric" })}</p>
      <div className="calendarSourceFilter" role="toolbar" aria-label="Calendar source filter">
        {SOURCE_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`calendarSourceFilterButton ${calendarSourceFilter === filter.id ? "calendarSourceFilterButtonActive" : ""}`}
            onClick={() => onCalendarSourceFilterChange?.(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>
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
            const labelDate = parseLocalDateKey(cell.dateKey).toLocaleDateString("en-US", {
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
                      key={`${event.source}-${event.id}`}
                      role="button"
                      tabIndex={0}
                      className="calendarEventBar calendarEventBarButton"
                      style={{ backgroundColor: getEventBackgroundColor(event) }}
                      title={event.title}
                      aria-label={`${event.title}${providerBadgeLabel(event) ? ` (${providerBadgeLabel(event)})` : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }
                      }}
                    />
                  ))}
                  {overflowCount > 0 && <span className="calendarOverflow">+{overflowCount}</span>}
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
          </div>
          <div className="calendarAllDayStrip">
            {getAllDayEventsForDate(
              selectedDateKey,
              monthCells.find((c) => c.dateKey === selectedDateKey)?.events || []
            ).map((event) => (
              <div
                key={event.id}
                className="calendarAllDayEvent"
                style={{ backgroundColor: getEventBackgroundColor(event) }}
              >
                {event.title}
              </div>
            ))}
          </div>
          <div className="calendarHourlyGrid">
            {(() => {
              const selectedDate = monthCells.find((c) => c.dateKey === selectedDateKey);
              const hourlyEvents = selectedDate
                ? getHourlyEventsForDate(selectedDateKey, selectedDate.events, START_HOUR, END_HOUR)
                : [];
              if (hourlyEvents.length === 0) {
                return (
                  <>
                    <div className="muted">No events scheduled for this day.</div>
                    <div className="row" style={{ gap: "0.5rem", marginTop: "var(--space-2)" }}>
                      {onCreateReminder && (
                        <button type="button" className="ghostButton" onClick={handleOpenReminder}>
                          <Bell size={14} /> Add reminder
                        </button>
                      )}
                      {onCreateTask && (
                        <button type="button" className="ghostButton" onClick={handleOpenTask}>
                          <ListTodo size={14} /> Add task
                        </button>
                      )}
                    </div>
                  </>
                );
              }
              return hourlyEvents.map(({ hour, event }) => (
                <div key={`${hour}-${event.id}`} className="calendarHourRow">
                  <div className="calendarHourLabel">{hour}:00</div>
                  <div className="calendarHourContent">
                    <div
                      key={event.id}
                      className="calendarHourEvent"
                      style={{ backgroundColor: getEventBackgroundColor(event) }}
                    >
                      {event.title}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
      {(calendarView === "workWeek" || calendarView === "week") && (
        <div className="calendarWeekView" aria-label={`${calendarView} view`}>
          <div className="calendarWeekHeader">
            <h3>{calendarView === "workWeek" ? "Work Week" : "Week"}</h3>
          </div>
          <div className="calendarWeekGrid">
            {(() => {
              const days =
                calendarView === "workWeek"
                  ? getWorkWeekDaysForDate(selectedDateKey)
                  : getWeekDaysForDate(selectedDateKey);
              const allHourlyEvents = days.flatMap((dayKey) => {
                const dayCell = monthCells.find((c) => c.dateKey === dayKey);
                return dayCell ? getHourlyEventsForDate(dayKey, dayCell.events, START_HOUR, END_HOUR) : [];
              });
              if (allHourlyEvents.length === 0) {
                const startDate = days[0] ? parseLocalDateKey(days[0]) : selectedDate;
                const lastDayKey = days[days.length - 1];
                const endDate = lastDayKey ? parseLocalDateKey(lastDayKey) : selectedDate;
                const dateRange = `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                return (
                  <>
                    <p className="muted" style={{ gridColumn: "1 / -1", marginBottom: "var(--space-1)" }}>
                      {dateRange}
                    </p>
                    <div className="muted" style={{ gridColumn: "1 / -1" }}>
                      No events scheduled for this {calendarView === "workWeek" ? "work week" : "week"}.
                    </div>
                    <div className="row" style={{ gap: "0.5rem", marginTop: "var(--space-2)", gridColumn: "1 / -1" }}>
                      {onCreateReminder && (
                        <button type="button" className="ghostButton" onClick={handleOpenReminder}>
                          <Bell size={14} /> Add reminder
                        </button>
                      )}
                      {onCreateTask && (
                        <button type="button" className="ghostButton" onClick={handleOpenTask}>
                          <ListTodo size={14} /> Add task
                        </button>
                      )}
                    </div>
                  </>
                );
              }
              const hoursWithEvents = [...new Set(allHourlyEvents.map((he) => he.hour))];
              return (
                <>
                  <div className="calendarWeekHeaderRow">
                    <div className="calendarWeekHeaderCell calendarWeekTimeHeader">Time</div>
                    {days.map((dayKey) => (
                      <div key={dayKey} className="calendarWeekHeaderCell">
                        {parseLocalDateKey(dayKey).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric"
                        })}
                      </div>
                    ))}
                  </div>
                  {hoursWithEvents
                    .sort((a, b) => a - b)
                    .map((hour) => (
                      <div key={hour} className="calendarWeekRow">
                        <div className="calendarWeekTimeCell">{hour}:00</div>
                        {days.map((dayKey) => {
                          const dayCell = monthCells.find((c) => c.dateKey === dayKey);
                          const eventsForHour = dayCell
                            ? getHourlyEventsForDate(dayKey, dayCell.events, START_HOUR, END_HOUR).filter(
                                (he) => he.hour === hour
                              )
                            : [];
                          return (
                            <div key={dayKey} className="calendarWeekDayCell">
                              {eventsForHour.map(({ event }) => (
                                <div
                                  key={event.id}
                                  className="calendarWeekEvent"
                                  style={{ backgroundColor: getEventBackgroundColor(event) }}
                                >
                                  {event.title}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                </>
              );
            })()}
          </div>
        </div>
      )}
      {calendarView === "agenda" && (
        <div className="calendarAgendaView" aria-label="Agenda view">
          <div className="calendarAgendaHeader">
            <h3>{selectedDayHeading(selectedDateKey, todayKey)}</h3>
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
          </div>
          {(() => {
            const allEvents = monthCells.flatMap((c) => c.events);
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
                          <span
                            className={`agendaListItemIcon ${event.source === "reminder" ? "" : event.source === "task" ? "" : ""}`}
                          >
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
                  const dayCell = monthCells.find((c) => c.dateKey === dayKey);
                  if (!dayCell || dayCell.events.length === 0) return null;
                  return (
                    <div key={dayKey} className="calendarUpcomingSection">
                      <h4 className="calendarUpcomingSectionTitle">
                        {dayKey === todayKey
                          ? "Today"
                          : parseLocalDateKey(dayKey).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric"
                            })}
                      </h4>
                      <ul className="agendaList">
                        {dayCell.events.map((event) => (
                          <li key={event.id} className="agendaListItem">
                            <span
                              className={`agendaListItemIcon ${event.source === "reminder" ? "" : event.source === "task" ? "" : ""}`}
                            >
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
      {calendarView === "month" && (
        <>
          <div className="dayFocusTitle">
            <h3 className="subheading">{selectedDayHeading(selectedDateKey, todayKey)}</h3>
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
            {selectedDayExternalEvents.map((event) => (
              <li key={`${event.source}-${event.id}`} className="agendaListItem">
                <button type="button" className="calendarExternalAgendaButton" onClick={() => setSelectedEvent(event)}>
                  <span className="pill calendarProviderBadge">{providerBadgeLabel(event)}</span>
                  <span className="agendaListItemText">{event.title}</span>
                  {event.readOnly ? <Lock size={12} aria-label="Read-only" /> : null}
                </button>
              </li>
            ))}
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
        </>
      )}
      {createMode === "reminder" && (
        <div className="calendarCreateForm">
          <div className="calendarCreateFormHeader">
            <span className="calendarCreateFormTitle">
              Add reminder for {selectedDayHeading(selectedDateKey, todayKey)}
            </span>
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
      {selectedEvent ? (
        <div className="calendarEventDetail" aria-label="Event details">
          <div className="calendarEventDetailHeader">
            <h3 className="subheading">{selectedEvent.title}</h3>
            <IconButton icon={X} label="Close event details" onClick={() => setSelectedEvent(null)} variant="ghost" size={14} />
          </div>
          {providerBadgeLabel(selectedEvent) ? (
            <span className="pill calendarProviderBadge">{providerBadgeLabel(selectedEvent)}</span>
          ) : null}
          {selectedEvent.readOnly ? (
            <p className="calendarReadOnlyMarker">
              <Lock size={12} /> Read-only external event
            </p>
          ) : null}
          <p className="muted">
            {selectedEvent.allDay
              ? "All day"
              : `${new Date(selectedEvent.startsAt).toLocaleString("en-US")}${selectedEvent.endsAt ? ` – ${new Date(selectedEvent.endsAt).toLocaleString("en-US")}` : ""}`}
          </p>
          {selectedEvent.calendarName ? <p className="muted">Calendar: {selectedEvent.calendarName}</p> : null}
          {selectedEvent.location ? <p className="muted">Location: {selectedEvent.location}</p> : null}
          {typeof selectedEvent.attendeesCount === "number" && selectedEvent.attendeesCount > 0 ? (
            <p className="muted">Attendees: {selectedEvent.attendeesCount}</p>
          ) : null}
          {(() => {
            const action = externalEventActionLink(selectedEvent);
            return action ? (
              <a className="ghostButton" href={action.href} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> {action.label}
              </a>
            ) : null;
          })()}
        </div>
      ) : null}
      {createMode === "task" && (
        <div className="calendarCreateForm">
          <div className="calendarCreateFormHeader">
            <span className="calendarCreateFormTitle">
              Add task for {selectedDayHeading(selectedDateKey, todayKey)}
            </span>
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
              <button type="button" className="primaryButton" onClick={handleSaveTask} disabled={!taskTitle.trim()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});
