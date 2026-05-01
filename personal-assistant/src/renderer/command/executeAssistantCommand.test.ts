import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { executeAssistantCommand } from "./executeAssistantCommand";
import type { HaDeviceRow } from "../types";

function baseDeps(overrides: Partial<Parameters<typeof executeAssistantCommand>[0]> = {}) {
  return {
    rawInput: "help",
    devices: [] as HaDeviceRow[],
    haReady: false,
    setQuery: vi.fn(),
    setReminderFilter: vi.fn(),
    setStatus: vi.fn(),
    refreshHomeAssistantEntities: vi.fn().mockResolvedValue(undefined),
    runDeviceToggle: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe("executeAssistantCommand", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      assistantApi: {
        createNote: vi.fn().mockResolvedValue(undefined),
        createReminder: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("no-ops on blank input", async () => {
    const deps = baseDeps({ rawInput: "   " });
    await executeAssistantCommand(deps);
    expect(deps.setStatus).not.toHaveBeenCalled();
  });

  it("handles help", async () => {
    const deps = baseDeps({ rawInput: "help" });
    await executeAssistantCommand(deps);
    expect(deps.setStatus).toHaveBeenCalledWith(expect.stringContaining("new note"));
  });

  it("lists reminders via alias", async () => {
    const deps = baseDeps({ rawInput: "today" });
    await executeAssistantCommand(deps);
    expect(deps.setReminderFilter).toHaveBeenCalledWith("pending");
  });

  it("search updates query", async () => {
    const deps = baseDeps({ rawInput: "search milk" });
    await executeAssistantCommand(deps);
    expect(deps.setQuery).toHaveBeenCalledWith("milk");
  });

  it("creates a note", async () => {
    const deps = baseDeps({ rawInput: "new note buy eggs" });
    await executeAssistantCommand(deps);
    expect(window.assistantApi.createNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: "buy eggs", content: "buy eggs" })
    );
  });

  it("rejects empty new note", async () => {
    const deps = baseDeps({ rawInput: "new note" });
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/Write note text/);
  });

  it("toggle requires Home Assistant", async () => {
    const deps = baseDeps({
      rawInput: "toggle kitchen",
      haReady: false,
      devices: [{ entityId: "light.kitchen", friendlyName: "Kitchen", state: "off" }]
    });
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/Home Assistant is not configured/);
  });

  it("toggle resolves device and delegates", async () => {
    const deps = baseDeps({
      rawInput: "toggle kitchen",
      haReady: true,
      devices: [{ entityId: "light.kitchen", friendlyName: "Kitchen Light", state: "off" }]
    });
    await executeAssistantCommand(deps);
    expect(deps.runDeviceToggle).toHaveBeenCalledWith("light.kitchen", "Kitchen Light");
  });

  it("refresh devices calls refresh when HA ready", async () => {
    const deps = baseDeps({ rawInput: "refresh devices", haReady: true });
    await executeAssistantCommand(deps);
    expect(deps.refreshHomeAssistantEntities).toHaveBeenCalled();
  });

  it("unknown command throws", async () => {
    const deps = baseDeps({ rawInput: "nope" });
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/Unknown command/);
  });
});
