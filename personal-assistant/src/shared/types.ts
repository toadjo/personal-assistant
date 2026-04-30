export type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Reminder = {
  id: string;
  text: string;
  dueAt: string;
  recurrence: "none" | "daily";
  status: "pending" | "done";
  notifyChannel: "desktop";
};

export type AutomationRule = {
  id: string;
  name: string;
  triggerType: "time";
  triggerConfig: { at: string };
  actionType: "localReminder" | "haToggle";
  actionConfig: Record<string, string>;
  enabled: boolean;
};

export type DeviceCache = {
  id: string;
  entityId: string;
  friendlyName: string;
  domain: string;
  state: string;
  attributes: string;
  lastSeenAt: string;
};

export type ExecutionLog = {
  id: string;
  ruleId: string;
  status: "success" | "failed";
  startedAt: string;
  endedAt: string;
  error?: string;
  attemptCount: number;
  retryCount: number;
};
