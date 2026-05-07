import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TodayDashboardPanel } from "./TodayDashboardPanel";

describe("TodayDashboardPanel", () => {
  const onCompleteTask = vi.fn();
  const onCompleteReminder = vi.fn();
  const onSnoozeReminder = vi.fn();

  it("renders Focus Brief with summary, priorities, and pressure", () => {
    render(
      <TodayDashboardPanel
        overdueTasks={[
          {
            id: "1",
            title: "late",
            notes: "",
            dueAt: new Date().toISOString(),
            priority: "normal",
            status: "open",
            recurrence: "none",
            notifyChannel: "desktop",
            createdAt: "",
            updatedAt: "",
            lastCompletedAt: null
          }
        ]}
        dueTodayTasks={[]}
        upcomingReminders={[]}
        selectedDayAgenda={[]}
        pinnedNotes={[{ id: "n1", title: "Pinned", content: "", tags: [], pinned: true, createdAt: "", updatedAt: "" }]}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
      />
    );

    expect(screen.getByText(/Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Top priorities/i)).toBeInTheDocument();
    expect(screen.getByText(/Pressure/i)).toBeInTheDocument();
    expect(screen.getByText(/late/i)).toBeInTheDocument();
  });

  it("shows empty state when no items", () => {
    render(
      <TodayDashboardPanel
        overdueTasks={[]}
        dueTodayTasks={[]}
        upcomingReminders={[]}
        selectedDayAgenda={[]}
        pinnedNotes={[]}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
      />
    );

    expect(screen.getByText(/No items to show/i)).toBeInTheDocument();
  });

  it("renders complete action for task items", () => {
    render(
      <TodayDashboardPanel
        overdueTasks={[
          {
            id: "task-1",
            title: "Task",
            notes: "",
            dueAt: new Date().toISOString(),
            priority: "normal",
            status: "open",
            recurrence: "none",
            notifyChannel: "desktop",
            createdAt: "",
            updatedAt: "",
            lastCompletedAt: null
          }
        ]}
        dueTodayTasks={[]}
        upcomingReminders={[]}
        selectedDayAgenda={[]}
        pinnedNotes={[]}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
      />
    );

    const completeButton = screen.getByLabelText("Complete task: Task");
    completeButton.click();
    expect(onCompleteTask).toHaveBeenCalledWith("task-1");
  });

  it("renders complete and snooze actions for reminder items", () => {
    render(
      <TodayDashboardPanel
        overdueTasks={[]}
        dueTodayTasks={[]}
        upcomingReminders={[
          {
            id: "reminder-1",
            text: "Reminder",
            dueAt: new Date().toISOString(),
            recurrence: "none",
            status: "pending",
            notifyChannel: "desktop"
          }
        ]}
        selectedDayAgenda={[]}
        pinnedNotes={[]}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
      />
    );

    const completeButton = screen.getByLabelText("Complete reminder: Reminder");
    completeButton.click();
    expect(onCompleteReminder).toHaveBeenCalledWith("reminder-1");

    const snoozeButton = screen.getByLabelText("Snooze reminder ten minutes: Reminder");
    snoozeButton.click();
    expect(onSnoozeReminder).toHaveBeenCalledWith("reminder-1");
  });

  it("renders complete and snooze actions for agenda items", () => {
    render(
      <TodayDashboardPanel
        overdueTasks={[]}
        dueTodayTasks={[]}
        upcomingReminders={[]}
        selectedDayAgenda={[
          {
            id: "agenda-1",
            text: "Agenda",
            dueAt: new Date().toISOString(),
            recurrence: "none",
            status: "pending",
            notifyChannel: "desktop"
          }
        ]}
        pinnedNotes={[]}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
      />
    );

    const completeButton = screen.getByLabelText("Complete reminder: Agenda");
    completeButton.click();
    expect(onCompleteReminder).toHaveBeenCalledWith("agenda-1");

    const snoozeButton = screen.getByLabelText("Snooze reminder ten minutes: Agenda");
    snoozeButton.click();
    expect(onSnoozeReminder).toHaveBeenCalledWith("agenda-1");
  });

  it("does not render mutation actions for note items", () => {
    render(
      <TodayDashboardPanel
        overdueTasks={[]}
        dueTodayTasks={[]}
        upcomingReminders={[]}
        selectedDayAgenda={[]}
        pinnedNotes={[{ id: "n1", title: "Note", content: "", tags: [], pinned: true, createdAt: "", updatedAt: "" }]}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
      />
    );

    expect(screen.queryByLabelText("Complete task")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Complete reminder")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Snooze 10 minutes")).not.toBeInTheDocument();
  });
});
