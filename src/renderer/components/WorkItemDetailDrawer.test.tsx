import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkItemDetailDrawer } from "./WorkItemDetailDrawer";
import type { UnifiedWorkItem, UnifiedWorkPriority } from "../lib/derived/unified-work";

// Helper function to convert ISO timestamp to local datetime-local format (matches component logic)
function isoToLocalDateTime(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function makeUnifiedItem(overrides: Partial<UnifiedWorkItem> = {}): UnifiedWorkItem {
  return {
    id: "test-id",
    source: "local-task",
    sourceId: "task-1",
    label: "Test Item",
    detail: "Test detail",
    priority: "normal" as UnifiedWorkPriority,
    dueAt: undefined,
    isCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe("WorkItemDetailDrawer", () => {
  it("renders null when item is null", () => {
    const { container } = render(<WorkItemDetailDrawer item={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders drawer when item is provided", () => {
    const item = makeUnifiedItem();
    render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} />);
    expect(screen.getByText("Work Item Details")).toBeDefined();
    expect(screen.getByText("Test Item")).toBeDefined();
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    const item = makeUnifiedItem();
    render(<WorkItemDetailDrawer item={item} onClose={onClose} />);

    const overlay = screen.getByText("Work Item Details").closest(".drawerOverlay");
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    const item = makeUnifiedItem();
    render(<WorkItemDetailDrawer item={item} onClose={onClose} />);

    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows edit form when edit button is clicked", () => {
    const item = makeUnifiedItem();
    render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} />);

    const editButton = screen.getByText("Edit");
    fireEvent.click(editButton);

    expect(screen.getByLabelText("Title")).toBeDefined();
  });

  it("calls onCompleteTask when complete button is clicked", () => {
    const onCompleteTask = vi.fn().mockResolvedValue(undefined);
    const item = makeUnifiedItem({ source: "local-task" });
    render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} onCompleteTask={onCompleteTask} />);

    const completeButton = screen.getByLabelText("Complete task");
    fireEvent.click(completeButton);

    expect(onCompleteTask).toHaveBeenCalledWith("task-1");
  });

  it("calls onDeleteTask when delete button is clicked", () => {
    const onDeleteTask = vi.fn().mockResolvedValue(undefined);
    const item = makeUnifiedItem({ source: "local-task" });
    render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} onDeleteTask={onDeleteTask} />);

    const deleteButton = screen.getByLabelText("Delete task");
    fireEvent.click(deleteButton);

    expect(onDeleteTask).toHaveBeenCalledWith("task-1");
  });

  it("calls onCompleteReminder when complete button is clicked for reminder", () => {
    const onCompleteReminder = vi.fn().mockResolvedValue(undefined);
    const item = makeUnifiedItem({ source: "local-reminder" });
    render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} onCompleteReminder={onCompleteReminder} />);

    const completeButton = screen.getByLabelText("Complete reminder");
    fireEvent.click(completeButton);

    expect(onCompleteReminder).toHaveBeenCalledWith("task-1");
  });

  it("calls onSnoozeReminder when snooze button is clicked", () => {
    const onSnoozeReminder = vi.fn().mockResolvedValue(undefined);
    const item = makeUnifiedItem({ source: "local-reminder" });
    render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} onSnoozeReminder={onSnoozeReminder} />);

    const snoozeButton = screen.getByLabelText("Snooze 10m");
    fireEvent.click(snoozeButton);

    expect(onSnoozeReminder).toHaveBeenCalledWith("task-1", 10);
  });

  it("calls onConvertNoteToTask when convert button is clicked", () => {
    const onConvertNoteToTask = vi.fn().mockResolvedValue(undefined);
    const item = makeUnifiedItem({ source: "local-note" });
    render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} onConvertNoteToTask={onConvertNoteToTask} />);

    const convertButton = screen.getByLabelText("Convert to task");
    fireEvent.click(convertButton);

    expect(onConvertNoteToTask).toHaveBeenCalledWith("task-1");
  });

  it("calls onDeleteNote when delete button is clicked for note", () => {
    const onDeleteNote = vi.fn().mockResolvedValue(undefined);
    const item = makeUnifiedItem({ source: "local-note" });
    render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} onDeleteNote={onDeleteNote} />);

    const deleteButton = screen.getByLabelText("Delete note");
    fireEvent.click(deleteButton);

    expect(onDeleteNote).toHaveBeenCalledWith("task-1");
  });

  describe("reminder editing", () => {
    it("shows enabled Edit button for reminder items", () => {
      const item = makeUnifiedItem({ source: "local-reminder" });
      render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} onUpdateReminder={vi.fn()} />);

      const editButton = screen.getByText("Edit") as HTMLButtonElement;
      expect(editButton).toBeDefined();
      expect(editButton.disabled).toBe(false);
    });

    it("opens edit form with reminder text and due date fields when Edit is clicked", () => {
      const dueAt = new Date(Date.now() + 60_000).toISOString();
      const item = makeUnifiedItem({ source: "local-reminder", dueAt, label: "Buy milk" });
      render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} onUpdateReminder={vi.fn()} />);

      const editButton = screen.getByText("Edit");
      fireEvent.click(editButton);

      expect(screen.getByLabelText("Title")).toBeDefined();
      expect(screen.getByLabelText("Due Date")).toBeDefined();
    });

    it("calls onUpdateReminder with updated text and ISO due date on save", async () => {
      const dueAt = new Date(Date.now() + 60_000).toISOString();
      const item = makeUnifiedItem({ source: "local-reminder", dueAt, label: "Buy milk" });
      const onUpdateReminder = vi.fn().mockResolvedValue(undefined);
      const onShowSuccess = vi.fn();
      const onClose = vi.fn();

      render(
        <WorkItemDetailDrawer
          item={item}
          onClose={onClose}
          onUpdateReminder={onUpdateReminder}
          onShowSuccess={onShowSuccess}
        />
      );

      const editButton = screen.getByText("Edit");
      fireEvent.click(editButton);

      const titleInput = screen.getByLabelText("Title");
      fireEvent.change(titleInput, { target: { value: "Buy bread" } });

      const dueDateInput = screen.getByLabelText("Due Date");
      const newDue = new Date(Date.now() + 120_000);
      const isoString = newDue.toISOString().slice(0, 16);
      fireEvent.change(dueDateInput, { target: { value: isoString } });

      const saveButton = screen.getByText("Save");
      fireEvent.click(saveButton);

      await vi.waitFor(() => expect(onUpdateReminder).toHaveBeenCalled());

      const expectedDueAt = new Date(isoString).toISOString();
      expect(onUpdateReminder).toHaveBeenCalledWith("task-1", "Buy bread", expectedDueAt);
    });

    it("closes drawer and shows success on successful save", async () => {
      const dueAt = new Date(Date.now() + 60_000).toISOString();
      const item = makeUnifiedItem({ source: "local-reminder", dueAt, label: "Buy milk" });
      const onUpdateReminder = vi.fn().mockResolvedValue(undefined);
      const onShowSuccess = vi.fn();
      const onClose = vi.fn();

      render(
        <WorkItemDetailDrawer
          item={item}
          onClose={onClose}
          onUpdateReminder={onUpdateReminder}
          onShowSuccess={onShowSuccess}
        />
      );

      const editButton = screen.getByText("Edit");
      fireEvent.click(editButton);

      const dueDateInput = screen.getByLabelText("Due Date");
      const newDue = new Date(Date.now() + 120_000);
      const isoString = newDue.toISOString().slice(0, 16);
      fireEvent.change(dueDateInput, { target: { value: isoString } });

      const saveButton = screen.getByText("Save");
      fireEvent.click(saveButton);

      await vi.waitFor(() => expect(onUpdateReminder).toHaveBeenCalled());
      expect(onClose).toHaveBeenCalled();
      expect(onShowSuccess).toHaveBeenCalledWith("Reminder updated.");
    });

    it("reports error and keeps drawer open on failed save", async () => {
      const dueAt = new Date(Date.now() + 60_000).toISOString();
      const item = makeUnifiedItem({ source: "local-reminder", dueAt, label: "Buy milk" });
      const onUpdateReminder = vi.fn().mockRejectedValue(new Error("Update failed"));
      const onError = vi.fn();
      const onClose = vi.fn();

      render(
        <WorkItemDetailDrawer item={item} onClose={onClose} onUpdateReminder={onUpdateReminder} onError={onError} />
      );

      const editButton = screen.getByText("Edit");
      fireEvent.click(editButton);

      const dueDateInput = screen.getByLabelText("Due Date");
      const newDue = new Date(Date.now() + 120_000);
      const isoString = newDue.toISOString().slice(0, 16);
      fireEvent.change(dueDateInput, { target: { value: isoString } });

      const saveButton = screen.getByText("Save");
      fireEvent.click(saveButton);

      await vi.waitFor(() => expect(onUpdateReminder).toHaveBeenCalled());
      await vi.waitFor(() => expect(onError).toHaveBeenCalledWith("Failed to update item."));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("team task editing", () => {
    it("shows project name and assignee in metadata for team tasks", () => {
      const item = makeUnifiedItem({
        source: "team-task",
        projectName: "Frontend",
        assigneeDisplayName: "Alice"
      });
      render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} />);

      expect(screen.getByText("Project:")).toBeDefined();
      expect(screen.getByText("Frontend")).toBeDefined();
      expect(screen.getByText("Assignee:")).toBeDefined();
      expect(screen.getByText("Alice")).toBeDefined();
    });

    it("shows team task edit form with all required fields", () => {
      const item = makeUnifiedItem({ source: "team-task" });
      render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} onUpdateTeamTask={vi.fn()} />);

      const editButton = screen.getByText("Edit");
      fireEvent.click(editButton);

      expect(screen.getByLabelText("Title")).toBeDefined();
      expect(screen.getByLabelText("Notes")).toBeDefined();
      expect(screen.getByLabelText("Due Date")).toBeDefined();
      expect(screen.getByLabelText("Priority")).toBeDefined();
      expect(screen.getByLabelText("Recurrence")).toBeDefined();
      expect(screen.getByLabelText("Assignee")).toBeDefined();
      expect(screen.getByLabelText("Status")).toBeDefined();
    });

    it("calls onUpdateTeamTask with expected patch on save", async () => {
      const item = makeUnifiedItem({ source: "team-task", label: "Review PR" });
      const onUpdateTeamTask = vi.fn().mockResolvedValue(undefined);
      const onShowSuccess = vi.fn();
      const onClose = vi.fn();

      render(
        <WorkItemDetailDrawer
          item={item}
          onClose={onClose}
          onUpdateTeamTask={onUpdateTeamTask}
          onShowSuccess={onShowSuccess}
        />
      );

      const editButton = screen.getByText("Edit");
      fireEvent.click(editButton);

      const titleInput = screen.getByLabelText("Title");
      fireEvent.change(titleInput, { target: { value: "Update PR" } });

      const contentInput = screen.getByLabelText("Notes");
      fireEvent.change(contentInput, { target: { value: "Updated notes" } });

      const priorityInput = screen.getByLabelText("Priority");
      fireEvent.change(priorityInput, { target: { value: "high" } });

      const assigneeInput = screen.getByLabelText("Assignee");
      fireEvent.change(assigneeInput, { target: { value: "Bob" } });

      const statusInput = screen.getByLabelText("Status");
      fireEvent.change(statusInput, { target: { value: "done" } });

      const saveButton = screen.getByText("Save");
      fireEvent.click(saveButton);

      await vi.waitFor(() => expect(onUpdateTeamTask).toHaveBeenCalled());

      expect(onUpdateTeamTask).toHaveBeenCalledWith("task-1", {
        title: "Update PR",
        notes: "Updated notes",
        dueAt: null,
        priority: "high",
        recurrence: "none",
        assigneeDisplayName: "Bob",
        status: "done"
      });
    });

    it("shows complete action for open team tasks", async () => {
      const item = makeUnifiedItem({ source: "team-task", isCompleted: false });
      const onUpdateTeamTask = vi.fn().mockResolvedValue(undefined);
      const onShowSuccess = vi.fn();
      const onClose = vi.fn();

      render(
        <WorkItemDetailDrawer
          item={item}
          onClose={onClose}
          onUpdateTeamTask={onUpdateTeamTask}
          onShowSuccess={onShowSuccess}
        />
      );

      const completeButton = screen.getByLabelText("Complete team task");
      fireEvent.click(completeButton);

      await vi.waitFor(() => expect(onUpdateTeamTask).toHaveBeenCalled());
      expect(onUpdateTeamTask).toHaveBeenCalledWith("task-1", { status: "done" });
      expect(onShowSuccess).toHaveBeenCalledWith("Team task completed.");
      expect(onClose).toHaveBeenCalled();
    });

    it("shows reopen action for done team tasks", async () => {
      const item = makeUnifiedItem({ source: "team-task", isCompleted: true });
      const onUpdateTeamTask = vi.fn().mockResolvedValue(undefined);
      const onShowSuccess = vi.fn();
      const onClose = vi.fn();

      render(
        <WorkItemDetailDrawer
          item={item}
          onClose={onClose}
          onUpdateTeamTask={onUpdateTeamTask}
          onShowSuccess={onShowSuccess}
        />
      );

      const reopenButton = screen.getByLabelText("Reopen team task");
      fireEvent.click(reopenButton);

      await vi.waitFor(() => expect(onUpdateTeamTask).toHaveBeenCalled());
      expect(onUpdateTeamTask).toHaveBeenCalledWith("task-1", { status: "open" });
      expect(onShowSuccess).toHaveBeenCalledWith("Team task reopened.");
      expect(onClose).toHaveBeenCalled();
    });

    it("does not show delete action for team tasks", () => {
      const item = makeUnifiedItem({ source: "team-task" });
      render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} />);

      expect(screen.queryByLabelText("Delete task")).toBeNull();
      expect(screen.queryByLabelText("Delete team task")).toBeNull();
    });

    it("preloads real team-task priority, recurrence, assignee, due date, and status in edit form", () => {
      const item = makeUnifiedItem({
        source: "team-task",
        label: "Deploy v2",
        detail: "Release notes",
        dueAt: "2024-08-01T09:00:00.000Z",
        assigneeDisplayName: "Carol",
        teamPriority: "high",
        teamRecurrence: "weekly",
        teamStatus: "done"
      });
      render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} onUpdateTeamTask={vi.fn()} />);

      fireEvent.click(screen.getByText("Edit"));

      expect(screen.getByLabelText("Title")).toHaveValue("Deploy v2");
      expect(screen.getByLabelText("Notes")).toHaveValue("Release notes");
      expect(screen.getByLabelText("Due Date")).toHaveValue(isoToLocalDateTime("2024-08-01T09:00:00.000Z"));
      expect(screen.getByLabelText("Priority")).toHaveValue("high");
      expect(screen.getByLabelText("Recurrence")).toHaveValue("weekly");
      expect(screen.getByLabelText("Assignee")).toHaveValue("Carol");
      expect(screen.getByLabelText("Status")).toHaveValue("done");
    });

    it("saves a team task preserving untouched metadata", async () => {
      const originalDueAt = "2024-08-01T09:00:00.000Z";
      const item = makeUnifiedItem({
        source: "team-task",
        label: "Original Title",
        detail: "Original notes",
        dueAt: originalDueAt,
        assigneeDisplayName: "Carol",
        teamPriority: "high",
        teamRecurrence: "weekly",
        teamStatus: "open"
      });
      const onUpdateTeamTask = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      const onShowSuccess = vi.fn();

      render(
        <WorkItemDetailDrawer
          item={item}
          onClose={onClose}
          onUpdateTeamTask={onUpdateTeamTask}
          onShowSuccess={onShowSuccess}
        />
      );

      fireEvent.click(screen.getByText("Edit"));

      const titleInput = screen.getByLabelText("Title");
      fireEvent.change(titleInput, { target: { value: "Updated Title" } });

      fireEvent.click(screen.getByText("Save"));

      await vi.waitFor(() => expect(onUpdateTeamTask).toHaveBeenCalled());

      const expectedDueAt = new Date(isoToLocalDateTime(originalDueAt)).toISOString();
      expect(onUpdateTeamTask).toHaveBeenCalledWith("task-1", {
        title: "Updated Title",
        notes: "Original notes",
        dueAt: expectedDueAt,
        priority: "high",
        recurrence: "weekly",
        assigneeDisplayName: "Carol",
        status: "open"
      });
    });

    it("rejects recurring team task without due date before IPC", async () => {
      const item = makeUnifiedItem({
        source: "team-task",
        label: "Recurring task",
        teamPriority: "normal",
        teamRecurrence: "none",
        teamStatus: "open"
      });
      const onUpdateTeamTask = vi.fn().mockResolvedValue(undefined);

      render(
        <WorkItemDetailDrawer item={item} onClose={vi.fn()} onUpdateTeamTask={onUpdateTeamTask} />
      );

      fireEvent.click(screen.getByText("Edit"));

      const recurrenceSelect = screen.getByLabelText("Recurrence");
      fireEvent.change(recurrenceSelect, { target: { value: "daily" } });

      fireEvent.click(screen.getByText("Save"));

      await vi.waitFor(() =>
        expect(screen.getByRole("alert")).toBeDefined()
      );
      expect(screen.getByText("Recurring tasks require a due date.")).toBeDefined();
      expect(onUpdateTeamTask).not.toHaveBeenCalled();
    });

    it("rejects team task with empty title", async () => {
      const item = makeUnifiedItem({
        source: "team-task",
        label: "Some task",
        teamPriority: "normal",
        teamRecurrence: "none",
        teamStatus: "open"
      });
      const onUpdateTeamTask = vi.fn().mockResolvedValue(undefined);

      render(
        <WorkItemDetailDrawer item={item} onClose={vi.fn()} onUpdateTeamTask={onUpdateTeamTask} />
      );

      fireEvent.click(screen.getByText("Edit"));

      const titleInput = screen.getByLabelText("Title");
      fireEvent.change(titleInput, { target: { value: "   " } });

      fireEvent.click(screen.getByText("Save"));

      await vi.waitFor(() =>
        expect(screen.getByRole("alert")).toBeDefined()
      );
      expect(screen.getByText("Title is required.")).toBeDefined();
      expect(onUpdateTeamTask).not.toHaveBeenCalled();
    });
  });

  describe("prop refresh behavior", () => {
    it("updates displayed content when item prop changes", () => {
      const initialItem = makeUnifiedItem({ label: "Initial Title", detail: "Initial detail" });
      const { rerender } = render(<WorkItemDetailDrawer item={initialItem} onClose={vi.fn()} />);

      expect(screen.getByText("Initial Title")).toBeDefined();
      expect(screen.getByText("Initial detail")).toBeDefined();

      const updatedItem = makeUnifiedItem({ label: "Updated Title", detail: "Updated detail" });
      rerender(<WorkItemDetailDrawer item={updatedItem} onClose={vi.fn()} />);

      expect(screen.getByText("Updated Title")).toBeDefined();
      expect(screen.getByText("Updated detail")).toBeDefined();
      expect(screen.queryByText("Initial Title")).toBeNull();
      expect(screen.queryByText("Initial detail")).toBeNull();
    });
  });

  describe("local task editing", () => {
    it("shows priority, recurrence, and due date fields for local tasks", () => {
      const item = makeUnifiedItem({
        source: "local-task",
        localPriority: "high",
        localRecurrence: "weekly"
      });
      render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} onUpdateTask={vi.fn()} />);

      fireEvent.click(screen.getByText("Edit"));

      expect(screen.getByLabelText("Title")).toBeDefined();
      expect(screen.getByLabelText("Notes")).toBeDefined();
      expect(screen.getByLabelText("Due Date")).toBeDefined();
      expect(screen.getByLabelText("Priority")).toBeDefined();
      expect(screen.getByLabelText("Recurrence")).toBeDefined();
    });

    it("preloads local task priority and recurrence in edit form", () => {
      const item = makeUnifiedItem({
        source: "local-task",
        label: "Fix bug",
        detail: "Stack trace attached",
        dueAt: "2024-09-15T14:00:00.000Z",
        localPriority: "high",
        localRecurrence: "daily"
      });
      render(<WorkItemDetailDrawer item={item} onClose={vi.fn()} onUpdateTask={vi.fn()} />);

      fireEvent.click(screen.getByText("Edit"));

      expect(screen.getByLabelText("Title")).toHaveValue("Fix bug");
      expect(screen.getByLabelText("Notes")).toHaveValue("Stack trace attached");
      expect(screen.getByLabelText("Due Date")).toHaveValue(isoToLocalDateTime("2024-09-15T14:00:00.000Z"));
      expect(screen.getByLabelText("Priority")).toHaveValue("high");
      expect(screen.getByLabelText("Recurrence")).toHaveValue("daily");
    });

    it("calls onUpdateTask with full patch including priority and recurrence", async () => {
      const item = makeUnifiedItem({
        source: "local-task",
        label: "Deploy",
        detail: "Notes here",
        localPriority: "normal",
        localRecurrence: "none"
      });
      const onUpdateTask = vi.fn().mockResolvedValue(undefined);
      const onShowSuccess = vi.fn();

      render(
        <WorkItemDetailDrawer
          item={item}
          onClose={vi.fn()}
          onUpdateTask={onUpdateTask}
          onShowSuccess={onShowSuccess}
        />
      );

      fireEvent.click(screen.getByText("Edit"));

      fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "high" } });
      fireEvent.change(screen.getByLabelText("Recurrence"), { target: { value: "weekly" } });
      const localDateTime = "2024-10-01T10:00";
      fireEvent.change(screen.getByLabelText("Due Date"), { target: { value: localDateTime } });

      fireEvent.click(screen.getByText("Save"));

      await vi.waitFor(() => expect(onUpdateTask).toHaveBeenCalled());

      const expectedDueAt = new Date(localDateTime).toISOString();
      expect(onUpdateTask).toHaveBeenCalledWith("task-1", {
        title: "Deploy",
        notes: "Notes here",
        dueAt: expectedDueAt,
        priority: "high",
        recurrence: "weekly"
      });
      expect(onShowSuccess).toHaveBeenCalledWith("Task updated.");
    });

    it("rejects recurring local task without due date", async () => {
      const item = makeUnifiedItem({
        source: "local-task",
        label: "Recurring task",
        localPriority: "normal",
        localRecurrence: "none"
      });
      const onUpdateTask = vi.fn().mockResolvedValue(undefined);

      render(
        <WorkItemDetailDrawer item={item} onClose={vi.fn()} onUpdateTask={onUpdateTask} />
      );

      fireEvent.click(screen.getByText("Edit"));

      fireEvent.change(screen.getByLabelText("Recurrence"), { target: { value: "daily" } });

      fireEvent.click(screen.getByText("Save"));

      await vi.waitFor(() =>
        expect(screen.getByRole("alert")).toBeDefined()
      );
      expect(screen.getByText("Recurring tasks require a due date.")).toBeDefined();
      expect(onUpdateTask).not.toHaveBeenCalled();
    });

    it("stays in view mode after save instead of closing drawer", async () => {
      const item = makeUnifiedItem({
        source: "local-task",
        label: "Stay open",
        localPriority: "normal",
        localRecurrence: "none"
      });
      const onUpdateTask = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      const onShowSuccess = vi.fn();

      render(
        <WorkItemDetailDrawer
          item={item}
          onClose={onClose}
          onUpdateTask={onUpdateTask}
          onShowSuccess={onShowSuccess}
        />
      );

      fireEvent.click(screen.getByText("Edit"));
      fireEvent.click(screen.getByText("Save"));

      await vi.waitFor(() => expect(onShowSuccess).toHaveBeenCalledWith("Task updated."));

      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText("Edit")).toBeDefined();
    });
  });
});
