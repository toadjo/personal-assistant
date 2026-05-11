import { describe, expect, it } from "vitest";
import { formatAutomationActionLabel } from "./formatActionLabel";

describe("formatAutomationActionLabel", () => {
  it("formats localReminder with text", () => {
    expect(formatAutomationActionLabel("localReminder", '{"text":"Stretch"}')).toBe("Create reminder: Stretch");
  });

  it("formats localReminder without text", () => {
    expect(formatAutomationActionLabel("localReminder", '{}')).toBe("Create reminder");
  });

  it("formats localTask with title", () => {
    expect(formatAutomationActionLabel("localTask", '{"title":"Morning review"}')).toBe("Create task: Morning review");
  });

  it("formats localTask without title", () => {
    expect(formatAutomationActionLabel("localTask", '{}')).toBe("Create task");
  });

  it("formats haToggle with entityId", () => {
    expect(formatAutomationActionLabel("haToggle", '{"entityId":"switch.kitchen"}')).toBe("Toggle device: switch.kitchen");
  });

  it("formats haToggle without entityId", () => {
    expect(formatAutomationActionLabel("haToggle", '{}')).toBe("Toggle device");
  });

  it("falls back for unknown actionType", () => {
    expect(formatAutomationActionLabel("unknown", '{}')).toBe("Run automation action");
  });

  it("falls back safely for malformed actionConfig JSON", () => {
    expect(formatAutomationActionLabel("localReminder", "not-json")).toBe("Create reminder");
  });

  it("falls back safely for null actionConfig", () => {
    expect(formatAutomationActionLabel("haToggle", null)).toBe("Toggle device");
  });
});
