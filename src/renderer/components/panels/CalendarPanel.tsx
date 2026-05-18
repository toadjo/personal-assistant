import { memo, useState } from "react";
import type { CalendarCell } from "../../lib/calendar";
import { Calendar, ChevronLeft, ChevronRight, ListTodo, Bell, X } from "lucide-react";
import { parseLocalDateKey, toLocalDateKey } from "../../lib/calendar";
import { getDefaultTimeForDate } from "../../lib/calendar-default-time";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import type { AgendaItem, AgendaFilter } from "../../hooks/workspace/useCalendarState";
import "./CalendarPanel.css";

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
  onCreateReminder?: (payload: { text: string; dueAt: string; recurrence: "none" }) => void;
  onCreateTask?: (payload: { title: string; notes?: string; dueAt?: string; priority: "low" | "normal" | "high"; recurrence: "none" | "daily" | "weekly" | "monthly" }) => void;
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
  const [createMode, setCreateMode] = useState<"none" | "reminder" | "task">("none");
  const [reminderText, setReminderText] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "normal" | "high">("normal");
  const [taskRecurrence, setTaskRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none");

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
    const dueAt = `${selectedDateKey}T${reminderTime}:00`;
    onCreateReminder?.({ text: reminderText, dueAt, recurrence: "none" });
    handleCloseForm();
  }

  function handleSaveTask(): void {
    if (!taskTitle.trim()) return;
    const dueAt = taskTime ? `${selectedDateKey}T${taskTime}:00` : undefined;
    onCreateTask?.({ title: taskTitle, notes: taskNotes || undefined, dueAt, priority: taskPriority, recurrence: taskRecurrence });
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
                    {item.dueAt
                      ? new Date(item.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "-"}
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
