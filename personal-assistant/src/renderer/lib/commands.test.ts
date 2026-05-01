import { describe, expect, it, vi } from "vitest";
import { normalizeCommandAlias, parseReminderCommand } from "./commands";

describe("normalizeCommandAlias", () => {
  it("maps conversational shortcuts to list reminders", () => {
    expect(normalizeCommandAlias("today")).toBe("list reminders");
    expect(normalizeCommandAlias("What's next")).toBe("list reminders");
    expect(normalizeCommandAlias("whats next")).toBe("list reminders");
  });

  it("trims and preserves other input", () => {
    expect(normalizeCommandAlias("  help  ")).toBe("help");
  });
});

describe("parseReminderCommand", () => {
  it("parses minutes and hours with case-insensitive unit", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-02T12:00:00.000Z"));
    try {
      const m = parseReminderCommand("remind buy milk in 15m");
      expect(m.text).toBe("buy milk");
      expect(m.dueAt).toBe(new Date("2026-05-02T12:15:00.000Z").toISOString());

      const h = parseReminderCommand("remind stand up in 2h");
      expect(h.text).toBe("stand up");
      expect(h.dueAt).toBe(new Date("2026-05-02T14:00:00.000Z").toISOString());
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects invalid patterns", () => {
    expect(() => parseReminderCommand("remind only text")).toThrow(/Use: remind/);
  });
});
