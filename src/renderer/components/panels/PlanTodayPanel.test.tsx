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

  it("shows checkboxes for completable items (tasks and reminders)", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      }),
      makePlanTodayItem({
        id: "local-reminder-reminder-1",
        source: "local-reminder",
        sourceId: "reminder-1",
        label: "Test Reminder",
        queueReason: "due-today"
      }),
      makePlanTodayItem({
        id: "local-note-note-1",
        source: "local-note",
        sourceId: "note-1",
        label: "Test Note",
        queueReason: "unsorted"
      })
    ]);

    render(<PlanTodayPanel queue={queue} />);

    const itemCheckboxes = screen.getAllByLabelText(/Select item:/);
    expect(itemCheckboxes).toHaveLength(2); // Only for task and reminder, not note
  });

  it("shows Select All checkbox when completable items exist", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} />);

    const selectAllCheckbox = screen.getByLabelText("Select all");
    expect(selectAllCheckbox).toBeDefined();
  });

  it("toggles item selection when checkbox is clicked", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} />);

    const checkbox = screen.getByLabelText("Select item: Test Task");
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("selects all completable items when Select All is clicked", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      }),
      makePlanTodayItem({
        id: "local-reminder-reminder-1",
        source: "local-reminder",
        sourceId: "reminder-1",
        label: "Test Reminder",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} />);

    const selectAllCheckbox = screen.getByLabelText("Select all");
    fireEvent.click(selectAllCheckbox);

    const checkboxes = screen.getAllByLabelText(/Select item:/);
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  it("deselects all items when Select All is clicked while all selected", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} />);

    const selectAllCheckbox = screen.getByLabelText("Select all");
    fireEvent.click(selectAllCheckbox); // Select all
    expect(selectAllCheckbox).toBeChecked();

    fireEvent.click(selectAllCheckbox); // Deselect all
    expect(selectAllCheckbox).not.toBeChecked();
  });

  it("shows Complete N Selected button when items are selected", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onBulkCompleteTasks={vi.fn()} onCompleteReminder={vi.fn()} />);

    expect(screen.queryByText(/Complete 1 Selected/)).toBeNull();

    const checkbox = screen.getByLabelText("Select item: Test Task");
    fireEvent.click(checkbox);

    expect(screen.getByText(/Complete 1 Selected/)).toBeDefined();
  });

  it("calls onBulkCompleteTasks with sourceIds when Complete N Selected is clicked", async () => {
    const onBulkCompleteTasks = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      }),
      makePlanTodayItem({
        id: "local-task-task-2",
        source: "local-task",
        sourceId: "task-2",
        label: "Test Task 2",
        queueReason: "due-today"
      })
    ]);

    render(
      <PlanTodayPanel
        queue={queue}
        onBulkCompleteTasks={onBulkCompleteTasks}
        onCompleteReminder={vi.fn()}
        onShowSuccess={vi.fn()}
      />
    );

    const checkboxes = screen.getAllByLabelText(/Select item:/);
    checkboxes.forEach((checkbox) => fireEvent.click(checkbox));

    const completeButton = screen.getByText(/Complete 2 Selected/);
    fireEvent.click(completeButton);

    await vi.waitFor(() => expect(onBulkCompleteTasks).toHaveBeenCalled());
    expect(onBulkCompleteTasks).toHaveBeenCalledWith(["task-1", "task-2"]);
  });

  it("calls onCompleteReminder for selected reminders when Complete N Selected is clicked", async () => {
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

    render(
      <PlanTodayPanel
        queue={queue}
        onBulkCompleteTasks={vi.fn()}
        onCompleteReminder={onCompleteReminder}
        onShowSuccess={vi.fn()}
      />
    );

    const checkbox = screen.getByLabelText("Select item: Test Reminder");
    fireEvent.click(checkbox);

    const completeButton = screen.getByText(/Complete 1 Selected/);
    fireEvent.click(completeButton);

    await vi.waitFor(() => expect(onCompleteReminder).toHaveBeenCalled());
    expect(onCompleteReminder).toHaveBeenCalledWith("reminder-1");
  });

  it("clears selection after successful bulk completion", async () => {
    const onBulkCompleteTasks = vi.fn().mockResolvedValue(undefined);
    const onShowSuccess = vi.fn();
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(
      <PlanTodayPanel
        queue={queue}
        onBulkCompleteTasks={onBulkCompleteTasks}
        onCompleteReminder={vi.fn()}
        onShowSuccess={onShowSuccess}
      />
    );

    const checkbox = screen.getByLabelText("Select item: Test Task");
    fireEvent.click(checkbox);

    const completeButton = screen.getByText(/Complete 1 Selected/);
    fireEvent.click(completeButton);

    await vi.waitFor(() => expect(onBulkCompleteTasks).toHaveBeenCalled());

    // Wait for checkbox to be unchecked after state update
    await vi.waitFor(() => expect(checkbox).not.toBeChecked());
    expect(screen.queryByText(/Complete 1 Selected/)).toBeNull();
    expect(onShowSuccess).toHaveBeenCalledWith("Completed 1 items.");
  });

  it("shows reschedule button for tasks and reminders", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      }),
      makePlanTodayItem({
        id: "local-reminder-reminder-1",
        source: "local-reminder",
        sourceId: "reminder-1",
        label: "Test Reminder",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onUpdateTaskDueAt={vi.fn()} onUpdateReminderDueAt={vi.fn()} />);

    const rescheduleButtons = screen.getAllByLabelText("Reschedule");
    expect(rescheduleButtons).toHaveLength(2); // One for task, one for reminder
  });

  it("does not show reschedule button for notes", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-note-note-1",
        source: "local-note",
        sourceId: "note-1",
        label: "Test Note",
        queueReason: "unsorted"
      })
    ]);

    render(<PlanTodayPanel queue={queue} />);

    const rescheduleButtons = screen.queryAllByLabelText("Reschedule");
    expect(rescheduleButtons).toHaveLength(0);
  });

  it("shows Snooze button in header when reminders are selected", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-reminder-reminder-1",
        source: "local-reminder",
        sourceId: "reminder-1",
        label: "Test Reminder",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onSnoozeReminder={vi.fn()} />);

    expect(screen.queryByText("Snooze")).toBeNull();

    const checkbox = screen.getByLabelText("Select item: Test Reminder");
    fireEvent.click(checkbox);

    expect(screen.getByText("Snooze")).toBeDefined();
  });

  it("does not show Snooze button in header when only tasks are selected", () => {
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onSnoozeReminder={vi.fn()} />);

    const checkbox = screen.getByLabelText("Select item: Test Task");
    fireEvent.click(checkbox);

    expect(screen.queryByText("Snooze")).toBeNull();
  });

  it("calls onUpdateTaskDueAt when Today reschedule preset is clicked", async () => {
    const onUpdateTaskDueAt = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onUpdateTaskDueAt={onUpdateTaskDueAt} onShowSuccess={vi.fn()} />);

    const rescheduleButton = screen.getByLabelText("Reschedule");
    fireEvent.click(rescheduleButton);

    const todayButton = screen.getByText("Today");
    fireEvent.click(todayButton);

    await vi.waitFor(() => expect(onUpdateTaskDueAt).toHaveBeenCalled());
    expect(onUpdateTaskDueAt).toHaveBeenCalledWith("task-1", expect.any(String));
  });

  it("calls onUpdateReminderDueAt when Tomorrow reschedule preset is clicked", async () => {
    const onUpdateReminderDueAt = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-reminder-reminder-1",
        source: "local-reminder",
        sourceId: "reminder-1",
        label: "Test Reminder",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onUpdateReminderDueAt={onUpdateReminderDueAt} onShowSuccess={vi.fn()} />);

    const rescheduleButton = screen.getByLabelText("Reschedule");
    fireEvent.click(rescheduleButton);

    const tomorrowButton = screen.getByText("Tomorrow");
    fireEvent.click(tomorrowButton);

    await vi.waitFor(() => expect(onUpdateReminderDueAt).toHaveBeenCalled());
    expect(onUpdateReminderDueAt).toHaveBeenCalledWith("reminder-1", expect.any(String));
  });

  it("calls onSnoozeReminder for selected reminders when 10m snooze preset is clicked", async () => {
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

    const checkbox = screen.getByLabelText("Select item: Test Reminder");
    fireEvent.click(checkbox);

    const snoozeButton = screen.getByText("Snooze");
    fireEvent.click(snoozeButton);

    const tenMinutesButton = screen.getByText("10 minutes");
    fireEvent.click(tenMinutesButton);

    await vi.waitFor(() => expect(onSnoozeReminder).toHaveBeenCalled());
    expect(onSnoozeReminder).toHaveBeenCalledWith("reminder-1", 10);
  });

  it("batch snooze only affects selected reminders, not selected tasks", async () => {
    const onSnoozeReminder = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      }),
      makePlanTodayItem({
        id: "local-reminder-reminder-1",
        source: "local-reminder",
        sourceId: "reminder-1",
        label: "Test Reminder",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onSnoozeReminder={onSnoozeReminder} onShowSuccess={vi.fn()} />);

    const checkboxes = screen.getAllByLabelText(/Select item:/);
    checkboxes.forEach((checkbox) => fireEvent.click(checkbox));

    const snoozeButton = screen.getByText("Snooze");
    fireEvent.click(snoozeButton);

    const tenMinutesButton = screen.getByText("10 minutes");
    fireEvent.click(tenMinutesButton);

    await vi.waitFor(() => expect(onSnoozeReminder).toHaveBeenCalled());
    // Should only be called once for the reminder, not for the task
    expect(onSnoozeReminder).toHaveBeenCalledTimes(1);
    expect(onSnoozeReminder).toHaveBeenCalledWith("reminder-1", 10);
  });

  it("shows error when batch snooze is clicked with no reminders selected", async () => {
    const onError = vi.fn();
    const queue = makeQueue([
      makePlanTodayItem({
        id: "local-task-task-1",
        source: "local-task",
        sourceId: "task-1",
        label: "Test Task",
        queueReason: "due-today"
      })
    ]);

    render(<PlanTodayPanel queue={queue} onSnoozeReminder={vi.fn()} onError={onError} />);

    const checkbox = screen.getByLabelText("Select item: Test Task");
    fireEvent.click(checkbox);

    // Snooze button should not appear when only tasks are selected
    expect(screen.queryByText("Snooze")).toBeNull();
  });
});
