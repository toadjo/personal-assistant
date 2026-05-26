import { describe, expect, it } from "vitest";
import { IpcInvoke } from "../../../shared/ipc-channels";
import {
  aiChatRequestSchema,
  aiSetKeySchema,
  assistantNameSchema,
  backupPayloadSchema,
  haConfigSchema,
  haEntityIdSchema,
  hobbyCreateSchema,
  hobbyUpdateSchema,
  hobbySessionCreateSchema,
  hobbyProjectCreateSchema,
  hobbyMilestoneCreateSchema,
  hobbySupplyCreateSchema,
  noteCreateSchema,
  noteUpdateSchema,
  optionalQuerySchema,
  positiveIntegerSchema,
  reminderCreateSchema,
  reminderUpdateSchema,
  rendererLogPayloadSchema,
  ruleCreateSchema,
  ruleEnabledPayloadSchema,
  taskCreateSchema,
  taskUpdateSchema,
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
  IpcInvoke.settingsGetSecurityPolicy,
  IpcInvoke.automationLogs,
  IpcInvoke.automationRulesList,
  IpcInvoke.dataExport,
  IpcInvoke.dataImportPreview,
  IpcInvoke.dataReset,
  IpcInvoke.dbHealthCheck,
  IpcInvoke.dbOptimize,
  IpcInvoke.appOpenHouseholdWindow,
  IpcInvoke.appFocusDeskWindow,
  IpcInvoke.appHideDeskWindow,
  IpcInvoke.appOpenBugReport,
  // Team mode zero-arg channels
  IpcInvoke.teamGetConfig,
  IpcInvoke.teamClearConfig,
  IpcInvoke.teamWorkspacesList,
  IpcInvoke.teamProjectsList,
  IpcInvoke.teamTasksList,
  // Test-only channels (guarded by ELECTRON_E2E_TEST_MODE)
  IpcInvoke.testSetHaFetchOverride,
  IpcInvoke.testSetAutomationActionOverride,
  IpcInvoke.teamRealtimeStart,
  IpcInvoke.teamRealtimeStop,
  // AI configuration zero-arg channels
  IpcInvoke.aiGetConfig,
  IpcInvoke.aiClearKey,
  IpcInvoke.aiTestKey,
  // Finance zero-arg channels
  IpcInvoke.financeBillsList,
  IpcInvoke.financeExpensesList,
  IpcInvoke.financeSummaryGet,
  // Car list channels (zero-arg: optional vehicleId filter)
  IpcInvoke.carVehiclesList,
  IpcInvoke.carFuelList,
  IpcInvoke.carMaintenanceList,
  IpcInvoke.carRecurringBillsList,
  IpcInvoke.carMileageList,
  IpcInvoke.carServiceRemindersList,
  // Family list channels (zero-arg: optional memberId filter)
  IpcInvoke.familyMembersList,
  IpcInvoke.familyOccasionsList,
  IpcInvoke.familyObligationsList,
  IpcInvoke.familySummaryGet,
  // Health list channels (zero-arg)
  IpcInvoke.healthAppointmentsList,
  IpcInvoke.healthMedicationsList,
  IpcInvoke.healthSymptomsList,
  IpcInvoke.healthMeasurementsList,
  IpcInvoke.healthObligationsList,
  IpcInvoke.healthSummaryGet,
  // Hobbies list channels (zero-arg: optional hobbyId/projectId filter)
  IpcInvoke.hobbiesList,
  IpcInvoke.hobbySessionsList,
  IpcInvoke.hobbyProjectsList,
  IpcInvoke.hobbyMilestonesList,
  IpcInvoke.hobbySuppliesList,
  IpcInvoke.hobbiesSummaryGet
];

describe("IPC handler payload contracts", () => {
  it("lists every invoke channel as either schema-backed or explicitly zero-arg", () => {
    const all = new Set(Object.values(IpcInvoke));
    const documented = new Set(ZERO_ARG_INVOKE_CHANNELS);
    for (const ch of all) {
      const covered: boolean = !!(
        documented.has(ch) ||
        ch === IpcInvoke.notesList ||
        ch === IpcInvoke.notesCreate ||
        ch === IpcInvoke.notesUpdate ||
        ch === IpcInvoke.notesDelete ||
        ch === IpcInvoke.remindersCreate ||
        ch === IpcInvoke.remindersUpdate ||
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
        ch === IpcInvoke.dataImport ||
        ch === IpcInvoke.rendererLogError ||
        // Finance schema-backed channels
        ch === IpcInvoke.financeBillsCreate ||
        ch === IpcInvoke.financeBillsUpdate ||
        ch === IpcInvoke.financeBillsDelete ||
        ch === IpcInvoke.financeBillsMarkPaid ||
        ch === IpcInvoke.financeExpensesCreate ||
        ch === IpcInvoke.financeExpensesUpdate ||
        ch === IpcInvoke.financeExpensesDelete ||
        // Car schema-backed channels
        ch === IpcInvoke.carVehiclesCreate ||
        ch === IpcInvoke.carVehiclesUpdate ||
        ch === IpcInvoke.carVehiclesDelete ||
        ch === IpcInvoke.carFuelCreate ||
        ch === IpcInvoke.carFuelUpdate ||
        ch === IpcInvoke.carFuelDelete ||
        ch === IpcInvoke.carMaintenanceCreate ||
        ch === IpcInvoke.carMaintenanceUpdate ||
        ch === IpcInvoke.carMaintenanceDelete ||
        ch === IpcInvoke.carRecurringBillsCreate ||
        ch === IpcInvoke.carRecurringBillsUpdate ||
        ch === IpcInvoke.carRecurringBillsMarkPaid ||
        ch === IpcInvoke.carRecurringBillsDelete ||
        ch === IpcInvoke.carMileageCreate ||
        ch === IpcInvoke.carMileageUpdate ||
        ch === IpcInvoke.carMileageDelete ||
        ch === IpcInvoke.carServiceRemindersCreate ||
        ch === IpcInvoke.carServiceRemindersUpdate ||
        ch === IpcInvoke.carServiceRemindersComplete ||
        ch === IpcInvoke.carServiceRemindersDelete ||
        // Family schema-backed channels
        ch === IpcInvoke.familyMembersCreate ||
        ch === IpcInvoke.familyMembersUpdate ||
        ch === IpcInvoke.familyMembersDelete ||
        ch === IpcInvoke.familyOccasionsCreate ||
        ch === IpcInvoke.familyOccasionsUpdate ||
        ch === IpcInvoke.familyOccasionsDelete ||
        ch === IpcInvoke.familyObligationsCreate ||
        ch === IpcInvoke.familyObligationsUpdate ||
        ch === IpcInvoke.familyObligationsDelete ||
        ch === IpcInvoke.familyObligationsComplete ||
        // Health schema-backed channels
        ch === IpcInvoke.healthAppointmentsCreate ||
        ch === IpcInvoke.healthAppointmentsUpdate ||
        ch === IpcInvoke.healthAppointmentsDelete ||
        ch === IpcInvoke.healthMedicationsCreate ||
        ch === IpcInvoke.healthMedicationsUpdate ||
        ch === IpcInvoke.healthMedicationsDelete ||
        ch === IpcInvoke.healthSymptomsCreate ||
        ch === IpcInvoke.healthSymptomsUpdate ||
        ch === IpcInvoke.healthSymptomsDelete ||
        ch === IpcInvoke.healthMeasurementsCreate ||
        ch === IpcInvoke.healthMeasurementsUpdate ||
        ch === IpcInvoke.healthMeasurementsDelete ||
        ch === IpcInvoke.healthObligationsCreate ||
        ch === IpcInvoke.healthObligationsUpdate ||
        ch === IpcInvoke.healthObligationsComplete ||
        ch === IpcInvoke.healthObligationsDelete ||
        // Hobbies schema-backed channels
        ch === IpcInvoke.hobbiesCreate ||
        ch === IpcInvoke.hobbiesUpdate ||
        ch === IpcInvoke.hobbiesDelete ||
        ch === IpcInvoke.hobbySessionsCreate ||
        ch === IpcInvoke.hobbySessionsUpdate ||
        ch === IpcInvoke.hobbySessionsDelete ||
        ch === IpcInvoke.hobbyProjectsCreate ||
        ch === IpcInvoke.hobbyProjectsUpdate ||
        ch === IpcInvoke.hobbyProjectsComplete ||
        ch === IpcInvoke.hobbyProjectsDelete ||
        ch === IpcInvoke.hobbyMilestonesCreate ||
        ch === IpcInvoke.hobbyMilestonesUpdate ||
        ch === IpcInvoke.hobbyMilestonesComplete ||
        ch === IpcInvoke.hobbyMilestonesDelete ||
        ch === IpcInvoke.hobbySuppliesCreate ||
        ch === IpcInvoke.hobbySuppliesUpdate ||
        ch === IpcInvoke.hobbySuppliesDelete ||
        // Team mode schema-backed channels
        ch === IpcInvoke.teamSetConfig ||
        ch === IpcInvoke.teamSetDisplayName ||
        ch === IpcInvoke.teamWorkspacesCreate ||
        ch === IpcInvoke.teamWorkspacesJoin ||
        ch === IpcInvoke.teamWorkspacesSetActive ||
        ch === IpcInvoke.teamProjectsCreate ||
        ch === IpcInvoke.teamTasksCreate ||
        ch === IpcInvoke.teamTasksUpdate ||
        ch === IpcInvoke.aiSetKey ||
        ch === IpcInvoke.aiChat
      );
      expect(covered, `Add ${ch} to this test (schema or ZERO_ARG list)`).toBe(true);
    }
  });

  it("notesCreateSchema rejects empty title", () => {
    expect(() => noteCreateSchema.parse({ title: "   ", content: "", tags: [], pinned: false })).toThrow();
  });

  it("reminderUpdateSchema rejects empty payload", () => {
    expect(() => reminderUpdateSchema.parse({ id: "123e4567-e89b-12d3-a456-426614174000" })).toThrow();
  });

  it("reminderUpdateSchema accepts text-only update", () => {
    const result = reminderUpdateSchema.parse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      text: "Updated reminder"
    });
    expect(result.text).toBe("Updated reminder");
  });

  it("reminderUpdateSchema accepts dueAt-only update", () => {
    const result = reminderUpdateSchema.parse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      dueAt: "2024-01-01T12:00:00Z"
    });
    expect(result.dueAt).toBe("2024-01-01T12:00:00Z");
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

  it("backupPayloadSchema accepts a valid export shape", () => {
    const valid = {
      version: "1.7.1",
      exportedAt: new Date().toISOString(),
      notes: [
        {
          id: "n1",
          title: "Test note",
          content: "content",
          tags: "",
          pinned: 0,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z"
        }
      ],
      reminders: [
        {
          id: "r1",
          text: "Remind me",
          dueAt: "2024-01-01T00:00:00.000Z",
          recurrence: "none",
          status: "pending",
          notifyChannel: "desktop"
        }
      ],
      tasks: [
        {
          id: "t1",
          title: "Task",
          notes: "",
          dueAt: null,
          priority: "normal",
          status: "open",
          recurrence: "none",
          notifyChannel: "desktop",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          lastCompletedAt: null
        }
      ],
      automation_rules: [
        {
          id: "a1",
          name: "Rule",
          triggerType: "time",
          triggerConfig: "{}",
          actionType: "localReminder",
          actionConfig: "{}",
          enabled: 1,
          lastFiredAt: null
        }
      ],
      app_settings: [
        {
          key: "theme",
          value: "glass",
          updatedAt: "2024-01-01T00:00:00.000Z"
        }
      ]
    };
    const parsed = backupPayloadSchema.parse(valid);
    expect(parsed.version).toBe("1.7.1");
    expect(parsed.notes).toHaveLength(1);
  });

  it("backupPayloadSchema rejects empty version", () => {
    expect(() =>
      backupPayloadSchema.parse({
        version: "",
        exportedAt: "2024-01-01T00:00:00.000Z",
        notes: [],
        reminders: [],
        tasks: [],
        automation_rules: [],
        app_settings: []
      })
    ).toThrow();
  });

  it("backupPayloadSchema rejects malformed note row", () => {
    expect(() =>
      backupPayloadSchema.parse({
        version: "1.7.1",
        exportedAt: "2024-01-01T00:00:00.000Z",
        notes: [{ id: "", title: "x", content: "", tags: "", pinned: 0, createdAt: "x", updatedAt: "x" }],
        reminders: [],
        tasks: [],
        automation_rules: [],
        app_settings: []
      })
    ).toThrow();
  });

  it("aiSetKeySchema rejects unsupported provider", () => {
    expect(() => aiSetKeySchema.parse({ provider: "gemini", apiKey: "sk-abc" })).toThrow();
  });

  it("aiSetKeySchema rejects empty key after trim", () => {
    expect(() => aiSetKeySchema.parse({ provider: "openai", apiKey: "   " })).toThrow();
  });

  it("aiSetKeySchema rejects overlong key", () => {
    expect(() => aiSetKeySchema.parse({ provider: "openai", apiKey: "x".repeat(4_097) })).toThrow();
  });

  it("aiSetKeySchema accepts a valid payload and trims the key", () => {
    const parsed = aiSetKeySchema.parse({ provider: "anthropic", apiKey: "  sk-ant-123  " });
    expect(parsed.provider).toBe("anthropic");
    expect(parsed.apiKey).toBe("sk-ant-123");
  });

  it("aiChatRequestSchema rejects empty message", () => {
    expect(() => aiChatRequestSchema.parse({ message: "" })).toThrow();
  });

  it("aiChatRequestSchema rejects overlong message", () => {
    expect(() => aiChatRequestSchema.parse({ message: "x".repeat(8001) })).toThrow();
  });

  it("aiChatRequestSchema accepts valid message with context", () => {
    const parsed = aiChatRequestSchema.parse({ message: "hello", context: { notesCount: 5, tasksCount: 3 } });
    expect(parsed.message).toBe("hello");
    expect(parsed.context?.notesCount).toBe(5);
  });

  it("backupPayloadSchema rejects missing required fields", () => {
    expect(() =>
      backupPayloadSchema.parse({
        // version intentionally omitted
        exportedAt: "2024-01-01T00:00:00.000Z"
      })
    ).toThrow();
  });

  it("hobbyCreateSchema rejects empty name", () => {
    expect(() => hobbyCreateSchema.parse({ name: "   ", category: "Music", status: "active", notes: "" })).toThrow();
  });

  it("hobbyCreateSchema accepts valid hobby", () => {
    const parsed = hobbyCreateSchema.parse({ name: "Guitar", category: "Music", status: "active", description: "" });
    expect(parsed.name).toBe("Guitar");
  });

  it("hobbyUpdateSchema rejects empty payload", () => {
    expect(() => hobbyUpdateSchema.parse({ id: "123e4567-e89b-12d3-a456-426614174000" })).toThrow();
  });

  it("hobbySessionCreateSchema rejects missing hobbyId", () => {
    expect(() => hobbySessionCreateSchema.parse({ date: "2024-06-15T00:00:00Z", duration: 30, energy: 3, notes: "" })).toThrow();
  });

  it("hobbySessionCreateSchema accepts valid session", () => {
    const parsed = hobbySessionCreateSchema.parse({ hobbyId: "123e4567-e89b-12d3-a456-426614174000", date: "2024-06-15T00:00:00Z", durationMinutes: 30, notes: "", mood: "", energy: 3, progressRating: null });
    expect(parsed.hobbyId).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("hobbyProjectCreateSchema rejects missing hobbyId", () => {
    expect(() => hobbyProjectCreateSchema.parse({ name: "Learn a Song", status: "active", startDate: "2024-06-01T00:00:00Z", targetDate: null, notes: "" })).toThrow();
  });

  it("hobbyProjectCreateSchema accepts valid project", () => {
    const parsed = hobbyProjectCreateSchema.parse({ hobbyId: "123e4567-e89b-12d3-a456-426614174000", name: "Learn a Song", status: "active", description: "", targetDate: null, completedAt: null });
    expect(parsed.hobbyId).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("hobbyMilestoneCreateSchema rejects missing projectId", () => {
    expect(() => hobbyMilestoneCreateSchema.parse({ name: "Master Chords", status: "pending", targetDate: "2024-06-15T00:00:00Z", notes: "" })).toThrow();
  });

  it("hobbyMilestoneCreateSchema accepts valid milestone", () => {
    const parsed = hobbyMilestoneCreateSchema.parse({ projectId: "123e4567-e89b-12d3-a456-426614174000", name: "Master Chords", description: "", targetDate: "2024-06-15T00:00:00Z", completedAt: null });
    expect(parsed.projectId).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("hobbySupplyCreateSchema rejects missing hobbyId", () => {
    expect(() => hobbySupplyCreateSchema.parse({ projectId: null, name: "Guitar Strings", quantity: 1, cost: 500, purchaseDate: "2024-06-01T00:00:00Z", notes: "" })).toThrow();
  });

  it("hobbySupplyCreateSchema accepts valid supply", () => {
    const parsed = hobbySupplyCreateSchema.parse({ hobbyId: "123e4567-e89b-12d3-a456-426614174000", projectId: null, name: "Guitar Strings", type: "equipment", cost: 500, purchaseDate: "2024-06-01T00:00:00Z", source: "", notes: "" });
    expect(parsed.hobbyId).toBe("123e4567-e89b-12d3-a456-426614174000");
  });
});
