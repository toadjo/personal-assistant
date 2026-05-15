import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InboxPanel } from "./InboxPanel";
import type { UnifiedWorkItem } from "../../lib/derived/unified-work";

function makeUnifiedItem(overrides: Partial<UnifiedWorkItem> = {}): UnifiedWorkItem {
  return {
    id: `item-${Math.random()}`,
    source: "local-note",
    sourceId: `source-${Math.random()}`,
    label: "Item",
    priority: "context",
    dueAt: undefined,
    isCompleted: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

describe("InboxPanel", () => {
  it("renders empty state when no items", () => {
    const onShowSuccess = vi.fn();
    const onError = vi.fn();

    render(
      <InboxPanel
        unifiedItems={[]}
        needsSorting={[]}
        createQuickNote={vi.fn()}
        createQuickTask={vi.fn()}
        createQuickReminder={vi.fn()}
        convertNoteToTask={vi.fn()}
        convertNoteToReminder={vi.fn()}
        sendTaskToTeam={vi.fn()}
        onShowSuccess={onShowSuccess}
        onError={onError}
      />
    );

    expect(screen.getByText("Inbox is clear")).toBeDefined();
    expect(screen.getByText("Capture a note, task, or reminder to get started.")).toBeDefined();
  });

  it("renders capture options when in default mode", () => {
    render(
      <InboxPanel
        unifiedItems={[]}
        needsSorting={[]}
        createQuickNote={vi.fn()}
        createQuickTask={vi.fn()}
        createQuickReminder={vi.fn()}
        convertNoteToTask={vi.fn()}
        convertNoteToReminder={vi.fn()}
        sendTaskToTeam={vi.fn()}
      />
    );

    expect(screen.getByText("Note")).toBeDefined();
    expect(screen.getByText("Task")).toBeDefined();
    expect(screen.getByText("Reminder")).toBeDefined();
  });

  it("renders needs sorting section when items exist", () => {
    const needsSorting = [
      makeUnifiedItem({ source: "local-note", label: "Meeting notes" }),
      makeUnifiedItem({ source: "local-task", label: "Buy groceries", priority: "context", dueAt: undefined })
    ];

    render(
      <InboxPanel
        unifiedItems={[]}
        needsSorting={needsSorting}
        createQuickNote={vi.fn()}
        createQuickTask={vi.fn()}
        createQuickReminder={vi.fn()}
        convertNoteToTask={vi.fn()}
        convertNoteToReminder={vi.fn()}
        sendTaskToTeam={vi.fn()}
      />
    );

    expect(screen.getByText("Needs Sorting (2)")).toBeDefined();
    expect(screen.getByText("Meeting notes")).toBeDefined();
    expect(screen.getByText("Buy groceries")).toBeDefined();
  });

  it("renders all items section when items exist", () => {
    const unifiedItems = [
      makeUnifiedItem({ source: "local-note", label: "Note 1" }),
      makeUnifiedItem({ source: "local-task", label: "Task 1", priority: "overdue", dueAt: "2024-01-14T12:00:00Z" }),
      makeUnifiedItem({ source: "local-reminder", label: "Reminder 1", priority: "today", dueAt: "2024-01-15T12:00:00Z" })
    ];

    render(
      <InboxPanel
        unifiedItems={unifiedItems}
        needsSorting={[]}
        createQuickNote={vi.fn()}
        createQuickTask={vi.fn()}
        createQuickReminder={vi.fn()}
        convertNoteToTask={vi.fn()}
        convertNoteToReminder={vi.fn()}
        sendTaskToTeam={vi.fn()}
      />
    );

    expect(screen.getByText("All Items (3)")).toBeDefined();
  });

  it("shows convert actions for local-note items", () => {
    const needsSorting = [makeUnifiedItem({ source: "local-note", label: "Meeting notes" })];

    render(
      <InboxPanel
        unifiedItems={[]}
        needsSorting={needsSorting}
        createQuickNote={vi.fn()}
        createQuickTask={vi.fn()}
        createQuickReminder={vi.fn()}
        convertNoteToTask={vi.fn()}
        convertNoteToReminder={vi.fn()}
        sendTaskToTeam={vi.fn()}
      />
    );

    // Convert buttons should be present for notes
    const buttons = screen.getAllByRole("button");
    const convertButtons = buttons.filter((btn) => btn.getAttribute("aria-label")?.includes("Convert"));
    expect(convertButtons.length).toBeGreaterThan(0);
  });

  it("clicking a visible item calls onOpenItem", () => {
    const onOpenItem = vi.fn();
    const needsSorting = [makeUnifiedItem({ source: "local-note", label: "Meeting notes" })];

    render(
      <InboxPanel
        unifiedItems={[]}
        needsSorting={needsSorting}
        createQuickNote={vi.fn()}
        createQuickTask={vi.fn()}
        createQuickReminder={vi.fn()}
        convertNoteToTask={vi.fn()}
        convertNoteToReminder={vi.fn()}
        sendTaskToTeam={vi.fn()}
        onOpenItem={onOpenItem}
      />
    );

    // Find the item row button and click it
    const itemButtons = screen.getAllByRole("button");
    const itemRowButton = itemButtons.find((btn) => btn.textContent?.includes("Meeting notes"));
    expect(itemRowButton).toBeDefined();
    itemRowButton?.click();

    expect(onOpenItem).toHaveBeenCalledTimes(1);
    expect(onOpenItem).toHaveBeenCalledWith(expect.objectContaining({ label: "Meeting notes" }));
  });

  it("convert action does not accidentally call onOpenItem", () => {
    const onOpenItem = vi.fn();
    const convertNoteToTask = vi.fn();
    const needsSorting = [makeUnifiedItem({ source: "local-note", label: "Meeting notes" })];

    render(
      <InboxPanel
        unifiedItems={[]}
        needsSorting={needsSorting}
        createQuickNote={vi.fn()}
        createQuickTask={vi.fn()}
        createQuickReminder={vi.fn()}
        convertNoteToTask={convertNoteToTask}
        convertNoteToReminder={vi.fn()}
        sendTaskToTeam={vi.fn()}
        onOpenItem={onOpenItem}
      />
    );

    // Find the convert button and click it
    const buttons = screen.getAllByRole("button");
    const convertButton = buttons.find((btn) => btn.getAttribute("aria-label") === "Convert to task");
    expect(convertButton).toBeDefined();
    convertButton?.click();

    expect(convertNoteToTask).toHaveBeenCalledTimes(1);
    expect(onOpenItem).not.toHaveBeenCalled();
  });
});
