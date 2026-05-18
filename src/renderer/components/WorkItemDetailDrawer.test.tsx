import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkItemDetailDrawer } from "./WorkItemDetailDrawer";
import type { UnifiedWorkItem, UnifiedWorkPriority } from "../lib/derived/unified-work";

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
    const { container } = render(
      <WorkItemDetailDrawer
        item={null}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders drawer when item is provided", () => {
    const item = makeUnifiedItem();
    render(
      <WorkItemDetailDrawer
        item={item}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Work Item Details")).toBeDefined();
    expect(screen.getByText("Test Item")).toBeDefined();
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    const item = makeUnifiedItem();
    render(
      <WorkItemDetailDrawer
        item={item}
        onClose={onClose}
      />
    );
    
    const overlay = screen.getByText("Work Item Details").closest(".drawerOverlay");
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    const item = makeUnifiedItem();
    render(
      <WorkItemDetailDrawer
        item={item}
        onClose={onClose}
      />
    );
    
    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows edit form when edit button is clicked", () => {
    const item = makeUnifiedItem();
    render(
      <WorkItemDetailDrawer
        item={item}
        onClose={vi.fn()}
      />
    );
    
    const editButton = screen.getByText("Edit");
    fireEvent.click(editButton);
    
    expect(screen.getByLabelText("Title")).toBeDefined();
  });

  it("calls onCompleteTask when complete button is clicked", () => {
    const onCompleteTask = vi.fn().mockResolvedValue(undefined);
    const item = makeUnifiedItem({ source: "local-task" });
    render(
      <WorkItemDetailDrawer
        item={item}
        onClose={vi.fn()}
        onCompleteTask={onCompleteTask}
      />
    );
    
    const completeButton = screen.getByLabelText("Complete task");
    fireEvent.click(completeButton);
    
    expect(onCompleteTask).toHaveBeenCalledWith("task-1");
  });

  it("calls onDeleteTask when delete button is clicked", () => {
    const onDeleteTask = vi.fn().mockResolvedValue(undefined);
    const item = makeUnifiedItem({ source: "local-task" });
    render(
      <WorkItemDetailDrawer
        item={item}
        onClose={vi.fn()}
        onDeleteTask={onDeleteTask}
      />
    );
    
    const deleteButton = screen.getByLabelText("Delete task");
    fireEvent.click(deleteButton);
    
    expect(onDeleteTask).toHaveBeenCalledWith("task-1");
  });

  it("calls onCompleteReminder when complete button is clicked for reminder", () => {
    const onCompleteReminder = vi.fn().mockResolvedValue(undefined);
    const item = makeUnifiedItem({ source: "local-reminder" });
    render(
      <WorkItemDetailDrawer
        item={item}
        onClose={vi.fn()}
        onCompleteReminder={onCompleteReminder}
      />
    );
    
    const completeButton = screen.getByLabelText("Complete reminder");
    fireEvent.click(completeButton);
    
    expect(onCompleteReminder).toHaveBeenCalledWith("task-1");
  });

  it("calls onSnoozeReminder when snooze button is clicked", () => {
    const onSnoozeReminder = vi.fn().mockResolvedValue(undefined);
    const item = makeUnifiedItem({ source: "local-reminder" });
    render(
      <WorkItemDetailDrawer
        item={item}
        onClose={vi.fn()}
        onSnoozeReminder={onSnoozeReminder}
      />
    );
    
    const snoozeButton = screen.getByLabelText("Snooze 10m");
    fireEvent.click(snoozeButton);
    
    expect(onSnoozeReminder).toHaveBeenCalledWith("task-1", 10);
  });

  it("calls onConvertNoteToTask when convert button is clicked", () => {
    const onConvertNoteToTask = vi.fn().mockResolvedValue(undefined);
    const item = makeUnifiedItem({ source: "local-note" });
    render(
      <WorkItemDetailDrawer
        item={item}
        onClose={vi.fn()}
        onConvertNoteToTask={onConvertNoteToTask}
      />
    );
    
    const convertButton = screen.getByLabelText("Convert to task");
    fireEvent.click(convertButton);
    
    expect(onConvertNoteToTask).toHaveBeenCalledWith("task-1");
  });

  it("calls onDeleteNote when delete button is clicked for note", () => {
    const onDeleteNote = vi.fn().mockResolvedValue(undefined);
    const item = makeUnifiedItem({ source: "local-note" });
    render(
      <WorkItemDetailDrawer
        item={item}
        onClose={vi.fn()}
        onDeleteNote={onDeleteNote}
      />
    );
    
    const deleteButton = screen.getByLabelText("Delete note");
    fireEvent.click(deleteButton);
    
    expect(onDeleteNote).toHaveBeenCalledWith("task-1");
  });

  describe("reminder editing", () => {
    it("shows enabled Edit button for reminder items", () => {
      const item = makeUnifiedItem({ source: "local-reminder" });
      render(
        <WorkItemDetailDrawer
          item={item}
          onClose={vi.fn()}
          onUpdateReminder={vi.fn()}
        />
      );
      
      const editButton = screen.getByText("Edit") as HTMLButtonElement;
      expect(editButton).toBeDefined();
      expect(editButton.disabled).toBe(false);
    });

    it("opens edit form with reminder text and due date fields when Edit is clicked", () => {
      const dueAt = new Date(Date.now() + 60_000).toISOString();
      const item = makeUnifiedItem({ source: "local-reminder", dueAt, label: "Buy milk" });
      render(
        <WorkItemDetailDrawer
          item={item}
          onClose={vi.fn()}
          onUpdateReminder={vi.fn()}
        />
      );
      
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
        <WorkItemDetailDrawer
          item={item}
          onClose={onClose}
          onUpdateReminder={onUpdateReminder}
          onError={onError}
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
      expect(onError).toHaveBeenCalledWith("Failed to update item.");
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
