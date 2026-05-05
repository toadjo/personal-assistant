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
        createReminder: vi.fn().mockResolvedValue(undefined),
        openHouseholdWindow: vi.fn().mockResolvedValue(true),
        focusDeskWindow: vi.fn().mockResolvedValue(true),
        getAssistantSettings: vi.fn().mockResolvedValue({
          name: "Assistant",
          isConfigured: false,
          userPreferredName: "",
          userPreferredNameIsSet: false
        }),
        setUserPreferredName: vi.fn().mockResolvedValue({
          name: "Assistant",
          isConfigured: false,
          userPreferredName: "",
          userPreferredNameIsSet: false
        })
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("no-ops on blank input", async () => {
    const deps = baseDeps({ rawInput: "   " });
    const result = await executeAssistantCommand(deps);
    expect(deps.setStatus).not.toHaveBeenCalled();
    expect(result.mutated).toBe(false);
  });

  it("handles help", async () => {
    const deps = baseDeps({ rawInput: "help" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setStatus).toHaveBeenCalledWith(expect.stringContaining("new note"));
    expect(result.mutated).toBe(false);
  });

  it("opens household window", async () => {
    const deps = baseDeps({ rawInput: "open household" });
    const result = await executeAssistantCommand(deps);
    expect(window.assistantApi.openHouseholdWindow).toHaveBeenCalled();
    expect(deps.setStatus).toHaveBeenCalledWith("Opened the Household window for you.");
    expect(result.mutated).toBe(false);
  });

  it("lists reminders via alias", async () => {
    const deps = baseDeps({ rawInput: "today" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setReminderFilter).toHaveBeenCalledWith("pending");
    expect(result.mutated).toBe(false);
  });

  it("search updates query", async () => {
    const deps = baseDeps({ rawInput: "search milk" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setQuery).toHaveBeenCalledWith("milk");
    expect(result.mutated).toBe(false);
  });

  it("creates a note", async () => {
    const deps = baseDeps({ rawInput: "new note buy eggs" });
    const result = await executeAssistantCommand(deps);
    expect(window.assistantApi.createNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: "buy eggs", content: "buy eggs" })
    );
    expect(result.mutated).toBe(true);
  });

  it("rejects empty new note", async () => {
    const deps = baseDeps({ rawInput: "new note" });
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/Tell me what to write/);
  });

  it("toggle requires Home Assistant", async () => {
    const deps = baseDeps({
      rawInput: "toggle kitchen",
      haReady: false,
      devices: [{ entityId: "light.kitchen", friendlyName: "Kitchen", state: "off" }]
    });
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/Home Assistant is not linked/);
  });

  it("toggle resolves device and delegates", async () => {
    const deps = baseDeps({
      rawInput: "toggle kitchen",
      haReady: true,
      devices: [{ entityId: "light.kitchen", friendlyName: "Kitchen Light", state: "off" }]
    });
    const result = await executeAssistantCommand(deps);
    expect(deps.runDeviceToggle).toHaveBeenCalledWith("light.kitchen", "Kitchen Light");
    expect(result.mutated).toBe(true);
  });

  it("refresh devices calls refresh when HA ready", async () => {
    const deps = baseDeps({ rawInput: "refresh devices", haReady: true });
    const result = await executeAssistantCommand(deps);
    expect(deps.refreshHomeAssistantEntities).toHaveBeenCalled();
    expect(result.mutated).toBe(true);
  });

  it("unknown command throws", async () => {
    const deps = baseDeps({ rawInput: "nope" });
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/I do not recognize/);
  });

  it("reminder command mutates", async () => {
    const deps = baseDeps({ rawInput: "remind call mom in 15m" });
    const result = await executeAssistantCommand(deps);
    expect(window.assistantApi.createReminder).toHaveBeenCalled();
    expect(result.mutated).toBe(true);
  });
});
