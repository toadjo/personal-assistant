import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { getDb } from "../../db";
import { createTimeRule, listRules } from "../../services/automation";
import { formatAutomationActionLabel } from "../automation/formatActionLabel";
import { ruleCreateSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerAutomationHandlers(assertSender: AssertSender): void {
  ipcMain.handle("automation:logs", (event) => {
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
  ipcMain.handle("automation:rules:list", (event) => {
    assertSender(event);
    return listRules();
  });
  ipcMain.handle("automation:rules:create", (event, payload) => {
    assertSender(event);
    return createTimeRule(ruleCreateSchema.parse(payload));
  });
}
