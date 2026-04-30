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
      triggerConfig: JSON.parse(row.triggerConfig),
      actionConfig: JSON.parse(row.actionConfig),
      enabled: Boolean(row.enabled)
    })) as AutomationRule[];
}

export function createTimeRule(input: Omit<AutomationRule, "id" | "triggerType">): AutomationRule {
  const rule: AutomationRule = { ...input, id: randomUUID(), triggerType: "time" };
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
      const trigger = JSON.parse(rule.triggerConfig) as { at: string };
      if (trigger.at !== hhmm) continue;
      const action = JSON.parse(rule.actionConfig) as Record<string, string>;
      await withRetry(async () => {
        if (rule.actionType === "localReminder") {
          createReminder({ text: action.text || "Automation reminder", dueAt: new Date().toISOString(), recurrence: "none" });
        } else if (rule.actionType === "haToggle" && action.entityId) {
          await toggleEntity(action.entityId);
        }
      });
      writeLog(rule.id, "success", startedAt, new Date().toISOString());
    } catch (error) {
      writeLog(rule.id, "failed", startedAt, new Date().toISOString(), String(error));
    }
  }
}

async function withRetry(fn: () => Promise<void> | void, attempts = 3): Promise<void> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await Promise.race([
        Promise.resolve(fn()),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Action timeout")), 10_000))
      ]);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function writeLog(ruleId: string, status: "success" | "failed", startedAt: string, endedAt: string, error?: string): void {
  getDb()
    .prepare(
      "INSERT INTO execution_logs (id, ruleId, status, startedAt, endedAt, error) VALUES (@id,@ruleId,@status,@startedAt,@endedAt,@error)"
    )
    .run({ id: randomUUID(), ruleId, status, startedAt, endedAt, error: error || null });
}
