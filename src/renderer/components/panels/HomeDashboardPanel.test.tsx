import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { HomeDashboardPanel } from "./HomeDashboardPanel";
import type { DailyCommandCenter } from "../../lib/derived/daily-command-center";

function makeDashboard(overrides: Partial<DailyCommandCenter> = {}): DailyCommandCenter {
  return {
    nowItems: [],
    attentionItems: [],
    contextItems: [],
    awayItems: [],
    summary: "All clear.",
    pressure: {
      overdue: 0,
      dueToday: 0,
      upcoming: 0,
      context: 0
    },
    filter: "all",
    ...overrides
  };
}

function renderDashboard(data: DailyCommandCenter) {
  const handlers = {
    onOpenToday: vi.fn(),
    onOpenInbox: vi.fn(),
    onOpenWorkItem: vi.fn(),
    onOpenAutomations: vi.fn(),
    onCompleteTask: vi.fn(),
    onCompleteReminder: vi.fn(),
    onSnoozeReminder: vi.fn()
  };

  render(<HomeDashboardPanel data={data} {...handlers} />);

  return handlers;
}

describe("HomeDashboardPanel", () => {
  it("renders hero pressure summary and inline next action", () => {
    renderDashboard(
      makeDashboard({
        summary: "Now: 1 overdue.",
        pressure: {
          overdue: 1,
          dueToday: 2,
          upcoming: 0,
          context: 0
        },
        nowItems: [
          {
            id: "local-task-task-1",
            kind: "task",
            label: "Review proposal",
            urgency: "overdue",
            sourceId: "task-1",
            action: "complete-task"
          }
        ]
      })
    );

    expect(screen.getByRole("heading", { name: "1 overdue item need attention" })).toBeInTheDocument();
    expect(screen.getByText("Now: 1 overdue.")).toBeInTheDocument();
    expect(screen.getByText("Review proposal")).toBeInTheDocument();
    // Verify next action is inside the hero, not in a separate section
    expect(screen.queryByText("Action queue")).not.toBeInTheDocument();
  });

  it("opens team tasks instead of completing them through local task actions", async () => {
    const user = userEvent.setup();
    const handlers = renderDashboard(
      makeDashboard({
        nowItems: [
          {
            id: "team-task-team-task-1",
            kind: "team-task",
            label: "Coordinate rollout",
            urgency: "today",
            sourceId: "team-task-1",
            action: "complete-task"
          }
        ]
      })
    );

    await user.click(screen.getByRole("button", { name: "Open item: Coordinate rollout" }));

    expect(handlers.onOpenWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "team-task", sourceId: "team-task-1" })
    );
    expect(handlers.onCompleteTask).not.toHaveBeenCalled();
  });

  it("routes automation items to the household automation callback", async () => {
    const user = userEvent.setup();
    const handlers = renderDashboard(
      makeDashboard({
        nowItems: [
          {
            id: "automation-rule-1",
            kind: "automation",
            label: "Morning routine",
            urgency: "today",
            sourceId: "rule-1",
            action: "complete-task"
          }
        ]
      })
    );

    await user.click(screen.getByRole("button", { name: "Open item: Morning routine" }));

    expect(handlers.onOpenAutomations).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "automation", sourceId: "rule-1" })
    );
    expect(handlers.onOpenWorkItem).not.toHaveBeenCalled();
  });

  it("calls onOpenWorkItem for non-automation items", async () => {
    const user = userEvent.setup();
    const handlers = renderDashboard(
      makeDashboard({
        nowItems: [
          {
            id: "local-task-task-1",
            kind: "task",
            label: "Review proposal",
            urgency: "overdue",
            sourceId: "task-1",
            action: "complete-task"
          }
        ]
      })
    );

    await user.click(screen.getByRole("button", { name: "Review proposal Overdue / Task" }));

    expect(handlers.onOpenWorkItem).toHaveBeenCalledWith(expect.objectContaining({ kind: "task", sourceId: "task-1" }));
  });

  it("shows calm clear-desk message when no urgent actions are waiting", () => {
    renderDashboard(
      makeDashboard({
        summary: "All clear.",
        pressure: {
          overdue: 0,
          dueToday: 0,
          upcoming: 0,
          context: 0
        },
        nowItems: []
      })
    );

    expect(screen.getByRole("heading", { name: "Clear desk" })).toBeInTheDocument();
    expect(
      screen.getByText("Your desk is clear. Capture something in Inbox or review your Today list.")
    ).toBeInTheDocument();
    // Verify no separate action queue block exists
    expect(screen.queryByText("Action queue")).not.toBeInTheDocument();
  });
});
