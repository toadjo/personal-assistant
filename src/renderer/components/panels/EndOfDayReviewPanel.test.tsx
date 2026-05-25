import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EndOfDayReviewPanel } from "./EndOfDayReviewPanel";
import type { EndOfDayReview, EndOfDayReviewItem } from "../../lib/derived/daily-command-center";

function makeEndOfDayReviewItem(overrides: Partial<EndOfDayReviewItem> = {}): EndOfDayReviewItem {
  return {
    id: "test-id",
    kind: "task",
    sourceId: "task-1",
    label: "Test Item",
    urgency: "today",
    source: "local-task",
    reviewCategory: "completed-task",
    ...overrides
  };
}

function makeEndOfDayReview(overrides: Partial<EndOfDayReview> = {}): EndOfDayReview {
  return {
    completedTasks: [],
    completedReminders: [],
    unfinishedTasks: [],
    unfinishedReminders: [],
    capturedNotes: [],
    summary: "No activity today.",
    totalCompleted: 0,
    totalUnfinished: 0,
    totalCaptured: 0,
    ...overrides
  };
}

describe("EndOfDayReviewPanel", () => {
  it("renders empty state when no activity", () => {
    const review = makeEndOfDayReview();
    render(
      <EndOfDayReviewPanel
        review={review}
        onShowSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText("No activity today")).toBeInTheDocument();
    expect(screen.getByText(/You haven't completed any tasks/)).toBeInTheDocument();
  });

  it("renders completed tasks section", () => {
    const review = makeEndOfDayReview({
      completedTasks: [
        makeEndOfDayReviewItem({
          id: "task-1",
          label: "Completed Task 1",
          reviewCategory: "completed-task"
        }),
        makeEndOfDayReviewItem({
          id: "task-2",
          label: "Completed Task 2",
          reviewCategory: "completed-task"
        })
      ],
      totalCompleted: 2,
      summary: "Day review: 2 completed."
    });

    render(
      <EndOfDayReviewPanel
        review={review}
        onShowSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText("Completed Tasks")).toBeInTheDocument();
    expect(screen.getByText("Completed Task 1")).toBeInTheDocument();
    expect(screen.getByText("Completed Task 2")).toBeInTheDocument();
    expect(screen.getByText("Day review: 2 completed.")).toBeInTheDocument();
  });

  it("renders completed reminders section", () => {
    const review = makeEndOfDayReview({
      completedReminders: [
        makeEndOfDayReviewItem({
          id: "reminder-1",
          label: "Completed Reminder 1",
          reviewCategory: "completed-reminder",
          kind: "reminder"
        })
      ],
      totalCompleted: 1,
      summary: "Day review: 1 completed."
    });

    render(
      <EndOfDayReviewPanel
        review={review}
        onShowSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText("Completed Reminders")).toBeInTheDocument();
    expect(screen.getByText("Completed Reminder 1")).toBeInTheDocument();
  });

  it("renders unfinished tasks section with carry-over action", () => {
    const onUpdateTaskDueAt = vi.fn().mockResolvedValue(undefined);
    const review = makeEndOfDayReview({
      unfinishedTasks: [
        makeEndOfDayReviewItem({
          id: "task-1",
          label: "Unfinished Task 1",
          reviewCategory: "unfinished-task"
        })
      ],
      totalUnfinished: 1,
      summary: "Day review: 1 unfinished."
    });

    render(
      <EndOfDayReviewPanel
        review={review}
        onUpdateTaskDueAt={onUpdateTaskDueAt}
        onShowSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText("Unfinished Tasks")).toBeInTheDocument();
    expect(screen.getByText("Unfinished Task 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Carry over to tomorrow")).toBeInTheDocument();
  });

  it("renders unfinished reminders section with carry-over action", () => {
    const onSnoozeReminder = vi.fn().mockResolvedValue(undefined);
    const review = makeEndOfDayReview({
      unfinishedReminders: [
        makeEndOfDayReviewItem({
          id: "reminder-1",
          label: "Unfinished Reminder 1",
          reviewCategory: "unfinished-reminder",
          kind: "reminder"
        })
      ],
      totalUnfinished: 1,
      summary: "Day review: 1 unfinished."
    });

    render(
      <EndOfDayReviewPanel
        review={review}
        onSnoozeReminder={onSnoozeReminder}
        onShowSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText("Unfinished Reminders")).toBeInTheDocument();
    expect(screen.getByText("Unfinished Reminder 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Carry over to tomorrow")).toBeInTheDocument();
  });

  it("renders captured notes section", () => {
    const review = makeEndOfDayReview({
      capturedNotes: [
        makeEndOfDayReviewItem({
          id: "note-1",
          label: "Captured Note 1",
          reviewCategory: "captured-note",
          kind: "note"
        })
      ],
      totalCaptured: 1,
      summary: "Day review: 1 captured."
    });

    render(
      <EndOfDayReviewPanel
        review={review}
        onShowSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText("Notes Captured")).toBeInTheDocument();
    expect(screen.getByText("Captured Note 1")).toBeInTheDocument();
  });

  it("renders mixed state with all categories", () => {
    const onUpdateTaskDueAt = vi.fn().mockResolvedValue(undefined);
    const onSnoozeReminder = vi.fn().mockResolvedValue(undefined);
    const review = makeEndOfDayReview({
      completedTasks: [
        makeEndOfDayReviewItem({
          id: "task-1",
          label: "Completed Task",
          reviewCategory: "completed-task"
        })
      ],
      unfinishedTasks: [
        makeEndOfDayReviewItem({
          id: "task-2",
          label: "Unfinished Task",
          reviewCategory: "unfinished-task"
        })
      ],
      capturedNotes: [
        makeEndOfDayReviewItem({
          id: "note-1",
          label: "Captured Note",
          reviewCategory: "captured-note",
          kind: "note"
        })
      ],
      totalCompleted: 1,
      totalUnfinished: 1,
      totalCaptured: 1,
      summary: "Day review: 1 completed, 1 unfinished, 1 captured."
    });

    render(
      <EndOfDayReviewPanel
        review={review}
        onUpdateTaskDueAt={onUpdateTaskDueAt}
        onSnoozeReminder={onSnoozeReminder}
        onShowSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText("Completed Tasks")).toBeInTheDocument();
    expect(screen.getByText("Unfinished Tasks")).toBeInTheDocument();
    expect(screen.getByText("Notes Captured")).toBeInTheDocument();
    expect(screen.getByText("Day review: 1 completed, 1 unfinished, 1 captured.")).toBeInTheDocument();
  });

  it("handles carry-over task action", async () => {
    const onUpdateTaskDueAt = vi.fn().mockResolvedValue(undefined);
    const onShowSuccess = vi.fn();
    const review = makeEndOfDayReview({
      unfinishedTasks: [
        makeEndOfDayReviewItem({
          id: "task-1",
          sourceId: "task-1",
          label: "Unfinished Task",
          reviewCategory: "unfinished-task"
        })
      ],
      totalUnfinished: 1,
      summary: "Day review: 1 unfinished."
    });

    render(
      <EndOfDayReviewPanel
        review={review}
        onUpdateTaskDueAt={onUpdateTaskDueAt}
        onShowSuccess={onShowSuccess}
        onError={vi.fn()}
      />
    );

    const carryOverButton = screen.getByLabelText("Carry over to tomorrow");
    carryOverButton.click();

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(onUpdateTaskDueAt).toHaveBeenCalledWith("task-1", expect.any(String));
    expect(onShowSuccess).toHaveBeenCalledWith("Task rescheduled to tomorrow.");
  });

  it("handles carry-over reminder action", async () => {
    const onSnoozeReminder = vi.fn().mockResolvedValue(undefined);
    const onShowSuccess = vi.fn();
    const review = makeEndOfDayReview({
      unfinishedReminders: [
        makeEndOfDayReviewItem({
          id: "reminder-1",
          sourceId: "reminder-1",
          label: "Unfinished Reminder",
          reviewCategory: "unfinished-reminder",
          kind: "reminder"
        })
      ],
      totalUnfinished: 1,
      summary: "Day review: 1 unfinished."
    });

    render(
      <EndOfDayReviewPanel
        review={review}
        onSnoozeReminder={onSnoozeReminder}
        onShowSuccess={onShowSuccess}
        onError={vi.fn()}
      />
    );

    const carryOverButton = screen.getByLabelText("Carry over to tomorrow");
    carryOverButton.click();

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(onSnoozeReminder).toHaveBeenCalledWith("reminder-1", 24 * 60);
    expect(onShowSuccess).toHaveBeenCalledWith("Reminder snoozed to tomorrow.");
  });

  it("shows error when carry-over task fails", async () => {
    const onUpdateTaskDueAt = vi.fn().mockRejectedValue(new Error("Failed"));
    const onError = vi.fn();
    const review = makeEndOfDayReview({
      unfinishedTasks: [
        makeEndOfDayReviewItem({
          id: "task-1",
          sourceId: "task-1",
          label: "Unfinished Task",
          reviewCategory: "unfinished-task"
        })
      ],
      totalUnfinished: 1,
      summary: "Day review: 1 unfinished."
    });

    render(
      <EndOfDayReviewPanel
        review={review}
        onUpdateTaskDueAt={onUpdateTaskDueAt}
        onShowSuccess={vi.fn()}
        onError={onError}
      />
    );

    const carryOverButton = screen.getByLabelText("Carry over to tomorrow");
    carryOverButton.click();

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(onError).toHaveBeenCalledWith("Failed to reschedule task.");
  });

  it("shows error when carry-over reminder fails", async () => {
    const onSnoozeReminder = vi.fn().mockRejectedValue(new Error("Failed"));
    const onError = vi.fn();
    const review = makeEndOfDayReview({
      unfinishedReminders: [
        makeEndOfDayReviewItem({
          id: "reminder-1",
          sourceId: "reminder-1",
          label: "Unfinished Reminder",
          reviewCategory: "unfinished-reminder",
          kind: "reminder"
        })
      ],
      totalUnfinished: 1,
      summary: "Day review: 1 unfinished."
    });

    render(
      <EndOfDayReviewPanel
        review={review}
        onSnoozeReminder={onSnoozeReminder}
        onShowSuccess={vi.fn()}
        onError={onError}
      />
    );

    const carryOverButton = screen.getByLabelText("Carry over to tomorrow");
    carryOverButton.click();

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(onError).toHaveBeenCalledWith("Failed to snooze reminder.");
  });

  it("renders empty message for sections with no items", () => {
    const review = makeEndOfDayReview({
      completedTasks: [],
      unfinishedTasks: [
        makeEndOfDayReviewItem({
          id: "task-1",
          label: "Unfinished Task",
          reviewCategory: "unfinished-task"
        })
      ],
      totalCompleted: 0,
      totalUnfinished: 1,
      summary: "Day review: 1 unfinished."
    });

    render(
      <EndOfDayReviewPanel
        review={review}
        onShowSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText("No tasks completed today")).toBeInTheDocument();
  });
});
