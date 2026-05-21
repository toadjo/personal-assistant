import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskEditor } from "./TaskEditor";
import type { TeamProjectTask } from "../../../shared/team/types";
import type { TeamState } from "../../hooks/team/useTeamState";

const mockTeam = {
  updateTask: vi.fn()
} as unknown as TeamState;

const mockTask: TeamProjectTask = {
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
  updatedBy: "user-1"
};

describe("TaskEditor", () => {
  it("renders task editor with initial values", () => {
    render(<TaskEditor task={mockTask} team={mockTeam} onCancel={vi.fn()} />);
    
    expect(screen.getByLabelText("Title")).toHaveValue(mockTask.title);
    expect(screen.getByLabelText("Notes")).toHaveValue(mockTask.notes);
    expect(screen.getByLabelText("Due Date")).toHaveValue("2024-01-01T00:00");
    expect(screen.getByLabelText("Priority")).toHaveValue(mockTask.priority);
    expect(screen.getByLabelText("Recurrence")).toHaveValue(mockTask.recurrence);
    expect(screen.getByLabelText("Assignee")).toHaveValue(mockTask.assigneeDisplayName);
    expect(screen.getByLabelText("Status")).toHaveValue(mockTask.status);
  });

  it("calls onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<TaskEditor task={mockTask} team={mockTeam} onCancel={onCancel} />);
    
    screen.getByText("Cancel").click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
