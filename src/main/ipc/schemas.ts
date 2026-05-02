import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const noteCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().max(10_000),
  tags: z.array(z.string().trim().min(1).max(40)).max(25),
  pinned: z.boolean()
});

export const noteUpdateSchema = z
  .object({
    id: uuidSchema,
    title: z.string().trim().min(1).max(160).optional(),
    content: z.string().max(10_000).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(25).optional(),
    pinned: z.boolean().optional()
  })
  .refine((v) => v.title !== undefined || v.content !== undefined || v.tags !== undefined || v.pinned !== undefined, {
    message: "At least one of title, content, tags, or pinned must be provided."
  });

export const ruleEnabledPayloadSchema = z.object({
  id: uuidSchema,
  enabled: z.boolean()
});

export const rendererLogPayloadSchema = z.object({
  message: z.string().min(1).max(8_000),
  stack: z.string().max(20_000).optional(),
  componentStack: z.string().max(20_000).optional()
});

export const reminderCreateSchema = z.object({
  text: z.string().trim().min(1).max(500),
  dueAt: z.string().datetime({ offset: true }),
  recurrence: z.enum(["none", "daily"])
});

export const haConfigSchema = z.object({
  url: z.string().trim().min(1).max(2_048),
  token: z.string().trim().max(4_096)
});

export const optionalQuerySchema = z.string().optional();
export const positiveIntegerSchema = z.number().int().positive();
export const haEntityIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]+\.[a-z0-9_]+$/i, "Invalid Home Assistant entity id");
export const assistantNameSchema = z.string().trim().min(1).max(60);

/** User display name for greetings; empty clears. */
export const userPreferredNameSchema = z.string().trim().max(60);

export const ruleCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    triggerConfig: z.object({ at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid HH:MM time") }),
    actionType: z.enum(["localReminder", "haToggle"]),
    actionConfig: z
      .object({
        text: z.string().trim().min(1).max(500).optional(),
        entityId: z
          .string()
          .regex(/^[a-z0-9_]+\.[a-z0-9_]+$/i, "Invalid Home Assistant entity id")
          .optional()
      })
      .refine((value) => Object.keys(value).length > 0, "Rule action config is required"),
    enabled: z.boolean()
  })
  .superRefine((value, ctx) => {
    if (value.actionType === "localReminder" && !value.actionConfig.text) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reminder text is required for localReminder actions",
        path: ["actionConfig", "text"]
      });
    }
    if (value.actionType === "haToggle" && !value.actionConfig.entityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Entity ID is required for haToggle actions",
        path: ["actionConfig", "entityId"]
      });
    }
  });
