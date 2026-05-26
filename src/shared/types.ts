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

export type Task = {
  id: string;
  title: string;
  notes: string;
  dueAt: string | null;
  priority: "low" | "normal" | "high";
  status: "open" | "done";
  recurrence: "none" | "daily" | "weekly" | "monthly";
  notifyChannel: "desktop";
  createdAt: string;
  updatedAt: string;
  lastCompletedAt: string | null;
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

export type AutomationRuleLocalTask = AutomationRuleBase & {
  actionType: "localTask";
  actionConfig: {
    title: string;
    notes: string;
    dueAt: string | null;
    priority: "low" | "normal" | "high";
    recurrence: "none" | "daily" | "weekly" | "monthly";
  };
};

export type AutomationRuleHaToggle = AutomationRuleBase & {
  actionType: "haToggle";
  actionConfig: { entityId: string };
};

export type AutomationRule = AutomationRuleLocalReminder | AutomationRuleLocalTask | AutomationRuleHaToggle;

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

export type FinanceCategory =
  | "housing"
  | "utilities"
  | "food"
  | "transport"
  | "health"
  | "subscriptions"
  | "debt"
  | "income"
  | "other";

export type FinanceBill = {
  id: string;
  name: string;
  amount: number; // stored as integer cents
  dueAt: string;
  recurrence: "none" | "weekly" | "monthly" | "yearly";
  category: FinanceCategory;
  status: "unpaid" | "paid";
  notes: string;
  createdAt: string;
  updatedAt: string;
  lastPaidAt: string | null;
};

export type FinanceExpense = {
  id: string;
  description: string;
  amount: number; // stored as integer cents
  date: string;
  category: FinanceCategory;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type FinanceMonthlySummary = {
  upcomingBills: number;
  paidBills: number;
  unpaidBills: number;
  totalExpenses: number;
  totalCommittedAmount: number;
};

// Car types
export type CarVehicle = {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string | null;
  vin: string | null;
  color: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null; // stored as integer cents
  currentMileage: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CarFuelEntry = {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  fuelAmount: number;
  fuelUnit: string;
  pricePerUnit: number; // stored as integer cents
  totalPrice: number; // stored as integer cents
  station: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CarMaintenance = {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number | null;
  type: string;
  description: string;
  cost: number; // stored as integer cents
  shop: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CarRecurringBill = {
  id: string;
  vehicleId: string;
  name: string;
  type: string;
  amount: number; // stored as integer cents
  dueDate: string;
  frequency: string;
  status: "pending" | "paid";
  lastPaidDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CarMileage = {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CarServiceReminder = {
  id: string;
  vehicleId: string;
  type: string;
  description: string;
  dueOdometer: number | null;
  dueDate: string | null;
  status: "pending" | "completed";
  completedAt: string | null;
  completedOdometer: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

// Family types
export type FamilyOccasionType = "birthday" | "name_day" | "anniversary" | "memorial" | "custom";
export type FamilyObligationType = "call" | "visit" | "message" | "gift" | "paperwork" | "custom";
export type FamilyObligationStatus = "open" | "done";
export type FamilyPriority = "low" | "normal" | "high";

export type FamilyMember = {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  preferredContactMethod: string;
  notes: string;
  isImportant: number; // stored as integer 0/1
  createdAt: string;
  updatedAt: string;
};

export type FamilyOccasion = {
  id: string;
  memberId: string;
  type: FamilyOccasionType;
  title: string;
  date: string;
  recurrence: string;
  remindDaysBefore: number;
  lastAcknowledgedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type FamilyObligation = {
  id: string;
  memberId: string;
  occasionId: string | null;
  type: FamilyObligationType;
  title: string;
  dueAt: string | null;
  status: FamilyObligationStatus;
  priority: FamilyPriority;
  completedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type FamilySummary = {
  totalMembers: number;
  importantMembers: number;
  upcomingOccasions: number;
  openObligations: number;
  overdueObligations: number;
};
