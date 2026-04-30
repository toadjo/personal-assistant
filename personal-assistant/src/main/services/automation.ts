import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import { createReminder } from "./reminders";
import { toggleEntity } from "./homeAssistant";
import { AutomationRule } from "../../shared/types";

export function listRules(): AutomationRule[] {
  return getDb()
    .prepare("SELECT * FROM automation_rules ORDER BY name ASC")
    .all()
    .map((row: any) => ({
      ...row,
      triggerConfig: validateTriggerConfig(safeParseObject(row.triggerConfig, "automation triggerConfig")),
      actionConfig: validateActionConfig(safeParseObject(row.actionConfig, "automation actionConfig")),
      enabled: Boolean(row.enabled)
    })) as AutomationRule[];
}

export function createTimeRule(input: Omit<AutomationRule, "id" | "triggerType">): AutomationRule {
  const actionType = validateActionType(input.actionType);
  const rule: AutomationRule = {
    ...input,
    id: randomUUID(),
    triggerType: "time",
    name: normalizeName(input.name),
    triggerConfig: validateTriggerConfig(input.triggerConfig),
    actionType,
    actionConfig: validateActionConfig(input.actionConfig),
    enabled: Boolean(input.enabled)
  };
  getDb()
    .prepare(
      "INSERT INTO automation_rules (id, name, triggerType, triggerConfig, actionType, actionConfig, enabled) VALUES (@id,@name,@triggerType,@triggerConfig,@actionType,@actionConfig,@enabled)"
    )
    .run({
      ...rule,
      triggerConfig: JSON.stringify(rule.triggerConfig),
      actionConfig: JSON.stringify(rule.actionConfig),
      enabled: rule.enabled ? 1 : 0
    });
  return rule;
}

export async function runAutomationCycle(): Promise<void> {
  const hhmm = new Date().toTimeString().slice(0, 5);
  const rules = getDb()
    .prepare("SELECT * FROM automation_rules WHERE enabled = 1 AND triggerType = 'time'")
    .all() as Array<{ id: string; triggerConfig: string; actionType: string; actionConfig: string }>;

  for (const rule of rules) {
    const startedAt = new Date().toISOString();
    try {
      const trigger = validateTriggerConfig(safeParseObject(rule.triggerConfig, "automation triggerConfig"));
      if (trigger.at !== hhmm) continue;
      const action = validateActionConfig(safeParseObject(rule.actionConfig, "automation actionConfig"));
      await withRetry(async () => {
        if (rule.actionType === "localReminder") {
          if (!action.text) throw new Error("localReminder requires text");
          createReminder({ text: action.text, dueAt: new Date().toISOString(), recurrence: "none" });
        } else if (rule.actionType === "haToggle" && action.entityId) {
          await toggleEntity(action.entityId);
        } else {
          throw new Error(
            rule.actionType === "haToggle"
              ? "haToggle action requires a valid entityId."
              : `Unsupported action configuration for "${rule.actionType}".`
          );
        }
      });
      writeLog(rule.id, "success", startedAt, new Date().toISOString());
    } catch (error) {
      writeLog(rule.id, "failed", startedAt, new Date().toISOString(), formatErrorMessage(error));
    }
  }
}

async function withRetry(fn: () => Promise<void> | void, attempts = 3): Promise<void> {
  const safeAttempts = Number.isInteger(attempts) && attempts > 0 ? attempts : 1;
  let lastError: unknown;
  for (let i = 0; i < safeAttempts; i += 1) {
    try {
      await withTimeout(Promise.resolve(fn()), 10_000);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Automation failed after ${safeAttempts} attempts: ${formatErrorMessage(lastError)}`);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Timeout duration must be a positive number.");
  }
  let timeoutRef: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutRef = setTimeout(() => reject(new Error("Action timeout")), timeoutMs);
        timeoutRef.unref();
      })
    ]);
  } finally {
    if (timeoutRef) clearTimeout(timeoutRef);
  }
}

function writeLog(ruleId: string, status: "success" | "failed", startedAt: string, endedAt: string, error?: string): void {
  getDb()
    .prepare(
      "INSERT INTO execution_logs (id, ruleId, status, startedAt, endedAt, error) VALUES (@id,@ruleId,@status,@startedAt,@endedAt,@error)"
    )
    .run({ id: randomUUID(), ruleId, status, startedAt, endedAt, error: error || null });
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function safeParseObject(raw: unknown, fieldName: string): Record<string, unknown> {
  if (typeof raw !== "string") {
    throw new Error(`Invalid ${fieldName}: expected string payload.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid ${fieldName}: malformed JSON.`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid ${fieldName}: expected object payload.`);
  }
  return parsed as Record<string, unknown>;
}

function normalizeName(name: unknown): string {
  if (typeof name !== "string") throw new Error("Automation rule name must be a string.");
  const normalized = name.trim();
  if (!normalized) throw new Error("Automation rule name is required.");
  return normalized;
}

function validateTriggerConfig(triggerConfig: unknown): { at: string } {
  const config = triggerConfig as { at?: unknown };
  const at = typeof config?.at === "string" ? config.at.trim() : "";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(at)) {
    throw new Error("Automation trigger time must use HH:MM format.");
  }
  return { at };
}

function validateActionConfig(actionConfig: unknown): Record<string, string> {
  if (!actionConfig || typeof actionConfig !== "object" || Array.isArray(actionConfig)) {
    throw new Error("Automation action config must be an object.");
  }
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(actionConfig)) {
    if (typeof value === "string") {
      output[key] = value.trim();
    }
  }
  return output;
}

function validateActionType(value: unknown): "localReminder" | "haToggle" {
  if (value === "localReminder" || value === "haToggle") return value;
  throw new Error("Automation action type must be 'localReminder' or 'haToggle'.");
}
