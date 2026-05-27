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

// Health types
export type HealthAppointmentType = "checkup" | "specialist" | "emergency" | "followup" | "procedure" | "custom";
export type HealthAppointmentStatus = "scheduled" | "completed" | "cancelled" | "missed";
export type HealthMedicationStatus = "active" | "discontinued" | "completed";
export type HealthSymptomSeverity = "mild" | "moderate" | "severe";
export type HealthMeasurementType = "weight" | "blood_pressure" | "heart_rate" | "temperature" | "blood_sugar" | "custom";
export type HealthObligationType = "refill" | "lab_test" | "vaccination" | "screening" | "exercise" | "custom";
export type HealthObligationStatus = "open" | "done";
export type HealthPriority = "low" | "normal" | "high";

export type HealthAppointment = {
  id: string;
  type: HealthAppointmentType;
  title: string;
  provider: string | null;
  location: string | null;
  date: string;
  time: string;
  duration: number; // minutes
  status: HealthAppointmentStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type HealthMedication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string; // oral, injection, topical, etc.
  status: HealthMedicationStatus;
  startDate: string;
  endDate: string | null;
  prescriber: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type HealthSymptom = {
  id: string;
  name: string;
  severity: HealthSymptomSeverity;
  startDate: string;
  endDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type HealthMeasurement = {
  id: string;
  type: HealthMeasurementType;
  value: string;
  unit: string;
  date: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type HealthObligation = {
  id: string;
  type: HealthObligationType;
  title: string;
  dueAt: string;
  status: HealthObligationStatus;
  priority: HealthPriority;
  completedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type HealthSummary = {
  upcomingAppointments: number;
  activeMedications: number;
  activeSymptoms: number;
  recentMeasurements: number;
  openObligations: number;
  overdueObligations: number;
};

// Hobbies types
export type HobbyStatus = "active" | "paused" | "archived";
export type HobbyProjectStatus = "active" | "paused" | "completed" | "abandoned";

export type Hobby = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: HobbyStatus;
  createdAt: string;
  updatedAt: string;
};

export type HobbySession = {
  id: string;
  hobbyId: string;
  date: string;
  durationMinutes: number;
  notes: string;
  mood: string;
  energy: number | null; // 1-5 scale
  progressRating: number | null; // 1-5 scale
  createdAt: string;
  updatedAt: string;
};

export type HobbyProject = {
  id: string;
  hobbyId: string;
  name: string;
  description: string;
  status: HobbyProjectStatus;
  targetDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HobbyMilestone = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  targetDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HobbySupply = {
  id: string;
  hobbyId: string;
  projectId: string | null;
  name: string;
  type: string;
  cost: number | null; // cents
  purchaseDate: string | null;
  source: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type HobbySummary = {
  activeHobbies: number;
  sessionsThisMonth: number;
  openProjects: number;
  openMilestones: number;
  recentSessions: number;
};

// Connected Calendar types
export type ConnectedCalendarProvider = "google" | "microsoft";
export type ConnectedCalendarFeature = "calendar";
export type ConnectedCalendarSyncStateValue = "disconnected" | "connecting" | "syncing" | "synced" | "error";

export type ConnectedCalendarAccount = {
  id: string;
  provider: ConnectedCalendarProvider;
  accountLabel: string;
  email: string;
  enabledFeatures: string; // JSON string of ConnectedCalendarFeature[]
  syncState: ConnectedCalendarSyncStateValue;
  lastSyncAt: string | null;
  syncError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExternalCalendarEvent = {
  id: string;
  accountId: string;
  provider: ConnectedCalendarProvider;
  externalId: string;
  calendarId: string | null;
  calendarName: string | null;
  title: string;
  startAt: string;
  endAt: string;
  allDay: number; // stored as INTEGER 0/1
  location: string | null;
  status: string | null;
  attendeesCount: number;
  htmlLink: string | null;
  etag: string | null;
  updatedAtProvider: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExternalCalendarSyncState = {
  id: string;
  accountId: string;
  calendarId: string;
  provider: ConnectedCalendarProvider;
  syncToken: string | null;
  deltaLink: string | null;
  lastFullSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
};
