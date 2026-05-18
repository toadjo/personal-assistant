/**
 * Tests for CalendarPanel create forms.
 */

import { render, screen } from "@testing-library/react";
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
});
