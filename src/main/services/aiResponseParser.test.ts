import { describe, expect, it } from "vitest";
import { parseAiResponse } from "./aiResponseParser";

describe("parseAiResponse", () => {
  it("parses plain text response", () => {
    const result = parseAiResponse("Hello, how can I help you?");
    expect(result.reply).toBe("Hello, how can I help you?");
    expect(result.actionDraft).toBeUndefined();
  });

  it("parses JSON response with reply only", () => {
    const result = parseAiResponse('{"reply": "Hello!"}');
    expect(result.reply).toBe("Hello!");
    expect(result.actionDraft).toBeUndefined();
  });

  it("parses JSON response with reply and valid actionDraft", () => {
    const result = parseAiResponse(
      '{"reply": "I can help with that", "actionDraft": {"type": "create_note", "title": "Test note", "content": "Test content"}}'
    );
    expect(result.reply).toBe("I can help with that");
    expect(result.actionDraft).toEqual({
      type: "create_note",
      title: "Test note",
      content: "Test content"
    });
  });

  it("parses fenced JSON response", () => {
    const result = parseAiResponse(
      '```json\n{"reply": "Hello from fenced code", "actionDraft": {"type": "create_task", "title": "Task title"}}\n```'
    );
    expect(result.reply).toBe("Hello from fenced code");
    expect(result.actionDraft).toEqual({
      type: "create_task",
      title: "Task title"
    });
  });

  it("parses fenced JSON without json marker", () => {
    const result = parseAiResponse(
      '```\n{"reply": "Hello", "actionDraft": {"type": "create_reminder", "text": "Buy milk", "dueAt": "2024-01-01T00:00:00Z"}}\n```'
    );
    expect(result.reply).toBe("Hello");
    expect(result.actionDraft).toEqual({
      type: "create_reminder",
      text: "Buy milk",
      dueAt: "2024-01-01T00:00:00Z"
    });
  });

  it("ignores invalid actionDraft and returns reply only", () => {
    const result = parseAiResponse('{"reply": "Hello", "actionDraft": {"type": "invalid"}}');
    expect(result.reply).toBe("Hello");
    expect(result.actionDraft).toBeUndefined();
  });

  it("ignores actionDraft with missing required fields", () => {
    const result = parseAiResponse('{"reply": "Hello", "actionDraft": {"type": "create_note"}}');
    expect(result.reply).toBe("Hello");
    expect(result.actionDraft).toBeUndefined();
  });

  it("ignores actionDraft with wrong type", () => {
    const result = parseAiResponse('{"reply": "Hello", "actionDraft": "not an object"}');
    expect(result.reply).toBe("Hello");
    expect(result.actionDraft).toBeUndefined();
  });

  it("parses create_task with all optional fields", () => {
    const result = parseAiResponse(
      '{"reply": "Task created", "actionDraft": {"type": "create_task", "title": "My task", "notes": "Some notes", "dueAt": "2024-12-31T23:59:59Z", "priority": "high"}}'
    );
    expect(result.reply).toBe("Task created");
    expect(result.actionDraft).toEqual({
      type: "create_task",
      title: "My task",
      notes: "Some notes",
      dueAt: "2024-12-31T23:59:59Z",
      priority: "high"
    });
  });

  it("parses toggle_device with friendlyName", () => {
    const result = parseAiResponse(
      '{"reply": "Device toggled", "actionDraft": {"type": "toggle_device", "entityId": "light.living_room", "friendlyName": "Living Room Light"}}'
    );
    expect(result.reply).toBe("Device toggled");
    expect(result.actionDraft).toEqual({
      type: "toggle_device",
      entityId: "light.living_room",
      friendlyName: "Living Room Light"
    });
  });

  it("treats malformed JSON as plain text", () => {
    const result = parseAiResponse('{"invalid": json}');
    expect(result.reply).toBe('{"invalid": json}');
    expect(result.actionDraft).toBeUndefined();
  });

  it("treats non-object JSON as plain text", () => {
    const result = parseAiResponse('["array", "of", "strings"]');
    expect(result.reply).toBe('["array", "of", "strings"]');
    expect(result.actionDraft).toBeUndefined();
  });

  it("treats JSON without reply field as plain text", () => {
    const result = parseAiResponse('{"other": "field"}');
    expect(result.reply).toBe('{"other": "field"}');
    expect(result.actionDraft).toBeUndefined();
  });

  it("trims whitespace from response", () => {
    const result = parseAiResponse('  {"reply": "Hello"}  ');
    expect(result.reply).toBe("Hello");
  });

  it("handles empty string", () => {
    const result = parseAiResponse("");
    expect(result.reply).toBe("");
    expect(result.actionDraft).toBeUndefined();
  });

  it("validates create_reminder requires dueAt", () => {
    const result = parseAiResponse(
      '{"reply": "Hello", "actionDraft": {"type": "create_reminder", "text": "Buy milk"}}'
    );
    expect(result.reply).toBe("Hello");
    expect(result.actionDraft).toBeUndefined();
  });

  it("validates priority enum values", () => {
    const validResult = parseAiResponse(
      '{"reply": "OK", "actionDraft": {"type": "create_task", "title": "Task", "priority": "low"}}'
    );
    if (validResult.actionDraft?.type === "create_task") {
      expect(validResult.actionDraft.priority).toBe("low");
    }

    const invalidResult = parseAiResponse(
      '{"reply": "OK", "actionDraft": {"type": "create_task", "title": "Task", "priority": "urgent"}}'
    );
    if (invalidResult.actionDraft?.type === "create_task") {
      expect(invalidResult.actionDraft.priority).toBeUndefined();
    }
  });
});
