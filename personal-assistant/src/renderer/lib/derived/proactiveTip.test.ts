import { describe, expect, it } from "vitest";
import { proactiveTipText } from "./proactiveTip";

describe("proactiveTipText", () => {
  it("prompts Home Assistant setup when not connected", () => {
    expect(
      proactiveTipText({
        haReady: false,
        overdueCount: 0,
        todayAgendaCount: 0,
        commandHistoryLength: 0
      })
    ).toMatch(/connect Home Assistant/);
  });

  it("prioritizes overdue reminders", () => {
    expect(
      proactiveTipText({
        haReady: true,
        overdueCount: 2,
        todayAgendaCount: 5,
        commandHistoryLength: 3
      })
    ).toMatch(/overdue/);
  });

  it("falls back to command history hint when idle", () => {
    expect(
      proactiveTipText({
        haReady: true,
        overdueCount: 0,
        todayAgendaCount: 0,
        commandHistoryLength: 3
      })
    ).toMatch(/reuse command history/);
  });
});
