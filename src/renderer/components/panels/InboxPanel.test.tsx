import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InboxPanel } from "./InboxPanel";
import type { UnifiedWorkItem } from "../../lib/derived/unified-work";
import type { TeamProject } from "../../../shared/team/types";

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

function makeTeamProject(overrides: Partial<TeamProject> = {}): TeamProject {
  return {
    id: `project-${Math.random()}`,
    workspaceId: "workspace-1",
    name: "Project",
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "user-1",
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
        teamProjects={[]}
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
        teamProjects={[]}
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
        teamProjects={[]}
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
      makeUnifiedItem({
        source: "local-reminder",
        label: "Reminder 1",
        priority: "today",
        dueAt: "2024-01-15T12:00:00Z"
      })
    ];

    render(
      <InboxPanel
        unifiedItems={unifiedItems}
        needsSorting={[]}
        teamProjects={[]}
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
        teamProjects={[]}
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
        teamProjects={[]}
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
        teamProjects={[]}
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

  describe("Send to team", () => {
    it("local task in Needs Sorting shows project selector and Send to team button when projects exist", () => {
      const teamProjects = [makeTeamProject({ name: "Project A" }), makeTeamProject({ name: "Project B" })];
      const needsSorting = [makeUnifiedItem({ source: "local-task", label: "Buy groceries" })];
      const sendTaskToTeam = vi.fn().mockResolvedValue(undefined);

      render(
        <InboxPanel
          unifiedItems={[]}
          needsSorting={needsSorting}
          teamProjects={teamProjects}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={sendTaskToTeam}
        />
      );

      expect(screen.getByRole("combobox")).toBeDefined();
      expect(screen.getByLabelText("Send to team")).toBeDefined();
    });

    it("clicking Send to team calls sendTaskToTeam with the local task id and default project id", () => {
      const teamProjects = [makeTeamProject({ name: "Project A" }), makeTeamProject({ name: "Project B" })];
      const needsSorting = [makeUnifiedItem({ source: "local-task", label: "Buy groceries", sourceId: "task-123" })];
      const sendTaskToTeam = vi.fn().mockResolvedValue(undefined);

      render(
        <InboxPanel
          unifiedItems={[]}
          needsSorting={needsSorting}
          teamProjects={teamProjects}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={sendTaskToTeam}
        />
      );

      const sendButton = screen.getByLabelText("Send to team");
      sendButton.click();

      expect(sendTaskToTeam).toHaveBeenCalledTimes(1);
      expect(sendTaskToTeam).toHaveBeenCalledWith("task-123", teamProjects[0]!.id);
    });

    it("no Team action renders when teamProjects is empty", () => {
      const needsSorting = [makeUnifiedItem({ source: "local-task", label: "Buy groceries" })];

      render(
        <InboxPanel
          unifiedItems={[]}
          needsSorting={needsSorting}
          teamProjects={[]}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
        />
      );

      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Send to team")).not.toBeInTheDocument();
    });

    it("no Team action renders for notes", () => {
      const teamProjects = [makeTeamProject({ name: "Project A" })];
      const needsSorting = [makeUnifiedItem({ source: "local-note", label: "Meeting notes" })];

      render(
        <InboxPanel
          unifiedItems={[]}
          needsSorting={needsSorting}
          teamProjects={teamProjects}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
        />
      );

      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Send to team")).not.toBeInTheDocument();
    });

    it("no Team action renders for reminders", () => {
      const teamProjects = [makeTeamProject({ name: "Project A" })];
      const needsSorting = [makeUnifiedItem({ source: "local-reminder", label: "Call mom" })];

      render(
        <InboxPanel
          unifiedItems={[]}
          needsSorting={needsSorting}
          teamProjects={teamProjects}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
        />
      );

      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Send to team")).not.toBeInTheDocument();
    });

    it("no Team action renders for team tasks", () => {
      const teamProjects = [makeTeamProject({ name: "Project A" })];
      const needsSorting = [makeUnifiedItem({ source: "team-task", label: "Team task" })];

      render(
        <InboxPanel
          unifiedItems={[]}
          needsSorting={needsSorting}
          teamProjects={teamProjects}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
        />
      );

      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Send to team")).not.toBeInTheDocument();
    });
  });

  describe("inline actions on All Items", () => {
    it("shows complete button for tasks in All Items", () => {
      const unifiedItems = [makeUnifiedItem({ source: "local-task", label: "Task in all" })];

      render(
        <InboxPanel
          unifiedItems={unifiedItems}
          needsSorting={[]}
          teamProjects={[]}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
          completeTask={vi.fn()}
        />
      );

      expect(screen.getByLabelText("Complete task")).toBeDefined();
    });

    it("shows complete button for reminders in All Items", () => {
      const unifiedItems = [makeUnifiedItem({ source: "local-reminder", label: "Reminder in all" })];

      render(
        <InboxPanel
          unifiedItems={unifiedItems}
          needsSorting={[]}
          teamProjects={[]}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
          completeReminder={vi.fn()}
        />
      );

      expect(screen.getByLabelText("Complete reminder")).toBeDefined();
    });

    it("shows delete button for tasks in All Items", () => {
      const unifiedItems = [makeUnifiedItem({ source: "local-task", label: "Task to delete" })];

      render(
        <InboxPanel
          unifiedItems={unifiedItems}
          needsSorting={[]}
          teamProjects={[]}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
          deleteTask={vi.fn()}
        />
      );

      expect(screen.getByLabelText("Delete task")).toBeDefined();
    });

    it("shows delete button for reminders in All Items", () => {
      const unifiedItems = [makeUnifiedItem({ source: "local-reminder", label: "Reminder to delete" })];

      render(
        <InboxPanel
          unifiedItems={unifiedItems}
          needsSorting={[]}
          teamProjects={[]}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
          deleteReminder={vi.fn()}
        />
      );

      expect(screen.getByLabelText("Delete reminder")).toBeDefined();
    });

    it("shows delete button for notes in All Items", () => {
      const unifiedItems = [makeUnifiedItem({ source: "local-note", label: "Note to delete" })];

      render(
        <InboxPanel
          unifiedItems={unifiedItems}
          needsSorting={[]}
          teamProjects={[]}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
          deleteNote={vi.fn()}
        />
      );

      expect(screen.getByLabelText("Delete note")).toBeDefined();
    });

    it("shows convert buttons for notes in All Items", () => {
      const unifiedItems = [makeUnifiedItem({ source: "local-note", label: "Note in all" })];

      render(
        <InboxPanel
          unifiedItems={unifiedItems}
          needsSorting={[]}
          teamProjects={[]}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
        />
      );

      const buttons = screen.getAllByRole("button");
      const convertToTask = buttons.find((btn) => btn.getAttribute("aria-label") === "Convert to task");
      const convertToReminder = buttons.find((btn) => btn.getAttribute("aria-label") === "Convert to reminder");
      expect(convertToTask).toBeDefined();
      expect(convertToReminder).toBeDefined();
    });

    it("does not show complete button for already completed items", () => {
      const unifiedItems = [makeUnifiedItem({ source: "local-task", label: "Done task", isCompleted: true })];

      render(
        <InboxPanel
          unifiedItems={unifiedItems}
          needsSorting={[]}
          teamProjects={[]}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
          completeTask={vi.fn()}
        />
      );

      expect(screen.queryByLabelText("Complete task")).toBeNull();
    });

    it("team task has no local complete/delete/convert action in All Items", () => {
      const unifiedItems = [makeUnifiedItem({ source: "team-task", label: "Team task in all" })];

      render(
        <InboxPanel
          unifiedItems={unifiedItems}
          needsSorting={[]}
          teamProjects={[]}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
          completeTask={vi.fn()}
          deleteTask={vi.fn()}
          deleteNote={vi.fn()}
        />
      );

      expect(screen.queryByLabelText("Complete task")).toBeNull();
      expect(screen.queryByLabelText("Delete task")).toBeNull();
      expect(screen.queryByLabelText("Convert to task")).toBeNull();
    });
  });

  describe("inline actions on Needs Sorting", () => {
    it("shows complete button for tasks in Needs Sorting", () => {
      const needsSorting = [makeUnifiedItem({ source: "local-task", label: "Task in needs sorting" })];

      render(
        <InboxPanel
          unifiedItems={[]}
          needsSorting={needsSorting}
          teamProjects={[]}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
          completeTask={vi.fn()}
        />
      );

      expect(screen.getByLabelText("Complete task")).toBeDefined();
    });

    it("shows complete button for reminders in Needs Sorting", () => {
      const needsSorting = [makeUnifiedItem({ source: "local-reminder", label: "Reminder in needs sorting" })];

      render(
        <InboxPanel
          unifiedItems={[]}
          needsSorting={needsSorting}
          teamProjects={[]}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
          completeReminder={vi.fn()}
        />
      );

      expect(screen.getByLabelText("Complete reminder")).toBeDefined();
    });

    it("does not show delete button in Needs Sorting", () => {
      const needsSorting = [makeUnifiedItem({ source: "local-task", label: "Task in needs sorting" })];

      render(
        <InboxPanel
          unifiedItems={[]}
          needsSorting={needsSorting}
          teamProjects={[]}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
          deleteTask={vi.fn()}
        />
      );

      expect(screen.queryByLabelText("Delete task")).toBeNull();
    });

    it("team task has no local complete/delete/convert action in Needs Sorting", () => {
      const needsSorting = [makeUnifiedItem({ source: "team-task", label: "Team task in needs sorting" })];

      render(
        <InboxPanel
          unifiedItems={[]}
          needsSorting={needsSorting}
          teamProjects={[]}
          createQuickNote={vi.fn()}
          createQuickTask={vi.fn()}
          createQuickReminder={vi.fn()}
          convertNoteToTask={vi.fn()}
          convertNoteToReminder={vi.fn()}
          sendTaskToTeam={vi.fn()}
          completeTask={vi.fn()}
          deleteTask={vi.fn()}
          deleteNote={vi.fn()}
        />
      );

      expect(screen.queryByLabelText("Complete task")).toBeNull();
      expect(screen.queryByLabelText("Delete task")).toBeNull();
      expect(screen.queryByLabelText("Convert to task")).toBeNull();
    });
  });
});
