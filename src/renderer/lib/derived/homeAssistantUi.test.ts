import { describe, expect, it } from "vitest";
import { homeAssistantUi } from "./homeAssistantUi";

describe("homeAssistantUi", () => {
  it("reports missing URL", () => {
    const ui = homeAssistantUi("", "", false);
    expect(ui.hasHaUrl).toBe(false);
    expect(ui.haReady).toBe(false);
    expect(ui.haStatusText).toMatch(/URL missing/);
  });

  it("requires token when none stored and none entered", () => {
    const ui = homeAssistantUi("http://ha.local:8123", "", false);
    expect(ui.hasHaUrl).toBe(true);
    expect(ui.haReady).toBe(false);
    expect(ui.canSaveHa).toBe(false);
    expect(ui.haStatusText).toMatch(/Token missing/);
  });

  it("is ready when URL and stored token exist", () => {
    const ui = homeAssistantUi("http://ha.local:8123", "", true);
    expect(ui.haReady).toBe(true);
    expect(ui.canSaveHa).toBe(true);
  });
});
