import { describe, expect, it } from "vitest";
import type { Reminder } from "../../shared/types";
import { buildCalendarCells, parseLocalDateKey, toLocalDateKey } from "./calendar";

describe("toLocalDateKey", () => {
  it("formats local calendar date as YYYY-MM-DD", () => {
    expect(toLocalDateKey(new Date(2026, 4, 2))).toBe("2026-05-02");
  });
});

describe("parseLocalDateKey", () => {
  it("round-trips with toLocalDateKey in local time", () => {
    const key = "2026-12-31";
    expect(toLocalDateKey(parseLocalDateKey(key))).toBe(key);
  });
});

describe("buildCalendarCells", () => {
  it("pads leading/trailing days and counts reminders per cell", () => {
    const month = new Date(2026, 4, 1);
    const key = "2026-05-15";
    const remindersByDate = new Map<string, Reminder[]>([
      [
        key,
        [
          {
            id: "1",
            text: "x",
            dueAt: `${key}T15:00:00.000Z`,
            recurrence: "none",
            status: "pending",
            notifyChannel: "desktop"
          }
        ]
      ]
    ]);
    const cells = buildCalendarCells(month, remindersByDate);
    expect(cells.length % 7).toBe(0);
    const fifteenth = cells.find((c) => c.dateKey === key && c.isCurrentMonth);
    expect(fifteenth?.count).toBe(1);
  });
});
