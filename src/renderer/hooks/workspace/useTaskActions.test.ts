import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTaskActions } from "./useTaskActions";
import type { Task } from "../../../shared/types";
import { createQueryTestWrapper } from "../../test/queryTestUtils";

const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Test Task",
    notes: "Test notes",
    dueAt: "2024-01-01T12:00:00Z",
    priority: "normal",
    recurrence: "none",
    status: "open",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    notifyChannel: "desktop",
    lastCompletedAt: null
  }
];

const mockSetStatus = vi.fn();
const mockSetError = vi.fn();

vi.mock("../../lib/errors", () => ({
  getAssistantInvokeErrorMessage: vi.fn((err) => (err instanceof Error ? err.message : "Unknown error"))
}));

describe("useTaskActions", () => {
  beforeEach(() => {
    mockSetStatus.mockClear();
    mockSetError.mockClear();
    (window as unknown as { assistantApi: unknown }).assistantApi = {
      completeTask: vi.fn().mockResolvedValue(undefined),
      deleteTask: vi.fn().mockResolvedValue(undefined),
      createTask: vi.fn().mockResolvedValue(undefined),
      updateTask: vi.fn().mockResolvedValue(undefined)
    };
  });

  it("updateDetailsById calls assistantApi.updateTask with only id, title, and notes", async () => {
    const wrapper = createQueryTestWrapper();
    const { result } = renderHook(() => useTaskActions(mockTasks, mockSetStatus, mockSetError), { wrapper });

    await result.current.updateDetailsById("task-1", "Updated Title", "Updated Notes");

    expect(window.assistantApi.updateTask).toHaveBeenCalledWith({
      id: "task-1",
      title: "Updated Title",
      notes: "Updated Notes"
    });
    expect(window.assistantApi.updateTask).not.toHaveBeenCalledWith(
      expect.objectContaining({
        dueAt: expect.anything()
      })
    );
    expect(window.assistantApi.updateTask).not.toHaveBeenCalledWith(
      expect.objectContaining({
        priority: expect.anything()
      })
    );
    expect(window.assistantApi.updateTask).not.toHaveBeenCalledWith(
      expect.objectContaining({
        recurrence: expect.anything()
      })
    );
  });

  it("updateDetailsById refreshes tasks and sets status on success", async () => {
    const wrapper = createQueryTestWrapper();
    const { result } = renderHook(() => useTaskActions(mockTasks, mockSetStatus, mockSetError), { wrapper });

    await result.current.updateDetailsById("task-1", "Updated Title", "Updated Notes");

    await waitFor(() => {
      expect(mockSetStatus).toHaveBeenCalledWith("Task updated.");
    });
  });

  it("updateDetailsById sets error on failure", async () => {
    (
      (window as unknown as { assistantApi: { updateTask: unknown } }).assistantApi.updateTask as ReturnType<
        typeof vi.fn
      >
    ).mockRejectedValue(new Error("API Error"));

    const wrapper = createQueryTestWrapper();
    const { result } = renderHook(() => useTaskActions(mockTasks, mockSetStatus, mockSetError), { wrapper });

    await result.current.updateDetailsById("task-1", "Updated Title", "Updated Notes");

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith("API Error");
    });
  });
});
