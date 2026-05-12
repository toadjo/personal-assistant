import { describe, expect, it } from "vitest";
import { IpcInvoke } from "../../../shared/ipc-channels";
import {
  assistantNameSchema,
  haConfigSchema,
  haEntityIdSchema,
  noteCreateSchema,
  noteUpdateSchema,
  optionalQuerySchema,
  positiveIntegerSchema,
  reminderCreateSchema,
  taskCreateSchema,
  taskUpdateSchema,
  rendererLogPayloadSchema,
  ruleCreateSchema,
  ruleEnabledPayloadSchema,
  userPreferredNameSchema,
  uuidSchema
} from "../schemas";

/**
 * Documents which `IpcInvoke` channels accept payloads validated by Zod in handlers.
 * Zero-arg channels are listed explicitly so new IPC is harder to add "without a schema".
 * At runtime, `registerInvoke` maps any Zod parse failure in those handlers to `ipc_validation` / `INVALID_PAYLOAD`.
 */
const ZERO_ARG_INVOKE_CHANNELS: readonly string[] = [
  IpcInvoke.remindersList,
  IpcInvoke.haGetConfig,
  IpcInvoke.haTest,
  IpcInvoke.haRefresh,
  IpcInvoke.haListDevices,
  IpcInvoke.settingsGetAssistant,
  IpcInvoke.automationLogs,
  IpcInvoke.automationRulesList,
  IpcInvoke.appOpenHouseholdWindow,
  IpcInvoke.appFocusDeskWindow,
  IpcInvoke.appHideDeskWindow,
  // Test-only channels (guarded by ELECTRON_E2E_TEST_MODE)
  IpcInvoke.testSetHaFetchOverride,
  IpcInvoke.testSetAutomationActionOverride
];

describe("IPC handler payload contracts", () => {
  it("lists every invoke channel as either schema-backed or explicitly zero-arg", () => {
    const all = new Set(Object.values(IpcInvoke));
    const documented = new Set(ZERO_ARG_INVOKE_CHANNELS);
    for (const ch of all) {
      const covered =
        documented.has(ch) ||
        ch === IpcInvoke.notesList ||
        ch === IpcInvoke.notesCreate ||
        ch === IpcInvoke.notesUpdate ||
        ch === IpcInvoke.notesDelete ||
        ch === IpcInvoke.remindersCreate ||
        ch === IpcInvoke.remindersComplete ||
        ch === IpcInvoke.remindersDelete ||
        ch === IpcInvoke.remindersSnooze ||
        ch === IpcInvoke.tasksList ||
        ch === IpcInvoke.tasksCreate ||
        ch === IpcInvoke.tasksUpdate ||
        ch === IpcInvoke.tasksComplete ||
        ch === IpcInvoke.tasksDelete ||
        ch === IpcInvoke.haConfigure ||
        ch === IpcInvoke.haToggle ||
        ch === IpcInvoke.settingsSetAssistantName ||
        ch === IpcInvoke.settingsSetUserPreferredName ||
        ch === IpcInvoke.automationRulesCreate ||
        ch === IpcInvoke.automationRulesDelete ||
        ch === IpcInvoke.automationRulesSetEnabled ||
        ch === IpcInvoke.automationRulesDuplicate ||
        ch === IpcInvoke.automationRulesTestRun ||
        ch === IpcInvoke.rendererLogError;
      expect(covered, `Add ${ch} to this test (schema or ZERO_ARG list)`).toBe(true);
    }
  });

  it("notesCreateSchema rejects empty title", () => {
    expect(() => noteCreateSchema.parse({ title: "   ", content: "", tags: [], pinned: false })).toThrow();
  });

  it("notesList optional query accepts undefined and rejects non-string", () => {
    expect(optionalQuerySchema.parse(undefined)).toBeUndefined();
    expect(() => optionalQuerySchema.parse(123 as unknown)).toThrow();
  });

  it("notesUpdateSchema requires at least one mutable field", () => {
    expect(() =>
      noteUpdateSchema.parse({
        id: "00000000-0000-4000-8000-000000000001",
        title: undefined,
        content: undefined,
        tags: undefined,
        pinned: undefined
      })
    ).toThrow();
  });

  it("haConfigSchema rejects empty URL", () => {
    expect(() => haConfigSchema.parse({ url: "", token: "" })).toThrow();
  });

  it("remindersSnooze uses positiveIntegerSchema", () => {
    expect(() => positiveIntegerSchema.parse(0)).toThrow();
    expect(positiveIntegerSchema.parse(5)).toBe(5);
  });

  it("reminderCreateSchema rejects invalid ISO datetime", () => {
    expect(() => reminderCreateSchema.parse({ text: "x", dueAt: "not-iso", recurrence: "none" })).toThrow();
  });

  it("task schemas reject recurring task without dueAt", () => {
    expect(() =>
      taskCreateSchema.parse({
        title: "pay rent",
        notes: "",
        dueAt: null,
        priority: "normal",
        recurrence: "weekly"
      })
    ).toThrow();

    expect(() =>
      taskUpdateSchema.parse({
        id: "00000000-0000-4000-8000-000000000001",
        recurrence: "monthly",
        dueAt: null
      })
    ).toThrow();
  });

  it("haEntityIdSchema rejects malformed entity ids", () => {
    expect(() => haEntityIdSchema.parse("not_an_entity")).toThrow();
  });

  it("ruleEnabledPayloadSchema requires uuid id", () => {
    expect(() => ruleEnabledPayloadSchema.parse({ id: "nope", enabled: true })).toThrow();
  });

  it("ruleCreateSchema still validates haToggle entity id", () => {
    expect(() =>
      ruleCreateSchema.parse({
        name: "x",
        triggerConfig: { at: "09:00" },
        actionType: "haToggle",
        actionConfig: { entityId: "bad" },
        enabled: true
      })
    ).toThrow();
  });

  it("rendererLogPayloadSchema rejects empty message", () => {
    expect(() => rendererLogPayloadSchema.parse({ message: "" })).toThrow();
  });

  it("settings name schemas trim and bound length", () => {
    expect(() => assistantNameSchema.parse("")).toThrow();
    expect(userPreferredNameSchema.parse("")).toBe("");
  });

  it("uuidSchema rejects non-uuid delete ids", () => {
    expect(() => uuidSchema.parse("not-a-uuid")).toThrow();
  });
});
