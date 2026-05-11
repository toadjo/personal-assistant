import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DailyCommandCenterPanel } from "./DailyCommandCenterPanel";
import type { DailyCommandCenter } from "../../lib/derived/daily-command-center";

function makeData(overrides: Partial<DailyCommandCenter> = {}): DailyCommandCenter {
  return {
    nowItems: [],
    attentionItems: [],
    contextItems: [],
    awayItems: [],
    summary: "All clear - nothing needs attention right now.",
    pressure: { overdue: 0, dueToday: 0, upcoming: 0, context: 0 },
    ...overrides
  };
}

describe("DailyCommandCenterPanel", () => {
  const onCompleteTask = vi.fn();
  const onCompleteReminder = vi.fn();
  const onSnoozeReminder = vi.fn();
  const onMarkSeen = vi.fn();

  it("renders summary and empty state when no items", () => {
    render(
      <DailyCommandCenterPanel
        data={makeData()}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
      />
    );

    expect(screen.getByText("Daily Command Center")).toBeInTheDocument();
    expect(screen.getByText("All clear - nothing needs attention right now.")).toBeInTheDocument();
    expect(
      screen.getByText(/Nothing on your plate. Add tasks, reminders, or pin notes/)
    ).toBeInTheDocument();
  });

  it("renders Now section with actionable items", () => {
    const data = makeData({
      nowItems: [
        {
          kind: "task",
          label: "Overdue task",
          urgency: "overdue",
          sourceId: "t1",
          action: "complete-task"
        }
      ],
      attentionItems: [
        { kind: "task", label: "Overdue task", urgency: "overdue", sourceId: "t1" }
      ],
      summary: "Now: 1 overdue."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
      />
    );

    expect(screen.getAllByText("Overdue task")[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Complete task: Overdue task/)[0]).toBeInTheDocument();
  });

  it("renders snooze action for reminder now items", () => {
    const data = makeData({
      nowItems: [
        {
          kind: "reminder",
          label: "Today reminder",
          urgency: "today",
          sourceId: "r1",
          action: "complete-reminder"
        }
      ],
      attentionItems: [
        { kind: "reminder", label: "Today reminder", urgency: "today", sourceId: "r1" }
      ],
      summary: "Now: 1 due today."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
      />
    );

    expect(screen.getAllByLabelText(/Complete reminder: Today reminder/)[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Snooze reminder ten minutes: Today reminder/)[0]).toBeInTheDocument();
  });

  it("calls onCompleteTask when complete task button is clicked", () => {
    const data = makeData({
      nowItems: [
        {
          kind: "task",
          label: "Task to complete",
          urgency: "overdue",
          sourceId: "t1",
          action: "complete-task"
        }
      ],
      attentionItems: [
        { kind: "task", label: "Task to complete", urgency: "overdue", sourceId: "t1" }
      ],
      summary: "Now: 1 overdue."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
      />
    );

    screen.getAllByLabelText(/Complete task: Task to complete/)[0]!.click();
    expect(onCompleteTask).toHaveBeenCalledWith("t1");
  });

  it("calls onCompleteReminder when complete reminder button is clicked", () => {
    const data = makeData({
      nowItems: [
        {
          kind: "reminder",
          label: "Reminder to complete",
          urgency: "today",
          sourceId: "r1",
          action: "complete-reminder"
        }
      ],
      attentionItems: [
        { kind: "reminder", label: "Reminder to complete", urgency: "today", sourceId: "r1" }
      ],
      summary: "Now: 1 due today."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
      />
    );

    screen.getAllByLabelText(/Complete reminder: Reminder to complete/)[0]!.click();
    expect(onCompleteReminder).toHaveBeenCalledWith("r1");
  });

  it("calls onSnoozeReminder when snooze button is clicked", () => {
    const data = makeData({
      nowItems: [
        {
          kind: "reminder",
          label: "Snooze me",
          urgency: "today",
          sourceId: "r1",
          action: "complete-reminder"
        }
      ],
      attentionItems: [
        { kind: "reminder", label: "Snooze me", urgency: "today", sourceId: "r1" }
      ],
      summary: "Now: 1 due today."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
      />
    );

    screen.getAllByLabelText(/Snooze reminder ten minutes: Snooze me/)[0]!.click();
    expect(onSnoozeReminder).toHaveBeenCalledWith("r1");
  });

  it("renders Away Brief section when away items exist", () => {
    const data = makeData({
      awayItems: [
        {
          kind: "task",
          reason: "new",
          label: "New since away",
          sourceId: "a1",
          changedAt: "2024-01-15T10:00:00Z"
        }
      ],
      summary: "Now: 1 since you were away."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
      />
    );

    expect(screen.getByText("Since You Were Away")).toBeInTheDocument();
    expect(screen.getByText("New since away")).toBeInTheDocument();
    expect(screen.getByLabelText("Mark as seen")).toBeInTheDocument();
  });

  it("calls onMarkSeen when dismiss button is clicked", () => {
    const data = makeData({
      awayItems: [
        {
          kind: "task",
          reason: "new",
          label: "Dismiss me",
          sourceId: "a1",
          changedAt: "2024-01-15T10:00:00Z"
        }
      ]
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
      />
    );

    screen.getByLabelText("Mark as seen").click();
    expect(onMarkSeen).toHaveBeenCalledTimes(1);
  });

  it("renders Attention section with action buttons", () => {
    const data = makeData({
      attentionItems: [
        { kind: "task", label: "Attention task", urgency: "overdue", sourceId: "t1" },
        { kind: "reminder", label: "Attention reminder", urgency: "today", sourceId: "r1" }
      ],
      summary: "Now: 1 overdue, 1 due today."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
      />
    );

    expect(screen.getByText("Attention")).toBeInTheDocument();
    expect(screen.getByText("Attention task")).toBeInTheDocument();
    expect(screen.getByText("Attention reminder")).toBeInTheDocument();
  });

  it("renders Context section without action buttons", () => {
    const data = makeData({
      contextItems: [
        { kind: "note", label: "Pinned note", urgency: "context", sourceId: "n1" },
        { kind: "reminder", label: "Upcoming reminder", urgency: "upcoming", sourceId: "r2" }
      ],
      summary: "Now: 1 context."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
      />
    );

    expect(screen.getByText("Context")).toBeInTheDocument();
    expect(screen.getByText("Pinned note")).toBeInTheDocument();
    expect(screen.getByText("Upcoming reminder")).toBeInTheDocument();
  });

  it("calls onOpenTasks when open task button is clicked", () => {
    const onOpenTasks = vi.fn();
    const data = makeData({
      nowItems: [
        {
          kind: "task",
          label: "Overdue task",
          urgency: "overdue",
          sourceId: "t1",
          action: "complete-task"
        }
      ],
      attentionItems: [
        { kind: "task", label: "Overdue task", urgency: "overdue", sourceId: "t1" }
      ],
      summary: "Now: 1 overdue."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
        onOpenTasks={onOpenTasks}
      />
    );

    screen.getAllByLabelText(/Open tasks: Overdue task/)[0]!.click();
    expect(onOpenTasks).toHaveBeenCalledWith("overdue");
  });

  it("calls onOpenReminders when open reminder button is clicked", () => {
    const onOpenReminders = vi.fn();
    const data = makeData({
      nowItems: [
        {
          kind: "reminder",
          label: "Today reminder",
          urgency: "today",
          sourceId: "r1",
          action: "complete-reminder"
        }
      ],
      attentionItems: [
        { kind: "reminder", label: "Today reminder", urgency: "today", sourceId: "r1" }
      ],
      summary: "Now: 1 due today."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
        onOpenReminders={onOpenReminders}
      />
    );

    screen.getAllByLabelText(/Open reminders: Today reminder/)[0]!.click();
    expect(onOpenReminders).toHaveBeenCalledWith("pending");
  });

  it("calls onOpenNotes when open notes button is clicked on a context note", () => {
    const onOpenNotes = vi.fn();
    const data = makeData({
      contextItems: [
        { kind: "note", label: "Pinned note", urgency: "context", sourceId: "n1" }
      ],
      summary: "Now: 1 context."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
        onOpenNotes={onOpenNotes}
      />
    );

    screen.getByLabelText(/Open notes: Pinned note/).click();
    expect(onOpenNotes).toHaveBeenCalledTimes(1);
  });
});
