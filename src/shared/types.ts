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

export type AutomationRuleBase = {
  id: string;
  name: string;
  triggerType: "time";
  triggerConfig: { at: string };
  enabled: boolean;
};

export type AutomationRuleLocalReminder = AutomationRuleBase & {
  actionType: "localReminder";
  actionConfig: { text: string };
};

export type AutomationRuleHaToggle = AutomationRuleBase & {
  actionType: "haToggle";
  actionConfig: { entityId: string };
};

export type AutomationRule = AutomationRuleLocalReminder | AutomationRuleHaToggle;

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

export type AssistantSettings = {
  /** Legacy desk label (assistant.name in DB). */
  name: string;
  isConfigured: boolean;
  /** Your first name or nickname for greetings (user.preferredName). */
  userPreferredName: string;
  userPreferredNameIsSet: boolean;
};
