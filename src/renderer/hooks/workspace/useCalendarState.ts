import { useMemo, useState } from "react";
import type { Reminder } from "../../../shared/types";
import { buildCalendarCells, toLocalDateKey } from "../../lib/calendar";
import { agendaForDateKey, remindersGroupedByLocalDate } from "../../lib/derived/reminders";

export function useCalendarState(reminders: Reminder[]) {
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarSelectedKey, setCalendarSelectedKey] = useState(() => toLocalDateKey(new Date()));

  const remindersByDate = useMemo(() => remindersGroupedByLocalDate(reminders), [reminders]);
  const monthCells = useMemo(
    () => buildCalendarCells(calendarCursor, remindersByDate),
    [calendarCursor, remindersByDate]
  );
  const todayKey = toLocalDateKey(new Date());
  const selectedDayAgenda = useMemo(
    () => agendaForDateKey(reminders, calendarSelectedKey),
    [reminders, calendarSelectedKey]
  );

  return {
    calendarCursor,
    setCalendarCursor,
    calendarSelectedKey,
    setCalendarSelectedKey,
    monthCells,
    todayKey,
    selectedDayAgenda
  };
}
