import { useMemo, useState } from "react";
import type { ExternalCalendarEvent, Note, Reminder, Task } from "../../../shared/types";
import {
  buildCalendarCells,
  filterCalendarEvents,
  toLocalDateKey,
  type CalendarSourceFilter
} from "../../lib/calendar";
import { externalEventsGroupedByLocalDate, mapExternalCalendarEventToCalendarItem } from "../../lib/externalCalendar";
import { agendaForDateKey, remindersGroupedByLocalDate } from "../../lib/derived/reminders";

export type AgendaFilter = "day" | "today" | "tomorrow" | "week";
export type { CalendarSourceFilter };

export type AgendaItem =
  | { type: "reminder"; id: string; text: string; dueAt: string }
  | { type: "task"; id: string; title: string; dueAt: string | null; priority: "low" | "normal" | "high" }
  | { type: "note"; id: string; title: string; createdAt: string };

function getItemDate(item: AgendaItem): string | null {
  if (item.type === "note") return item.createdAt;
  return item.dueAt;
}

function tasksForDateKey(tasks: Task[], dateKey: string): AgendaItem[] {
  return tasks
    .filter((t) => t.dueAt && toLocalDateKey(new Date(t.dueAt)) === dateKey)
    .map((t) => ({ type: "task" as const, id: t.id, title: t.title, dueAt: t.dueAt, priority: t.priority }));
}

function notesForDateKey(notes: Note[], dateKey: string): AgendaItem[] {
  return notes
    .filter((n) => toLocalDateKey(new Date(n.createdAt)) === dateKey)
    .map((n) => ({ type: "note" as const, id: n.id, title: n.title, createdAt: n.createdAt }));
}

function combinedAgenda(reminders: Reminder[], tasks: Task[], notes: Note[], dateKey: string): AgendaItem[] {
  const remItems: AgendaItem[] = agendaForDateKey(reminders, dateKey).map((r) => ({
    type: "reminder",
    id: r.id,
    text: r.text,
    dueAt: r.dueAt
  }));
  const taskItems = tasksForDateKey(tasks, dateKey);
  const noteItems = notesForDateKey(notes, dateKey);
  return [...remItems, ...taskItems, ...noteItems];
}

function filterAgenda(items: AgendaItem[], filter: AgendaFilter): AgendaItem[] {
  const now = new Date();
  if (filter === "day") return items;
  if (filter === "today") return items;
  if (filter === "tomorrow") {
    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    return items.filter((item) => {
      const dk = getItemDate(item);
      if (!dk) return false;
      return toLocalDateKey(new Date(dk)) === toLocalDateKey(tmrw);
    });
  }
  if (filter === "week") {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return items.filter((item) => {
      const dateStr = getItemDate(item);
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= now && d <= weekEnd;
    });
  }
  return items;
}

function tasksGroupedByLocalDate(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.dueAt) continue;
    const dateKey = toLocalDateKey(new Date(task.dueAt));
    const existing = map.get(dateKey) || [];
    existing.push(task);
    map.set(dateKey, existing);
  }
  return map;
}

function notesGroupedByLocalDate(notes: Note[]): Map<string, Note[]> {
  const map = new Map<string, Note[]>();
  for (const note of notes) {
    const dateKey = toLocalDateKey(new Date(note.createdAt));
    const existing = map.get(dateKey) || [];
    existing.push(note);
    map.set(dateKey, existing);
  }
  return map;
}

function applySourceFilterToCells(
  cells: ReturnType<typeof buildCalendarCells>,
  sourceFilter: CalendarSourceFilter
): ReturnType<typeof buildCalendarCells> {
  if (sourceFilter === "all") return cells;
  return cells.map((cell) => {
    const events = filterCalendarEvents(cell.events, sourceFilter);
    return { ...cell, events, count: events.length };
  });
}

export function useCalendarState(
  reminders: Reminder[],
  tasks: Task[],
  notes: Note[],
  externalEvents: ExternalCalendarEvent[] = []
) {
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarSelectedKey, setCalendarSelectedKey] = useState(() => toLocalDateKey(new Date()));
  const [agendaFilter, setAgendaFilter] = useState<AgendaFilter>("day");
  const [calendarSourceFilter, setCalendarSourceFilter] = useState<CalendarSourceFilter>("all");

  const remindersByDate = useMemo(() => remindersGroupedByLocalDate(reminders), [reminders]);
  const tasksByDate = useMemo(() => tasksGroupedByLocalDate(tasks), [tasks]);
  const notesByDate = useMemo(() => notesGroupedByLocalDate(notes), [notes]);
  const externalEventsByDate = useMemo(() => externalEventsGroupedByLocalDate(externalEvents), [externalEvents]);

  const monthCells = useMemo(() => {
    const cells = buildCalendarCells(calendarCursor, remindersByDate, tasksByDate, notesByDate, externalEventsByDate);
    return applySourceFilterToCells(cells, calendarSourceFilter);
  }, [calendarCursor, remindersByDate, tasksByDate, notesByDate, externalEventsByDate, calendarSourceFilter]);

  const todayKey = toLocalDateKey(new Date());
  const selectedDayAgenda = useMemo(
    () => combinedAgenda(reminders, tasks, notes, calendarSelectedKey),
    [reminders, tasks, notes, calendarSelectedKey]
  );
  const selectedDayExternalEvents = useMemo(() => {
    const events = externalEventsByDate.get(calendarSelectedKey) || [];
    const mapped = events.map(mapExternalCalendarEventToCalendarItem);
    return filterCalendarEvents(mapped, calendarSourceFilter);
  }, [externalEventsByDate, calendarSelectedKey, calendarSourceFilter]);

  const filteredAgenda = useMemo(
    () => filterAgenda(selectedDayAgenda, agendaFilter),
    [selectedDayAgenda, agendaFilter]
  );

  return {
    calendarCursor,
    setCalendarCursor,
    calendarSelectedKey,
    setCalendarSelectedKey,
    agendaFilter,
    setAgendaFilter,
    calendarSourceFilter,
    setCalendarSourceFilter,
    monthCells,
    todayKey,
    selectedDayAgenda: filteredAgenda,
    selectedDayExternalEvents
  };
}
