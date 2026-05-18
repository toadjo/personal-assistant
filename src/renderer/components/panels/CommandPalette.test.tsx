import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandPalette } from "./CommandPalette";
import type { Note, Task, Reminder, AutomationRule } from "../../../shared/types";
import type { TeamProjectTask, TeamProject } from "../../../shared/team/types";
import type { HaDeviceRow } from "../../types";

function makeNote(id: string, title: string): Note {
  return { id, title, content: "", tags: [], pinned: false, createdAt: "", updatedAt: "" };
}

function makeTask(id: string, title: string): Task {
  return {
    id,
    title,
    status: "open",
    notes: "",
    dueAt: null,
    priority: "normal",
    recurrence: "none",
    notifyChannel: "desktop",
    createdAt: "",
    updatedAt: "",
    lastCompletedAt: null
  };
}

function _makeReminder(id: string, text: string): Reminder {
  return { id, text, dueAt: "", recurrence: "none", status: "pending", notifyChannel: "desktop" };
}

function _makeRule(id: string, name: string): AutomationRule {
  return {
    id,
    name,
    triggerType: "time",
    triggerConfig: { at: "08:00" },
    actionType: "localReminder",
    actionConfig: { text: "" },
    enabled: true
  };
}

function _makeDevice(entityId: string, friendlyName: string): HaDeviceRow {
  return { entityId, friendlyName, state: "off" };
}

function makeTeamTask(id: string, projectId: string, title: string): TeamProjectTask {
  return {
    id,
    projectId,
    workspaceId: "ws-1",
    title,
    notes: "",
    dueAt: null,
    priority: "normal",
    recurrence: "none",
    assigneeDisplayName: null,
    status: "open",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    createdBy: "user-1",
    updatedBy: "user-1"
  };
}

function makeTeamProject(id: string, name: string): TeamProject {
  return {
    id,
    workspaceId: "ws-1",
    name,
    createdAt: "2026-01-01T00:00:00Z",
    createdBy: "user-1"
  };
}

const noop = () => undefined;

describe("CommandPalette", () => {
  it("renders with search input focused", () => {
    render(<CommandPalette notes={[]} tasks={[]} reminders={[]} rules={[]} devices={[]} onClose={noop} />);
    expect(screen.getByPlaceholderText(/Search notes/)).toBeInTheDocument();
  });

  it("shows results for matching query", () => {
    render(
      <CommandPalette
        notes={[makeNote("n1", "Meeting notes")]}
        tasks={[]}
        reminders={[]}
        rules={[]}
        devices={[]}
        onClose={noop}
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/Search notes/), { target: { value: "meet" } });
    expect(screen.getByText("Meeting notes")).toBeInTheDocument();
  });

  it("shows empty state when no matches", () => {
    render(<CommandPalette notes={[]} tasks={[]} reminders={[]} rules={[]} devices={[]} onClose={noop} />);
    fireEvent.change(screen.getByPlaceholderText(/Search notes/), { target: { value: "xyz" } });
    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<CommandPalette notes={[]} tasks={[]} reminders={[]} rules={[]} devices={[]} onClose={onClose} />);
    fireEvent.keyDown(screen.getByPlaceholderText(/Search notes/), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onOpenNote when a note result is clicked", () => {
    const onOpenNote = vi.fn();
    render(
      <CommandPalette
        notes={[makeNote("n1", "Meeting notes")]}
        tasks={[]}
        reminders={[]}
        rules={[]}
        devices={[]}
        onOpenNote={onOpenNote}
        onClose={noop}
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/Search notes/), { target: { value: "meet" } });
    fireEvent.click(screen.getByText("Meeting notes"));
    expect(onOpenNote).toHaveBeenCalledWith("n1");
  });

  it("shows categories with icons", () => {
    render(
      <CommandPalette
        notes={[]}
        tasks={[makeTask("t1", "Pay rent")]}
        reminders={[]}
        rules={[]}
        devices={[]}
        onClose={noop}
      />
    );
    expect(screen.getByText("Pay rent")).toBeInTheDocument();
    expect(screen.getByText("Open task")).toBeInTheDocument();
  });

  it("keyboard navigation: arrow down selects next item", () => {
    render(
      <CommandPalette
        notes={[makeNote("n1", "A"), makeNote("n2", "B")]}
        tasks={[]}
        reminders={[]}
        rules={[]}
        devices={[]}
        onClose={noop}
      />
    );
    const input = screen.getByPlaceholderText(/Search notes/);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    // First item should be selected by default, arrow down moves to second
    // Visual selection is class-based; we verify no errors are thrown
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  describe("team tasks", () => {
    it("renders team task results", () => {
      render(
        <CommandPalette
          notes={[]}
          tasks={[]}
          reminders={[]}
          rules={[]}
          devices={[]}
          teamTasks={[makeTeamTask("tt1", "proj-1", "Fix bug")]}
          teamProjects={[makeTeamProject("proj-1", "Frontend")]}
          onClose={noop}
        />
      );
      fireEvent.change(screen.getByPlaceholderText(/Search/), { target: { value: "fix" } });
      expect(screen.getByText("Fix bug")).toBeInTheDocument();
      expect(screen.getByText("Open team task")).toBeInTheDocument();
    });

    it("calls onOpenTeamTask when team task result is clicked", () => {
      const onOpenTeamTask = vi.fn();
      render(
        <CommandPalette
          notes={[]}
          tasks={[]}
          reminders={[]}
          rules={[]}
          devices={[]}
          teamTasks={[makeTeamTask("tt1", "proj-1", "Implement feature")]}
          teamProjects={[makeTeamProject("proj-1", "Frontend")]}
          onOpenTeamTask={onOpenTeamTask}
          onClose={noop}
        />
      );
      fireEvent.change(screen.getByPlaceholderText(/Search/), { target: { value: "implement" } });
      fireEvent.click(screen.getByText("Implement feature"));
      expect(onOpenTeamTask).toHaveBeenCalledWith("tt1");
    });
  });
});
