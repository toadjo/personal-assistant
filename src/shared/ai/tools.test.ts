import { describe, expect, it } from "vitest";
import {
  getLocalToolRegistry,
  toJsonSchema,
  toOpenAiTool,
  toAnthropicTool,
  toolCallToActionDraft
} from "./tools";

describe("getLocalToolRegistry", () => {
  it("returns 4 tools with stable IDs", () => {
    const registry = getLocalToolRegistry();
    expect(registry.tools).toHaveLength(4);
    expect(registry.tools.map((t) => t.id).sort()).toEqual([
      "create_note",
      "create_reminder",
      "create_task",
      "toggle_device"
    ]);
  });

  it("includes required parameters for each tool", () => {
    const registry = getLocalToolRegistry();
    for (const tool of registry.tools) {
      const required = (tool.parameters ?? []).filter((p) => p.required);
      expect(required.length).toBeGreaterThan(0);
    }
  });

  it("create_task has enum for priority", () => {
    const registry = getLocalToolRegistry();
    const task = registry.tools.find((t) => t.id === "create_task");
    expect(task).toBeDefined();
    const priority = task!.parameters!.find((p) => p.name === "priority");
    expect(priority).toBeDefined();
    expect(priority!.type).toBe("enum");
    expect(priority!.enum).toEqual(["low", "medium", "high"]);
  });
});

describe("toJsonSchema", () => {
  it("converts parameters to JSON schema properties", () => {
    const registry = getLocalToolRegistry();
    const note = registry.tools.find((t) => t.id === "create_note")!;
    const schema = toJsonSchema(note);
    expect(schema.type).toBe("object");
    expect(schema.properties.title).toEqual({
      type: "string",
      description: "Note title (required)"
    });
    expect(schema.properties.content).toEqual({
      type: "string",
      description: "Note content (optional)"
    });
    expect(schema.required).toEqual(["title"]);
  });

  it("maps enum type to string with enum values", () => {
    const registry = getLocalToolRegistry();
    const task = registry.tools.find((t) => t.id === "create_task")!;
    const schema = toJsonSchema(task);
    expect(schema.properties.priority).toEqual({
      type: "string",
      description: "Priority level (optional, defaults to normal)",
      enum: ["low", "medium", "high"]
    });
  });

  it("includes all required params in required array", () => {
    const registry = getLocalToolRegistry();
    const reminder = registry.tools.find((t) => t.id === "create_reminder")!;
    const schema = toJsonSchema(reminder);
    expect(schema.required).toEqual(["text", "dueAt"]);
  });
});

describe("toOpenAiTool", () => {
  it("wraps tool in OpenAI function-calling format", () => {
    const registry = getLocalToolRegistry();
    const note = registry.tools.find((t) => t.id === "create_note")!;
    const def = toOpenAiTool(note);
    expect(def.type).toBe("function");
    expect(def.function.name).toBe("create_note");
    expect(def.function.description).toBe(note.description);
    expect(def.function.parameters.type).toBe("object");
    expect(def.function.parameters.properties.title!.type).toBe("string");
  });
});

describe("toAnthropicTool", () => {
  it("wraps tool in Anthropic tool_use format", () => {
    const registry = getLocalToolRegistry();
    const reminder = registry.tools.find((t) => t.id === "create_reminder")!;
    const def = toAnthropicTool(reminder);
    expect(def.name).toBe("create_reminder");
    expect(def.description).toBe(reminder.description);
    expect(def.input_schema.type).toBe("object");
    expect(def.input_schema.required).toEqual(["text", "dueAt"]);
  });
});

describe("toolCallToActionDraft", () => {
  it("converts create_note tool call", () => {
    const draft = toolCallToActionDraft("create_note", {
      title: "My note",
      content: "Some content"
    });
    expect(draft).toEqual({
      type: "create_note",
      title: "My note",
      content: "Some content"
    });
  });

  it("converts create_task tool call with all fields", () => {
    const draft = toolCallToActionDraft("create_task", {
      title: "My task",
      notes: "Task notes",
      dueAt: "2024-12-31T23:59:59Z",
      priority: "high"
    });
    expect(draft).toEqual({
      type: "create_task",
      title: "My task",
      notes: "Task notes",
      dueAt: "2024-12-31T23:59:59Z",
      priority: "high"
    });
  });

  it("converts create_reminder tool call", () => {
    const draft = toolCallToActionDraft("create_reminder", {
      text: "Buy milk",
      dueAt: "2024-12-31T09:00:00Z"
    });
    expect(draft).toEqual({
      type: "create_reminder",
      text: "Buy milk",
      dueAt: "2024-12-31T09:00:00Z"
    });
  });

  it("converts toggle_device tool call", () => {
    const draft = toolCallToActionDraft("toggle_device", {
      entityId: "light.living_room",
      friendlyName: "Living Room Light"
    });
    expect(draft).toEqual({
      type: "toggle_device",
      entityId: "light.living_room",
      friendlyName: "Living Room Light"
    });
  });

  it("returns undefined for unknown tool ID", () => {
    expect(toolCallToActionDraft("unknown_tool", { foo: "bar" })).toBeUndefined();
  });

  it("returns undefined when required fields are missing", () => {
    expect(toolCallToActionDraft("create_note", {})).toBeUndefined();
    expect(toolCallToActionDraft("create_reminder", { text: "Buy milk" })).toBeUndefined();
    expect(toolCallToActionDraft("create_reminder", { dueAt: "2024-01-01T00:00:00Z" })).toBeUndefined();
    expect(toolCallToActionDraft("toggle_device", {})).toBeUndefined();
  });

  it("returns undefined when required fields are wrong type", () => {
    expect(toolCallToActionDraft("create_note", { title: 123 })).toBeUndefined();
    expect(toolCallToActionDraft("create_reminder", { text: "Buy milk", dueAt: 123 })).toBeUndefined();
  });

  it("ignores invalid priority enum value", () => {
    const draft = toolCallToActionDraft("create_task", {
      title: "My task",
      priority: "urgent"
    });
    expect(draft).toBeDefined();
    if (draft?.type === "create_task") {
      expect(draft.priority).toBeUndefined();
    }
  });

  it("handles missing optional fields gracefully", () => {
    const draft = toolCallToActionDraft("create_task", { title: "Minimal task" });
    expect(draft).toEqual({
      type: "create_task",
      title: "Minimal task",
      notes: undefined,
      dueAt: undefined,
      priority: undefined
    });
  });
});
