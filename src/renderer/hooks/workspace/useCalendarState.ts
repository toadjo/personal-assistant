import { useMemo, useState } from "react";
import type { Reminder, Task } from "../../../shared/types";
import { buildCalendarCells, toLocalDateKey } from "../../lib/calendar";
import { agendaForDateKey, remindersGroupedByLocalDate } from "../../lib/derived/reminders";

export type AgendaFilter = "day" | "today" | "tomorrow" | "week";

export type AgendaItem =
  | { type: "reminder"; id: string; text: string; dueAt: string }
  | { type: "task"; id: string; title: string; dueAt: string | null; priority: "low" | "normal" | "high" };

function tasksForDateKey(tasks: Task[], dateKey: string): AgendaItem[] {
  return tasks
    .filter((t) => t.dueAt && toLocalDateKey(new Date(t.dueAt)) === dateKey)
    .map((t) => ({ type: "task" as const, id: t.id, title: t.title, dueAt: t.dueAt, priority: t.priority }));
}

function combinedAgenda(reminders: Reminder[], tasks: Task[], dateKey: string): AgendaItem[] {
  const remItems: AgendaItem[] = agendaForDateKey(reminders, dateKey).map((r) => ({
    type: "reminder",
    id: r.id,
    text: r.text,
    dueAt: r.dueAt
  }));
  const taskItems = tasksForDateKey(tasks, dateKey);
  return [...remItems, ...taskItems];
}

function filterAgenda(items: AgendaItem[], filter: AgendaFilter): AgendaItem[] {
  const now = new Date();
  if (filter === "day") return items;
  if (filter === "today") return items;
  if (filter === "tomorrow") {
    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    return items.filter((item) => {
      const dk = item.dueAt ? toLocalDateKey(new Date(item.dueAt)) : "";
      return dk === toLocalDateKey(tmrw);
    });
  }
  if (filter === "week") {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return items.filter((item) => {
      if (!item.dueAt) return false;
      const d = new Date(item.dueAt);
      return d >= now && d <= weekEnd;
    });
  }
  return items;
}

export function useCalendarState(reminders: Reminder[], tasks: Task[]) {
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarSelectedKey, setCalendarSelectedKey] = useState(() => toLocalDateKey(new Date()));
  const [agendaFilter, setAgendaFilter] = useState<AgendaFilter>("day");

  const remindersByDate = useMemo(() => remindersGroupedByLocalDate(reminders), [reminders]);
  const monthCells = useMemo(
    () => buildCalendarCells(calendarCursor, remindersByDate),
    [calendarCursor, remindersByDate]
  );
  const todayKey = toLocalDateKey(new Date());
  const selectedDayAgenda = useMemo(
    () => combinedAgenda(reminders, tasks, calendarSelectedKey),
    [reminders, tasks, calendarSelectedKey]
  );

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
    monthCells,
    todayKey,
    selectedDayAgenda: filteredAgenda
  };
}
