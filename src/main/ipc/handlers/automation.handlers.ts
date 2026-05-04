import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { getDb } from "../../db";
import {
  createTimeRule,
  deleteRule,
  listRules,
  setRuleEnabled,
  setTestAutomationActionOverride
} from "../../services/automation";
import { formatAutomationActionLabel } from "../automation/formatActionLabel";
import { registerInvoke } from "../invoke-handle";
import { ruleCreateSchema, ruleEnabledPayloadSchema, uuidSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for automation rules, execution logs, and rule lifecycle mutations. */
export function registerAutomationHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.automationLogs, assertSender, () => {
    const rows = getDb()
      .prepare(
        `SELECT
          l.id,
          l.ruleId,
          l.status,
          l.startedAt,
          l.endedAt,
          l.error,
          l.attemptCount,
          l.retryCount,
          r.name AS ruleName,
          r.actionType,
          r.actionConfig
        FROM execution_logs l
        LEFT JOIN automation_rules r ON r.id = l.ruleId
        ORDER BY l.startedAt DESC
        LIMIT 100`
      )
      .all() as Array<{
      id: string;
      ruleId: string;
      status: string;
      startedAt: string;
      endedAt: string;
      error: string | null;
      attemptCount: number | null;
      retryCount: number | null;
      ruleName: string | null;
      actionType: string | null;
      actionConfig: string | null;
    }>;
    return rows.map((row) => ({
      id: row.id,
      ruleId: row.ruleId,
      status: row.status,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      error: row.error ?? undefined,
      attemptCount: row.attemptCount ?? 1,
      retryCount: row.retryCount ?? 0,
      ruleName: row.ruleName ?? "Unknown rule",
      actionLabel: formatAutomationActionLabel(row.actionType, row.actionConfig)
    }));
  });
  registerInvoke(IpcInvoke.automationRulesList, assertSender, () => {
    return listRules();
  });
  registerInvoke(IpcInvoke.automationRulesCreate, assertSender, (_event, payload) => {
    return createTimeRule(ruleCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.automationRulesDelete, assertSender, (_event, id) => {
    deleteRule(uuidSchema.parse(id));
  });
  registerInvoke(IpcInvoke.automationRulesSetEnabled, assertSender, (_event, payload) => {
    const { id, enabled } = ruleEnabledPayloadSchema.parse(payload);
    setRuleEnabled(id, enabled);
  });
  /**
   * Test-only handler: allows Electron E2E tests to inject a fake automation action executor
   * to simulate timeout and failure modes without requiring real external services.
   * Only active when ELECTRON_E2E_TEST_MODE is set.
   */
  registerInvoke(IpcInvoke.testSetAutomationActionOverride, assertSender, (_event, overrideConfig) => {
    if (process.env.ELECTRON_E2E_TEST_MODE !== "1") {
      throw new Error("Test-only handler: not allowed in production");
    }
    if (overrideConfig === null) {
      setTestAutomationActionOverride(null);
      return;
    }
    // Simulate various failure modes based on config
    const config = overrideConfig as { mode: "timeout" | "failure" };
    if (config.mode === "timeout") {
      setTestAutomationActionOverride(async () => {
        await new Promise((resolve) => setTimeout(resolve, 15_000)); // Exceeds 10s timeout
      });
    } else if (config.mode === "failure") {
      setTestAutomationActionOverride(async () => {
        throw new Error("Simulated automation action failure");
      });
    } else {
      throw new Error(`Unknown test override mode: ${config.mode}`);
    }
  });
}
