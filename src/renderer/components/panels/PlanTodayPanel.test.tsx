import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanTodayPanel } from "./PlanTodayPanel";
import type { PlanTodayQueue, PlanTodayItem } from "../../lib/derived/daily-command-center";

function makePlanTodayItem(overrides: Partial<PlanTodayItem> = {}): PlanTodayItem {
  return {
    id: "local-task-task-1",
    kind: "task",
    sourceId: "task-1",
    label: "Test Item",
    urgency: "today",
    source: "local-task",
    queueReason: "due-today",
    queuePriority: 1,
    ...overrides
  };
}

function makeQueue(items: PlanTodayItem[] = []): PlanTodayQueue {
  return {
    items,
    summary: "Plan Today: 1 due today.",
    totalItems: items.length
  };
}

describe("PlanTodayPanel", () => {
  it("renders empty state when queue is empty", () => {
    const queue = makeQueue();
    render(<PlanTodayPanel queue={queue} />);

    expect(screen.getByText("Plan Today")).toBeDefined();
    expect(screen.getByText("All clear")).toBeDefined();
    expect(screen.getByText("No items need planning today.")).toBeDefined();
  });

  it("renders queue items when items are present", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} />);

    expect(screen.getByText("Test Task")).toBeDefined();
    expect(screen.getByText("Due Today")).toBeDefined();
  });

  it("displays summary when items are present", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} />);

    expect(screen.getByText("Plan Today: 1 due today.")).toBeDefined();
  });

  it("calls onCompleteTask when complete button is clicked for task", async () => {
    const onCompleteTask = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onCompleteTask={onCompleteTask} onShowSuccess={vi.fn()} />);

    const completeButton = screen.getByLabelText("Complete");
    fireEvent.click(completeButton);

    await vi.waitFor(() => expect(onCompleteTask).toHaveBeenCalled());
    expect(onCompleteTask).toHaveBeenCalledWith("task-1");
  });

  it("calls onCompleteReminder when complete button is clicked for reminder", async () => {
    const onCompleteReminder = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-reminder-reminder-1",
        source: "local-reminder",
        sourceId: "reminder-1",
        label: "Test Reminder",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onCompleteReminder={onCompleteReminder} onShowSuccess={vi.fn()} />);

    const completeButton = screen.getByLabelText("Complete");
    fireEvent.click(completeButton);

    await vi.waitFor(() => expect(onCompleteReminder).toHaveBeenCalled());
    expect(onCompleteReminder).toHaveBeenCalledWith("reminder-1");
  });

  it("calls onSnoozeReminder when snooze button is clicked for reminder", async () => {
    const onSnoozeReminder = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-reminder-reminder-1",
        source: "local-reminder",
        sourceId: "reminder-1",
        label: "Test Reminder",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onSnoozeReminder={onSnoozeReminder} onShowSuccess={vi.fn()} />);

    const snoozeButton = screen.getByLabelText("Snooze 10m");
    fireEvent.click(snoozeButton);

    await vi.waitFor(() => expect(onSnoozeReminder).toHaveBeenCalled());
    expect(onSnoozeReminder).toHaveBeenCalledWith("reminder-1", 10);
  });

  it("calls onOpenWorkItem when details button is clicked", () => {
    const onOpenWorkItem = vi.fn();
    const queue = makeQueue([
      makePlanTodayItem({
        id: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onOpenWorkItem={onOpenWorkItem} />);

    const detailsButton = screen.getByLabelText("Details");
    fireEvent.click(detailsButton);

    expect(onOpenWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "task-1",
        label: "Test Task"
      })
    );
  });

  it("shows Open Inbox button when onOpenInbox is provided", () => {
    const onOpenInbox = vi.fn();
    const queue = makeQueue([
      makePlanTodayItem({
        id: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onOpenInbox={onOpenInbox} />);

    expect(screen.getByText("Open Inbox")).toBeDefined();
  });

  it("does not show Open Inbox button when onOpenInbox is not provided", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} />);

    expect(screen.queryByText("Open Inbox")).toBeNull();
  });

  it("disables buttons while processing", async () => {
    const onCompleteTask = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    const queue = makeQueue([
      makePlanTodayItem({
        id: "task-1",
        source: "local-task",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onCompleteTask={onCompleteTask} onShowSuccess={vi.fn()} />);

    const completeButton = screen.getByLabelText("Complete");
    fireEvent.click(completeButton);

    // Button should be disabled while processing
    expect(completeButton).toBeDisabled();
  });

  it("shows snooze button only for reminders", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "task-1",
        source: "local-task",
        label: "Test Task",
        queueReason: "due-today"
      }),
      makePlanTodayItem({
        id: "reminder-1",
        source: "local-reminder",
        label: "Test Reminder",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onSnoozeReminder={vi.fn()} />);

    const snoozeButtons = screen.getAllByLabelText("Snooze 10m");
    expect(snoozeButtons).toHaveLength(1); // Only for reminder
  });
});
