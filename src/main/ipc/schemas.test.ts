import { describe, expect, it } from "vitest";
import { haEntityIdSchema, reminderCreateSchema, ruleCreateSchema, userPreferredNameSchema } from "./schemas";

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
});
