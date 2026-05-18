/**
 * Tests for CalendarPanel create forms.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CalendarPanel } from "./CalendarPanel";
import type { CalendarCell } from "../../lib/calendar";
import type { AgendaItem, AgendaFilter } from "../../hooks/workspace/useCalendarState";

function makeCalendarCell(overrides: Partial<CalendarCell> = {}): CalendarCell {
  return {
    dateKey: "2024-01-01",
    dayNumber: 1,
    isCurrentMonth: true,
    count: 0,
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
  const agendaFilter: AgendaFilter = "day";
  const setAgendaFilter = vi.fn();
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
        agendaFilter={agendaFilter}
        setAgendaFilter={setAgendaFilter}
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
        agendaFilter={agendaFilter}
        setAgendaFilter={setAgendaFilter}
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
        agendaFilter={agendaFilter}
        setAgendaFilter={setAgendaFilter}
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
        agendaFilter={agendaFilter}
        setAgendaFilter={setAgendaFilter}
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
        agendaFilter={agendaFilter}
        setAgendaFilter={setAgendaFilter}
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
        agendaFilter={agendaFilter}
        setAgendaFilter={setAgendaFilter}
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
        agendaFilter={agendaFilter}
        setAgendaFilter={setAgendaFilter}
        onCreateReminder={onCreateReminder}
        onCreateTask={onCreateTask}
      />
    );

    const addButton = screen.getByText("Add task");
    await user.click(addButton);

    const saveButton = screen.getByText("Save");
    expect(saveButton).toBeDisabled();
  });
});
