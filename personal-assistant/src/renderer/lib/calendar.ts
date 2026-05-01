import type { Reminder } from "../../shared/types";

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type CalendarCell = { dateKey: string; dayNumber: number; isCurrentMonth: boolean; count: number };

export function buildCalendarCells(monthDate: Date, remindersByDate: Map<string, Reminder[]>): CalendarCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leading = firstDay.getDay();
  const cells: CalendarCell[] = [];

  for (let i = leading; i > 0; i -= 1) {
    const date = new Date(year, month, 1 - i);
    const key = toLocalDateKey(date);
    cells.push({ dateKey: key, dayNumber: date.getDate(), isCurrentMonth: false, count: (remindersByDate.get(key) || []).length });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const key = toLocalDateKey(date);
    cells.push({ dateKey: key, dayNumber: day, isCurrentMonth: true, count: (remindersByDate.get(key) || []).length });
  }

  let trailingDay = 1;
  while (cells.length % 7 !== 0) {
    const nextDate = new Date(year, month + 1, trailingDay);
    const key = toLocalDateKey(nextDate);
    cells.push({ dateKey: key, dayNumber: nextDate.getDate(), isCurrentMonth: false, count: (remindersByDate.get(key) || []).length });
    trailingDay += 1;
  }

  return cells;
}
