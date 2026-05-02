import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { getDb } from "../../db";
import { createTimeRule, deleteRule, listRules, setRuleEnabled } from "../../services/automation";
import { formatAutomationActionLabel } from "../automation/formatActionLabel";
import { ruleCreateSchema, ruleEnabledPayloadSchema, uuidSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerAutomationHandlers(assertSender: AssertSender): void {
  ipcMain.handle(IpcInvoke.automationLogs, (event) => {
    assertSender(event);
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
  ipcMain.handle(IpcInvoke.automationRulesList, (event) => {
    assertSender(event);
    return listRules();
  });
  ipcMain.handle(IpcInvoke.automationRulesCreate, (event, payload) => {
    assertSender(event);
    return createTimeRule(ruleCreateSchema.parse(payload));
  });
  ipcMain.handle(IpcInvoke.automationRulesDelete, (event, id) => {
    assertSender(event);
    deleteRule(uuidSchema.parse(id));
  });
  ipcMain.handle(IpcInvoke.automationRulesSetEnabled, (event, payload) => {
    assertSender(event);
    const { id, enabled } = ruleEnabledPayloadSchema.parse(payload);
    setRuleEnabled(id, enabled);
  });
}
