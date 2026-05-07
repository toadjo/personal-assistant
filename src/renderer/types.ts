import type { AutomationRule } from "../shared/types";

export type ThemeMode = "light" | "dark" | "system";

export type HaDeviceRow = {
  entityId: string;
  friendlyName: string;
  state: string;
  attributes?: Record<string, unknown>;
};

export type ExecutionLogRow = {
  id: number;
  ruleId: number;
  status: "success" | "error";
  message: string;
  executedAt: string;
};

export type ReminderFilter = "all" | "pending" | "done";
export type TaskFilter = "all" | "open" | "completed";

export type AutomationRuleListItem = {
  id: number;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  lastExecutedAt?: string;
};

export type BriefItemKind = "task" | "reminder" | "note" | "agenda";
export type BriefItemUrgency = "overdue" | "today" | "upcoming" | "context";
export type BriefItem = {
  kind: BriefItemKind;
  label: string;
  detail?: string;
  urgency: BriefItemUrgency;
  sourceId: string;
};
