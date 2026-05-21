/**
 * Tests for TodayStrip component.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TodayStrip } from "./TodayStrip";

describe("TodayStrip", () => {
  it("renders all local chips when team props are omitted", () => {
    render(<TodayStrip overdueCount={3} dueTodayCount={5} remindersCount={2} notesCount={10} automationsCount={4} />);

    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Due today")).toBeInTheDocument();
    expect(screen.getByText("Reminders")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Automations")).toBeInTheDocument();
    expect(screen.queryByText("Team")).not.toBeInTheDocument();
  });

  it("renders Team chip when teamOpenCount is provided and greater than 0", () => {
    const onFilterTeam = vi.fn();
    render(
      <TodayStrip
        overdueCount={3}
        dueTodayCount={5}
        remindersCount={2}
        notesCount={10}
        automationsCount={4}
        teamOpenCount={7}
        teamAttentionCount={0}
        onFilterTeam={onFilterTeam}
      />
    );

    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("does not render Team chip when teamOpenCount is 0", () => {
    render(
      <TodayStrip
        overdueCount={3}
        dueTodayCount={5}
        remindersCount={2}
        notesCount={10}
        automationsCount={4}
        teamOpenCount={0}
        teamAttentionCount={0}
        onFilterTeam={vi.fn()}
      />
    );

    expect(screen.queryByText("Team")).not.toBeInTheDocument();
  });

  it("does not render Team chip when teamOpenCount is undefined", () => {
    render(
      <TodayStrip
        overdueCount={3}
        dueTodayCount={5}
        remindersCount={2}
        notesCount={10}
        automationsCount={4}
        onFilterTeam={vi.fn()}
      />
    );

    expect(screen.queryByText("Team")).not.toBeInTheDocument();
  });

  it("applies attention styling when teamAttentionCount > 0", () => {
    const onFilterTeam = vi.fn();
    render(
      <TodayStrip
        overdueCount={3}
        dueTodayCount={5}
        remindersCount={2}
        notesCount={10}
        automationsCount={4}
        teamOpenCount={7}
        teamAttentionCount={2}
        onFilterTeam={onFilterTeam}
      />
    );

    const teamChip = screen.getByText("Team").closest("button");
    expect(teamChip).toHaveClass("todayStripChipAttention");
  });

  it("does not apply attention styling when teamAttentionCount is 0", () => {
    const onFilterTeam = vi.fn();
    render(
      <TodayStrip
        overdueCount={3}
        dueTodayCount={5}
        remindersCount={2}
        notesCount={10}
        automationsCount={4}
        teamOpenCount={7}
        teamAttentionCount={0}
        onFilterTeam={onFilterTeam}
      />
    );

    const teamChip = screen.getByText("Team").closest("button");
    expect(teamChip).not.toHaveClass("todayStripChipAttention");
  });

  it("calls onFilterTeam when Team chip is clicked", () => {
    const onFilterTeam = vi.fn();
    render(
      <TodayStrip
        overdueCount={3}
        dueTodayCount={5}
        remindersCount={2}
        notesCount={10}
        automationsCount={4}
        teamOpenCount={7}
        teamAttentionCount={0}
        onFilterTeam={onFilterTeam}
      />
    );

    const teamChip = screen.getByText("Team").closest("button");
    teamChip?.click();

    expect(onFilterTeam).toHaveBeenCalledTimes(1);
  });

  it("preserves existing chip behavior when team props are omitted", () => {
    const onFilterOverdue = vi.fn();
    const onFilterDueToday = vi.fn();
    const onFilterReminders = vi.fn();
    const onFilterNotes = vi.fn();
    const onFilterAutomations = vi.fn();

    render(
      <TodayStrip
        overdueCount={3}
        dueTodayCount={5}
        remindersCount={2}
        notesCount={10}
        automationsCount={4}
        onFilterOverdue={onFilterOverdue}
        onFilterDueToday={onFilterDueToday}
        onFilterReminders={onFilterReminders}
        onFilterNotes={onFilterNotes}
        onFilterAutomations={onFilterAutomations}
      />
    );

    const overdueChip = screen.getByText("Overdue").closest("button");
    overdueChip?.click();
    expect(onFilterOverdue).toHaveBeenCalledTimes(1);

    const dueTodayChip = screen.getByText("Due today").closest("button");
    dueTodayChip?.click();
    expect(onFilterDueToday).toHaveBeenCalledTimes(1);

    const remindersChip = screen.getByText("Reminders").closest("button");
    remindersChip?.click();
    expect(onFilterReminders).toHaveBeenCalledTimes(1);

    const notesChip = screen.getByText("Notes").closest("button");
    notesChip?.click();
    expect(onFilterNotes).toHaveBeenCalledTimes(1);

    const automationsChip = screen.getByText("Automations").closest("button");
    automationsChip?.click();
    expect(onFilterAutomations).toHaveBeenCalledTimes(1);
  });
});
