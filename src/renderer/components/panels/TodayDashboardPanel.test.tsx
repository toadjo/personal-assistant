import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TodayDashboardPanel } from "./TodayDashboardPanel";

describe("TodayDashboardPanel", () => {
  it("renders Focus Brief with summary, priorities, and pressure", () => {
    render(
      <TodayDashboardPanel
        overdueTasks={[
          {
            id: "1",
            title: "late",
            notes: "",
            dueAt: new Date().toISOString(),
            priority: "normal",
            status: "open",
            recurrence: "none",
            notifyChannel: "desktop",
            createdAt: "",
            updatedAt: "",
            lastCompletedAt: null
          }
        ]}
        dueTodayTasks={[]}
        upcomingReminders={[]}
        selectedDayAgenda={[]}
        pinnedNotes={[{ id: "n1", title: "Pinned", content: "", tags: [], pinned: true, createdAt: "", updatedAt: "" }]}
      />
    );

    expect(screen.getByText(/Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Top priorities/i)).toBeInTheDocument();
    expect(screen.getByText(/Pressure/i)).toBeInTheDocument();
    expect(screen.getByText(/late/i)).toBeInTheDocument();
  });

  it("shows empty state when no items", () => {
    render(
      <TodayDashboardPanel
        overdueTasks={[]}
        dueTodayTasks={[]}
        upcomingReminders={[]}
        selectedDayAgenda={[]}
        pinnedNotes={[]}
      />
    );

    expect(screen.getByText(/No items to show/i)).toBeInTheDocument();
  });
});
