import { describe, it, expect } from "vitest";
import { buildSearchIndex, search } from "./searchEngine";
import type { Note, Task, Reminder, AutomationRule } from "../../../shared/types";
import type { HaDeviceRow } from "../../types";

function makeNote(id: string, title: string, content = ""): Note {
  return { id, title, content, tags: [], pinned: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
}

function makeTask(id: string, title: string, status: "open" | "done" = "open"): Task {
  return { id, title, status, notes: "", dueAt: null, priority: "normal", recurrence: "none", notifyChannel: "desktop", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", lastCompletedAt: null };
}

function makeReminder(id: string, text: string, status: "pending" | "done" = "pending"): Reminder {
  return { id, text, dueAt: "2026-01-01T00:00:00Z", recurrence: "none", status, notifyChannel: "desktop" };
}

function makeRule(id: string, name: string): AutomationRule {
  return { id, name, triggerType: "time", triggerConfig: { at: "08:00" }, actionType: "localReminder", actionConfig: { text: "" }, enabled: true };
}

function makeDevice(entityId: string, friendlyName: string, state = "off"): HaDeviceRow {
  return { entityId, friendlyName, state };
}

describe("searchEngine", () => {
  it("builds an index from all entity types", () => {
    const index = buildSearchIndex(
      [makeNote("n1", "Meeting notes")],
      [makeTask("t1", "Pay rent")],
      [makeReminder("r1", "Standup")],
      [makeRule("a1", "Morning routine")],
      [makeDevice("light.living", "Living room light")]
    );

    expect(index.length).toBe(7); // 5 entities + 2 settings
    expect(index.some((r) => r.id === "note:n1")).toBe(true);
    expect(index.some((r) => r.id === "task:t1")).toBe(true);
    expect(index.some((r) => r.id === "reminder:r1")).toBe(true);
    expect(index.some((r) => r.id === "automation:a1")).toBe(true);
    expect(index.some((r) => r.id === "device:light.living")).toBe(true);
  });

  it("returns all results when query is empty (capped at 12)", () => {
    const index = buildSearchIndex([], [], [], [], []);
    const results = search("", index);
    expect(results.length).toBe(2); // settings only
  });

  it("ranks title matches highest", () => {
    const index = buildSearchIndex(
      [makeNote("n1", "Meeting notes", "about rent")],
      [makeTask("t1", "Pay rent")],
      [],
      [],
      []
    );
    const results = search("rent", index);
    expect(results[0]!.id).toBe("task:t1");
    expect(results[1]!.id).toBe("note:n1");
  });

  it("matches partial words case-insensitively", () => {
    const index = buildSearchIndex(
      [makeNote("n1", "Meeting Notes")],
      [],
      [],
      [],
      []
    );
    const results = search("meet", index);
    expect(results.length).toBe(1);
    expect(results[0]!.id).toBe("note:n1");
  });

  it("returns empty when nothing matches", () => {
    const index = buildSearchIndex([], [], [], [], []);
    const results = search("xyz", index);
    expect(results.length).toBe(0);
  });

  it("limits results to 12", () => {
    const notes = Array.from({ length: 20 }, (_, i) => makeNote(`n${i}`, `Note ${i}`));
    const index = buildSearchIndex(notes, [], [], [], []);
    const results = search("note", index);
    expect(results.length).toBe(12);
  });

  it("includes static settings entries", () => {
    const index = buildSearchIndex([], [], [], [], []);
    expect(index.some((r) => r.id === "setting:theme" && r.title === "Appearance")).toBe(true);
    expect(index.some((r) => r.id === "setting:density" && r.title === "Layout")).toBe(true);
  });
});
