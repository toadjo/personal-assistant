import { describe, expect, it } from "vitest";
import {
  haEntityIdSchema,
  reminderCreateSchema,
  ruleCreateSchema,
  userPreferredNameSchema,
  teamProjectCreateSchema,
  teamTaskCreateSchema
} from "./schemas";

describe("IPC Zod schemas", () => {
  it("reminderCreateSchema accepts valid ISO datetimes with offset", () => {
    const parsed = reminderCreateSchema.parse({
      text: "Call back",
      dueAt: "2026-05-02T14:00:00.000Z",
      recurrence: "none"
    });
    expect(parsed.text).toBe("Call back");
  });

  it("reminderCreateSchema rejects invalid dueAt", () => {
    expect(() =>
      reminderCreateSchema.parse({
        text: "x",
        dueAt: "not-a-date",
        recurrence: "none"
      })
    ).toThrow();
  });

  it("haEntityIdSchema validates domain.entity shape", () => {
    expect(haEntityIdSchema.parse("light.kitchen")).toBe("light.kitchen");
    expect(() => haEntityIdSchema.parse("bad")).toThrow();
  });

  it("userPreferredNameSchema allows empty string (clear name)", () => {
    expect(userPreferredNameSchema.parse("")).toBe("");
    expect(userPreferredNameSchema.parse("  Alex  ")).toBe("Alex");
  });

  it("ruleCreateSchema enforces action fields by actionType", () => {
    const ok = ruleCreateSchema.parse({
      name: "Morning",
      triggerConfig: { at: "08:30" },
      actionType: "localReminder",
      actionConfig: { text: "Stretch" },
      enabled: true
    });
    expect(ok.actionType).toBe("localReminder");

    expect(() =>
      ruleCreateSchema.parse({
        name: "Bad",
        triggerConfig: { at: "25:99" },
        actionType: "localReminder",
        actionConfig: { text: "x" },
        enabled: true
      })
    ).toThrow();

    expect(() =>
      ruleCreateSchema.parse({
        name: "Bad HA",
        triggerConfig: { at: "09:00" },
        actionType: "haToggle",
        actionConfig: {},
        enabled: true
      })
    ).toThrow();
  });

  it("ruleCreateSchema trims haToggle entityId consistently with haEntityIdSchema", () => {
    const ok = ruleCreateSchema.parse({
      name: "Trim",
      triggerConfig: { at: "10:00" },
      actionType: "haToggle",
      actionConfig: { entityId: "  switch.porch  " },
      enabled: true
    });
    expect(ok.actionConfig.entityId).toBe("switch.porch");
  });

  it("ruleCreateSchema accepts valid localTask with all fields", () => {
    const ok = ruleCreateSchema.parse({
      name: "Daily Standup Task",
      triggerConfig: { at: "09:00" },
      actionType: "localTask",
      actionConfig: {
        title: "Attend daily standup",
        notes: "Check agenda first",
        dueAt: "2026-05-11T09:30:00.000Z",
        priority: "high",
        recurrence: "daily"
      },
      enabled: true
    });
    expect(ok.actionType).toBe("localTask");
    expect(ok.actionConfig.title).toBe("Attend daily standup");
    expect(ok.actionConfig.priority).toBe("high");
  });

  it("ruleCreateSchema rejects localTask with missing title", () => {
    expect(() =>
      ruleCreateSchema.parse({
        name: "Bad",
        triggerConfig: { at: "09:00" },
        actionType: "localTask",
        actionConfig: {
          notes: "Missing title",
          dueAt: null,
          priority: "normal",
          recurrence: "none"
        },
        enabled: true
      })
    ).toThrow(/title/i);
  });

  it("ruleCreateSchema rejects recurring localTask without dueAt", () => {
    expect(() =>
      ruleCreateSchema.parse({
        name: "Bad Recurring",
        triggerConfig: { at: "09:00" },
        actionType: "localTask",
        actionConfig: {
          title: "Recurring but no due date",
          notes: "",
          dueAt: null,
          priority: "normal",
          recurrence: "daily"
        },
        enabled: true
      })
    ).toThrow(/due date|dueAt/i);
  });

  it("ruleCreateSchema rejects localTask with invalid priority", () => {
    expect(() =>
      ruleCreateSchema.parse({
        name: "Bad Priority",
        triggerConfig: { at: "09:00" },
        actionType: "localTask",
        actionConfig: {
          title: "Task",
          notes: "",
          dueAt: null,
          priority: "urgent",
          recurrence: "none"
        },
        enabled: true
      })
    ).toThrow();
  });

  it("teamProjectCreateSchema accepts a name only payload", () => {
    const parsed = teamProjectCreateSchema.parse({ name: "Q1 Campaign" });
    expect(parsed.name).toBe("Q1 Campaign");
  });

  it("teamProjectCreateSchema rejects empty name", () => {
    expect(() => teamProjectCreateSchema.parse({ name: "" })).toThrow();
  });

  it("teamTaskCreateSchema accepts the renderer payload shape", () => {
    const payload = {
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "Design logo",
      notes: "Create a modern logo",
      dueAt: "2026-05-02T14:00:00.000Z",
      priority: "normal" as const,
      recurrence: "none" as const,
      assigneeDisplayName: "Alice"
    };
    const parsed = teamTaskCreateSchema.parse(payload);
    expect(parsed).toEqual(payload);
  });

  it("teamTaskCreateSchema accepts null assigneeDisplayName and dueAt", () => {
    const parsed = teamTaskCreateSchema.parse({
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "Task",
      notes: "",
      dueAt: null,
      priority: "low",
      recurrence: "none",
      assigneeDisplayName: null
    });
    expect(parsed.assigneeDisplayName).toBe(null);
    expect(parsed.dueAt).toBe(null);
  });

  it("teamTaskCreateSchema rejects recurring task without dueAt", () => {
    expect(() =>
      teamTaskCreateSchema.parse({
        projectId: "11111111-1111-1111-1111-111111111111",
        title: "Daily standup",
        notes: "",
        dueAt: null,
        priority: "normal",
        recurrence: "daily",
        assigneeDisplayName: null
      })
    ).toThrow();
  });

  it("teamTaskCreateSchema rejects extra workspaceId field via strict shape mismatch is allowed but ignored", () => {
    // Zod object schemas strip unknown keys by default; ensure parsed result has no workspaceId.
    const parsed = teamTaskCreateSchema.parse({
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "Task",
      notes: "",
      dueAt: null,
      priority: "normal",
      recurrence: "none",
      assigneeDisplayName: null,
      workspaceId: "should-be-stripped"
    } as unknown as Record<string, unknown>);
    expect("workspaceId" in parsed).toBe(false);
  });
});
