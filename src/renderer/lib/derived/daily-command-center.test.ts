import { describe, expect, it } from "vitest";
import { deriveDailyCommandCenter, getDailyCommandCenterPressureLabel } from "./daily-command-center";
import type { BriefItem, AwayBriefItem } from "../../types";

function makeBriefItem(overrides: Partial<BriefItem> = {}): BriefItem {
  return {
    kind: "task",
    label: "Item",
    urgency: "today",
    sourceId: "1",
    ...overrides
  };
}

function makeAwayItem(overrides: Partial<AwayBriefItem> = {}): AwayBriefItem {
  return {
    kind: "task",
    reason: "new",
    label: "Away item",
    sourceId: "a1",
    changedAt: "2024-01-15T12:00:00Z",
    ...overrides
  };
}

describe("deriveDailyCommandCenter", () => {
  it("returns empty state when all inputs are empty", () => {
    const result = deriveDailyCommandCenter({
      focusBrief: [],
      awayBrief: []
    });

    expect(result.nowItems).toEqual([]);
    expect(result.attentionItems).toEqual([]);
    expect(result.contextItems).toEqual([]);
    expect(result.awayItems).toEqual([]);
    expect(result.summary).toBe("All clear - nothing needs attention right now.");
    expect(result.pressure).toEqual({ overdue: 0, dueToday: 0, upcoming: 0, context: 0 });
  });

  it("places overdue items in attention before due-today items", () => {
    const overdue = makeBriefItem({ urgency: "overdue", label: "Overdue", sourceId: "o1" });
    const today = makeBriefItem({ urgency: "today", label: "Today", sourceId: "t1" });

    const result = deriveDailyCommandCenter({
      focusBrief: [today, overdue],
      awayBrief: []
    });

    expect(result.attentionItems).toHaveLength(2);
    expect(result.attentionItems[0]?.urgency).toBe("overdue");
    expect(result.attentionItems[1]?.urgency).toBe("today");
  });

  it("places due-today items in attention before upcoming/context", () => {
    const today = makeBriefItem({ urgency: "today", label: "Today", sourceId: "t1" });
    const upcoming = makeBriefItem({ urgency: "upcoming", label: "Upcoming", sourceId: "u1" });
    const context = makeBriefItem({ urgency: "context", label: "Context", sourceId: "c1", kind: "note" });

    const result = deriveDailyCommandCenter({
      focusBrief: [context, upcoming, today],
      awayBrief: []
    });

    expect(result.attentionItems).toHaveLength(1);
    expect(result.attentionItems[0]?.urgency).toBe("today");
    expect(result.contextItems).toHaveLength(2);
    expect(result.contextItems[0]?.urgency).toBe("upcoming");
    expect(result.contextItems[1]?.urgency).toBe("context");
  });

  it("excludes done tasks and reminders from focus brief input", () => {
    const result = deriveDailyCommandCenter({
      focusBrief: [],
      awayBrief: []
    });

    expect(result.attentionItems).toEqual([]);
    expect(result.nowItems).toEqual([]);
  });

  it("returns nowItems with correct action mapping for tasks", () => {
    const overdue = makeBriefItem({ urgency: "overdue", label: "Overdue task", sourceId: "o1", kind: "task" });

    const result = deriveDailyCommandCenter({
      focusBrief: [overdue],
      awayBrief: []
    });

    expect(result.nowItems).toHaveLength(1);
    expect(result.nowItems[0]?.action).toBe("complete-task");
  });

  it("returns nowItems with correct action mapping for reminders", () => {
    const todayReminder = makeBriefItem({
      urgency: "today",
      label: "Today reminder",
      sourceId: "r1",
      kind: "reminder"
    });

    const result = deriveDailyCommandCenter({
      focusBrief: [todayReminder],
      awayBrief: []
    });

    expect(result.nowItems).toHaveLength(1);
    expect(result.nowItems[0]?.action).toBe("complete-reminder");
  });

  it("caps nowItems at top 3 attention items", () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeBriefItem({ urgency: "overdue", label: `Task ${i}`, sourceId: `t${i}` })
    );

    const result = deriveDailyCommandCenter({
      focusBrief: items,
      awayBrief: []
    });

    expect(result.nowItems).toHaveLength(3);
  });

  it("keeps stable now ordering: overdue before due-today before upcoming", () => {
    const upcoming = makeBriefItem({ urgency: "upcoming", label: "Upcoming", sourceId: "u1" });
    const today = makeBriefItem({ urgency: "today", label: "Today", sourceId: "t1" });
    const overdue1 = makeBriefItem({ urgency: "overdue", label: "Overdue A", sourceId: "o1" });
    const overdue2 = makeBriefItem({ urgency: "overdue", label: "Overdue B", sourceId: "o2" });

    const result = deriveDailyCommandCenter({
      focusBrief: [upcoming, today, overdue1, overdue2],
      awayBrief: []
    });

    expect(result.nowItems).toHaveLength(3);
    expect(result.nowItems[0]?.sourceId).toBe("o1");
    expect(result.nowItems[1]?.sourceId).toBe("o2");
    expect(result.nowItems[2]?.sourceId).toBe("t1");
  });

  it("includes away brief items in the returned shape", () => {
    const awayItem = makeAwayItem({ label: "New task", reason: "new" });

    const result = deriveDailyCommandCenter({
      focusBrief: [],
      awayBrief: [awayItem]
    });

    expect(result.awayItems).toHaveLength(1);
    expect(result.awayItems[0]?.label).toBe("New task");
    expect(result.summary).toContain("since you were away");
  });

  it("produces clean summary when away brief is cleared but focus brief remains", () => {
    const focusBrief = [makeBriefItem({ urgency: "overdue", sourceId: "o1", label: "Overdue" })];

    const result = deriveDailyCommandCenter({
      focusBrief,
      awayBrief: []
    });

    expect(result.awayItems).toHaveLength(0);
    expect(result.summary).not.toContain("since you were away");
    expect(result.summary).toContain("overdue");
    expect(result.nowItems).toHaveLength(1);
  });

  it("counts pressure correctly across urgencies", () => {
    const focusBrief = [
      makeBriefItem({ urgency: "overdue", sourceId: "o1" }),
      makeBriefItem({ urgency: "overdue", sourceId: "o2" }),
      makeBriefItem({ urgency: "today", sourceId: "t1" }),
      makeBriefItem({ urgency: "upcoming", sourceId: "u1", kind: "reminder" }),
      makeBriefItem({ urgency: "context", sourceId: "c1", kind: "note" })
    ];

    const result = deriveDailyCommandCenter({
      focusBrief,
      awayBrief: []
    });

    expect(result.pressure).toEqual({ overdue: 2, dueToday: 1, upcoming: 1, context: 1 });
  });
});

describe("getDailyCommandCenterPressureLabel", () => {
  it("returns empty message when all counts are zero", () => {
    expect(getDailyCommandCenterPressureLabel({ overdue: 0, dueToday: 0, upcoming: 0, context: 0 })).toBe(
      "Nothing on your plate."
    );
  });

  it("includes overdue and due today counts", () => {
    expect(getDailyCommandCenterPressureLabel({ overdue: 2, dueToday: 1, upcoming: 0, context: 0 })).toBe(
      "2 overdue / 1 due today"
    );
  });

  it("includes all non-zero counts", () => {
    expect(getDailyCommandCenterPressureLabel({ overdue: 1, dueToday: 1, upcoming: 3, context: 2 })).toBe(
      "1 overdue / 1 due today / 3 upcoming / 2 context"
    );
  });
});
