import type { AutomationRule, ExecutionLog } from "../shared/types";

export type ThemeMode = "glass" | "paper" | "obsidian" | "fog" | "deepblue" | "corporate";

export type HaDeviceRow = {
  entityId: string;
  friendlyName: string;
  state: string;
  attributes?: Record<string, unknown>;
};

export type ExecutionLogRow = ExecutionLog & {
  ruleName?: string;
  actionLabel?: string;
};

export type ReminderFilter = "all" | "pending" | "done";
export type TaskFilter = "all" | "open" | "done" | "overdue";

export type AutomationRuleListItem = Omit<AutomationRule, "actionConfig"> & {
  lastExecutedAt?: string;
};

export type BriefItemKind = "task" | "reminder" | "note" | "agenda" | "team-task" | "automation";
export type BriefItemUrgency = "overdue" | "today" | "upcoming" | "context";
export type BriefItem = {
  kind: BriefItemKind;
  label: string;
  detail?: string;
  urgency: BriefItemUrgency;
  sourceId: string;
};

export type AwayBriefItemKind = "task" | "reminder" | "note";
export type AwayBriefReason = "new" | "updated" | "due" | "overdue";
export type AwayBriefItem = {
  kind: AwayBriefItemKind;
  reason: AwayBriefReason;
  label: string;
  detail?: string;
  sourceId: string;
  changedAt: string;
};
