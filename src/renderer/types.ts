import type { AutomationRule } from "../shared/types";

export type ThemeMode = "paper" | "obsidian" | "fog" | "deepblue";

export type HaDeviceRow = { entityId: string; friendlyName: string; state: string };

export type ExecutionLogRow = {
  id: string;
  status: string;
  startedAt: string;
  error?: string;
  attemptCount: number;
  retryCount: number;
};

export type ReminderFilter = "all" | "pending" | "done";

export type AutomationRuleListItem = Pick<AutomationRule, "id" | "name" | "triggerConfig" | "actionType" | "enabled">;
