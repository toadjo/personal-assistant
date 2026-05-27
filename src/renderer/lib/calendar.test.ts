import { describe, expect, it } from "vitest";
import type { ExternalCalendarEvent, Reminder, Task } from "../../shared/types";
import { buildCalendarCells, filterCalendarEvents, parseLocalDateKey, toLocalDateKey } from "./calendar";
import { externalEventLocalDateKey, mapExternalCalendarEventToCalendarItem } from "./externalCalendar";

describe("calendar", () => {
  it("buildCalendarCells includes event items from reminders and tasks", () => {
    const monthDate = new Date(2026, 0, 1); // January 2026
    const remindersByDate = new Map<string, Reminder[]>();
    const tasksByDate = new Map<string, Task[]>();

    const reminderDateKey = "2026-01-15";
    remindersByDate.set(reminderDateKey, [
      {
        id: "r1",
        text: "Test reminder",
        dueAt: "2026-01-15T10:00:00",
        recurrence: "none",
        status: "pending",
        notifyChannel: "desktop"
      }
    ]);

    const taskDateKey = "2026-01-16";
    tasksByDate.set(taskDateKey, [
      {
        id: "t1",
        title: "Test task",
        notes: "",
        dueAt: "2026-01-16T10:00:00",
        priority: "normal",
        status: "open",
        recurrence: "none",
        notifyChannel: "desktop",
        createdAt: "2026-01-01T00:00:00",
        updatedAt: "2026-01-01T00:00:00",
        lastCompletedAt: null
      }
    ]);

    const cells = buildCalendarCells(monthDate, remindersByDate, tasksByDate, new Map());

    const reminderCell = cells.find((c) => c.dateKey === reminderDateKey);
    expect(reminderCell).toBeDefined();
    expect(reminderCell?.events).toHaveLength(1);
    expect(reminderCell?.events[0]?.source).toBe("reminder");
    expect(reminderCell?.events[0]?.title).toBe("Test reminder");

    const taskCell = cells.find((c) => c.dateKey === taskDateKey);
    expect(taskCell).toBeDefined();
    expect(taskCell?.events).toHaveLength(1);
    expect(taskCell?.events[0]?.source).toBe("task");
    expect(taskCell?.events[0]?.title).toBe("Test task");
  });

  it("buildCalendarCells starts week on Monday", () => {
    const monthDate = new Date(2026, 0, 1); // January 1, 2026 is Thursday
    const cells = buildCalendarCells(monthDate, new Map(), new Map(), new Map());

    // First cell should be Monday (Dec 29, 2025)
    expect(cells[0]?.dayNumber).toBe(29);
    expect(cells[0]?.isCurrentMonth).toBe(false);

    // Thursday (Jan 1) should be at index 3
    const jan1 = cells.find((c) => c.dateKey === "2026-01-01");
    expect(jan1).toBeDefined();
    expect(jan1?.dayNumber).toBe(1);
    expect(jan1?.isCurrentMonth).toBe(true);
  });

  it("buildCalendarCells handles multiple events per day", () => {
    const monthDate = new Date(2026, 0, 1);
    const remindersByDate = new Map<string, Reminder[]>();
    const tasksByDate = new Map<string, Task[]>();

    const dateKey = "2026-01-15";
    remindersByDate.set(dateKey, [
      {
        id: "r1",
        text: "Reminder 1",
        dueAt: "2026-01-15T10:00:00",
        recurrence: "none",
        status: "pending",
        notifyChannel: "desktop"
      },
      {
        id: "r2",
        text: "Reminder 2",
        dueAt: "2026-01-15T11:00:00",
        recurrence: "none",
        status: "pending",
        notifyChannel: "desktop"
      }
    ]);
    tasksByDate.set(dateKey, [
      {
        id: "t1",
        title: "Task 1",
        notes: "",
        dueAt: "2026-01-15T12:00:00",
        priority: "normal",
        status: "open",
        recurrence: "none",
        notifyChannel: "desktop",
        createdAt: "2026-01-01T00:00:00",
        updatedAt: "2026-01-01T00:00:00",
        lastCompletedAt: null
      }
    ]);

    const cells = buildCalendarCells(monthDate, remindersByDate, tasksByDate, new Map());
    const cell = cells.find((c) => c.dateKey === dateKey);

    expect(cell).toBeDefined();
    expect(cell?.events).toHaveLength(3);
    expect(cell?.count).toBe(3);
  });

  it("buildCalendarCells marks completed tasks", () => {
    const monthDate = new Date(2026, 0, 1);
    const remindersByDate = new Map<string, Reminder[]>();
    const tasksByDate = new Map<string, Task[]>();

    const dateKey = "2026-01-15";
    tasksByDate.set(dateKey, [
      {
        id: "t1",
        title: "Completed task",
        notes: "",
        dueAt: "2026-01-15T10:00:00",
        priority: "normal",
        status: "done",
        recurrence: "none",
        notifyChannel: "desktop",
        createdAt: "2026-01-01T00:00:00",
        updatedAt: "2026-01-01T00:00:00",
        lastCompletedAt: "2026-01-15T10:00:00"
      }
    ]);

    const cells = buildCalendarCells(monthDate, remindersByDate, tasksByDate, new Map());
    const cell = cells.find((c) => c.dateKey === dateKey);

    expect(cell).toBeDefined();
    expect(cell?.events[0]?.status).toBe("done");
  });

  it("buildCalendarCells handles high priority tasks", () => {
    const monthDate = new Date(2026, 0, 1);
    const remindersByDate = new Map<string, Reminder[]>();
    const tasksByDate = new Map<string, Task[]>();

    const dateKey = "2026-01-15";
    tasksByDate.set(dateKey, [
      {
        id: "t1",
        title: "High priority task",
        notes: "",
        dueAt: "2026-01-15T10:00:00",
        priority: "high",
        status: "open",
        recurrence: "none",
        notifyChannel: "desktop",
        createdAt: "2026-01-01T00:00:00",
        updatedAt: "2026-01-01T00:00:00",
        lastCompletedAt: null
      }
    ]);

    const cells = buildCalendarCells(monthDate, remindersByDate, tasksByDate, new Map());
    const cell = cells.find((c) => c.dateKey === dateKey);

    expect(cell).toBeDefined();
    expect(cell?.events[0]?.priority).toBe("high");
  });
});

describe("toLocalDateKey", () => {
  it("formats local calendar date as YYYY-MM-DD", () => {
    expect(toLocalDateKey(new Date(2026, 4, 2))).toBe("2026-05-02");
  });
});

describe("parseLocalDateKey", () => {
  it("round-trips with toLocalDateKey in local time", () => {
    const key = "2026-12-31";
    const parsed = parseLocalDateKey(key);
    expect(toLocalDateKey(parsed)).toBe(key);
  });
});

describe("buildCalendarCells", () => {
  it("pads leading/trailing days and counts reminders per cell", () => {
    const month = new Date(2026, 4, 1);
    const key = "2026-05-15";
    const remindersByDate = new Map<string, Reminder[]>([
      [
        key,
        [
          {
            id: "1",
            text: "x",
            dueAt: `${key}T15:00:00.000Z`,
            recurrence: "none",
            status: "pending",
            notifyChannel: "desktop"
          }
        ]
      ]
    ]);
    const cells = buildCalendarCells(month, remindersByDate, new Map(), new Map());
    expect(cells.length % 7).toBe(0);
    const fifteenth = cells.find((c) => c.dateKey === key && c.isCurrentMonth);
    expect(fifteenth?.count).toBe(1);
  });
});

describe("external calendar events", () => {
  const monthDate = new Date(2026, 5, 1);

  function makeExternal(partial: Partial<ExternalCalendarEvent> & Pick<ExternalCalendarEvent, "id" | "title" | "startAt">): ExternalCalendarEvent {
    return {
      accountId: "acc-1",
      provider: partial.provider ?? "google",
      externalId: partial.externalId ?? partial.id,
      calendarId: "primary",
      calendarName: "Primary",
      endAt: partial.endAt ?? partial.startAt,
      allDay: partial.allDay ?? 0,
      location: null,
      status: null,
      attendeesCount: 0,
      htmlLink: null,
      etag: null,
      updatedAtProvider: null,
      isOnlineMeeting: 0,
      onlineMeetingProvider: null,
      onlineMeetingUrl: null,
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
      ...partial
    };
  }

  it("places Google and Microsoft events on the correct local dates", () => {
    const external = new Map<string, ExternalCalendarEvent[]>([
      [
        "2026-06-10",
        [
          makeExternal({
            id: "g1",
            provider: "google",
            title: "Google meet",
            startAt: "2026-06-10T14:00:00Z",
            endAt: "2026-06-10T15:00:00Z"
          })
        ]
      ],
      [
        "2026-06-11",
        [
          makeExternal({
            id: "m1",
            provider: "microsoft",
            title: "Outlook review",
            startAt: "2026-06-11T09:00:00Z",
            endAt: "2026-06-11T10:00:00Z"
          })
        ]
      ]
    ]);
    const cells = buildCalendarCells(monthDate, new Map(), new Map(), new Map(), external);
    expect(cells.find((c) => c.dateKey === "2026-06-10")?.events.some((e) => e.source === "google")).toBe(true);
    expect(cells.find((c) => c.dateKey === "2026-06-11")?.events.some((e) => e.source === "microsoft")).toBe(true);
  });

  it("keeps local and external events on the same day", () => {
    const remindersByDate = new Map<string, Reminder[]>([
      [
        "2026-06-10",
        [
          {
            id: "r1",
            text: "Local reminder",
            dueAt: "2026-06-10T10:00:00Z",
            recurrence: "none",
            status: "pending",
            notifyChannel: "desktop"
          }
        ]
      ]
    ]);
    const external = new Map<string, ExternalCalendarEvent[]>([
      [
        "2026-06-10",
        [
          makeExternal({
            id: "g1",
            title: "External",
            startAt: "2026-06-10T14:00:00Z",
            endAt: "2026-06-10T15:00:00Z"
          })
        ]
      ]
    ]);
    const cell = buildCalendarCells(monthDate, remindersByDate, new Map(), new Map(), external).find(
      (c) => c.dateKey === "2026-06-10"
    );
    expect(cell?.events).toHaveLength(2);
  });

  it("does not shift all-day external event dates across time zones", () => {
    const event = makeExternal({
      id: "g-all-day",
      title: "Holiday",
      startAt: "2026-06-12",
      endAt: "2026-06-13",
      allDay: 1
    });
    expect(externalEventLocalDateKey(event)).toBe("2026-06-12");
    const external = new Map<string, ExternalCalendarEvent[]>([["2026-06-12", [event]]]);
    const cell = buildCalendarCells(monthDate, new Map(), new Map(), new Map(), external).find(
      (c) => c.dateKey === "2026-06-12"
    );
    expect(cell?.events[0]?.allDay).toBe(true);
    expect(cell?.events[0]?.title).toBe("Holiday");
  });

  it("maps Microsoft Teams meetings to teams display source", () => {
    const item = mapExternalCalendarEventToCalendarItem(
      makeExternal({
        id: "teams-1",
        provider: "microsoft",
        title: "Sprint",
        startAt: "2026-06-10T14:00:00Z",
        isOnlineMeeting: 1,
        onlineMeetingProvider: "teamsForBusiness",
        onlineMeetingUrl: "https://teams.microsoft.com/l/meetup-join/abc"
      })
    );
    expect(item.source).toBe("teams");
    expect(item.sourceLabel).toBe("Teams");
    expect(item.onlineMeetingUrl).toContain("teams.microsoft.com");
  });

  it("maps Microsoft events without online meeting as Outlook", () => {
    const item = mapExternalCalendarEventToCalendarItem(
      makeExternal({
        id: "outlook-1",
        provider: "microsoft",
        title: "1:1",
        startAt: "2026-06-10T14:00:00Z"
      })
    );
    expect(item.source).toBe("microsoft");
    expect(item.sourceLabel).toBe("Outlook");
  });

  it("filters events by source including Teams and Outlook split", () => {
    const events = [
      { source: "reminder" as const, id: "1", title: "r", startsAt: "", allDay: false },
      { source: "google" as const, id: "2", title: "g", startsAt: "", allDay: false },
      { source: "microsoft" as const, id: "3", title: "m", startsAt: "", allDay: false },
      { source: "teams" as const, id: "4", title: "t", startsAt: "", allDay: false }
    ];
    expect(filterCalendarEvents(events, "local")).toHaveLength(1);
    expect(filterCalendarEvents(events, "google")).toHaveLength(1);
    expect(filterCalendarEvents(events, "microsoft")).toHaveLength(1);
    expect(filterCalendarEvents(events, "teams")).toHaveLength(1);
    expect(filterCalendarEvents(events, "teams").every((e) => e.source === "teams")).toBe(true);
    expect(filterCalendarEvents(events, "microsoft").every((e) => e.source === "microsoft")).toBe(true);
  });
});
