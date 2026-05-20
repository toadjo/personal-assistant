/**
 * Tests for CalendarPanel create forms.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { CalendarPanel } from "./CalendarPanel";
import type { CalendarCell } from "../../lib/calendar";
import type { AgendaItem } from "../../hooks/workspace/useCalendarState";

function makeCalendarCell(overrides: Partial<CalendarCell> = {}): CalendarCell {
  return {
    dateKey: "2024-01-01",
    dayNumber: 1,
    isCurrentMonth: true,
    count: 0,
    events: [],
    ...overrides
  };
}

describe("CalendarPanel", () => {
  const calendarCursor = new Date(2024, 0, 1);
  const setCalendarCursor = vi.fn();
  const monthCells = [
    makeCalendarCell({ dateKey: "2024-01-01", dayNumber: 1 }),
    makeCalendarCell({ dateKey: "2024-01-02", dayNumber: 2 })
  ];
  const todayKey = "2024-01-01";
  const selectedDateKey = "2024-01-01";
  const onSelectDateKey = vi.fn();
  const dayAgenda: AgendaItem[] = [];
  const onCreateReminder = vi.fn();
  const onCreateTask = vi.fn();

  it("renders Add reminder and Add task buttons", () => {
    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    expect(screen.getByText("Add reminder")).toBeInTheDocument();
    expect(screen.getByText("Add task")).toBeInTheDocument();
  });

  it("reminder form opens from Add reminder", async () => {
    const user = userEvent.setup();
    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const addButton = screen.getByText("Add reminder");
    await user.click(addButton);

    expect(screen.getByText(/Add reminder for/i)).toBeInTheDocument();
  });

  it("reminder save sends trimmed text, ISO due date, and recurrence: none", async () => {
    const user = userEvent.setup();
    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const addButton = screen.getByText("Add reminder");
    await user.click(addButton);

    const textInput = screen.getByPlaceholderText("Reminder text...");
    await user.type(textInput, "Test reminder");

    const saveButton = screen.getByText("Save");
    await user.click(saveButton);

    expect(onCreateReminder).toHaveBeenCalledWith({
      text: "Test reminder",
      dueAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      recurrence: "none"
    });
  });

  it("empty reminder text keeps Save disabled", async () => {
    const user = userEvent.setup();
    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const addButton = screen.getByText("Add reminder");
    await user.click(addButton);

    const saveButton = screen.getByText("Save");
    expect(saveButton).toBeDisabled();
  });

  it("task form opens from Add task", async () => {
    const user = userEvent.setup();
    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const addButton = screen.getByText("Add task");
    await user.click(addButton);

    expect(screen.getByText(/Add task for/i)).toBeInTheDocument();
  });

  it("task save sends trimmed title, notes, ISO due date, selected priority, and selected recurrence", async () => {
    const user = userEvent.setup();
    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const addButton = screen.getByText("Add task");
    await user.click(addButton);

    const titleInput = screen.getByPlaceholderText("Task title...");
    await user.type(titleInput, "Test task");

    const notesInput = screen.getByPlaceholderText("Notes (optional)...");
    await user.type(notesInput, "Test notes");

    const prioritySelect = screen.getByDisplayValue("Normal priority");
    await user.selectOptions(prioritySelect, "high");

    const recurrenceSelect = screen.getByDisplayValue("No repeat");
    await user.selectOptions(recurrenceSelect, "daily");

    const saveButton = screen.getByText("Save");
    await user.click(saveButton);

    expect(onCreateTask).toHaveBeenCalledWith({
      title: "Test task",
      notes: "Test notes",
      dueAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      priority: "high",
      recurrence: "daily"
    });
  });

  it("empty task title keeps Save disabled", async () => {
    const user = userEvent.setup();
    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const addButton = screen.getByText("Add task");
    await user.click(addButton);

    const saveButton = screen.getByText("Save");
    expect(saveButton).toBeDisabled();
  });

  it("renders calendar toolbar with Month view active by default", () => {
    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const toolbarButtons = document.querySelectorAll(".calendarToolbarButton");
    expect(toolbarButtons).toHaveLength(6);
    expect(toolbarButtons[0]?.textContent).toBe("Day");
    expect(toolbarButtons[1]?.textContent).toBe("Work Week");
    expect(toolbarButtons[2]?.textContent).toBe("Week");
    expect(toolbarButtons[3]?.textContent).toBe("Upcoming");
    expect(toolbarButtons[4]?.textContent).toBe("Month");
    expect(toolbarButtons[5]?.textContent).toBe("Agenda");
  });

  it("renders event bars for calendar cells with events", () => {
    const cellsWithEvents = [
      makeCalendarCell({
        dateKey: "2024-01-01",
        dayNumber: 1,
        count: 2,
        events: [
          { id: "r1", source: "reminder", title: "Reminder 1", startsAt: "2024-01-01T10:00:00", allDay: false },
          { id: "t1", source: "task", title: "Task 1", startsAt: "2024-01-01T11:00:00", allDay: false, priority: "normal", status: "open" }
        ]
      })
    ];

    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={cellsWithEvents}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    // Event bars should be rendered
    const eventBars = screen.getAllByTitle(/Reminder 1|Task 1/);
    expect(eventBars.length).toBeGreaterThan(0);
  });

  it("shows overflow indicator when events exceed max per cell", () => {
    const cellsWithOverflow = [
      makeCalendarCell({
        dateKey: "2024-01-01",
        dayNumber: 1,
        count: 5,
        events: [
          { id: "r1", source: "reminder", title: "Reminder 1", startsAt: "2024-01-01T10:00:00", allDay: false },
          { id: "r2", source: "reminder", title: "Reminder 2", startsAt: "2024-01-01T11:00:00", allDay: false },
          { id: "r3", source: "reminder", title: "Reminder 3", startsAt: "2024-01-01T12:00:00", allDay: false },
          { id: "t1", source: "task", title: "Task 1", startsAt: "2024-01-01T13:00:00", allDay: false, priority: "normal", status: "open" },
          { id: "t2", source: "task", title: "Task 2", startsAt: "2024-01-01T14:00:00", allDay: false, priority: "normal", status: "open" }
        ]
      })
    ];

    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={cellsWithOverflow}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    // Should show overflow indicator (+2 for 5 events with max 3)
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("renders calendar grid with Monday as first day of week", () => {
    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    // Week should start with Monday
    const headers = document.querySelectorAll(".calendarHeader");
    expect(headers[0]?.textContent).toBe("Mon");
    expect(headers[6]?.textContent).toBe("Sun");
  });

  it("Day view with no events shows empty state with Add buttons", async () => {
    const user = userEvent.setup();
    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const calendarToolbar = document.querySelector(".calendarToolbar");
    const dayButton = calendarToolbar?.querySelector('button') as HTMLElement;
    await user.click(dayButton!);

    // Should show empty state instead of hourly grid
    expect(screen.getByText("No events scheduled for this day.")).toBeInTheDocument();
    // Should show Add reminder and Add task buttons
    expect(screen.getByText("Add reminder")).toBeInTheDocument();
    expect(screen.getByText("Add task")).toBeInTheDocument();
    // Should NOT show Back to month button
    expect(screen.queryByText("Back to month")).not.toBeInTheDocument();
  });

  it("Day view with events shows only occupied hours", async () => {
    const user = userEvent.setup();
    const cellsWithEvents = [
      makeCalendarCell({
        dateKey: "2024-01-01",
        dayNumber: 1,
        count: 2,
        events: [
          { id: "r1", source: "reminder", title: "Reminder 1", startsAt: "2024-01-01T10:00:00", allDay: false },
          { id: "t1", source: "task", title: "Task 1", startsAt: "2024-01-01T14:00:00", allDay: false, priority: "normal", status: "open" }
        ]
      })
    ];

    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={cellsWithEvents}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const calendarToolbar = document.querySelector(".calendarToolbar");
    const dayButton = calendarToolbar?.querySelector('button') as HTMLElement;
    await user.click(dayButton!);

    // Should show only hours with events (10:00 and 14:00), not all hours
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText("14:00")).toBeInTheDocument();
    expect(screen.getByText("Reminder 1")).toBeInTheDocument();
    expect(screen.getByText("Task 1")).toBeInTheDocument();
    // Should NOT show empty hours like 6:00 or 22:00
    expect(screen.queryByText("6:00")).not.toBeInTheDocument();
    expect(screen.queryByText("22:00")).not.toBeInTheDocument();
    // Should NOT show Back to month button
    expect(screen.queryByText("Back to month")).not.toBeInTheDocument();
  });

  it("Work Week view with no events shows empty state with date range", async () => {
    const user = userEvent.setup();
    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const calendarToolbar = document.querySelector(".calendarToolbar");
    const buttons = calendarToolbar?.querySelectorAll('button') as NodeListOf<HTMLElement>;
    await user.click(buttons[1]!);

    const weekView = document.querySelector(".calendarWeekView");
    expect(weekView?.textContent).toContain("Work Week");
    expect(weekView?.textContent).toContain("No events scheduled for this work week.");
    // Should show date range
    expect(weekView?.textContent).toMatch(/\w+ \d+ - \w+ \d+/);
    // Should show Add reminder and Add task buttons
    expect(screen.getByText("Add reminder")).toBeInTheDocument();
    expect(screen.getByText("Add task")).toBeInTheDocument();
    // Should NOT show Back to month button
    expect(screen.queryByText("Back to month")).not.toBeInTheDocument();
  });

  it("Week view with no events shows empty state with date range", async () => {
    const user = userEvent.setup();
    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const calendarToolbar = document.querySelector(".calendarToolbar");
    const buttons = calendarToolbar?.querySelectorAll('button') as NodeListOf<HTMLElement>;
    await user.click(buttons[2]!);

    const weekView = document.querySelector(".calendarWeekView");
    expect(weekView?.textContent).toContain("Week");
    expect(weekView?.textContent).toContain("No events scheduled for this week.");
    // Should show date range
    expect(weekView?.textContent).toMatch(/\w+ \d+ - \w+ \d+/);
    // Should show Add reminder and Add task buttons
    expect(screen.getByText("Add reminder")).toBeInTheDocument();
    expect(screen.getByText("Add task")).toBeInTheDocument();
    // Should NOT show Back to month button
    expect(screen.queryByText("Back to month")).not.toBeInTheDocument();
  });

  it("Upcoming view groups overdue items and next 14 days", async () => {
    const user = userEvent.setup();
    const yesterday = "2023-12-31";
    const cellsWithOverdue = [
      makeCalendarCell({
        dateKey: yesterday,
        dayNumber: 31,
        count: 1,
        events: [
          { id: "r1", source: "reminder", title: "Overdue reminder", startsAt: "2023-12-31T10:00:00", allDay: false, status: "pending" }
        ]
      }),
      makeCalendarCell({
        dateKey: "2024-01-02",
        dayNumber: 2,
        count: 1,
        events: [
          { id: "t1", source: "task", title: "Future task", startsAt: "2024-01-02T10:00:00", allDay: false, priority: "normal", status: "open" }
        ]
      })
    ];

    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={cellsWithOverdue}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const calendarToolbar = document.querySelector(".calendarToolbar");
    const buttons = calendarToolbar?.querySelectorAll('button') as NodeListOf<HTMLElement>;
    await user.click(buttons[3]!);

    expect(screen.getByText("Upcoming (Next 14 Days)")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Overdue reminder")).toBeInTheDocument();
    // Should NOT show Back to month button
    expect(screen.queryByText("Back to month")).not.toBeInTheDocument();
  });

  it("Agenda view renders reminders, tasks, and memo activity", async () => {
    const user = userEvent.setup();
    const agendaWithItems: AgendaItem[] = [
      { type: "reminder", id: "r1", text: "Test reminder", dueAt: "2024-01-01T10:00:00" },
      { type: "task", id: "t1", title: "Test task", dueAt: "2024-01-01T11:00:00", priority: "normal" },
      { type: "note", id: "n1", title: "Test note", createdAt: "2024-01-01T09:00:00" }
    ];

    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={agendaWithItems}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const calendarToolbar = document.querySelector(".calendarToolbar");
    const buttons = calendarToolbar?.querySelectorAll('button') as NodeListOf<HTMLElement>;
    await user.click(buttons[5]!);

    // Should NOT show Back to month button
    expect(screen.queryByText("Back to month")).not.toBeInTheDocument();
    // Check within the calendarAgendaView specifically
    const agendaView = document.querySelector(".calendarAgendaView");
    expect(agendaView?.textContent).toContain("Test reminder");
    expect(agendaView?.textContent).toContain("Test task");
    expect(agendaView?.textContent).toContain("Test note");
  });

  it("Month view renders without lower pill row", () => {
    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={monthCells}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    // Month view should be active by default
    expect(screen.getByText("Mon")).toBeInTheDocument();
    // Should NOT show the lower pill row buttons (they had specific styling)
    expect(document.querySelector(".pillButton")).not.toBeInTheDocument();
  });

  it("Month view still renders event bars and overflow", async () => {
    const cellsWithEvents = [
      makeCalendarCell({
        dateKey: "2024-01-01",
        dayNumber: 1,
        count: 5,
        events: [
          { id: "r1", source: "reminder", title: "Reminder 1", startsAt: "2024-01-01T10:00:00", allDay: false },
          { id: "r2", source: "reminder", title: "Reminder 2", startsAt: "2024-01-01T11:00:00", allDay: false },
          { id: "r3", source: "reminder", title: "Reminder 3", startsAt: "2024-01-01T12:00:00", allDay: false },
          { id: "t1", source: "task", title: "Task 1", startsAt: "2024-01-01T13:00:00", allDay: false, priority: "normal", status: "open" },
          { id: "t2", source: "task", title: "Task 2", startsAt: "2024-01-01T14:00:00", allDay: false, priority: "normal", status: "open" }
        ]
      })
    ];

    render(
      <CalendarPanel
        calendarCursor={calendarCursor}
        setCalendarCursor={setCalendarCursor}
        monthCells={cellsWithEvents}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={onSelectDateKey}
        dayAgenda={dayAgenda}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    // Month view should be active by default
    expect(screen.getByText("+2")).toBeInTheDocument();
  });
});
