import type { Reminder } from "../../../shared/types";
import type { ReminderFilter } from "../../types";
import { toLocalDateKey } from "../calendar";

export function pendingReminders(reminders: Reminder[]): Reminder[] {
  return reminders.filter((r) => r.status === "pending");
}

export function overduePending(pending: Reminder[]): Reminder[] {
  const now = Date.now();
  return pending.filter((r) => new Date(r.dueAt).getTime() < now);
}

export function visibleReminders(reminders: Reminder[], filter: ReminderFilter): Reminder[] {
  return reminders.filter((r) => filter === "all" || r.status === filter);
}

export function remindersGroupedByLocalDate(reminders: Reminder[]): Map<string, Reminder[]> {
  const byDate = new Map<string, Reminder[]>();
  for (const reminder of reminders) {
    const key = toLocalDateKey(new Date(reminder.dueAt));
    byDate.set(key, [...(byDate.get(key) || []), reminder]);
  }
  return byDate;
}

export function agendaForDateKey(reminders: Reminder[], dateKey: string): Reminder[] {
  return reminders
    .filter((r) => r.status === "pending" && toLocalDateKey(new Date(r.dueAt)) === dateKey)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function todayAgendaFor(reminders: Reminder[], todayKey: string): Reminder[] {
  return agendaForDateKey(reminders, todayKey);
}
