import type { ConnectedCalendarProvider, ExternalCalendarEvent } from "../../shared/types";
import { classifyMicrosoftCalendarDisplaySource } from "../../shared/connectedCalendarDisplay";
import type { CalendarEventItem, CalendarEventSource } from "./calendar";
import { parseLocalDateKey, toLocalDateKey } from "./calendar";

export function externalEventLocalDateKey(event: ExternalCalendarEvent): string {
  if (event.allDay) {
    return event.startAt.slice(0, 10);
  }
  return toLocalDateKey(new Date(event.startAt));
}

export function externalEventsGroupedByLocalDate(events: ExternalCalendarEvent[]): Map<string, ExternalCalendarEvent[]> {
  const map = new Map<string, ExternalCalendarEvent[]>();
  for (const event of events) {
    const key = externalEventLocalDateKey(event);
    const existing = map.get(key) || [];
    existing.push(event);
    map.set(key, existing);
  }
  return map;
}

export function calendarDisplaySourceForExternalEvent(event: ExternalCalendarEvent): CalendarEventSource {
  if (event.provider === "google") {
    return "google";
  }
  return classifyMicrosoftCalendarDisplaySource({
    isOnlineMeeting: event.isOnlineMeeting,
    onlineMeetingProvider: event.onlineMeetingProvider,
    onlineMeetingUrl: event.onlineMeetingUrl
  });
}

export function mapExternalCalendarEventToCalendarItem(event: ExternalCalendarEvent): CalendarEventItem {
  const provider = event.provider as ConnectedCalendarProvider;
  const source = calendarDisplaySourceForExternalEvent(event);
  const sourceLabel = source === "google" ? "Google" : source === "teams" ? "Teams" : "Outlook";

  return {
    source,
    id: event.id,
    title: event.title,
    startsAt: event.startAt,
    endsAt: event.endAt,
    allDay: Boolean(event.allDay),
    provider,
    sourceLabel,
    readOnly: true,
    htmlLink: event.htmlLink,
    onlineMeetingUrl: event.onlineMeetingUrl,
    calendarName: event.calendarName,
    location: event.location,
    attendeesCount: event.attendeesCount
  };
}

export function getVisibleCalendarRangeIso(monthDate: Date): { startAt: string; endAt: string } {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leading = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - leading);
  const trailing = (7 - ((leading + lastDay.getDate()) % 7)) % 7;
  const gridEnd = new Date(year, month + 1, trailing);
  const start = parseLocalDateKey(toLocalDateKey(gridStart));
  start.setHours(0, 0, 0, 0);
  const end = parseLocalDateKey(toLocalDateKey(gridEnd));
  end.setHours(23, 59, 59, 999);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}
