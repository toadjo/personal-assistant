import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
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
    filter: "all",
    ...overrides
  };
}

describe("DailyCommandCenterPanel", () => {
  const onCompleteTask = vi.fn();
  const onCompleteReminder = vi.fn();
  const onSnoozeReminder = vi.fn();
  const onMarkSeen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    expect(screen.getByText(/Your day is clear. Add a task, reminder, or note to get started./)).toBeInTheDocument();
  });

  it("renders empty state actions when callbacks are provided", () => {
    const onOpenInbox = vi.fn();
    const onOpenTasks = vi.fn();
    render(
      <DailyCommandCenterPanel
        data={makeData()}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
        onOpenInbox={onOpenInbox}
        onOpenTasks={onOpenTasks}
      />
    );

    const openInboxButtons = screen.getAllByText("Open Inbox");
    expect(openInboxButtons.length).toBeGreaterThan(0);
    expect(screen.getByText("Open Tasks")).toBeInTheDocument();
  });

  it("renders Now section with actionable items", () => {
    const data = makeData({
      nowItems: [
        {
          id: "local-task-t1",
          kind: "task",
          label: "Overdue task",
          urgency: "overdue",
          sourceId: "t1",
          action: "complete-task"
        }
      ],
      attentionItems: [
        { id: "local-task-t1", kind: "task", label: "Overdue task", urgency: "overdue", sourceId: "t1" }
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
          id: "local-reminder-r1",
          kind: "reminder",
          label: "Today reminder",
          urgency: "today",
          sourceId: "r1",
          action: "complete-reminder"
        }
      ],
      attentionItems: [
        { id: "local-reminder-r1", kind: "reminder", label: "Today reminder", urgency: "today", sourceId: "r1" }
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

  it("calls onOpenInbox when Inbox button is clicked for context notes", async () => {
    const onOpenInbox = vi.fn();
    const onOpenNotes = vi.fn();
    const data = makeData({
      contextItems: [
        {
          id: "local-note-note-1",
          kind: "note",
          label: "Meeting notes",
          urgency: "context",
          sourceId: "note-1"
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
        onOpenInbox={onOpenInbox}
        onOpenNotes={onOpenNotes}
      />
    );

    const inboxButton = screen.getByLabelText(/Open in Inbox: Meeting notes/);
    expect(inboxButton).toBeInTheDocument();
  });

  it("calls onOpenInbox when Inbox button is clicked for attention notes", async () => {
    const onOpenInbox = vi.fn();
    const onOpenNotes = vi.fn();
    const data = makeData({
      attentionItems: [
        {
          id: "local-note-note-2",
          kind: "note",
          label: "Quick thought",
          urgency: "today",
          sourceId: "note-2"
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
        onOpenInbox={onOpenInbox}
        onOpenNotes={onOpenNotes}
      />
    );

    const inboxButton = screen.getByLabelText(/Open in Inbox: Quick thought/);
    expect(inboxButton).toBeInTheDocument();
  });

  it("calls onCompleteTask when complete task button is clicked", () => {
    const data = makeData({
      nowItems: [
        {
          id: "local-task-t1",
          kind: "task",
          label: "Task to complete",
          urgency: "overdue",
          sourceId: "t1",
          action: "complete-task"
        }
      ],
      attentionItems: [
        { id: "local-task-t1", kind: "task", label: "Task to complete", urgency: "overdue", sourceId: "t1" }
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
          id: "local-reminder-r1",
          kind: "reminder",
          label: "Reminder to complete",
          urgency: "today",
          sourceId: "r1",
          action: "complete-reminder"
        }
      ],
      attentionItems: [
        { id: "local-reminder-r1", kind: "reminder", label: "Reminder to complete", urgency: "today", sourceId: "r1" }
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
          id: "local-reminder-r1",
          kind: "reminder",
          label: "Snooze me",
          urgency: "today",
          sourceId: "r1",
          action: "complete-reminder"
        }
      ],
      attentionItems: [
        { id: "local-reminder-r1", kind: "reminder", label: "Snooze me", urgency: "today", sourceId: "r1" }
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
        { id: "local-task-t1", kind: "task", label: "Attention task", urgency: "overdue", sourceId: "t1" },
        { id: "local-reminder-r1", kind: "reminder", label: "Attention reminder", urgency: "today", sourceId: "r1" }
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
        { id: "local-note-n1", kind: "note", label: "Pinned note", urgency: "context", sourceId: "n1" },
        { id: "local-reminder-r2", kind: "reminder", label: "Upcoming reminder", urgency: "upcoming", sourceId: "r2" }
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
          id: "local-task-t1",
          kind: "task",
          label: "Overdue task",
          urgency: "overdue",
          sourceId: "t1",
          action: "complete-task"
        }
      ],
      attentionItems: [
        { id: "local-task-t1", kind: "task", label: "Overdue task", urgency: "overdue", sourceId: "t1" }
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
          id: "local-reminder-r1",
          kind: "reminder",
          label: "Today reminder",
          urgency: "today",
          sourceId: "r1",
          action: "complete-reminder"
        }
      ],
      attentionItems: [
        { id: "local-reminder-r1", kind: "reminder", label: "Today reminder", urgency: "today", sourceId: "r1" }
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
      contextItems: [{ id: "local-note-n1", kind: "note", label: "Pinned note", urgency: "context", sourceId: "n1" }],
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

  it("calls onOpenWorkItem when task label is clicked", () => {
    const onOpenWorkItem = vi.fn();
    const data = makeData({
      nowItems: [
        {
          id: "local-task-t1",
          kind: "task",
          label: "Task to open",
          urgency: "overdue",
          sourceId: "t1",
          action: "complete-task"
        }
      ],
      attentionItems: [
        { id: "local-task-t1", kind: "task", label: "Task to open", urgency: "overdue", sourceId: "t1" }
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
        onOpenWorkItem={onOpenWorkItem}
      />
    );

    // Click the label button
    const labelButtons = screen.getAllByRole("button");
    const labelButton = labelButtons.find((btn) => btn.textContent === "Task to open");
    expect(labelButton).toBeDefined();
    labelButton?.click();

    expect(onOpenWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "task",
        label: "Task to open",
        sourceId: "t1"
      })
    );
  });

  it("calls onOpenWorkItem when reminder label is clicked", () => {
    const onOpenWorkItem = vi.fn();
    const data = makeData({
      nowItems: [
        {
          id: "local-reminder-r1",
          kind: "reminder",
          label: "Reminder to open",
          urgency: "today",
          sourceId: "r1",
          action: "complete-reminder"
        }
      ],
      attentionItems: [
        { id: "local-reminder-r1", kind: "reminder", label: "Reminder to open", urgency: "today", sourceId: "r1" }
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
        onOpenWorkItem={onOpenWorkItem}
      />
    );

    // Click the label button
    const labelButtons = screen.getAllByRole("button");
    const labelButton = labelButtons.find((btn) => btn.textContent === "Reminder to open");
    expect(labelButton).toBeDefined();
    labelButton?.click();

    expect(onOpenWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "reminder",
        label: "Reminder to open",
        sourceId: "r1"
      })
    );
  });

  it("existing complete button still works when onOpenWorkItem is provided", () => {
    const onOpenWorkItem = vi.fn();
    const data = makeData({
      nowItems: [
        {
          id: "local-task-t1",
          kind: "task",
          label: "Task to complete",
          urgency: "overdue",
          sourceId: "t1",
          action: "complete-task"
        }
      ],
      attentionItems: [
        { id: "local-task-t1", kind: "task", label: "Task to complete", urgency: "overdue", sourceId: "t1" }
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
        onOpenWorkItem={onOpenWorkItem}
      />
    );

    screen.getAllByLabelText(/Complete task: Task to complete/)[0]!.click();
    expect(onCompleteTask).toHaveBeenCalledWith("t1");
    expect(onOpenWorkItem).not.toHaveBeenCalled();
  });

  it("renders without error when onOpenWorkItem is not provided", () => {
    const data = makeData({
      nowItems: [
        {
          id: "local-task-t1",
          kind: "task",
          label: "Task without drawer",
          urgency: "overdue",
          sourceId: "t1",
          action: "complete-task"
        }
      ],
      attentionItems: [
        { id: "local-task-t1", kind: "task", label: "Task without drawer", urgency: "overdue", sourceId: "t1" }
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

    expect(screen.getAllByText("Task without drawer").length).toBeGreaterThan(0);
  });

  it("calls onOpenWorkItem when team task label is clicked and does not call onCompleteTask", () => {
    onCompleteTask.mockClear();
    const onOpenWorkItem = vi.fn();
    const data = makeData({
      attentionItems: [
        { id: "team-task-tt1", kind: "team-task", label: "Team task", urgency: "overdue", sourceId: "tt1" }
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
        onOpenWorkItem={onOpenWorkItem}
      />
    );

    // Click the label button
    const labelButtons = screen.getAllByRole("button");
    const labelButton = labelButtons.find((btn) => btn.textContent === "Team task");
    expect(labelButton).toBeDefined();
    labelButton?.click();

    expect(onOpenWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "team-task",
        label: "Team task",
        sourceId: "tt1"
      })
    );
    expect(onCompleteTask).not.toHaveBeenCalled();
  });

  it("renders automation items in context section", () => {
    const data = makeData({
      contextItems: [
        {
          id: "automation-rule-1",
          kind: "automation",
          label: "Morning reminder",
          detail: "Runs at 08:00 | reminder",
          urgency: "context",
          sourceId: "rule-1"
        }
      ],
      summary: "Focus: 1 context items."
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

    expect(screen.getByText("Morning reminder")).toBeInTheDocument();
    expect(screen.getByText("Runs at 08:00 | reminder")).toBeInTheDocument();
  });

  it("calls onOpenAutomations when automation Open action is clicked", () => {
    const onOpenAutomations = vi.fn();
    const data = makeData({
      contextItems: [
        {
          id: "automation-rule-1",
          kind: "automation",
          label: "Morning reminder",
          detail: "Runs at 08:00 | reminder",
          urgency: "context",
          sourceId: "rule-1"
        }
      ],
      summary: "Focus: 1 context items."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
        onOpenAutomations={onOpenAutomations}
      />
    );

    // Find the Open button for automation items
    const openButtons = screen.getAllByTitle("Open");
    // The automation Open button should be present
    const automationOpenButton = openButtons.find((btn) => btn.getAttribute("aria-label")?.includes("automations"));
    expect(automationOpenButton).toBeDefined();
    automationOpenButton?.click();

    expect(onOpenAutomations).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "automation",
        label: "Morning reminder",
        sourceId: "rule-1"
      })
    );
  });

  it("shows Details button for tasks and calls onOpenWorkItem when clicked", () => {
    const onOpenWorkItem = vi.fn();
    const data = makeData({
      attentionItems: [
        { id: "local-task-t1", kind: "task", label: "Task with details", urgency: "overdue", sourceId: "t1" }
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
        onOpenWorkItem={onOpenWorkItem}
      />
    );

    const detailsButton = screen.getByLabelText("Details: Task with details");
    expect(detailsButton).toBeInTheDocument();
    detailsButton.click();

    expect(onOpenWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "task",
        label: "Task with details",
        sourceId: "t1"
      })
    );
  });

  it("shows Details button for reminders and calls onOpenWorkItem when clicked", () => {
    const onOpenWorkItem = vi.fn();
    const data = makeData({
      attentionItems: [
        { id: "local-reminder-r1", kind: "reminder", label: "Reminder with details", urgency: "today", sourceId: "r1" }
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
        onOpenWorkItem={onOpenWorkItem}
      />
    );

    const detailsButton = screen.getByLabelText("Details: Reminder with details");
    expect(detailsButton).toBeInTheDocument();
    detailsButton.click();

    expect(onOpenWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "reminder",
        label: "Reminder with details",
        sourceId: "r1"
      })
    );
  });

  it("shows Details button for team tasks and calls onOpenWorkItem when clicked", () => {
    const onOpenWorkItem = vi.fn();
    const data = makeData({
      attentionItems: [
        { id: "team-task-tt1", kind: "team-task", label: "Team task with details", urgency: "overdue", sourceId: "tt1" }
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
        onOpenWorkItem={onOpenWorkItem}
      />
    );

    const detailsButton = screen.getByLabelText("Details: Team task with details");
    expect(detailsButton).toBeInTheDocument();
    detailsButton.click();

    expect(onOpenWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "team-task",
        label: "Team task with details",
        sourceId: "tt1"
      })
    );
  });

  it("shows Open Inbox button in summary when onOpenInbox is provided", () => {
    const onOpenInbox = vi.fn();
    render(
      <DailyCommandCenterPanel
        data={makeData()}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
        onOpenInbox={onOpenInbox}
      />
    );

    const openInboxButtons = screen.getAllByText("Open Inbox");
    expect(openInboxButtons.length).toBeGreaterThan(0);
  });

  it("calls onOpenInbox when Open Inbox button in summary is clicked", () => {
    const onOpenInbox = vi.fn();
    render(
      <DailyCommandCenterPanel
        data={makeData()}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
        onOpenInbox={onOpenInbox}
      />
    );

    const openInboxButtons = screen.getAllByText("Open Inbox");
    // Click the first one (in the summary area)
    expect(openInboxButtons.length).toBeGreaterThan(0);
    openInboxButtons[0]?.click();

    expect(onOpenInbox).toHaveBeenCalledTimes(1);
  });

  it("does not show Details button when onOpenWorkItem is not provided", () => {
    render(
      <DailyCommandCenterPanel
        data={makeData({
          attentionItems: [
            { id: "local-task-t1", kind: "task", label: "Task without details", urgency: "overdue", sourceId: "t1" }
          ]
        })}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
      />
    );

    expect(screen.queryByLabelText(/Details:/)).not.toBeInTheDocument();
  });

  it("complete and snooze buttons still call their existing handlers", () => {
    const data = makeData({
      nowItems: [
        {
          id: "local-task-t1",
          kind: "task",
          label: "Task to complete",
          urgency: "overdue",
          sourceId: "t1",
          action: "complete-task"
        }
      ],
      attentionItems: [
        { id: "local-task-t1", kind: "task", label: "Task to complete", urgency: "overdue", sourceId: "t1" }
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

  it("context task row shows Details and Complete actions", () => {
    const onOpenWorkItem = vi.fn();
    const data = makeData({
      contextItems: [{ id: "local-task-t1", kind: "task", label: "Context task", urgency: "context", sourceId: "t1" }],
      summary: "Focus: 1 context items."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
        onOpenWorkItem={onOpenWorkItem}
      />
    );

    expect(screen.getByLabelText("Details: Context task")).toBeInTheDocument();
    expect(screen.getByLabelText("Complete task: Context task")).toBeInTheDocument();
  });

  it("duplicated reminder produces one Details, one Complete, and one Snooze button", () => {
    const onOpenWorkItem = vi.fn();
    const data = makeData({
      attentionItems: [
        { id: "local-reminder-r1", kind: "reminder", label: "Duplicated reminder", urgency: "today", sourceId: "r1" }
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
        onOpenWorkItem={onOpenWorkItem}
      />
    );

    // Should have exactly one Details button
    const detailsButtons = screen.getAllByLabelText(/Details: Duplicated reminder/);
    expect(detailsButtons).toHaveLength(1);

    // Should have exactly one Complete button
    const completeButtons = screen.getAllByLabelText(/Complete reminder: Duplicated reminder/);
    expect(completeButtons).toHaveLength(1);

    // Should have exactly one Snooze button
    const snoozeButtons = screen.getAllByLabelText(/Snooze reminder ten minutes: Duplicated reminder/);
    expect(snoozeButtons).toHaveLength(1);
  });

  it("prefers actionable Context over Away when showing one secondary section", () => {
    const onOpenWorkItem = vi.fn();
    const data = makeData({
      awayItems: [
        {
          kind: "task",
          reason: "new",
          label: "Away task",
          sourceId: "t1",
          changedAt: "2024-01-15T10:00:00Z"
        }
      ],
      contextItems: [{ id: "local-task-t2", kind: "task", label: "Context task", urgency: "context", sourceId: "t2" }],
      summary: "Focus: 1 context items."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
        onOpenWorkItem={onOpenWorkItem}
        showAllSecondary={false}
      />
    );

    // Should show Context section with actionable task, not Away section
    expect(screen.getByText("Context")).toBeInTheDocument();
    expect(screen.getByText("Context task")).toBeInTheDocument();
    expect(screen.queryByText("Since You Were Away")).not.toBeInTheDocument();
  });

  it("shows Away when Context has only passive items", () => {
    const data = makeData({
      awayItems: [
        {
          kind: "task",
          reason: "new",
          label: "Away task",
          sourceId: "t1",
          changedAt: "2024-01-15T10:00:00Z"
        }
      ],
      contextItems: [{ id: "local-note-n1", kind: "note", label: "Context note", urgency: "context", sourceId: "n1" }],
      summary: "Focus: 1 context items."
    });

    render(
      <DailyCommandCenterPanel
        data={data}
        onCompleteTask={onCompleteTask}
        onCompleteReminder={onCompleteReminder}
        onSnoozeReminder={onSnoozeReminder}
        onMarkSeen={onMarkSeen}
        showAllSecondary={false}
      />
    );

    // Should show Away section since Context has only passive note
    expect(screen.getByText("Since You Were Away")).toBeInTheDocument();
    expect(screen.getByText("Away task")).toBeInTheDocument();
    expect(screen.queryByText("Context")).not.toBeInTheDocument();
  });
});
