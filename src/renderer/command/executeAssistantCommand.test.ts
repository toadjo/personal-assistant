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
    setTaskFilter: vi.fn(),
    setDailyCommandCenterFilter: vi.fn(),
    setStatus: vi.fn(),
    refreshHomeAssistantEntities: vi.fn().mockResolvedValue(undefined),
    runDeviceToggle: vi.fn().mockResolvedValue(undefined),
    onReviewDay: vi.fn(),
    onQuickCapture: vi.fn(),
    ...overrides
  };
}

describe("executeAssistantCommand", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      assistantApi: {
        createNote: vi.fn().mockResolvedValue(undefined),
        createReminder: vi.fn().mockResolvedValue(undefined),
        createTask: vi.fn().mockResolvedValue(undefined),
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
    expect(deps.setStatus).toHaveBeenCalledWith(expect.stringContaining("make a note"));
    expect(result.mutated).toBe(false);
  });

  it("opens household window", async () => {
    const deps = baseDeps({ rawInput: "open household" });
    const result = await executeAssistantCommand(deps);
    expect(window.assistantApi.openHouseholdWindow).toHaveBeenCalled();
    expect(deps.setStatus).toHaveBeenCalledWith("Opened the Household window for you.");
    expect(result.mutated).toBe(false);
  });

  it("handles brief command", async () => {
    const deps = baseDeps({ rawInput: "brief" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setQuery).toHaveBeenCalledWith("");
    expect(deps.setStatus).toHaveBeenCalledWith(
      "Here's your focus brief for today. See the Daily Command Center for priorities."
    );
    expect(result.mutated).toBe(false);
  });

  it("handles today command", async () => {
    const deps = baseDeps({ rawInput: "today" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setQuery).toHaveBeenCalledWith("");
    expect(deps.setStatus).toHaveBeenCalledWith(
      "Here's your focus brief for today. See the Daily Command Center for priorities."
    );
    expect(result.mutated).toBe(false);
  });

  it("handles focus command", async () => {
    const deps = baseDeps({ rawInput: "focus" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setQuery).toHaveBeenCalledWith("");
    expect(deps.setStatus).toHaveBeenCalledWith(
      "Here's your focus brief for today. See the Daily Command Center for priorities."
    );
    expect(result.mutated).toBe(false);
  });

  it("handles what's next command", async () => {
    const deps = baseDeps({ rawInput: "what's next" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setQuery).toHaveBeenCalledWith("");
    expect(deps.setStatus).toHaveBeenCalledWith(
      "Here's your focus brief for today. See the Daily Command Center for priorities."
    );
    expect(result.mutated).toBe(false);
  });

  it("handles whats next command", async () => {
    const deps = baseDeps({ rawInput: "whats next" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setQuery).toHaveBeenCalledWith("");
    expect(deps.setStatus).toHaveBeenCalledWith(
      "Here's your focus brief for today. See the Daily Command Center for priorities."
    );
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
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/Tell me what to save/);
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

  it("toggle with multiple matching devices throws error", async () => {
    const deps = baseDeps({
      rawInput: "toggle lamp",
      haReady: true,
      devices: [
        { entityId: "light.kitchen_lamp", friendlyName: "Kitchen Lamp", state: "off" },
        { entityId: "light.desk_lamp", friendlyName: "Desk Lamp", state: "off" }
      ]
    });
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/I found multiple devices matching "lamp"/);
    expect(deps.runDeviceToggle).not.toHaveBeenCalled();
  });

  it("toggle with multiple matching devices lists up to 3 names", async () => {
    const deps = baseDeps({
      rawInput: "toggle lamp",
      haReady: true,
      devices: [
        { entityId: "light.kitchen_lamp", friendlyName: "Kitchen Lamp", state: "off" },
        { entityId: "light.desk_lamp", friendlyName: "Desk Lamp", state: "off" },
        { entityId: "light.hall_lamp", friendlyName: "Hall Lamp", state: "off" },
        { entityId: "light.bedroom_lamp", friendlyName: "Bedroom Lamp", state: "off" }
      ]
    });
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/Kitchen Lamp, Desk Lamp, Hall Lamp/);
    expect(deps.runDeviceToggle).not.toHaveBeenCalled();
  });

  it("toggle matches by friendlyName", async () => {
    const deps = baseDeps({
      rawInput: "toggle Kitchen Light",
      haReady: true,
      devices: [{ entityId: "light.kitchen", friendlyName: "Kitchen Light", state: "off" }]
    });
    const result = await executeAssistantCommand(deps);
    expect(deps.runDeviceToggle).toHaveBeenCalledWith("light.kitchen", "Kitchen Light");
    expect(result.mutated).toBe(true);
  });

  it("toggle matches by entityId", async () => {
    const deps = baseDeps({
      rawInput: "toggle light.kitchen",
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

  it("handles catch me up command", async () => {
    const deps = baseDeps({ rawInput: "catch me up" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setQuery).toHaveBeenCalledWith("");
    expect(deps.setStatus).toHaveBeenCalledWith(
      "Here's what changed while you were away. See the Daily Command Center for details."
    );
    expect(result.mutated).toBe(false);
  });

  it("handles review day command", async () => {
    const onReviewDay = vi.fn();
    const deps = baseDeps({ rawInput: "review day", onReviewDay });
    const result = await executeAssistantCommand(deps);
    expect(onReviewDay).toHaveBeenCalled();
    expect(deps.setStatus).toHaveBeenCalledWith("Opening your end-of-day review.");
    expect(result.mutated).toBe(false);
  });

  it("handles capture command", async () => {
    const onQuickCapture = vi.fn();
    const deps = baseDeps({ rawInput: "capture", onQuickCapture });
    const result = await executeAssistantCommand(deps);
    expect(onQuickCapture).toHaveBeenCalledWith("inbox", "");
    expect(deps.setStatus).toHaveBeenCalledWith("Quick capture opened.");
    expect(result.mutated).toBe(false);
  });

  it("handles quick capture command", async () => {
    const onQuickCapture = vi.fn();
    const deps = baseDeps({ rawInput: "quick capture", onQuickCapture });
    const result = await executeAssistantCommand(deps);
    expect(onQuickCapture).toHaveBeenCalledWith("inbox", "");
    expect(deps.setStatus).toHaveBeenCalledWith("Quick capture opened.");
    expect(result.mutated).toBe(false);
  });

  it("handles capture note command", async () => {
    const onQuickCapture = vi.fn();
    const deps = baseDeps({ rawInput: "capture note buy milk", onQuickCapture });
    const result = await executeAssistantCommand(deps);
    expect(onQuickCapture).toHaveBeenCalledWith("note", "buy milk");
    expect(deps.setStatus).toHaveBeenCalledWith("Quick capture opened.");
    expect(result.mutated).toBe(false);
  });

  it("handles capture task command", async () => {
    const onQuickCapture = vi.fn();
    const deps = baseDeps({ rawInput: "capture task pay rent", onQuickCapture });
    const result = await executeAssistantCommand(deps);
    expect(onQuickCapture).toHaveBeenCalledWith("task", "pay rent");
    expect(deps.setStatus).toHaveBeenCalledWith("Quick capture opened.");
    expect(result.mutated).toBe(false);
  });

  it("handles capture reminder command", async () => {
    const onQuickCapture = vi.fn();
    const deps = baseDeps({ rawInput: "capture reminder call Alex", onQuickCapture });
    const result = await executeAssistantCommand(deps);
    expect(onQuickCapture).toHaveBeenCalledWith("reminder", "call Alex");
    expect(deps.setStatus).toHaveBeenCalledWith("Quick capture opened.");
    expect(result.mutated).toBe(false);
  });

  it("handles capture with text command", async () => {
    const onQuickCapture = vi.fn();
    const deps = baseDeps({ rawInput: "capture buy groceries", onQuickCapture });
    const result = await executeAssistantCommand(deps);
    expect(onQuickCapture).toHaveBeenCalledWith("inbox", "buy groceries");
    expect(deps.setStatus).toHaveBeenCalledWith("Quick capture opened.");
    expect(result.mutated).toBe(false);
  });

  it("help text lists local commands before Home Assistant", async () => {
    const deps = baseDeps({ rawInput: "help" });
    await executeAssistantCommand(deps);
    const status = vi.mocked(deps.setStatus).mock.calls[0]?.[0] ?? "";
    expect(status).toContain("add task");
    expect(status).toContain("what's next");
    expect(status).toContain("catch me up");
    expect(status).toContain("review day");
    expect(status).toContain("capture");
    expect(status).toContain("After you link Home Assistant");
  });

  it("help text contains no mojibake ellipsis", async () => {
    const deps = baseDeps({ rawInput: "help" });
    await executeAssistantCommand(deps);
    const status = vi.mocked(deps.setStatus).mock.calls[0]?.[0] ?? "";
    expect(status).not.toContain("\u2026");
    expect(status).not.toContain("\u00B7");
  });

  it("note success status uses plain ASCII punctuation", async () => {
    const deps = baseDeps({ rawInput: "new note buy eggs" });
    await executeAssistantCommand(deps);
    const status = vi.mocked(deps.setStatus).mock.calls[0]?.[0] ?? "";
    expect(status).toContain("Got it - memo saved.");
    expect(status).not.toContain("\u2014");
  });

  it("reminder success status uses plain ASCII punctuation", async () => {
    const deps = baseDeps({ rawInput: "remind call mom in 15m" });
    await executeAssistantCommand(deps);
    const status = vi.mocked(deps.setStatus).mock.calls[0]?.[0] ?? "";
    expect(status).toContain("All set - reminder for");
    expect(status).not.toContain("\u2014");
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

  it("handles make a note alias", async () => {
    const deps = baseDeps({ rawInput: "make a note buy milk" });
    const result = await executeAssistantCommand(deps);
    expect(window.assistantApi.createNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: "buy milk", content: "buy milk" })
    );
    expect(result.mutated).toBe(true);
  });

  it("handles add note alias", async () => {
    const deps = baseDeps({ rawInput: "add note buy milk" });
    const result = await executeAssistantCommand(deps);
    expect(window.assistantApi.createNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: "buy milk", content: "buy milk" })
    );
    expect(result.mutated).toBe(true);
  });

  it("handles remember alias", async () => {
    const deps = baseDeps({ rawInput: "remember buy milk" });
    const result = await executeAssistantCommand(deps);
    expect(window.assistantApi.createNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: "buy milk", content: "buy milk" })
    );
    expect(result.mutated).toBe(true);
  });

  it("handles remind me to alias", async () => {
    const deps = baseDeps({ rawInput: "remind me to call mom in 15m" });
    const result = await executeAssistantCommand(deps);
    expect(window.assistantApi.createReminder).toHaveBeenCalled();
    expect(result.mutated).toBe(true);
  });

  it("handles remind me to with hours", async () => {
    const deps = baseDeps({ rawInput: "remind me to call mom in 2h" });
    const result = await executeAssistantCommand(deps);
    expect(window.assistantApi.createReminder).toHaveBeenCalled();
    expect(result.mutated).toBe(true);
  });

  it("handles show reminders alias", async () => {
    const deps = baseDeps({ rawInput: "show reminders" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setReminderFilter).toHaveBeenCalledWith("pending");
    expect(result.mutated).toBe(false);
  });

  it("handles show notes alias", async () => {
    const deps = baseDeps({ rawInput: "show notes" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setQuery).toHaveBeenCalledWith("");
    expect(result.mutated).toBe(false);
  });

  it("handles find alias", async () => {
    const deps = baseDeps({ rawInput: "find invoice" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setQuery).toHaveBeenCalledWith("invoice");
    expect(result.mutated).toBe(false);
  });

  it("handles open home alias", async () => {
    const deps = baseDeps({ rawInput: "open home" });
    const result = await executeAssistantCommand(deps);
    expect(window.assistantApi.openHouseholdWindow).toHaveBeenCalled();
    expect(result.mutated).toBe(false);
  });

  it("rejects empty make a note", async () => {
    const deps = baseDeps({ rawInput: "make a note" });
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/Tell me what to save/);
  });

  it("rejects empty add note", async () => {
    const deps = baseDeps({ rawInput: "add note" });
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/Tell me what to save/);
  });

  it("rejects empty remember", async () => {
    const deps = baseDeps({ rawInput: "remember" });
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/Tell me what to save/);
  });

  it("rejects empty find", async () => {
    const deps = baseDeps({ rawInput: "find" });
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/Tell me what to find/);
  });

  it("rejects bad remind me to format", async () => {
    const deps = baseDeps({ rawInput: "remind me to call mom" });
    await expect(executeAssistantCommand(deps)).rejects.toThrow(/Try: remind me to call mom in 15m/);
  });

  it("note alias still works", async () => {
    const deps = baseDeps({ rawInput: "note buy milk" });
    const result = await executeAssistantCommand(deps);
    expect(window.assistantApi.createNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: "buy milk", content: "buy milk" })
    );
    expect(result.mutated).toBe(true);
  });

  it("new note alias still works", async () => {
    const deps = baseDeps({ rawInput: "new note buy milk" });
    const result = await executeAssistantCommand(deps);
    expect(window.assistantApi.createNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: "buy milk", content: "buy milk" })
    );
    expect(result.mutated).toBe(true);
  });

  it("list reminders alias still works", async () => {
    const deps = baseDeps({ rawInput: "list reminders" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setReminderFilter).toHaveBeenCalledWith("pending");
    expect(result.mutated).toBe(false);
  });

  it("creates a task with add task alias", async () => {
    const deps = baseDeps({ rawInput: "add task plan groceries" });
    const result = await executeAssistantCommand(deps);
    expect(window.assistantApi.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "plan groceries", recurrence: "none" })
    );
    expect(result.mutated).toBe(true);
  });

  it("show tasks applies open task filter", async () => {
    const deps = baseDeps({ rawInput: "show tasks" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setTaskFilter).toHaveBeenCalledWith("open");
    expect(result.mutated).toBe(false);
  });

  it("plan today sets DCC filter to personal", async () => {
    const deps = baseDeps({ rawInput: "plan today" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setDailyCommandCenterFilter).toHaveBeenCalledWith("personal");
    expect(result.mutated).toBe(false);
  });

  it("show personal sets DCC filter to personal", async () => {
    const deps = baseDeps({ rawInput: "show personal" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setDailyCommandCenterFilter).toHaveBeenCalledWith("personal");
    expect(result.mutated).toBe(false);
  });

  it("personal sets DCC filter to personal", async () => {
    const deps = baseDeps({ rawInput: "personal" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setDailyCommandCenterFilter).toHaveBeenCalledWith("personal");
    expect(result.mutated).toBe(false);
  });

  it("show team sets DCC filter to team", async () => {
    const deps = baseDeps({ rawInput: "show team" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setDailyCommandCenterFilter).toHaveBeenCalledWith("team");
    expect(result.mutated).toBe(false);
  });

  it("team sets DCC filter to team", async () => {
    const deps = baseDeps({ rawInput: "team" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setDailyCommandCenterFilter).toHaveBeenCalledWith("team");
    expect(result.mutated).toBe(false);
  });

  it("show household sets DCC filter to household", async () => {
    const deps = baseDeps({ rawInput: "show household" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setDailyCommandCenterFilter).toHaveBeenCalledWith("household");
    expect(result.mutated).toBe(false);
  });

  it("show all sets DCC filter to all", async () => {
    const deps = baseDeps({ rawInput: "show all" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setDailyCommandCenterFilter).toHaveBeenCalledWith("all");
    expect(result.mutated).toBe(false);
  });

  it("all sets DCC filter to all", async () => {
    const deps = baseDeps({ rawInput: "all" });
    const result = await executeAssistantCommand(deps);
    expect(deps.setDailyCommandCenterFilter).toHaveBeenCalledWith("all");
    expect(result.mutated).toBe(false);
  });
});
