export type ThemeMode = "light" | "dark";

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

export type AutomationRuleListItem = {
  id: string;
  name: string;
  triggerConfig: { at: string };
  actionType: string;
};
