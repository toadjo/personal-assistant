import { describe, expect, it } from "vitest";
import { getLocalToolRegistry } from "./tools";

describe("getLocalToolRegistry", () => {
  it("returns a tool registry with version", () => {
    const registry = getLocalToolRegistry();
    expect(registry.version).toBe("1.0.0");
  });

  it("includes create_note tool", () => {
    const registry = getLocalToolRegistry();
    const noteTool = registry.tools.find((t) => t.id === "create_note");
    expect(noteTool).toBeDefined();
    expect(noteTool?.name).toBe("Create Note");
    expect(noteTool?.category).toBe("notes");
  });

  it("includes create_task tool", () => {
    const registry = getLocalToolRegistry();
    const taskTool = registry.tools.find((t) => t.id === "create_task");
    expect(taskTool).toBeDefined();
    expect(taskTool?.name).toBe("Create Task");
    expect(taskTool?.category).toBe("tasks");
  });

  it("includes create_reminder tool", () => {
    const registry = getLocalToolRegistry();
    const reminderTool = registry.tools.find((t) => t.id === "create_reminder");
    expect(reminderTool).toBeDefined();
    expect(reminderTool?.name).toBe("Create Reminder");
    expect(reminderTool?.category).toBe("reminders");
  });

  it("includes toggle_device tool", () => {
    const registry = getLocalToolRegistry();
    const deviceTool = registry.tools.find((t) => t.id === "toggle_device");
    expect(deviceTool).toBeDefined();
    expect(deviceTool?.name).toBe("Toggle Device");
    expect(deviceTool?.category).toBe("devices");
  });

  it("tools have required parameters defined", () => {
    const registry = getLocalToolRegistry();
    const noteTool = registry.tools.find((t) => t.id === "create_note");
    expect(noteTool?.parameters).toBeDefined();
    expect(noteTool?.parameters?.length).toBeGreaterThan(0);
    expect(noteTool?.parameters?.[0]?.required).toBe(true);
  });
});
