/**
 * Shared helper for safe window.assistantApi access.
 *
 * Provides typed optional and required access to the Electron preload bridge.
 * All renderer code should use these helpers instead of direct window.assistantApi access.
 */

import { PRELOAD_BRIDGE_MISSING_MESSAGE } from "../constants/assistant";
import type { ConnectedCalendarOAuthSetupStatus } from "../../shared/connectedCalendarOAuth";
import type { SecurityPolicy } from "../../shared/security";
import type { AssistantSettings, AutomationRule, Note, Reminder, Task, FinanceBill, FinanceExpense, FinanceMonthlySummary, CarVehicle, CarFuelEntry, CarMaintenance, CarRecurringBill, CarMileage, CarServiceReminder, FamilyMember, FamilyOccasion, FamilyObligation, FamilySummary, HealthAppointment, HealthMedication, HealthSymptom, HealthMeasurement, HealthObligation, HealthSummary, Hobby, HobbySession, HobbyProject, HobbyMilestone, HobbySupply, HobbySummary, ConnectedCalendarAccount, ExternalCalendarEvent } from "../../shared/types";
import type { TeamConfigStatus, TeamWorkspace, TeamProject, TeamProjectTask } from "../../shared/team/types";
import type { AiConfigStatus, AiProvider, AiActionDraft } from "../../shared/ai/types";

/**
 * The full AssistantApi interface exposed by the Electron preload script.
 * This matches the precise type declaration from vite-env.d.ts.
 */
export type AssistantApi = {
  listNotes: (query?: string) => Promise<Note[]>;
  createNote: (payload: { title: string; content: string; tags: string[]; pinned: boolean }) => Promise<Note>;
  updateNote: (payload: {
    id: string;
    title?: string;
    content?: string;
    tags?: string[];
    pinned?: boolean;
  }) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  listReminders: () => Promise<Reminder[]>;
  createReminder: (payload: { text: string; dueAt: string; recurrence: "none" | "daily" }) => Promise<Reminder>;
  updateReminder: (payload: { id: string; text?: string; dueAt?: string }) => Promise<void>;
  completeReminder: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  snoozeReminder: (id: string, minutes: number) => Promise<void>;
  listTasks: (query?: string) => Promise<Task[]>;
  createTask: (payload: {
    title: string;
    notes: string;
    dueAt: string | null;
    priority: "low" | "normal" | "high";
    recurrence: "none" | "daily" | "weekly" | "monthly";
  }) => Promise<Task>;
  updateTask: (payload: {
    id: string;
    title?: string;
    notes?: string;
    dueAt?: string | null;
    priority?: "low" | "normal" | "high";
    status?: "open" | "done";
    recurrence?: "none" | "daily" | "weekly" | "monthly";
  }) => Promise<Task>;
  completeTask: (id: string) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  configureHomeAssistant: (payload: { url: string; token: string }) => Promise<void>;
  getHomeAssistantConfig: () => Promise<{ url: string; hasToken: boolean }>;
  testHomeAssistant: () => Promise<boolean>;
  refreshHomeAssistantEntities: () => Promise<void>;
  listDevices: () => Promise<Array<{ entityId: string; friendlyName: string; state: string }>>;
  toggleDevice: (entityId: string) => Promise<void>;
  getAssistantSettings: () => Promise<AssistantSettings>;
  setAssistantName: (name: string) => Promise<AssistantSettings>;
  setUserPreferredName: (name: string) => Promise<AssistantSettings>;
  getSecurityPolicy: () => Promise<SecurityPolicy>;
  listConnectedCalendarAccounts: () => Promise<ConnectedCalendarAccount[]>;
  getConnectedCalendarAccountsSummary: () => Promise<{ total: number; synced: number; error: number }>;
  getConnectedCalendarOAuthSetup: () => Promise<ConnectedCalendarOAuthSetupStatus>;
  disconnectConnectedCalendarAccount: (accountId: string) => Promise<void>;
  listExternalCalendarEvents: (payload: {
    startAt: string;
    endAt: string;
    provider?: "google" | "microsoft";
    accountId?: string;
  }) => Promise<ExternalCalendarEvent[]>;
  startConnectedCalendarOAuth: (payload: { provider: "google" | "microsoft" }) => Promise<void>;
  completeConnectedCalendarOAuth: (payload: { provider: "google" | "microsoft" }) => Promise<ConnectedCalendarAccount>;
  syncConnectedCalendarAccount: (payload: { accountId: string }) => Promise<ConnectedCalendarAccount>;
  syncAllConnectedCalendarAccounts: () => Promise<ConnectedCalendarAccount[]>;
  listExecutionLogs: () => Promise<
    Array<{
      id: string;
      ruleId: string;
      status: string;
      startedAt: string;
      endedAt: string;
      error?: string;
      attemptCount: number;
      retryCount: number;
      ruleName: string;
      actionLabel: string;
    }>
  >;
  listRules: () => Promise<AutomationRule[]>;
  createRule: (payload: Omit<AutomationRule, "id" | "triggerType">) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  setRuleEnabled: (id: string, enabled: boolean) => Promise<void>;
  duplicateRule: (id: string) => Promise<AutomationRule>;
  testRunRule: (id: string) => Promise<void>;
  exportData: () => Promise<{
    version: string;
    exportedAt: string;
    notes: unknown[];
    reminders: unknown[];
    tasks: unknown[];
    automation_rules: unknown[];
    finance_bills?: unknown[];
    finance_expenses?: unknown[];
    car_vehicles?: unknown[];
    car_fuel_entries?: unknown[];
    car_maintenance?: unknown[];
    car_recurring_bills?: unknown[];
    car_mileage?: unknown[];
    car_service_reminders?: unknown[];
    family_members?: unknown[];
    family_occasions?: unknown[];
    family_obligations?: unknown[];
    health_appointments?: unknown[];
    health_medications?: unknown[];
    health_symptoms?: unknown[];
    health_measurements?: unknown[];
    health_obligations?: unknown[];
    hobbies?: unknown[];
    hobby_sessions?: unknown[];
    hobby_projects?: unknown[];
    hobby_milestones?: unknown[];
    hobby_supplies?: unknown[];
    app_settings: unknown[];
  }>;
  importData: (payload: {
    version: string;
    exportedAt: string;
    notes: unknown[];
    reminders: unknown[];
    tasks: unknown[];
    automation_rules: unknown[];
    finance_bills?: unknown[];
    finance_expenses?: unknown[];
    car_vehicles?: unknown[];
    car_fuel_entries?: unknown[];
    car_maintenance?: unknown[];
    car_recurring_bills?: unknown[];
    car_mileage?: unknown[];
    car_service_reminders?: unknown[];
    family_members?: unknown[];
    family_occasions?: unknown[];
    family_obligations?: unknown[];
    health_appointments?: unknown[];
    health_medications?: unknown[];
    health_symptoms?: unknown[];
    health_measurements?: unknown[];
    health_obligations?: unknown[];
    hobbies?: unknown[];
    hobby_sessions?: unknown[];
    hobby_projects?: unknown[];
    hobby_milestones?: unknown[];
    hobby_supplies?: unknown[];
    app_settings: unknown[];
  }) => Promise<{
    notes: number;
    reminders: number;
    tasks: number;
    automation_rules: number;
    finance_bills: number;
    finance_expenses: number;
    car_vehicles: number;
    car_fuel_entries: number;
    car_maintenance: number;
    car_recurring_bills: number;
    car_mileage: number;
    car_service_reminders: number;
    family_members: number;
    family_occasions: number;
    family_obligations: number;
    health_appointments: number;
    health_medications: number;
    health_symptoms: number;
    health_measurements: number;
    health_obligations: number;
    hobbies: number;
    hobby_sessions: number;
    hobby_projects: number;
    hobby_milestones: number;
    hobby_supplies: number;
    app_settings: number;
  }>;
  previewImportData: (payload: {
    version: string;
    exportedAt: string;
    notes: unknown[];
    reminders: unknown[];
    tasks: unknown[];
    automation_rules: unknown[];
    finance_bills?: unknown[];
    finance_expenses?: unknown[];
    car_vehicles?: unknown[];
    car_fuel_entries?: unknown[];
    car_maintenance?: unknown[];
    car_recurring_bills?: unknown[];
    car_mileage?: unknown[];
    car_service_reminders?: unknown[];
    family_members?: unknown[];
    family_occasions?: unknown[];
    family_obligations?: unknown[];
    health_appointments?: unknown[];
    health_medications?: unknown[];
    health_symptoms?: unknown[];
    health_measurements?: unknown[];
    health_obligations?: unknown[];
    hobbies?: unknown[];
    hobby_sessions?: unknown[];
    hobby_projects?: unknown[];
    hobby_milestones?: unknown[];
    hobby_supplies?: unknown[];
    app_settings: unknown[];
  }) => Promise<{
    valid: boolean;
    error?: string;
    notes: number;
    reminders: number;
    tasks: number;
    automation_rules: number;
    finance_bills: number;
    finance_expenses: number;
    car_vehicles: number;
    car_fuel_entries: number;
    car_maintenance: number;
    car_recurring_bills: number;
    car_mileage: number;
    car_service_reminders: number;
    family_members: number;
    family_occasions: number;
    family_obligations: number;
    health_appointments: number;
    health_medications: number;
    health_symptoms: number;
    health_measurements: number;
    health_obligations: number;
    hobbies: number;
    hobby_sessions: number;
    hobby_projects: number;
    hobby_milestones: number;
    hobby_supplies: number;
    app_settings: number;
    unsupported_sections: string[];
    has_encrypted_content: boolean;
    version: string;
    exportedAt: string;
  }>;
  resetData: () => Promise<void>;
  checkDbHealth: () => Promise<{
    overall_health: "healthy" | "degraded" | "critical";
    integrity_check: { passed: boolean; error?: string };
    schema_check: { passed: boolean; missing_tables: string[]; extra_tables: string[] };
    data_check: { total_rows: number; orphaned_records: number; corrupted_records: number };
    performance_check: {
      page_count: number;
      page_size: number;
      database_size_bytes: number;
      wal_enabled: boolean;
      wal_checkpoint_pending: boolean;
    };
    recommendations: string[];
  }>;
  optimizeDatabase: () => Promise<{ success: boolean; message: string }>;
  getOptimizeSuggestion: () => Promise<{
    shouldOptimize: boolean;
    writesSinceOptimize: number;
    threshold: number;
  }>;
  checkBackupDiskSpace: () => Promise<{
    freeBytes: number;
    totalBytes: number;
    estimatedBackupBytes: number;
    sufficient: boolean;
  }>;
  logRendererError: (payload: { message: string; stack?: string; componentStack?: string }) => Promise<void>;
  onRemindersUpdated: (cb: () => void) => () => void;
  onCommand: (cb: (_event: unknown, command: string) => void) => () => void;
  onShowAbout: (cb: () => void) => () => void;
  openHouseholdWindow: () => Promise<boolean>;
  focusDeskWindow: () => Promise<boolean>;
  hideDeskWindow: () => Promise<boolean>;
  openBugReport: () => Promise<boolean>;
  setTestHaFetchOverride: (
    config: { mode: "timeout" | "network_error" | "http_error"; status?: number } | null
  ) => Promise<void>;
  setTestAutomationActionOverride: (config: { mode: "timeout" | "failure" } | null) => Promise<void>;
  teamSetConfig: (payload: { supabaseUrl: string; supabaseAnonKey: string; displayName: string }) => Promise<void>;
  teamSetDisplayName: (payload: { displayName: string }) => Promise<void>;
  teamGetConfig: () => Promise<TeamConfigStatus>;
  teamClearConfig: () => Promise<void>;
  teamWorkspacesCreate: (payload: { name: string }) => Promise<TeamWorkspace>;
  teamWorkspacesJoin: (payload: { workspaceKey: string }) => Promise<TeamWorkspace>;
  teamWorkspacesList: () => Promise<TeamWorkspace[]>;
  teamWorkspacesSetActive: (payload: { workspaceId: string | null }) => Promise<void>;
  teamProjectsCreate: (payload: { name: string }) => Promise<TeamProject>;
  teamProjectsList: () => Promise<TeamProject[]>;
  teamTasksCreate: (payload: {
    projectId: string;
    title: string;
    notes: string;
    dueAt: string | null;
    priority: "low" | "normal" | "high";
    recurrence: "none" | "daily" | "weekly" | "monthly";
    assigneeDisplayName: string | null;
  }) => Promise<TeamProjectTask>;
  teamTasksUpdate: (payload: {
    id: string;
    title?: string;
    notes?: string;
    dueAt?: string | null;
    priority?: "low" | "normal" | "high";
    status?: "open" | "done";
    recurrence?: "none" | "daily" | "weekly" | "monthly";
    assigneeDisplayName?: string | null;
  }) => Promise<TeamProjectTask>;
  teamTasksList: () => Promise<TeamProjectTask[]>;
  teamRealtimeStart: () => Promise<void>;
  teamRealtimeStop: () => Promise<void>;
  onTeamDataUpdated: (
    callback: (event: unknown, payload: { workspaceId: string; tables: Array<"projects" | "tasks"> }) => void
  ) => () => void;
  getAiConfig: () => Promise<AiConfigStatus>;
  setAiKey: (payload: { provider: AiProvider; apiKey: string }) => Promise<AiConfigStatus>;
  clearAiKey: () => Promise<AiConfigStatus>;
  testAiKey: () => Promise<{ success: true; model: string }>;
  aiChat: (payload: {
    message: string;
    context?: { notesCount?: number; tasksCount?: number; remindersCount?: number; devicesCount?: number };
  }) => Promise<{ reply: string; actionDraft?: AiActionDraft }>;
  listBills: (filter?: "this_month" | "upcoming" | "overdue" | "unpaid" | "paid") => Promise<FinanceBill[]>;
  createBill: (payload: {
    name: string;
    amount: number;
    dueAt: string;
    recurrence: "none" | "weekly" | "monthly" | "yearly";
    category: "housing" | "utilities" | "food" | "transport" | "health" | "subscriptions" | "debt" | "income" | "other";
    notes?: string;
  }) => Promise<FinanceBill>;
  updateBill: (payload: {
    id: string;
    name?: string;
    amount?: number;
    dueAt?: string;
    recurrence?: "none" | "weekly" | "monthly" | "yearly";
    category?: "housing" | "utilities" | "food" | "transport" | "health" | "subscriptions" | "debt" | "income" | "other";
    status?: "unpaid" | "paid";
    notes?: string;
  }) => Promise<FinanceBill>;
  deleteBill: (id: string) => Promise<void>;
  markBillPaid: (id: string) => Promise<FinanceBill>;
  listExpenses: (filter?: "this_month") => Promise<FinanceExpense[]>;
  createExpense: (payload: {
    description: string;
    amount: number;
    date: string;
    category: "housing" | "utilities" | "food" | "transport" | "health" | "subscriptions" | "debt" | "income" | "other";
    notes?: string;
  }) => Promise<FinanceExpense>;
  updateExpense: (payload: {
    id: string;
    description?: string;
    amount?: number;
    date?: string;
    category?: "housing" | "utilities" | "food" | "transport" | "health" | "subscriptions" | "debt" | "income" | "other";
    notes?: string;
  }) => Promise<FinanceExpense>;
  deleteExpense: (id: string) => Promise<void>;
  getMonthlySummary: () => Promise<FinanceMonthlySummary>;
  // Car API
  listVehicles: () => Promise<CarVehicle[]>;
  createVehicle: (payload: {
    name: string;
    make: string;
    model: string;
    year: number;
    licensePlate?: string | null;
    vin?: string | null;
    color?: string | null;
    purchaseDate?: string | null;
    purchasePrice?: number | null;
    currentMileage: number;
    notes?: string;
  }) => Promise<CarVehicle>;
  updateVehicle: (payload: {
    id: string;
    name?: string;
    make?: string;
    model?: string;
    year?: number;
    licensePlate?: string | null;
    vin?: string | null;
    color?: string | null;
    purchaseDate?: string | null;
    purchasePrice?: number | null;
    currentMileage?: number;
    notes?: string;
  }) => Promise<CarVehicle>;
  deleteVehicle: (id: string) => Promise<void>;
  listFuelEntries: (vehicleId?: string) => Promise<CarFuelEntry[]>;
  createFuelEntry: (payload: {
    vehicleId: string;
    date: string;
    odometer: number;
    fuelAmount: number;
    fuelUnit?: string;
    pricePerUnit: number;
    totalPrice: number;
    station?: string | null;
    notes?: string;
  }) => Promise<CarFuelEntry>;
  updateFuelEntry: (payload: {
    id: string;
    vehicleId?: string;
    date?: string;
    odometer?: number;
    fuelAmount?: number;
    fuelUnit?: string;
    pricePerUnit?: number;
    totalPrice?: number;
    station?: string | null;
    notes?: string;
  }) => Promise<CarFuelEntry>;
  deleteFuelEntry: (id: string) => Promise<void>;
  listMaintenance: (vehicleId?: string) => Promise<CarMaintenance[]>;
  createMaintenance: (payload: {
    vehicleId: string;
    date: string;
    odometer?: number | null;
    type: string;
    description: string;
    cost: number;
    shop?: string | null;
    notes?: string;
  }) => Promise<CarMaintenance>;
  updateMaintenance: (payload: {
    id: string;
    vehicleId?: string;
    date?: string;
    odometer?: number | null;
    type?: string;
    description?: string;
    cost?: number;
    shop?: string | null;
    notes?: string;
  }) => Promise<CarMaintenance>;
  deleteMaintenance: (id: string) => Promise<void>;
  listRecurringBills: (vehicleId?: string) => Promise<CarRecurringBill[]>;
  createRecurringBill: (payload: {
    vehicleId: string;
    name: string;
    type: string;
    amount: number;
    dueDate: string;
    frequency: string;
    status?: "pending" | "paid";
    lastPaidDate?: string | null;
    notes?: string;
  }) => Promise<CarRecurringBill>;
  updateRecurringBill: (payload: {
    id: string;
    vehicleId?: string;
    name?: string;
    type?: string;
    amount?: number;
    dueDate?: string;
    frequency?: string;
    status?: "pending" | "paid";
    lastPaidDate?: string | null;
    notes?: string;
  }) => Promise<CarRecurringBill>;
  markRecurringBillPaid: (id: string) => Promise<CarRecurringBill>;
  deleteRecurringBill: (id: string) => Promise<void>;
  listMileage: (vehicleId?: string) => Promise<CarMileage[]>;
  createMileage: (payload: {
    vehicleId: string;
    date: string;
    odometer: number;
    notes?: string;
  }) => Promise<CarMileage>;
  updateMileage: (payload: {
    id: string;
    vehicleId?: string;
    date?: string;
    odometer?: number;
    notes?: string;
  }) => Promise<CarMileage>;
  deleteMileage: (id: string) => Promise<void>;
  listServiceReminders: (vehicleId?: string) => Promise<CarServiceReminder[]>;
  createServiceReminder: (payload: {
    vehicleId: string;
    type: string;
    description: string;
    dueOdometer?: number | null;
    dueDate?: string | null;
    status?: "pending" | "completed";
    completedAt?: string | null;
    completedOdometer?: number | null;
    notes?: string;
  }) => Promise<CarServiceReminder>;
  updateServiceReminder: (payload: {
    id: string;
    vehicleId?: string;
    type?: string;
    description?: string;
    dueOdometer?: number | null;
    dueDate?: string | null;
    status?: "pending" | "completed";
    completedAt?: string | null;
    completedOdometer?: number | null;
    notes?: string;
  }) => Promise<CarServiceReminder>;
  completeServiceReminder: (id: string) => Promise<CarServiceReminder>;
  deleteServiceReminder: (id: string) => Promise<void>;
  // Family API
  listFamilyMembers: () => Promise<FamilyMember[]>;
  createFamilyMember: (payload: {
    name: string;
    relationship: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    preferredContactMethod?: string;
    notes?: string;
    isImportant?: number;
  }) => Promise<FamilyMember>;
  updateFamilyMember: (payload: {
    id: string;
    name?: string;
    relationship?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    preferredContactMethod?: string;
    notes?: string;
    isImportant?: number;
  }) => Promise<FamilyMember>;
  deleteFamilyMember: (id: string) => Promise<void>;
  listFamilyOccasions: (memberId?: string) => Promise<FamilyOccasion[]>;
  createFamilyOccasion: (payload: {
    memberId: string;
    type: "birthday" | "name_day" | "anniversary" | "memorial" | "custom";
    title: string;
    date: string;
    recurrence?: string;
    remindDaysBefore?: number;
    lastAcknowledgedAt?: string | null;
    notes?: string;
  }) => Promise<FamilyOccasion>;
  updateFamilyOccasion: (payload: {
    id: string;
    memberId?: string;
    type?: "birthday" | "name_day" | "anniversary" | "memorial" | "custom";
    title?: string;
    date?: string;
    recurrence?: string;
    remindDaysBefore?: number;
    lastAcknowledgedAt?: string | null;
    notes?: string;
  }) => Promise<FamilyOccasion>;
  deleteFamilyOccasion: (id: string) => Promise<void>;
  listFamilyObligations: (memberId?: string) => Promise<FamilyObligation[]>;
  createFamilyObligation: (payload: {
    memberId: string;
    occasionId?: string | null;
    type: "call" | "visit" | "message" | "gift" | "paperwork" | "custom";
    title: string;
    dueAt?: string | null;
    status?: "open" | "done";
    priority?: "low" | "normal" | "high";
    completedAt?: string | null;
    notes?: string;
  }) => Promise<FamilyObligation>;
  updateFamilyObligation: (payload: {
    id: string;
    memberId?: string;
    occasionId?: string | null;
    type?: "call" | "visit" | "message" | "gift" | "paperwork" | "custom";
    title?: string;
    dueAt?: string | null;
    status?: "open" | "done";
    priority?: "low" | "normal" | "high";
    completedAt?: string | null;
    notes?: string;
  }) => Promise<FamilyObligation>;
  completeFamilyObligation: (id: string) => Promise<FamilyObligation>;
  deleteFamilyObligation: (id: string) => Promise<void>;
  getFamilySummary: () => Promise<FamilySummary>;

  // Health API
  listHealthAppointments: () => Promise<HealthAppointment[]>;
  createHealthAppointment: (payload: {
    type: "checkup" | "specialist" | "emergency" | "followup" | "procedure" | "custom";
    title: string;
    provider?: string | null;
    location?: string | null;
    date: string;
    time: string;
    duration: number;
    status?: "scheduled" | "completed" | "cancelled" | "missed";
    notes?: string;
  }) => Promise<HealthAppointment>;
  updateHealthAppointment: (payload: {
    id: string;
    type?: "checkup" | "specialist" | "emergency" | "followup" | "procedure" | "custom";
    title?: string;
    provider?: string | null;
    location?: string | null;
    date?: string;
    time?: string;
    duration?: number;
    status?: "scheduled" | "completed" | "cancelled" | "missed";
    notes?: string;
  }) => Promise<HealthAppointment>;
  deleteHealthAppointment: (id: string) => Promise<void>;
  listHealthMedications: () => Promise<HealthMedication[]>;
  createHealthMedication: (payload: {
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    status?: "active" | "discontinued" | "completed";
    startDate: string;
    endDate?: string | null;
    prescriber?: string | null;
    notes?: string;
  }) => Promise<HealthMedication>;
  updateHealthMedication: (payload: {
    id: string;
    name?: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    status?: "active" | "discontinued" | "completed";
    startDate?: string;
    endDate?: string | null;
    prescriber?: string | null;
    notes?: string;
  }) => Promise<HealthMedication>;
  deleteHealthMedication: (id: string) => Promise<void>;
  listHealthSymptoms: () => Promise<HealthSymptom[]>;
  createHealthSymptom: (payload: {
    name: string;
    severity: "mild" | "moderate" | "severe";
    startDate: string;
    endDate?: string | null;
    notes?: string;
  }) => Promise<HealthSymptom>;
  updateHealthSymptom: (payload: {
    id: string;
    name?: string;
    severity?: "mild" | "moderate" | "severe";
    startDate?: string;
    endDate?: string | null;
    notes?: string;
  }) => Promise<HealthSymptom>;
  deleteHealthSymptom: (id: string) => Promise<void>;
  listHealthMeasurements: () => Promise<HealthMeasurement[]>;
  createHealthMeasurement: (payload: {
    type: "weight" | "blood_pressure" | "heart_rate" | "temperature" | "blood_sugar" | "custom";
    value: string;
    unit: string;
    date: string;
    notes?: string;
  }) => Promise<HealthMeasurement>;
  updateHealthMeasurement: (payload: {
    id: string;
    type?: "weight" | "blood_pressure" | "heart_rate" | "temperature" | "blood_sugar" | "custom";
    value?: string;
    unit?: string;
    date?: string;
    notes?: string;
  }) => Promise<HealthMeasurement>;
  deleteHealthMeasurement: (id: string) => Promise<void>;
  listHealthObligations: () => Promise<HealthObligation[]>;
  createHealthObligation: (payload: {
    type: "refill" | "lab_test" | "vaccination" | "screening" | "exercise" | "custom";
    title: string;
    dueAt?: string | null;
    status?: "open" | "done";
    priority?: "low" | "normal" | "high";
    completedAt?: string | null;
    notes?: string;
  }) => Promise<HealthObligation>;
  updateHealthObligation: (payload: {
    id: string;
    type?: "refill" | "lab_test" | "vaccination" | "screening" | "exercise" | "custom";
    title?: string;
    dueAt?: string | null;
    status?: "open" | "done";
    priority?: "low" | "normal" | "high";
    completedAt?: string | null;
    notes?: string;
  }) => Promise<HealthObligation>;
  completeHealthObligation: (id: string) => Promise<HealthObligation>;
  deleteHealthObligation: (id: string) => Promise<void>;
  getHealthSummary: () => Promise<HealthSummary>;

  // Hobbies API
  listHobbies: () => Promise<Hobby[]>;
  createHobby: (payload: {
    name: string;
    category: string;
    description: string;
    status?: "active" | "paused" | "archived";
  }) => Promise<Hobby>;
  updateHobby: (payload: {
    id: string;
    name?: string;
    category?: string;
    description?: string;
    status?: "active" | "paused" | "archived";
  }) => Promise<Hobby>;
  deleteHobby: (id: string) => Promise<void>;
  listHobbySessions: (hobbyId?: string) => Promise<HobbySession[]>;
  createHobbySession: (payload: {
    hobbyId: string;
    date: string;
    durationMinutes: number;
    notes?: string;
    mood?: string;
    energy?: number | null;
    progressRating?: number | null;
  }) => Promise<HobbySession>;
  updateHobbySession: (payload: {
    id: string;
    hobbyId?: string;
    date?: string;
    durationMinutes?: number;
    notes?: string;
    mood?: string;
    energy?: number | null;
    progressRating?: number | null;
  }) => Promise<HobbySession>;
  deleteHobbySession: (id: string) => Promise<void>;
  listHobbyProjects: (hobbyId?: string) => Promise<HobbyProject[]>;
  createHobbyProject: (payload: {
    hobbyId: string;
    name: string;
    description: string;
    status?: "active" | "paused" | "completed" | "abandoned";
    targetDate?: string | null;
    completedAt?: string | null;
  }) => Promise<HobbyProject>;
  updateHobbyProject: (payload: {
    id: string;
    hobbyId?: string;
    name?: string;
    description?: string;
    status?: "active" | "paused" | "completed" | "abandoned";
    targetDate?: string | null;
    completedAt?: string | null;
  }) => Promise<HobbyProject>;
  completeHobbyProject: (id: string) => Promise<HobbyProject>;
  deleteHobbyProject: (id: string) => Promise<void>;
  listHobbyMilestones: (projectId?: string) => Promise<HobbyMilestone[]>;
  createHobbyMilestone: (payload: {
    projectId: string;
    name: string;
    description: string;
    targetDate?: string | null;
    completedAt?: string | null;
  }) => Promise<HobbyMilestone>;
  updateHobbyMilestone: (payload: {
    id: string;
    projectId?: string;
    name?: string;
    description?: string;
    targetDate?: string | null;
    completedAt?: string | null;
  }) => Promise<HobbyMilestone>;
  completeHobbyMilestone: (id: string) => Promise<HobbyMilestone>;
  deleteHobbyMilestone: (id: string) => Promise<void>;
  listHobbySupplies: (hobbyId?: string) => Promise<HobbySupply[]>;
  createHobbySupply: (payload: {
    hobbyId: string;
    projectId?: string | null;
    name: string;
    type: string;
    cost?: number | null;
    purchaseDate?: string | null;
    source?: string;
    notes?: string;
  }) => Promise<HobbySupply>;
  updateHobbySupply: (payload: {
    id: string;
    hobbyId?: string;
    projectId?: string | null;
    name?: string;
    type?: string;
    cost?: number | null;
    purchaseDate?: string | null;
    source?: string;
    notes?: string;
  }) => Promise<HobbySupply>;
  deleteHobbySupply: (id: string) => Promise<void>;
  getHobbiesSummary: () => Promise<HobbySummary>;
};

/**
 * Returns the AssistantApi if available, or null if running in a non-Electron context.
 * Use this for passive operations that should gracefully degrade when the preload bridge is missing.
 */
export function getAssistantApi(): AssistantApi | null {
  return (window as { assistantApi?: AssistantApi }).assistantApi ?? null;
}

/**
 * Returns the AssistantApi, or throws if the preload bridge is missing.
 * Use this for user-triggered actions that require the desktop app to function.
 */
export function requireAssistantApi(): AssistantApi {
  const api = getAssistantApi();
  if (!api) {
    throw new Error(PRELOAD_BRIDGE_MISSING_MESSAGE);
  }
  return api;
}
