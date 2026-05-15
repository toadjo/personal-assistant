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
});
