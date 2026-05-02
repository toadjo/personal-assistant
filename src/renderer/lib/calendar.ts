import type { Reminder } from "../../shared/types";

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
    cells.push({
      dateKey: key,
      dayNumber: date.getDate(),
      isCurrentMonth: false,
      count: (remindersByDate.get(key) || []).length
    });
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
    cells.push({
      dateKey: key,
      dayNumber: nextDate.getDate(),
      isCurrentMonth: false,
      count: (remindersByDate.get(key) || []).length
    });
    trailingDay += 1;
  }

  return cells;
}
