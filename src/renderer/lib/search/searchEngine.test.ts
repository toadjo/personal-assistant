import { describe, it, expect } from "vitest";
import { buildSearchIndex, search } from "./searchEngine";
import type { Note, Task, Reminder, AutomationRule } from "../../../shared/types";
import type { TeamProjectTask, TeamProject } from "../../../shared/team/types";
import type { HaDeviceRow } from "../../types";

function makeNote(id: string, title: string, content = ""): Note {
  return {
    id,
    title,
    content,
    tags: [],
    pinned: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z"
  };
}

function makeTask(id: string, title: string, status: "open" | "done" = "open"): Task {
  return {
    id,
    title,
    status,
    notes: "",
    dueAt: null,
    priority: "normal",
    recurrence: "none",
    notifyChannel: "desktop",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    lastCompletedAt: null
  };
}

function makeReminder(id: string, text: string, status: "pending" | "done" = "pending"): Reminder {
  return { id, text, dueAt: "2026-01-01T00:00:00Z", recurrence: "none", status, notifyChannel: "desktop" };
}

function makeRule(id: string, name: string): AutomationRule {
  return {
    id,
    name,
    triggerType: "time",
    triggerConfig: { at: "08:00" },
    actionType: "localReminder",
    actionConfig: { text: "" },
    enabled: true
  };
}

function makeDevice(entityId: string, friendlyName: string, state = "off"): HaDeviceRow {
  return { entityId, friendlyName, state };
}

function makeTeamTask(
  id: string,
  projectId: string,
  title: string,
  notes = "",
  status: "open" | "done" = "open",
  assigneeDisplayName: string | null = null
): TeamProjectTask {
  return {
    id,
    projectId,
    workspaceId: "ws-1",
    title,
    notes,
    dueAt: null,
    priority: "normal",
    recurrence: "none",
    assigneeDisplayName,
    status,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    createdBy: "user-1",
    updatedBy: "user-1"
  };
}

function makeTeamProject(id: string, name: string): TeamProject {
  return {
    id,
    workspaceId: "ws-1",
    name,
    createdAt: "2026-01-01T00:00:00Z",
    createdBy: "user-1"
  };
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

  it("prioritizes recent items when query is empty", () => {
    const recentIds = new Set(["note:n1"]);
    const index = buildSearchIndex([makeNote("n1", "Recent note")], [], [], [], [], [], [], recentIds);
    const results = search("", index);
    expect(results[0]!.id).toBe("note:n1");
    expect(results[0]!.isRecent).toBe(true);
  });

  it("ranks exact title matches highest", () => {
    const index = buildSearchIndex(
      [makeNote("n1", "Meeting notes", "about rent")],
      [makeTask("t1", "Pay rent")],
      [],
      [],
      []
    );
    const results = search("Pay rent", index);
    expect(results[0]!.id).toBe("task:t1");
    expect(results[0]!.score).toBeGreaterThan(50); // Exact match gets 100+ points
  });

  it("ranks prefix matches higher than fuzzy matches", () => {
    const index = buildSearchIndex(
      [makeNote("n1", "Meeting notes", "about rent")],
      [makeTask("t1", "Pay rent")],
      [],
      [],
      []
    );
    const results = search("Pay", index);
    expect(results[0]!.id).toBe("task:t1");
    expect(results[0]!.score).toBeGreaterThan(40); // Prefix match gets 50+ points
  });

  it("boosts recent items in ranking", () => {
    const recentIds = new Set(["note:n1"]);
    const index = buildSearchIndex(
      [makeNote("n1", "Meeting notes")],
      [makeTask("t1", "Meeting task")],
      [],
      [],
      [],
      [],
      [],
      recentIds
    );
    const results = search("Meeting", index);
    expect(results[0]!.id).toBe("note:n1");
    expect(results[0]!.isRecent).toBe(true);
  });

  it("boosts open/active items in ranking", () => {
    const index = buildSearchIndex(
      [],
      [makeTask("t1", "Meeting task", "open")],
      [makeReminder("r1", "Meeting reminder", "pending")],
      [],
      []
    );
    const results = search("Meeting", index);
    // Open task and pending reminder should be boosted
    expect(results[0]!.score).toBeGreaterThan(0);
  });

  it("penalizes completed/done items in ranking", () => {
    const index = buildSearchIndex(
      [],
      [makeTask("t1", "Meeting task", "open"), makeTask("t2", "Meeting task done", "done")],
      [],
      [],
      []
    );
    const results = search("Meeting", index);
    expect(results[0]!.id).toBe("task:t1"); // Open task should rank higher
    expect(results[1]!.id).toBe("task:t2"); // Done task should be lower
  });

  it("matches partial words case-insensitively", () => {
    const index = buildSearchIndex([makeNote("n1", "Meeting Notes")], [], [], [], []);
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

  describe("team tasks", () => {
    it("indexes team tasks with correct category and id", () => {
      const index = buildSearchIndex(
        [],
        [],
        [],
        [],
        [],
        [makeTeamTask("tt1", "proj-1", "Fix bug")],
        [makeTeamProject("proj-1", "Frontend")]
      );

      expect(index.some((r) => r.id === "team-task:tt1")).toBe(true);
      const teamTaskResult = index.find((r) => r.id === "team-task:tt1");
      expect(teamTaskResult?.category).toBe("team-task");
      expect(teamTaskResult?.title).toBe("Fix bug");
    });

    it("searches team tasks by title", () => {
      const index = buildSearchIndex(
        [],
        [],
        [],
        [],
        [],
        [makeTeamTask("tt1", "proj-1", "Implement feature")],
        [makeTeamProject("proj-1", "Frontend")]
      );

      const results = search("implement", index);
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("team-task:tt1");
    });

    it("searches team tasks by project name", () => {
      const index = buildSearchIndex(
        [],
        [],
        [],
        [],
        [],
        [makeTeamTask("tt1", "proj-1", "Task")],
        [makeTeamProject("proj-1", "Frontend")]
      );

      const results = search("frontend", index);
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("team-task:tt1");
    });

    it("searches team tasks by assignee", () => {
      const index = buildSearchIndex(
        [],
        [],
        [],
        [],
        [],
        [makeTeamTask("tt1", "proj-1", "Task", "", "open", "Alice")],
        [makeTeamProject("proj-1", "Frontend")]
      );

      const results = search("alice", index);
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("team-task:tt1");
    });

    it("searches team tasks by notes", () => {
      const index = buildSearchIndex(
        [],
        [],
        [],
        [],
        [],
        [makeTeamTask("tt1", "proj-1", "Task", "Important notes about this task")],
        [makeTeamProject("proj-1", "Frontend")]
      );

      const results = search("important", index);
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("team-task:tt1");
    });

    it("includes status in subtitle", () => {
      const index = buildSearchIndex(
        [],
        [],
        [],
        [],
        [],
        [makeTeamTask("tt1", "proj-1", "Task", "", "open")],
        [makeTeamProject("proj-1", "Frontend")]
      );

      const teamTaskResult = index.find((r) => r.id === "team-task:tt1");
      expect(teamTaskResult?.subtitle).toContain("Open");
    });

    it("includes project name in subtitle when available", () => {
      const index = buildSearchIndex(
        [],
        [],
        [],
        [],
        [],
        [makeTeamTask("tt1", "proj-1", "Task")],
        [makeTeamProject("proj-1", "Frontend")]
      );

      const teamTaskResult = index.find((r) => r.id === "team-task:tt1");
      expect(teamTaskResult?.subtitle).toContain("Frontend");
    });

    it("includes assignee in subtitle when available", () => {
      const index = buildSearchIndex(
        [],
        [],
        [],
        [],
        [],
        [makeTeamTask("tt1", "proj-1", "Task", "", "open", "Alice")],
        [makeTeamProject("proj-1", "Frontend")]
      );

      const teamTaskResult = index.find((r) => r.id === "team-task:tt1");
      expect(teamTaskResult?.subtitle).toContain("Alice");
    });
  });
});
