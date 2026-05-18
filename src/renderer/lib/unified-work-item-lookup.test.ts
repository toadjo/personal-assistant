/**
 * Tests for findUnifiedWorkItem helper.
 */

import { describe, expect, it } from "vitest";
import { findUnifiedWorkItem } from "./unified-work-item-lookup";
import type { UnifiedWorkItem } from "./derived/unified-work";

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

describe("findUnifiedWorkItem", () => {
  it("local note id maps to local-note", () => {
    const note = makeUnifiedItem({ source: "local-note", sourceId: "note-123" });
    const unifiedItems = [note];

    const result = findUnifiedWorkItem(unifiedItems, "local-note", "note-123");

    expect(result).toBe(note);
  });

  it("local task id maps to local-task", () => {
    const task = makeUnifiedItem({ source: "local-task", sourceId: "task-123" });
    const unifiedItems = [task];

    const result = findUnifiedWorkItem(unifiedItems, "local-task", "task-123");

    expect(result).toBe(task);
  });

  it("local reminder id maps to local-reminder", () => {
    const reminder = makeUnifiedItem({ source: "local-reminder", sourceId: "reminder-123" });
    const unifiedItems = [reminder];

    const result = findUnifiedWorkItem(unifiedItems, "local-reminder", "reminder-123");

    expect(result).toBe(reminder);
  });

  it("team task id maps to team-task", () => {
    const teamTask = makeUnifiedItem({ source: "team-task", sourceId: "team-task-123" });
    const unifiedItems = [teamTask];

    const result = findUnifiedWorkItem(unifiedItems, "team-task", "team-task-123");

    expect(result).toBe(teamTask);
  });

  it("missing items report a clear error (return null)", () => {
    const unifiedItems = [
      makeUnifiedItem({ source: "local-note", sourceId: "note-123" })
    ];

    const result = findUnifiedWorkItem(unifiedItems, "local-task", "task-456");

    expect(result).toBeNull();
  });

  it("does not match items with different source", () => {
    const note = makeUnifiedItem({ source: "local-note", sourceId: "item-123" });
    const unifiedItems = [note];

    const result = findUnifiedWorkItem(unifiedItems, "local-task", "item-123");

    expect(result).toBeNull();
  });

  it("does not match items with different sourceId", () => {
    const task = makeUnifiedItem({ source: "local-task", sourceId: "task-123" });
    const unifiedItems = [task];

    const result = findUnifiedWorkItem(unifiedItems, "local-task", "task-456");

    expect(result).toBeNull();
  });

  it("finds item in a list with multiple items", () => {
    const note = makeUnifiedItem({ source: "local-note", sourceId: "note-123" });
    const task = makeUnifiedItem({ source: "local-task", sourceId: "task-456" });
    const reminder = makeUnifiedItem({ source: "local-reminder", sourceId: "reminder-789" });
    const unifiedItems = [note, task, reminder];

    const result = findUnifiedWorkItem(unifiedItems, "local-task", "task-456");

    expect(result).toBe(task);
  });
});
