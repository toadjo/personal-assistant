import type { Reminder } from "../../shared/types";
import type { Task } from "../../shared/types";
import type { Note } from "../../shared/types";

export type CalendarEventSource = "reminder" | "task" | "note";

export type CalendarEventItem = {
  source: CalendarEventSource;
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  allDay: boolean;
  status?: "pending" | "completed" | "open" | "done";
  priority?: "low" | "normal" | "high";
};

export type CalendarCell = {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  count: number;
  events: CalendarEventItem[];
};

export type HourlyEvent = {
  event: CalendarEventItem;
  hour: number;
};

export function getHourlyEventsForDate(
  dateKey: string,
  events: CalendarEventItem[],
  startHour: number = 6,
  endHour: number = 22
): HourlyEvent[] {
  const hourlyEvents: HourlyEvent[] = [];
  for (const event of events) {
    if (event.allDay) continue;
    const eventDate = new Date(event.startsAt);
    const eventDateKey = toLocalDateKey(eventDate);
    if (eventDateKey !== dateKey) continue;
    const hour = eventDate.getHours();
    if (hour >= startHour && hour < endHour) {
      hourlyEvents.push({ event, hour });
    }
  }
  return hourlyEvents.sort((a, b) => {
    // Sort by hour first
    if (a.hour !== b.hour) return a.hour - b.hour;
    // Then by source: reminder, task, note
    const sourceOrder = { reminder: 0, task: 1, note: 2 };
    return sourceOrder[a.event.source] - sourceOrder[b.event.source];
  });
}

export function getAllDayEventsForDate(dateKey: string, events: CalendarEventItem[]): CalendarEventItem[] {
  return events.filter((e) => {
    if (!e.allDay) return false;
    const eventDate = new Date(e.startsAt);
    return toLocalDateKey(eventDate) === dateKey;
  });
}

export function getWeekDaysForDate(dateKey: string): string[] {
  const date = parseLocalDateKey(dateKey);
  const dayOfWeek = date.getDay();
  // Adjust to Monday as first day (0 = Sunday, 1 = Monday, so Sunday becomes 7)
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - mondayOffset);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(toLocalDateKey(day));
  }
  return days;
}

export function getWorkWeekDaysForDate(dateKey: string): string[] {
  const weekDays = getWeekDaysForDate(dateKey);
  return weekDays.slice(0, 5); // Monday to Friday
}

export function getUpcomingDays(dateKey: string, days: number = 14): string[] {
  const date = parseLocalDateKey(dateKey);
  const upcomingDays: string[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(date);
    day.setDate(date.getDate() + i);
    upcomingDays.push(toLocalDateKey(day));
  }
  return upcomingDays;
}

export function getOverdueEvents(events: CalendarEventItem[], todayKey: string): CalendarEventItem[] {
  return events.filter((e) => {
    const eventDateKey = toLocalDateKey(new Date(e.startsAt));
    return eventDateKey < todayKey && e.status !== "completed" && e.status !== "done";
  });
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse a `YYYY-MM-DD` key in local calendar (no UTC shift). */
export function parseLocalDateKey(dateKey: string): Date {
  const parts = dateKey.split("-").map((n) => Number(n));
  if (parts.length !== 3) {
    throw new Error(`Invalid date key (expected YYYY-MM-DD): ${dateKey}`);
  }
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined || ![y, m, d].every((n) => Number.isFinite(n))) {
    throw new Error(`Invalid date key (expected YYYY-MM-DD): ${dateKey}`);
  }
  return new Date(y, m - 1, d);
}

export function buildCalendarCells(
  monthDate: Date,
  remindersByDate: Map<string, Reminder[]>,
  tasksByDate: Map<string, Task[]>,
  notesByDate?: Map<string, Note[]>
): CalendarCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Week starts Monday (0 = Sunday, 1 = Monday, so adjust to start from Monday)
  const leading = (firstDay.getDay() + 6) % 7;
  const cells: CalendarCell[] = [];

  for (let i = leading; i > 0; i -= 1) {
    const date = new Date(year, month, 1 - i);
    const key = toLocalDateKey(date);
    const reminders = remindersByDate.get(key) || [];
    const tasks = tasksByDate.get(key) || [];
    const notes = notesByDate?.get(key) || [];
    const events: CalendarEventItem[] = [
      ...reminders.map((r) => ({
        source: "reminder" as const,
        id: r.id,
        title: r.text,
        startsAt: r.dueAt,
        endsAt: undefined,
        allDay: false,
        status: r.status,
        priority: undefined
      })),
      ...tasks.map((t) => ({
        source: "task" as const,
        id: t.id,
        title: t.title,
        startsAt: t.dueAt || "",
        endsAt: undefined,
        allDay: !t.dueAt,
        status: t.status,
        priority: t.priority
      })),
      ...notes.map((n) => ({
        source: "note" as const,
        id: n.id,
        title: n.title,
        startsAt: n.createdAt,
        endsAt: n.updatedAt,
        allDay: true,
        status: undefined,
        priority: undefined
      }))
    ];
    cells.push({
      dateKey: key,
      dayNumber: date.getDate(),
      isCurrentMonth: false,
      count: events.length,
      events
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const key = toLocalDateKey(date);
    const reminders = remindersByDate.get(key) || [];
    const tasks = tasksByDate.get(key) || [];
    const notes = notesByDate?.get(key) || [];
    const events: CalendarEventItem[] = [
      ...reminders.map((r) => ({
        source: "reminder" as const,
        id: r.id,
        title: r.text,
        startsAt: r.dueAt,
        endsAt: undefined,
        allDay: false,
        status: r.status,
        priority: undefined
      })),
      ...tasks.map((t) => ({
        source: "task" as const,
        id: t.id,
        title: t.title,
        startsAt: t.dueAt || "",
        endsAt: undefined,
        allDay: !t.dueAt,
        status: t.status,
        priority: t.priority
      })),
      ...notes.map((n) => ({
        source: "note" as const,
        id: n.id,
        title: n.title,
        startsAt: n.createdAt,
        endsAt: n.updatedAt,
        allDay: true,
        status: undefined,
        priority: undefined
      }))
    ];
    cells.push({
      dateKey: key,
      dayNumber: day,
      isCurrentMonth: true,
      count: events.length,
      events
    });
  }

  let trailingDay = 1;
  while (cells.length % 7 !== 0) {
    const nextDate = new Date(year, month + 1, trailingDay);
    const key = toLocalDateKey(nextDate);
    const reminders = remindersByDate.get(key) || [];
    const tasks = tasksByDate.get(key) || [];
    const notes = notesByDate?.get(key) || [];
    const events: CalendarEventItem[] = [
      ...reminders.map((r) => ({
        source: "reminder" as const,
        id: r.id,
        title: r.text,
        startsAt: r.dueAt,
        endsAt: undefined,
        allDay: false,
        status: r.status,
        priority: undefined
      })),
      ...tasks.map((t) => ({
        source: "task" as const,
        id: t.id,
        title: t.title,
        startsAt: t.dueAt || "",
        endsAt: undefined,
        allDay: !t.dueAt,
        status: t.status,
        priority: t.priority
      })),
      ...notes.map((n) => ({
        source: "note" as const,
        id: n.id,
        title: n.title,
        startsAt: n.createdAt,
        endsAt: n.updatedAt,
        allDay: true,
        status: undefined,
        priority: undefined
      }))
    ];
    cells.push({
      dateKey: key,
      dayNumber: nextDate.getDate(),
      isCurrentMonth: false,
      count: events.length,
      events
    });
    trailingDay += 1;
  }

  return cells;
}
