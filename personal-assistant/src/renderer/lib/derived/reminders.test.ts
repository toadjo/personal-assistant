import { describe, expect, it } from "vitest";
import type { Reminder } from "../../../shared/types";
import {
  overduePending,
  pendingReminders,
  remindersGroupedByLocalDate,
  todayAgendaFor,
  visibleReminders
} from "./reminders";

function r(partial: Partial<Reminder> & Pick<Reminder, "id" | "text" | "dueAt" | "status">): Reminder {
  return {
    recurrence: "none",
    notifyChannel: "desktop",
    ...partial
  };
}

describe("pendingReminders / overduePending", () => {
  it("filters pending and overdue only", () => {
    const now = Date.now();
    const reminders: Reminder[] = [
      r({ id: "a", text: "done", dueAt: new Date(now - 60_000).toISOString(), status: "done" }),
      r({ id: "b", text: "pending future", dueAt: new Date(now + 3600_000).toISOString(), status: "pending" }),
      r({ id: "c", text: "pending overdue", dueAt: new Date(now - 60_000).toISOString(), status: "pending" })
    ];
    const pending = pendingReminders(reminders);
    expect(pending.map((x) => x.id)).toEqual(["b", "c"]);
    expect(overduePending(pending).map((x) => x.id)).toEqual(["c"]);
  });
});

describe("visibleReminders", () => {
  it("respects filter", () => {
    const reminders: Reminder[] = [
      r({ id: "1", text: "a", dueAt: new Date().toISOString(), status: "pending" }),
      r({ id: "2", text: "b", dueAt: new Date().toISOString(), status: "done" })
    ];
    expect(visibleReminders(reminders, "all").length).toBe(2);
    expect(visibleReminders(reminders, "pending").length).toBe(1);
  });
});

describe("remindersGroupedByLocalDate / todayAgendaFor", () => {
  it("groups by local date key and builds today agenda", () => {
    const d = new Date(2026, 4, 2, 10, 30, 0);
    const dueAt = d.toISOString();
    const reminders: Reminder[] = [r({ id: "1", text: "Meeting", dueAt, status: "pending" })];
    const map = remindersGroupedByLocalDate(reminders);
    expect(map.get("2026-05-02")?.length).toBe(1);
    const agenda = todayAgendaFor(reminders, "2026-05-02");
    expect(agenda[0]?.text).toBe("Meeting");
  });
});
