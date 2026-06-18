import { getAssistantApi } from "../assistantApi";
import type { AutomationRule, ExecutionLog, Note, Reminder, Task } from "../../../shared/types";
import type { ExecutionLogRow, HaDeviceRow } from "../../types";

type ExecutionLogApiRow = {
  id: string;
  ruleId: string;
  status: string;
  startedAt: string;
  endedAt: string;
  error?: string;
  attemptCount: number;
  retryCount: number;
  ruleName?: string;
  actionLabel?: string;
};

export async function fetchNotes(query: string): Promise<Note[]> {
  const api = getAssistantApi();
  if (!api?.listNotes) return [];
  return api.listNotes(query);
}

export async function fetchReminders(): Promise<Reminder[]> {
  const api = getAssistantApi();
  if (!api?.listReminders) return [];
  return api.listReminders();
}

export async function fetchTasks(): Promise<Task[]> {
  const api = getAssistantApi();
  if (!api?.listTasks) return [];
  return api.listTasks();
}

export async function fetchDevices(): Promise<HaDeviceRow[]> {
  const api = getAssistantApi();
  if (!api?.listDevices) return [];
  return api.listDevices();
}

export async function fetchLogs(): Promise<ExecutionLogRow[]> {
  const api = getAssistantApi();
  if (!api?.listExecutionLogs) return [];
  const rows = await api.listExecutionLogs();
  return rows.map((l: ExecutionLogApiRow) => ({
    id: l.id,
    ruleId: l.ruleId,
    status: l.status as ExecutionLog["status"],
    startedAt: l.startedAt,
    endedAt: l.endedAt,
    error: l.error,
    attemptCount: l.attemptCount,
    retryCount: l.retryCount,
    ruleName: l.ruleName,
    actionLabel: l.actionLabel
  }));
}

export async function fetchRules(): Promise<AutomationRule[]> {
  const api = getAssistantApi();
  if (!api?.listRules) return [];
  return api.listRules();
}

