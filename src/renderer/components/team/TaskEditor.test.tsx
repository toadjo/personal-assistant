import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TaskEditor } from "./TaskEditor";
import type { TeamProjectTask } from "../../../shared/team/types";
import type { TeamState } from "../../hooks/team/useTeamState";

const mockTeam = {
  updateTask: vi.fn()
} as unknown as TeamState;

function makeTask(overrides: Partial<TeamProjectTask> = {}): TeamProjectTask {
  return {
    id: "task-1",
    projectId: "project-1",
    workspaceId: "workspace-1",
    title: "Test Task",
    notes: "Test notes",
    dueAt: "2024-01-01T00:00:00.000Z",
    priority: "normal",
    recurrence: "none",
    status: "open",
    assigneeDisplayName: "Alice",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    createdBy: "user-1",
    updatedBy: "user-1",
    ...overrides
  };
}

describe("TaskEditor", () => {
  it("renders task editor with initial values", () => {
    const task = makeTask();
    render(<TaskEditor task={task} team={mockTeam} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Title")).toHaveValue(task.title);
    expect(screen.getByLabelText("Notes")).toHaveValue(task.notes);
    expect(screen.getByLabelText("Due Date")).toHaveValue("2024-01-01T00:00");
    expect(screen.getByLabelText("Priority")).toHaveValue(task.priority);
    expect(screen.getByLabelText("Recurrence")).toHaveValue(task.recurrence);
    expect(screen.getByLabelText("Assignee")).toHaveValue(task.assigneeDisplayName);
    expect(screen.getByLabelText("Status")).toHaveValue(task.status);
  });

  it("calls onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<TaskEditor task={makeTask()} team={mockTeam} onCancel={onCancel} />);

    screen.getByText("Cancel").click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("returns null when task is null", () => {
    const { container } = render(<TaskEditor task={null} team={mockTeam} onCancel={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("does not throw hook-order errors with null task", () => {
    expect(() => {
      render(<TaskEditor task={null} team={mockTeam} onCancel={vi.fn()} />);
    }).not.toThrow();
  });

  it("resets form fields when switching from task A to task B", () => {
    const taskA = makeTask({
      id: "task-a",
      title: "Task A",
      notes: "Notes A",
      priority: "high",
      recurrence: "weekly",
      assigneeDisplayName: "Alice",
      status: "open",
      dueAt: "2024-06-01T10:00:00.000Z"
    });

    const taskB = makeTask({
      id: "task-b",
      title: "Task B",
      notes: "Notes B",
      priority: "low",
      recurrence: "daily",
      assigneeDisplayName: "Bob",
      status: "done",
      dueAt: "2024-07-15T14:00:00.000Z"
    });

    const { rerender } = render(<TaskEditor task={taskA} team={mockTeam} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Title")).toHaveValue("Task A");
    expect(screen.getByLabelText("Priority")).toHaveValue("high");

    rerender(<TaskEditor task={taskB} team={mockTeam} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Title")).toHaveValue("Task B");
    expect(screen.getByLabelText("Notes")).toHaveValue("Notes B");
    expect(screen.getByLabelText("Priority")).toHaveValue("low");
    expect(screen.getByLabelText("Recurrence")).toHaveValue("daily");
    expect(screen.getByLabelText("Assignee")).toHaveValue("Bob");
    expect(screen.getByLabelText("Status")).toHaveValue("done");
    expect(screen.getByLabelText("Due Date")).toHaveValue("2024-07-15T14:00");
  });

  it("validates that title is required before saving", async () => {
    const updateTask = vi.fn();
    const team = { updateTask } as unknown as TeamState;
    render(<TaskEditor task={makeTask()} team={team} onCancel={vi.fn()} />);

    const titleInput = screen.getByLabelText("Title");
    fireEvent.change(titleInput, { target: { value: "" } });

    await act(async () => {
      screen.getByText("Save").click();
    });

    expect(screen.getByText("Task title is required")).toBeDefined();
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("validates that recurring tasks require a due date", async () => {
    const updateTask = vi.fn();
    const team = { updateTask } as unknown as TeamState;
    const task = makeTask({ recurrence: "none", dueAt: null });
    render(<TaskEditor task={task} team={team} onCancel={vi.fn()} />);

    const recurrenceSelect = screen.getByLabelText("Recurrence");
    fireEvent.change(recurrenceSelect, { target: { value: "weekly" } });

    await act(async () => {
      screen.getByText("Save").click();
    });

    expect(screen.getByText("Recurring tasks require a due date")).toBeDefined();
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("switches from null task to valid task without error", () => {
    const task = makeTask();
    const { rerender, container } = render(<TaskEditor task={null} team={mockTeam} onCancel={vi.fn()} />);

    expect(container.innerHTML).toBe("");

    rerender(<TaskEditor task={task} team={mockTeam} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Title")).toHaveValue(task.title);
  });
});
