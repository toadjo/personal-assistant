import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EndOfDayReviewPanel } from "./EndOfDayReviewPanel";
import type { EndOfDayReview } from "../../lib/derived/daily-command-center";

describe("EndOfDayReviewPanel", () => {
  const mockOnUpdateTaskDueAt = vi.fn();
  const mockOnSnoozeReminder = vi.fn();
  const mockOnOpenWorkItem = vi.fn();
  const mockOnShowSuccess = vi.fn();
  const mockOnError = vi.fn();

  const emptyReview: EndOfDayReview = {
    completedTasks: [],
    completedReminders: [],
    unfinishedTasks: [],
    unfinishedReminders: [],
    capturedNotes: [],
    summary: "No activity today.",
    totalCompleted: 0,
    totalUnfinished: 0,
    totalCaptured: 0
  };

  const reviewWithActivity: EndOfDayReview = {
    completedTasks: [
      {
        id: "completed-task-1",
        kind: "task",
        sourceId: "task-1",
        label: "Completed Task 1",
        urgency: "today",
        source: "local-task",
        reviewCategory: "completed-task",
        dueAt: "2026-05-25T10:00:00.000Z"
      }
    ],
    completedReminders: [
      {
        id: "completed-reminder-1",
        kind: "reminder",
        sourceId: "reminder-1",
        label: "Completed Reminder 1",
        urgency: "today",
        source: "local-reminder",
        reviewCategory: "completed-reminder",
        dueAt: "2026-05-25T10:00:00.000Z"
      }
    ],
    unfinishedTasks: [
      {
        id: "unfinished-task-1",
        kind: "task",
        sourceId: "task-2",
        label: "Unfinished Task 1",
        urgency: "overdue",
        source: "local-task",
        reviewCategory: "unfinished-task",
        dueAt: "2026-05-24T10:00:00.000Z"
      }
    ],
    unfinishedReminders: [
      {
        id: "unfinished-reminder-1",
        kind: "reminder",
        sourceId: "reminder-2",
        label: "Unfinished Reminder 1",
        urgency: "overdue",
        source: "local-reminder",
        reviewCategory: "unfinished-reminder",
        dueAt: "2026-05-24T10:00:00.000Z"
      }
    ],
    capturedNotes: [
      {
        id: "captured-note-1",
        kind: "note",
        sourceId: "note-1",
        label: "Captured Note 1",
        urgency: "context",
        source: "local-note",
        reviewCategory: "captured-note",
        dueAt: "2026-05-25T10:00:00.000Z"
      }
    ],
    summary: "Day review: 2 completed, 2 unfinished, 1 captured.",
    totalCompleted: 2,
    totalUnfinished: 2,
    totalCaptured: 1
  };

  it("renders empty state when no activity", () => {
    render(
      <EndOfDayReviewPanel
        review={emptyReview}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText("No activity today")).toBeInTheDocument();
    expect(screen.getByText("You haven't completed any tasks, reminders, or captured notes today.")).toBeInTheDocument();
  });

  it("renders summary when there is activity", () => {
    render(
      <EndOfDayReviewPanel
        review={reviewWithActivity}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText("Day review: 2 completed, 2 unfinished, 1 captured.")).toBeInTheDocument();
  });

  it("renders completed tasks section", () => {
    render(
      <EndOfDayReviewPanel
        review={reviewWithActivity}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText("Completed Tasks")).toBeInTheDocument();
    expect(screen.getByText("Completed Task 1")).toBeInTheDocument();
  });

  it("renders completed reminders section", () => {
    render(
      <EndOfDayReviewPanel
        review={reviewWithActivity}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText("Completed Reminders")).toBeInTheDocument();
    expect(screen.getByText("Completed Reminder 1")).toBeInTheDocument();
  });

  it("renders unfinished tasks section with carry-over action", () => {
    render(
      <EndOfDayReviewPanel
        review={reviewWithActivity}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText("Unfinished Tasks")).toBeInTheDocument();
    expect(screen.getByText("Unfinished Task 1")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Carry over to tomorrow")).toHaveLength(2);
  });

  it("renders unfinished reminders section with carry-over action", () => {
    render(
      <EndOfDayReviewPanel
        review={reviewWithActivity}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText("Unfinished Reminders")).toBeInTheDocument();
    expect(screen.getByText("Unfinished Reminder 1")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Carry over to tomorrow")).toHaveLength(2);
  });

  it("renders captured notes section", () => {
    render(
      <EndOfDayReviewPanel
        review={reviewWithActivity}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText("Notes Captured")).toBeInTheDocument();
    expect(screen.getByText("Captured Note 1")).toBeInTheDocument();
  });

  it("calls onUpdateTaskDueAt when carry-over task is clicked", async () => {
    render(
      <EndOfDayReviewPanel
        review={reviewWithActivity}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    const carryOverButtons = screen.getAllByLabelText("Carry over to tomorrow");
    const taskCarryOver = carryOverButtons[0]; // First one should be for the unfinished task
    
    if (taskCarryOver) {
      await taskCarryOver.click();
    }

    expect(mockOnUpdateTaskDueAt).toHaveBeenCalledWith("task-2", expect.stringContaining("T"));
    expect(mockOnShowSuccess).toHaveBeenCalledWith("Task rescheduled to tomorrow.");
  });

  it("calls onSnoozeReminder when carry-over reminder is clicked", async () => {
    render(
      <EndOfDayReviewPanel
        review={reviewWithActivity}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    const carryOverButtons = screen.getAllByLabelText("Carry over to tomorrow");
    const reminderCarryOver = carryOverButtons[1]; // Second one should be for the unfinished reminder
    
    if (reminderCarryOver) {
      await reminderCarryOver.click();
    }

    expect(mockOnSnoozeReminder).toHaveBeenCalledWith("reminder-2", 24 * 60);
    expect(mockOnShowSuccess).toHaveBeenCalledWith("Reminder snoozed to tomorrow.");
  });

  it("calls onOpenWorkItem when details button is clicked", async () => {
    render(
      <EndOfDayReviewPanel
        review={reviewWithActivity}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    const detailsButtons = screen.getAllByLabelText("Details");
    if (detailsButtons[0]) {
      await detailsButtons[0].click();
    }

    expect(mockOnOpenWorkItem).toHaveBeenCalledWith(reviewWithActivity.completedTasks[0]);
  });

  it("shows error when carry-over task fails", async () => {
    mockOnUpdateTaskDueAt.mockRejectedValueOnce(new Error("Failed"));

    render(
      <EndOfDayReviewPanel
        review={reviewWithActivity}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    const carryOverButtons = screen.getAllByLabelText("Carry over to tomorrow");
    const taskCarryOver = carryOverButtons[0];
    
    if (taskCarryOver) {
      await taskCarryOver.click();
    }

    expect(mockOnError).toHaveBeenCalledWith("Failed to reschedule task.");
  });

  it("shows error when carry-over reminder fails", async () => {
    mockOnSnoozeReminder.mockRejectedValueOnce(new Error("Failed"));

    render(
      <EndOfDayReviewPanel
        review={reviewWithActivity}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    const carryOverButtons = screen.getAllByLabelText("Carry over to tomorrow");
    const reminderCarryOver = carryOverButtons[1];
    
    if (reminderCarryOver) {
      await reminderCarryOver.click();
    }

    expect(mockOnError).toHaveBeenCalledWith("Failed to snooze reminder.");
  });

  it("does not show carry-over actions for completed items", () => {
    render(
      <EndOfDayReviewPanel
        review={reviewWithActivity}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    // Completed items should only have Details button, not carry-over
    const completedTaskItem = screen.getByText("Completed Task 1").closest(".review-item");
    const carryOverButtons = completedTaskItem?.querySelectorAll('[aria-label="Carry over to tomorrow"]');
    expect(carryOverButtons?.length).toBe(0);
  });

  it("does not show carry-over actions for captured notes", () => {
    render(
      <EndOfDayReviewPanel
        review={reviewWithActivity}
        onUpdateTaskDueAt={mockOnUpdateTaskDueAt}
        onSnoozeReminder={mockOnSnoozeReminder}
        onOpenWorkItem={mockOnOpenWorkItem}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
      />
    );

    // Notes should only have Details button, not carry-over
    const capturedNoteItem = screen.getByText("Captured Note 1").closest(".review-item");
    const carryOverButtons = capturedNoteItem?.querySelectorAll('[aria-label="Carry over to tomorrow"]');
    expect(carryOverButtons?.length).toBe(0);
  });
});