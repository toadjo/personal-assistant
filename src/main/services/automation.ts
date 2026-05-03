import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import { mainLog } from "../log";
import { createReminder } from "./reminders";
import { toggleEntity } from "./homeAssistant";
import type { AutomationRule } from "../../shared/types";

type AutomationActionPayload =
  | { actionType: "localReminder"; actionConfig: { text: string } }
  | { actionType: "haToggle"; actionConfig: { entityId: string } };

/** IPC / Zod payload before `createTimeRule` normalizes `actionConfig`. */
export type CreateTimeRulePayload = {
  name: string;
  triggerConfig: { at: string };
  actionType: "localReminder" | "haToggle";
  actionConfig: Record<string, unknown>;
  enabled: boolean;
};

const AUTOMATION_ACTION_TIMEOUT_MS = 10_000;
const AUTOMATION_RETRY_ATTEMPTS = 3;
const AUTOMATION_RETRY_DELAY_MS = 250;
type RetryMeta = { attemptsUsed: number; retryCount: number };
class AutomationRetryError extends Error {
  retryMeta: RetryMeta;
  constructor(message: string, retryMeta: RetryMeta) {
    super(message);
    this.name = "AutomationRetryError";
    this.retryMeta = retryMeta;
  }
}

export function listRules(): AutomationRule[] {
  return getDb()
    .prepare("SELECT * FROM automation_rules ORDER BY name ASC")
    .all()
    .map((row) => {
      const r = row as Record<string, unknown>;
      const actionType = validateActionType(r.actionType);
      const rawActionConfig = safeParseObject(r.actionConfig, "automation actionConfig");
      const base = {
        id: typeof r.id === "string" ? r.id : "",
        name: typeof r.name === "string" ? r.name : "",
        triggerType: "time" as const,
        triggerConfig: validateTriggerConfig(safeParseObject(r.triggerConfig, "automation triggerConfig")),
        enabled: Boolean(r.enabled)
      };
      if (actionType === "localReminder") {
        return { ...base, actionType, actionConfig: validateLocalReminderConfig(rawActionConfig) };
      }
      return { ...base, actionType, actionConfig: validateHaToggleConfig(rawActionConfig) };
    });
}

export function createTimeRule(input: CreateTimeRulePayload): AutomationRule {
  const actionType = validateActionType(input.actionType);
  const name = normalizeName(input.name);
  const triggerConfig = validateTriggerConfig(input.triggerConfig);
  const enabled = Boolean(input.enabled);
  const id = randomUUID();
  const actionConfig =
    actionType === "localReminder"
      ? validateLocalReminderConfig(input.actionConfig)
      : validateHaToggleConfig(input.actionConfig);
  const rule = {
    id,
    name,
    triggerType: "time" as const,
    triggerConfig,
    actionType,
    actionConfig,
    enabled
  } as AutomationRule;
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

export function deleteRule(id: string): void {
  const trimmed = typeof id === "string" ? id.trim() : "";
  if (!trimmed) throw new Error("Rule ID is required.");
  const db = getDb();
  const exists = db.prepare("SELECT id FROM automation_rules WHERE id = ?").get(trimmed);
  if (!exists) throw new Error("Automation rule not found.");
  db.prepare("DELETE FROM automation_rules WHERE id = ?").run(trimmed);
}

export function setRuleEnabled(id: string, enabled: boolean): void {
  const trimmed = typeof id === "string" ? id.trim() : "";
  if (!trimmed) throw new Error("Rule ID is required.");
  const changes = getDb()
    .prepare("UPDATE automation_rules SET enabled = ? WHERE id = ?")
    .run(enabled ? 1 : 0, trimmed).changes;
  if (changes === 0) throw new Error("Automation rule not found.");
}

export async function runAutomationCycle(): Promise<void> {
  const nowMs = Date.now();
  const rules = getDb()
    .prepare(
      "SELECT id, name, triggerConfig, actionType, actionConfig, lastFiredAt FROM automation_rules WHERE enabled = 1 AND triggerType = 'time'"
    )
    .all() as Array<{
    id: string;
    name?: string;
    triggerConfig: string;
    actionType: string;
    actionConfig: string;
    lastFiredAt?: string | null;
  }>;

  let rulesEvaluated = 0;
  let skippedNotDue = 0;
  let firedSuccess = 0;
  let invalidStoredConfig = 0;
  let actionOrUnknownFailure = 0;

  for (const rule of rules) {
    rulesEvaluated += 1;
    const startedAt = new Date().toISOString();
    try {
      const trigger = validateTriggerConfig(safeParseObject(rule.triggerConfig, "automation triggerConfig"));
      if (!shouldRunTimeRule(nowMs, trigger.at, rule.lastFiredAt)) {
        skippedNotDue += 1;
        continue;
      }
      const actionType = validateActionType(rule.actionType);
      const rawActionConfig = safeParseObject(rule.actionConfig, "automation actionConfig");
      const spec: AutomationActionPayload =
        actionType === "localReminder"
          ? { actionType, actionConfig: validateLocalReminderConfig(rawActionConfig) }
          : { actionType, actionConfig: validateHaToggleConfig(rawActionConfig) };
      const retryMeta = await withRetry(() => executeAutomationAction(spec), AUTOMATION_RETRY_ATTEMPTS);
      const endedAt = new Date().toISOString();
      firedSuccess += 1;
      writeLog(rule.id, "success", startedAt, endedAt, undefined, retryMeta);
      getDb().prepare("UPDATE automation_rules SET lastFiredAt = @at WHERE id = @id").run({ at: endedAt, id: rule.id });
    } catch (error) {
      const ruleLabel = rule.name?.trim() || rule.id;
      const retryMeta = getRetryMetaFromError(error);
      const endedAt = new Date().toISOString();
      if (isInvalidAutomationStoredConfigError(error)) {
        invalidStoredConfig += 1;
      } else {
        actionOrUnknownFailure += 1;
      }
      writeLog(rule.id, "failed", startedAt, endedAt, `[${ruleLabel}] ${formatErrorMessage(error)}`, retryMeta);
      // Advance lastFiredAt on failure so we do not re-fire the same missed slot every scheduler tick (log/HA spam).
      getDb().prepare("UPDATE automation_rules SET lastFiredAt = @at WHERE id = @id").run({ at: endedAt, id: rule.id });
    }
  }

  if (rulesEvaluated > 0) {
    mainLog.info(
      `[scheduler:automation] cycle rulesEvaluated=${rulesEvaluated} skippedNotDue=${skippedNotDue} firedSuccess=${firedSuccess} invalidStoredConfig=${invalidStoredConfig} actionOrUnknownFailure=${actionOrUnknownFailure}`
    );
  }
}

/** Local calendar instant for `baseDate`'s calendar day at HH:mm. */
function msForLocalHm(baseDate: Date, hhmm: string): number {
  const [hs, mins] = hhmm.split(":");
  const h = Number(hs);
  const m = Number(mins);
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h, m, 0, 0).getTime();
}

/**
 * Latest scheduled trigger instant (today or yesterday only) that is still <= nowMs.
 * Handles sleep/offline: if the exact wall-clock minute was missed, we still align to the most recent due slot.
 */
function getLatestScheduledInstantMs(nowMs: number, hhmm: string): number {
  const now = new Date(nowMs);
  const todayT = msForLocalHm(now, hhmm);
  const prev = new Date(now);
  prev.setDate(prev.getDate() - 1);
  const yesterdayT = msForLocalHm(prev, hhmm);
  const candidates = [todayT, yesterdayT].filter((t) => t <= nowMs);
  if (candidates.length === 0) return -1;
  return Math.max(...candidates);
}

function shouldRunTimeRule(nowMs: number, hhmm: string, lastFiredAt: string | null | undefined): boolean {
  const boundary = getLatestScheduledInstantMs(nowMs, hhmm);
  if (boundary < 0) return false;
  if (!lastFiredAt) return true;
  const last = new Date(lastFiredAt).getTime();
  if (!Number.isFinite(last)) return true;
  return last < boundary;
}

async function executeAutomationAction(spec: AutomationActionPayload): Promise<void> {
  if (spec.actionType === "localReminder") {
    const { text } = spec.actionConfig;
    createReminder({ text, dueAt: new Date().toISOString(), recurrence: "none" });
    return;
  }
  const { entityId } = spec.actionConfig;
  await toggleEntity(entityId);
}

async function withRetry(fn: () => Promise<void> | void, attempts = 3): Promise<RetryMeta> {
  const safeAttempts = Number.isInteger(attempts) && attempts > 0 ? attempts : 1;
  let lastError: unknown;
  for (let i = 0; i < safeAttempts; i += 1) {
    try {
      await withTimeout(Promise.resolve(fn()), AUTOMATION_ACTION_TIMEOUT_MS);
      return {
        attemptsUsed: i + 1,
        retryCount: i
      };
    } catch (error) {
      lastError = error;
      if (i < safeAttempts - 1) {
        await sleep(AUTOMATION_RETRY_DELAY_MS);
      }
    }
  }
  const attemptsUsed = safeAttempts;
  const retryCount = Math.max(0, attemptsUsed - 1);
  throw new AutomationRetryError(`Automation failed after ${safeAttempts} attempts: ${formatErrorMessage(lastError)}`, {
    attemptsUsed,
    retryCount
  });
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
        timeoutRef = setTimeout(
          () => reject(new Error(`Automation action timed out after ${timeoutMs}ms.`)),
          timeoutMs
        );
        timeoutRef.unref();
      })
    ]);
  } finally {
    if (timeoutRef) clearTimeout(timeoutRef);
  }
}

function writeLog(
  ruleId: string,
  status: "success" | "failed",
  startedAt: string,
  endedAt: string,
  error?: string,
  retryMeta?: RetryMeta
): void {
  const safeAttemptCount = retryMeta?.attemptsUsed && retryMeta.attemptsUsed > 0 ? retryMeta.attemptsUsed : 1;
  const safeRetryCount = retryMeta?.retryCount && retryMeta.retryCount > 0 ? retryMeta.retryCount : 0;
  getDb()
    .prepare(
      "INSERT INTO execution_logs (id, ruleId, status, startedAt, endedAt, error, attemptCount, retryCount) VALUES (@id,@ruleId,@status,@startedAt,@endedAt,@error,@attemptCount,@retryCount)"
    )
    .run({
      id: randomUUID(),
      ruleId,
      status,
      startedAt,
      endedAt,
      error: error || null,
      attemptCount: safeAttemptCount,
      retryCount: safeRetryCount
    });
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** True when the failure is from parsing/normalizing stored rule JSON or fields (not external HA/reminder execution). */
function isInvalidAutomationStoredConfigError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const m = error.message;
  return (
    /^Invalid automation (triggerConfig|actionConfig):/.test(m) ||
    /Automation trigger time must use HH:MM format\./.test(m) ||
    /Automation action type must be 'localReminder' or 'haToggle'\./.test(m) ||
    /Automation action config must be an object\./.test(m) ||
    /localReminder action requires non-empty text\./.test(m) ||
    /haToggle action requires a valid entityId\./.test(m)
  );
}

function getRetryMetaFromError(error: unknown): RetryMeta {
  if (error instanceof AutomationRetryError) {
    return sanitizeRetryMeta(error.retryMeta);
  }
  return { attemptsUsed: 1, retryCount: 0 };
}

function sanitizeRetryMeta(meta: RetryMeta): RetryMeta {
  const attemptsUsed = Number.isInteger(meta.attemptsUsed) && meta.attemptsUsed > 0 ? meta.attemptsUsed : 1;
  const retryCount =
    Number.isInteger(meta.retryCount) && meta.retryCount >= 0 ? Math.min(meta.retryCount, attemptsUsed - 1) : 0;
  return { attemptsUsed, retryCount };
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

function validateLocalReminderConfig(actionConfig: unknown): { text: string } {
  if (!actionConfig || typeof actionConfig !== "object" || Array.isArray(actionConfig)) {
    throw new Error("Automation action config must be an object.");
  }
  const o = actionConfig as Record<string, unknown>;
  const text = typeof o.text === "string" ? o.text.trim() : "";
  if (!text) throw new Error("localReminder action requires non-empty text.");
  return { text };
}

function validateHaToggleConfig(actionConfig: unknown): { entityId: string } {
  if (!actionConfig || typeof actionConfig !== "object" || Array.isArray(actionConfig)) {
    throw new Error("Automation action config must be an object.");
  }
  const o = actionConfig as Record<string, unknown>;
  const entityId = typeof o.entityId === "string" ? o.entityId.trim() : "";
  if (!entityId) throw new Error("haToggle action requires a valid entityId.");
  return { entityId };
}

function validateActionType(value: unknown): "localReminder" | "haToggle" {
  if (value === "localReminder" || value === "haToggle") return value;
  throw new Error("Automation action type must be 'localReminder' or 'haToggle'.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);
    timeout.unref();
  });
}
