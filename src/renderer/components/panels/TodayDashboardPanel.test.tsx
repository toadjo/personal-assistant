import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TodayDashboardPanel } from "./TodayDashboardPanel";

describe("TodayDashboardPanel", () => {
  it("renders standalone productivity summary without HA dependency", () => {
    render(
      <TodayDashboardPanel
        overdueTasks={[{ id: "1", title: "late", notes: "", dueAt: new Date().toISOString(), priority: "normal", status: "open", recurrence: "none", notifyChannel: "desktop", createdAt: "", updatedAt: "", lastCompletedAt: null }]}
        dueTodayTasks={[]}
        upcomingReminders={[]}
        selectedDayAgenda={[]}
        pinnedNotes={[{ id: "n1", title: "Pinned", content: "", tags: [], pinned: true, createdAt: "", updatedAt: "" }]}
      />
    );

    expect(screen.getByText(/Overdue tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/Pinned notes/i)).toBeInTheDocument();
  });
});
