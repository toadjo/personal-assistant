import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AwayBriefPanel } from "./AwayBriefPanel";
import type { AwayBriefItem } from "../../types";

describe("AwayBriefPanel", () => {
  it("renders top items", () => {
    const items: AwayBriefItem[] = [
      {
        kind: "task",
        reason: "new",
        label: "Buy groceries",
        sourceId: "task-1",
        changedAt: "2026-05-07T11:00:00.000Z"
      },
      {
        kind: "note",
        reason: "updated",
        label: "Meeting notes",
        detail: "Discuss project timeline",
        sourceId: "note-1",
        changedAt: "2026-05-07T10:00:00.000Z"
      }
    ];

    const onMarkSeen = vi.fn();
    render(<AwayBriefPanel items={items} onMarkSeen={onMarkSeen} />);

    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
    expect(screen.getByText("Meeting notes")).toBeInTheDocument();
    expect(screen.getByText("Discuss project timeline")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    const onMarkSeen = vi.fn();
    render(<AwayBriefPanel items={[]} onMarkSeen={onMarkSeen} />);

    expect(
      screen.getByText("Nothing changed since you last checked.", { selector: ".awayBriefEmptyState" })
    ).toBeInTheDocument();
  });

  it("mark-seen action updates via callback", () => {
    const items: AwayBriefItem[] = [
      {
        kind: "task",
        reason: "new",
        label: "Buy groceries",
        sourceId: "task-1",
        changedAt: "2026-05-07T11:00:00.000Z"
      }
    ];

    const onMarkSeen = vi.fn();
    render(<AwayBriefPanel items={items} onMarkSeen={onMarkSeen} />);

    const dismissButton = screen.getByLabelText("Mark as seen");
    dismissButton.click();

    expect(onMarkSeen).toHaveBeenCalledTimes(1);
  });
});
