import { app } from "electron";
import { getDb } from "../db";
import { encryptSecret, decryptSecret, SecureStorageUnavailableError } from "./secureSecrets";
import { isCorporateMode } from "../security/policy";
import { isConnectedCalendarTokenSettingKey } from "./connectedCalendarSecrets";

/**
 * Secret setting keys that should never be included in backups.
 */
const SECRET_SETTING_KEYS = ["ha.token", "ai.apiKey", "ai.provider", "ai.configured", "ai.lastTestedAt"] as const;

function isSecretSettingKey(key: string): boolean {
  return (
    SECRET_SETTING_KEYS.includes(key as (typeof SECRET_SETTING_KEYS)[number]) || isConnectedCalendarTokenSettingKey(key)
  );
}

export type BackupPayload = {
  version: string;
  exportedAt: string;
  notes?: Array<{
    id: string;
    title: string;
    content: string;
    tags: string;
    pinned: number;
    createdAt: string;
    updatedAt: string;
  }>;
  reminders?: Array<{
    id: string;
    text: string;
    dueAt: string;
    recurrence: string;
    status: string;
    notifyChannel: string;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    notes: string;
    dueAt: string | null;
    priority: string;
    status: string;
    recurrence: string;
    notifyChannel: string;
    createdAt: string;
    updatedAt: string;
    lastCompletedAt: string | null;
  }>;
  automation_rules?: Array<{
    id: string;
    name: string;
    triggerType: string;
    triggerConfig: string;
    actionType: string;
    actionConfig: string;
    enabled: number;
    lastFiredAt: string | null;
  }>;
  finance_bills?: Array<{
    id: string;
    name: string;
    amount: number;
    dueAt: string;
    recurrence: string;
    category: string;
    status: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
    lastPaidAt: string | null;
  }>;
  finance_expenses?: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  car_vehicles?: Array<{
    id: string;
    name: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string | null;
    vin: string | null;
    color: string | null;
    purchaseDate: string | null;
    purchasePrice: number | null;
    currentMileage: number;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  car_fuel_entries?: Array<{
    id: string;
    vehicleId: string;
    date: string;
    odometer: number;
    fuelAmount: number;
    fuelUnit: string;
    pricePerUnit: number;
    totalPrice: number;
    station: string | null;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  car_maintenance?: Array<{
    id: string;
    vehicleId: string;
    date: string;
    odometer: number | null;
    type: string;
    description: string;
    cost: number;
    shop: string | null;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  car_recurring_bills?: Array<{
    id: string;
    vehicleId: string;
    name: string;
    type: string;
    amount: number;
    dueDate: string;
    frequency: string;
    status: string;
    lastPaidDate: string | null;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  car_mileage?: Array<{
    id: string;
    vehicleId: string;
    date: string;
    odometer: number;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  car_service_reminders?: Array<{
    id: string;
    vehicleId: string;
    type: string;
    description: string;
    dueOdometer: number | null;
    dueDate: string | null;
    status: string;
    completedAt: string | null;
    completedOdometer: number | null;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  family_members?: Array<{
    id: string;
    name: string;
    relationship: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    preferredContactMethod: string;
    notes: string;
    isImportant: number;
    createdAt: string;
    updatedAt: string;
  }>;
  family_occasions?: Array<{
    id: string;
    memberId: string;
    type: string;
    title: string;
    date: string;
    recurrence: string;
    remindDaysBefore: number;
    lastAcknowledgedAt: string | null;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  family_obligations?: Array<{
    id: string;
    memberId: string;
    occasionId: string | null;
    type: string;
    title: string;
    dueAt: string | null;
    status: string;
    priority: string;
    completedAt: string | null;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  health_appointments?: Array<{
    id: string;
    type: string;
    title: string;
    provider: string | null;
    location: string | null;
    date: string;
    time: string;
    duration: number;
    status: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  health_medications?: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    status: string;
    startDate: string;
    endDate: string | null;
    prescriber: string | null;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  health_symptoms?: Array<{
    id: string;
    name: string;
    severity: string;
    startDate: string;
    endDate: string | null;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  health_measurements?: Array<{
    id: string;
    type: string;
    value: string;
    unit: string;
    date: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  health_obligations?: Array<{
    id: string;
    type: string;
    title: string;
    dueAt: string | null;
    status: string;
    priority: string;
    completedAt: string | null;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  hobbies?: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  hobby_sessions?: Array<{
    id: string;
    hobbyId: string;
    date: string;
    durationMinutes: number;
    notes: string;
    mood: string;
    energy: number | null;
    progressRating: number | null;
    createdAt: string;
    updatedAt: string;
  }>;
  hobby_projects?: Array<{
    id: string;
    hobbyId: string;
    name: string;
    description: string;
    status: string;
    targetDate: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  hobby_milestones?: Array<{
    id: string;
    projectId: string;
    name: string;
    description: string;
    targetDate: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  hobby_supplies?: Array<{
    id: string;
    hobbyId: string;
    projectId: string | null;
    name: string;
    type: string;
    cost: number | null;
    purchaseDate: string | null;
    source: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  connected_accounts?: Array<{
    id: string;
    provider: string;
    accountLabel: string;
    email: string;
    enabledFeatures: string;
    syncState: string;
    lastSyncAt: string | null;
    syncError: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  external_calendar_events?: Array<{
    id: string;
    accountId: string;
    provider: string;
    externalId: string;
    calendarId: string | null;
    calendarName: string | null;
    title: string;
    startAt: string;
    endAt: string;
    allDay: number;
    location: string | null;
    status: string | null;
    attendeesCount: number;
    htmlLink: string | null;
    etag: string | null;
    updatedAtProvider: string | null;
    isOnlineMeeting: number;
    onlineMeetingProvider: string | null;
    onlineMeetingUrl: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  external_calendar_sync_state?: Array<{
    id: string;
    accountId: string;
    calendarId: string;
    provider: string;
    syncToken: string | null;
    deltaLink: string | null;
    lastFullSyncAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  app_settings?: Array<{
    key: string;
    value: string;
    updatedAt: string;
  }>;
  _encrypted?: string;
};

export type BackupExportOptions = {
  encrypt?: boolean;
};

export type BackupImportOptions = {
  encrypted?: boolean;
};

export type BackupPreviewResult = {
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
  connected_accounts: number;
  external_calendar_events: number;
  external_calendar_sync_state: number;
  app_settings: number;
  unsupported_sections: string[];
  has_encrypted_content: boolean;
  version: string;
  exportedAt: string;
};

export function exportBackup(options?: BackupExportOptions): BackupPayload {
  const db = getDb();
  const notes = db.prepare("SELECT * FROM notes").all() as BackupPayload["notes"];
  const reminders = db.prepare("SELECT * FROM reminders").all() as BackupPayload["reminders"];
  const tasks = db.prepare("SELECT * FROM tasks").all() as BackupPayload["tasks"];
  const automation_rules = db.prepare("SELECT * FROM automation_rules").all() as BackupPayload["automation_rules"];
  const finance_bills = db.prepare("SELECT * FROM finance_bills").all() as BackupPayload["finance_bills"];
  const finance_expenses = db.prepare("SELECT * FROM finance_expenses").all() as BackupPayload["finance_expenses"];
  const car_vehicles = db.prepare("SELECT * FROM car_vehicles").all() as BackupPayload["car_vehicles"];
  const car_fuel_entries = db.prepare("SELECT * FROM car_fuel_entries").all() as BackupPayload["car_fuel_entries"];
  const car_maintenance = db.prepare("SELECT * FROM car_maintenance").all() as BackupPayload["car_maintenance"];
  const car_recurring_bills = db.prepare("SELECT * FROM car_recurring_bills").all() as BackupPayload["car_recurring_bills"];
  const car_mileage = db.prepare("SELECT * FROM car_mileage").all() as BackupPayload["car_mileage"];
  const car_service_reminders = db.prepare("SELECT * FROM car_service_reminders").all() as BackupPayload["car_service_reminders"];
  const family_members = db.prepare("SELECT * FROM family_members").all() as BackupPayload["family_members"];
  const family_occasions = db.prepare("SELECT * FROM family_occasions").all() as BackupPayload["family_occasions"];
  const family_obligations = db.prepare("SELECT * FROM family_obligations").all() as BackupPayload["family_obligations"];
  const health_appointments = db.prepare("SELECT * FROM health_appointments").all() as BackupPayload["health_appointments"];
  const health_medications = db.prepare("SELECT * FROM health_medications").all() as BackupPayload["health_medications"];
  const health_symptoms = db.prepare("SELECT * FROM health_symptoms").all() as BackupPayload["health_symptoms"];
  const health_measurements = db.prepare("SELECT * FROM health_measurements").all() as BackupPayload["health_measurements"];
  const health_obligations = db.prepare("SELECT * FROM health_obligations").all() as BackupPayload["health_obligations"];
  const hobbies = db.prepare("SELECT * FROM hobbies").all() as BackupPayload["hobbies"];
  const hobby_sessions = db.prepare("SELECT * FROM hobby_sessions").all() as BackupPayload["hobby_sessions"];
  const hobby_projects = db.prepare("SELECT * FROM hobby_projects").all() as BackupPayload["hobby_projects"];
  const hobby_milestones = db.prepare("SELECT * FROM hobby_milestones").all() as BackupPayload["hobby_milestones"];
  const hobby_supplies = db.prepare("SELECT * FROM hobby_supplies").all() as BackupPayload["hobby_supplies"];
  const connected_accounts = db.prepare("SELECT * FROM connected_accounts").all() as BackupPayload["connected_accounts"];
  const external_calendar_events = db
    .prepare("SELECT * FROM external_calendar_events")
    .all() as BackupPayload["external_calendar_events"];
  const external_calendar_sync_state = db
    .prepare("SELECT * FROM external_calendar_sync_state")
    .all() as BackupPayload["external_calendar_sync_state"];

  // Filter out secret settings from backup
  const allSettings = db.prepare("SELECT * FROM app_settings").all() as BackupPayload["app_settings"];
  const app_settings = (allSettings || []).filter((setting) => !isSecretSettingKey(setting.key));

  const payload: BackupPayload = {
    version: app.getVersion(),
    exportedAt: new Date().toISOString(),
    notes,
    reminders,
    tasks,
    automation_rules,
    finance_bills,
    finance_expenses,
    car_vehicles,
    car_fuel_entries,
    car_maintenance,
    car_recurring_bills,
    car_mileage,
    car_service_reminders,
    family_members,
    family_occasions,
    family_obligations,
    health_appointments,
    health_medications,
    health_symptoms,
    health_measurements,
    health_obligations,
    hobbies,
    hobby_sessions,
    hobby_projects,
    hobby_milestones,
    hobby_supplies,
    connected_accounts,
    external_calendar_events,
    external_calendar_sync_state,
    app_settings
  };

  // In corporate mode, encrypt by default unless explicitly disabled
  const shouldEncrypt = options?.encrypt ?? isCorporateMode();
  if (shouldEncrypt) {
    try {
      const json = JSON.stringify(payload);
      const encrypted = encryptSecret(json);

      // When encrypted, return ONLY metadata + _encrypted, no plaintext arrays
      return {
        version: payload.version,
        exportedAt: payload.exportedAt,
        _encrypted: encrypted
      };
    } catch (error) {
      if (error instanceof SecureStorageUnavailableError) {
        // In corporate mode, fail closed when secure storage is unavailable
        if (isCorporateMode()) {
          throw new Error(
            "Corporate mode requires encrypted backup, but secure storage is unavailable. " +
              "Ensure your system supports safeStorage or enable encryption in your security settings."
          );
        }
        // In personal mode, fall back to unencrypted if secure storage is unavailable
        return payload;
      }
      throw error;
    }
  }

  return payload;
}

export function previewBackup(payload: BackupPayload): BackupPreviewResult {
  // Basic structure validation
  if (!payload || typeof payload !== "object") {
    return {
      valid: false,
      error: "Invalid backup: payload is not an object",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: "unknown",
      exportedAt: "unknown"
    };
  }

  // Check if encrypted
  const isEncrypted = payload._encrypted !== undefined && !payload.notes;
  if (isEncrypted) {
    // For encrypted backups, we can only show metadata
    return {
      valid: true,
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: true,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  // Validate required fields
  if (!payload.version || !payload.exportedAt) {
    return {
      valid: false,
      error: "Invalid backup: missing version or exportedAt field",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  // Validate data structure
  const unsupported_sections: string[] = [];

  if (payload.notes && !Array.isArray(payload.notes)) {
    return {
      valid: false,
      error: "Invalid backup: notes field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version,
      exportedAt: payload.exportedAt
    };
  }

  if (payload.reminders && !Array.isArray(payload.reminders)) {
    return {
      valid: false,
      error: "Invalid backup: reminders field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version,
      exportedAt: payload.exportedAt
    };
  }

  if (payload.tasks && !Array.isArray(payload.tasks)) {
    return {
      valid: false,
      error: "Invalid backup: tasks field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version,
      exportedAt: payload.exportedAt
    };
  }

  if (payload.automation_rules && !Array.isArray(payload.automation_rules)) {
    return {
      valid: false,
      error: "Invalid backup: automation_rules field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.app_settings && !Array.isArray(payload.app_settings)) {
    return {
      valid: false,
      error: "Invalid backup: app_settings field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.finance_bills && !Array.isArray(payload.finance_bills)) {
    return {
      valid: false,
      error: "Invalid backup: finance_bills field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.family_members && !Array.isArray(payload.family_members)) {
    return {
      valid: false,
      error: "Invalid backup: family_members field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.family_occasions && !Array.isArray(payload.family_occasions)) {
    return {
      valid: false,
      error: "Invalid backup: family_occasions field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.family_obligations && !Array.isArray(payload.family_obligations)) {
    return {
      valid: false,
      error: "Invalid backup: family_obligations field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.health_appointments && !Array.isArray(payload.health_appointments)) {
    return {
      valid: false,
      error: "Invalid backup: health_appointments field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.health_medications && !Array.isArray(payload.health_medications)) {
    return {
      valid: false,
      error: "Invalid backup: health_medications field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.health_symptoms && !Array.isArray(payload.health_symptoms)) {
    return {
      valid: false,
      error: "Invalid backup: health_symptoms field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.finance_expenses && !Array.isArray(payload.finance_expenses)) {
    return {
      valid: false,
      error: "Invalid backup: finance_expenses field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.hobbies && !Array.isArray(payload.hobbies)) {
    return {
      valid: false,
      error: "Invalid backup: hobbies field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.hobby_sessions && !Array.isArray(payload.hobby_sessions)) {
    return {
      valid: false,
      error: "Invalid backup: hobby_sessions field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.hobby_projects && !Array.isArray(payload.hobby_projects)) {
    return {
      valid: false,
      error: "Invalid backup: hobby_projects field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.hobby_milestones && !Array.isArray(payload.hobby_milestones)) {
    return {
      valid: false,
      error: "Invalid backup: hobby_milestones field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  if (payload.hobby_supplies && !Array.isArray(payload.hobby_supplies)) {
    return {
      valid: false,
      error: "Invalid backup: hobby_supplies field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      finance_bills: 0,
      finance_expenses: 0,
      car_vehicles: 0,
      car_fuel_entries: 0,
      car_maintenance: 0,
      car_recurring_bills: 0,
      car_mileage: 0,
      car_service_reminders: 0,
      family_members: 0,
      family_occasions: 0,
      family_obligations: 0,
      health_appointments: 0,
      health_medications: 0,
      health_symptoms: 0,
      health_measurements: 0,
      health_obligations: 0,
      hobbies: 0,
      hobby_sessions: 0,
      hobby_projects: 0,
      hobby_milestones: 0,
      hobby_supplies: 0,
      connected_accounts: 0,
      external_calendar_events: 0,
      external_calendar_sync_state: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  // Check for unsupported fields
  const knownFields = [
    "version",
    "exportedAt",
    "notes",
    "reminders",
    "tasks",
    "automation_rules",
    "finance_bills",
    "finance_expenses",
    "car_vehicles",
    "car_fuel_entries",
    "car_maintenance",
    "car_recurring_bills",
    "car_mileage",
    "car_service_reminders",
    "family_members",
    "family_occasions",
    "family_obligations",
    "health_appointments",
    "health_medications",
    "health_symptoms",
    "health_measurements",
    "health_obligations",
    "hobbies",
    "hobby_sessions",
    "hobby_projects",
    "hobby_milestones",
    "hobby_supplies",
    "connected_accounts",
    "external_calendar_events",
    "external_calendar_sync_state",
    "app_settings",
    "_encrypted"
  ];
  const payloadKeys = Object.keys(payload);
  for (const key of payloadKeys) {
    if (!knownFields.includes(key)) {
      unsupported_sections.push(key);
    }
  }

  // Count items that would be imported
  const notes = payload.notes?.length ?? 0;
  const reminders = payload.reminders?.length ?? 0;
  const tasks = payload.tasks?.length ?? 0;
  const automation_rules = payload.automation_rules?.length ?? 0;
  const finance_bills = payload.finance_bills?.length ?? 0;
  const finance_expenses = payload.finance_expenses?.length ?? 0;
  const car_vehicles = payload.car_vehicles?.length ?? 0;
  const car_fuel_entries = payload.car_fuel_entries?.length ?? 0;
  const car_maintenance = payload.car_maintenance?.length ?? 0;
  const car_recurring_bills = payload.car_recurring_bills?.length ?? 0;
  const car_mileage = payload.car_mileage?.length ?? 0;
  const car_service_reminders = payload.car_service_reminders?.length ?? 0;
  const family_members = payload.family_members?.length ?? 0;
  const family_occasions = payload.family_occasions?.length ?? 0;
  const family_obligations = payload.family_obligations?.length ?? 0;
  const health_appointments = payload.health_appointments?.length ?? 0;
  const health_medications = payload.health_medications?.length ?? 0;
  const health_symptoms = payload.health_symptoms?.length ?? 0;
  const health_measurements = payload.health_measurements?.length ?? 0;
  const health_obligations = payload.health_obligations?.length ?? 0;
  const app_settings = payload.app_settings?.length ?? 0;
  const hobbies = payload.hobbies?.length ?? 0;
  const hobby_sessions = payload.hobby_sessions?.length ?? 0;
  const hobby_projects = payload.hobby_projects?.length ?? 0;
  const hobby_milestones = payload.hobby_milestones?.length ?? 0;
  const hobby_supplies = payload.hobby_supplies?.length ?? 0;
  const connected_accounts = payload.connected_accounts?.length ?? 0;
  const external_calendar_events = payload.external_calendar_events?.length ?? 0;
  const external_calendar_sync_state = payload.external_calendar_sync_state?.length ?? 0;

  return {
    valid: true,
    notes,
    reminders,
    tasks,
    automation_rules,
    finance_bills,
    finance_expenses,
    car_vehicles,
    car_fuel_entries,
    car_maintenance,
    car_recurring_bills,
    car_mileage,
    car_service_reminders,
    family_members,
    family_occasions,
    family_obligations,
    health_appointments,
    health_medications,
    health_symptoms,
    health_measurements,
    health_obligations,
    hobbies,
    hobby_sessions,
    hobby_projects,
    hobby_milestones,
    hobby_supplies,
    connected_accounts,
    external_calendar_events,
    external_calendar_sync_state,
    app_settings,
    unsupported_sections,
    has_encrypted_content: false,
    version: payload.version,
    exportedAt: payload.exportedAt
  };
}

export function importBackup(
  payload: BackupPayload,
  _options?: BackupImportOptions
): {
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
  connected_accounts: number;
  external_calendar_events: number;
  external_calendar_sync_state: number;
  app_settings: number;
  rejected_secret_settings: number;
} {
  let actualPayload = payload;

  // Decrypt if payload is encrypted
  const isEncrypted = payload._encrypted !== undefined && !payload.notes;
  if (isEncrypted && payload._encrypted) {
    const decrypted = decryptSecret(payload._encrypted);
    if (!decrypted) {
      throw new Error("Failed to decrypt backup. The backup may be corrupted or was encrypted on a different system.");
    }
    try {
      actualPayload = JSON.parse(decrypted) as BackupPayload;
    } catch {
      throw new Error("Failed to parse decrypted backup. The backup may be corrupted.");
    }
  }

  // Ensure required fields exist after decryption
  if (!actualPayload.notes) actualPayload.notes = [];
  if (!actualPayload.reminders) actualPayload.reminders = [];
  if (!actualPayload.tasks) actualPayload.tasks = [];
  if (!actualPayload.automation_rules) actualPayload.automation_rules = [];
  if (!actualPayload.finance_bills) actualPayload.finance_bills = [];
  if (!actualPayload.finance_expenses) actualPayload.finance_expenses = [];
  if (!actualPayload.car_vehicles) actualPayload.car_vehicles = [];
  if (!actualPayload.car_fuel_entries) actualPayload.car_fuel_entries = [];
  if (!actualPayload.car_maintenance) actualPayload.car_maintenance = [];
  if (!actualPayload.car_recurring_bills) actualPayload.car_recurring_bills = [];
  if (!actualPayload.car_mileage) actualPayload.car_mileage = [];
  if (!actualPayload.car_service_reminders) actualPayload.car_service_reminders = [];
  if (!actualPayload.family_members) actualPayload.family_members = [];
  if (!actualPayload.family_occasions) actualPayload.family_occasions = [];
  if (!actualPayload.family_obligations) actualPayload.family_obligations = [];
  if (!actualPayload.health_appointments) actualPayload.health_appointments = [];
  if (!actualPayload.health_medications) actualPayload.health_medications = [];
  if (!actualPayload.health_symptoms) actualPayload.health_symptoms = [];
  if (!actualPayload.health_measurements) actualPayload.health_measurements = [];
  if (!actualPayload.health_obligations) actualPayload.health_obligations = [];
  if (!actualPayload.hobbies) actualPayload.hobbies = [];
  if (!actualPayload.hobby_sessions) actualPayload.hobby_sessions = [];
  if (!actualPayload.hobby_projects) actualPayload.hobby_projects = [];
  if (!actualPayload.hobby_milestones) actualPayload.hobby_milestones = [];
  if (!actualPayload.hobby_supplies) actualPayload.hobby_supplies = [];
  if (!actualPayload.connected_accounts) actualPayload.connected_accounts = [];
  if (!actualPayload.external_calendar_events) actualPayload.external_calendar_events = [];
  if (!actualPayload.external_calendar_sync_state) actualPayload.external_calendar_sync_state = [];
  if (!actualPayload.app_settings) actualPayload.app_settings = [];

  const db = getDb();
  let rejectedSecretSettings = 0;

  db.transaction(() => {
    db.prepare("DELETE FROM notes").run();
    db.prepare("DELETE FROM reminders").run();
    db.prepare("DELETE FROM tasks").run();
    db.prepare("DELETE FROM automation_rules").run();
    db.prepare("DELETE FROM finance_bills").run();
    db.prepare("DELETE FROM finance_expenses").run();
    db.prepare("DELETE FROM car_vehicles").run();
    db.prepare("DELETE FROM car_fuel_entries").run();
    db.prepare("DELETE FROM car_maintenance").run();
    db.prepare("DELETE FROM car_recurring_bills").run();
    db.prepare("DELETE FROM car_mileage").run();
    db.prepare("DELETE FROM car_service_reminders").run();
    db.prepare("DELETE FROM family_members").run();
    db.prepare("DELETE FROM family_occasions").run();
    db.prepare("DELETE FROM family_obligations").run();
    db.prepare("DELETE FROM health_appointments").run();
    db.prepare("DELETE FROM health_medications").run();
    db.prepare("DELETE FROM health_symptoms").run();
    db.prepare("DELETE FROM health_measurements").run();
    db.prepare("DELETE FROM health_obligations").run();
    db.prepare("DELETE FROM hobbies").run();
    db.prepare("DELETE FROM hobby_sessions").run();
    db.prepare("DELETE FROM hobby_projects").run();
    db.prepare("DELETE FROM hobby_milestones").run();
    db.prepare("DELETE FROM hobby_supplies").run();
    db.prepare("DELETE FROM external_calendar_events").run();
    db.prepare("DELETE FROM external_calendar_sync_state").run();
    db.prepare("DELETE FROM connected_accounts").run();
    db.prepare("DELETE FROM app_settings").run();

    const noteStmt = db.prepare(
      "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (@id, @title, @content, @tags, @pinned, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.notes || []) {
      noteStmt.run(row);
    }

    const reminderStmt = db.prepare(
      "INSERT INTO reminders (id, text, dueAt, recurrence, status, notifyChannel) VALUES (@id, @text, @dueAt, @recurrence, @status, @notifyChannel)"
    );
    for (const row of actualPayload.reminders || []) {
      reminderStmt.run(row);
    }

    const taskStmt = db.prepare(
      "INSERT INTO tasks (id, title, notes, dueAt, priority, status, recurrence, notifyChannel, createdAt, updatedAt, lastCompletedAt) VALUES (@id, @title, @notes, @dueAt, @priority, @status, @recurrence, @notifyChannel, @createdAt, @updatedAt, @lastCompletedAt)"
    );
    for (const row of actualPayload.tasks || []) {
      taskStmt.run(row);
    }

    const ruleStmt = db.prepare(
      "INSERT INTO automation_rules (id, name, triggerType, triggerConfig, actionType, actionConfig, enabled, lastFiredAt) VALUES (@id, @name, @triggerType, @triggerConfig, @actionType, @actionConfig, @enabled, @lastFiredAt)"
    );
    for (const row of actualPayload.automation_rules || []) {
      ruleStmt.run(row);
    }

    const billStmt = db.prepare(
      "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (@id, @name, @amount, @dueAt, @recurrence, @category, @status, @notes, @createdAt, @updatedAt, @lastPaidAt)"
    );
    for (const row of actualPayload.finance_bills || []) {
      billStmt.run(row);
    }

    const expenseStmt = db.prepare(
      "INSERT INTO finance_expenses (id, description, amount, date, category, notes, createdAt, updatedAt) VALUES (@id, @description, @amount, @date, @category, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.finance_expenses || []) {
      expenseStmt.run(row);
    }

    const vehicleStmt = db.prepare(
      "INSERT INTO car_vehicles (id, name, make, model, year, licensePlate, vin, color, purchaseDate, purchasePrice, currentMileage, notes, createdAt, updatedAt) VALUES (@id, @name, @make, @model, @year, @licensePlate, @vin, @color, @purchaseDate, @purchasePrice, @currentMileage, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.car_vehicles || []) {
      vehicleStmt.run(row);
    }

    const fuelStmt = db.prepare(
      "INSERT INTO car_fuel_entries (id, vehicleId, date, odometer, fuelAmount, fuelUnit, pricePerUnit, totalPrice, station, notes, createdAt, updatedAt) VALUES (@id, @vehicleId, @date, @odometer, @fuelAmount, @fuelUnit, @pricePerUnit, @totalPrice, @station, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.car_fuel_entries || []) {
      fuelStmt.run(row);
    }

    const maintenanceStmt = db.prepare(
      "INSERT INTO car_maintenance (id, vehicleId, date, odometer, type, description, cost, shop, notes, createdAt, updatedAt) VALUES (@id, @vehicleId, @date, @odometer, @type, @description, @cost, @shop, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.car_maintenance || []) {
      maintenanceStmt.run(row);
    }

    const recurringBillStmt = db.prepare(
      "INSERT INTO car_recurring_bills (id, vehicleId, name, type, amount, dueDate, frequency, status, lastPaidDate, notes, createdAt, updatedAt) VALUES (@id, @vehicleId, @name, @type, @amount, @dueDate, @frequency, @status, @lastPaidDate, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.car_recurring_bills || []) {
      recurringBillStmt.run(row);
    }

    const mileageStmt = db.prepare(
      "INSERT INTO car_mileage (id, vehicleId, date, odometer, notes, createdAt, updatedAt) VALUES (@id, @vehicleId, @date, @odometer, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.car_mileage || []) {
      mileageStmt.run(row);
    }

    const serviceReminderStmt = db.prepare(
      "INSERT INTO car_service_reminders (id, vehicleId, type, description, dueOdometer, dueDate, status, completedAt, completedOdometer, notes, createdAt, updatedAt) VALUES (@id, @vehicleId, @type, @description, @dueOdometer, @dueDate, @status, @completedAt, @completedOdometer, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.car_service_reminders || []) {
      serviceReminderStmt.run(row);
    }

    const familyMemberStmt = db.prepare(
      "INSERT INTO family_members (id, name, relationship, phone, email, address, preferredContactMethod, notes, isImportant, createdAt, updatedAt) VALUES (@id, @name, @relationship, @phone, @email, @address, @preferredContactMethod, @notes, @isImportant, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.family_members || []) {
      familyMemberStmt.run(row);
    }

    const familyOccasionStmt = db.prepare(
      "INSERT INTO family_occasions (id, memberId, type, title, date, recurrence, remindDaysBefore, lastAcknowledgedAt, notes, createdAt, updatedAt) VALUES (@id, @memberId, @type, @title, @date, @recurrence, @remindDaysBefore, @lastAcknowledgedAt, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.family_occasions || []) {
      familyOccasionStmt.run(row);
    }

    const familyObligationStmt = db.prepare(
      "INSERT INTO family_obligations (id, memberId, occasionId, type, title, dueAt, status, priority, completedAt, notes, createdAt, updatedAt) VALUES (@id, @memberId, @occasionId, @type, @title, @dueAt, @status, @priority, @completedAt, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.family_obligations || []) {
      familyObligationStmt.run(row);
    }

    const healthAppointmentStmt = db.prepare(
      "INSERT INTO health_appointments (id, type, title, provider, location, date, time, duration, status, notes, createdAt, updatedAt) VALUES (@id, @type, @title, @provider, @location, @date, @time, @duration, @status, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.health_appointments || []) {
      healthAppointmentStmt.run(row);
    }

    const healthMedicationStmt = db.prepare(
      "INSERT INTO health_medications (id, name, dosage, frequency, route, status, startDate, endDate, prescriber, notes, createdAt, updatedAt) VALUES (@id, @name, @dosage, @frequency, @route, @status, @startDate, @endDate, @prescriber, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.health_medications || []) {
      healthMedicationStmt.run(row);
    }

    const healthSymptomStmt = db.prepare(
      "INSERT INTO health_symptoms (id, name, severity, startDate, endDate, notes, createdAt, updatedAt) VALUES (@id, @name, @severity, @startDate, @endDate, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.health_symptoms || []) {
      healthSymptomStmt.run(row);
    }

    const healthMeasurementStmt = db.prepare(
      "INSERT INTO health_measurements (id, type, value, unit, date, notes, createdAt, updatedAt) VALUES (@id, @type, @value, @unit, @date, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.health_measurements || []) {
      healthMeasurementStmt.run(row);
    }

    const healthObligationStmt = db.prepare(
      "INSERT INTO health_obligations (id, type, title, dueAt, status, priority, completedAt, notes, createdAt, updatedAt) VALUES (@id, @type, @title, @dueAt, @status, @priority, @completedAt, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.health_obligations || []) {
      healthObligationStmt.run(row);
    }

    const hobbyStmt = db.prepare(
      "INSERT INTO hobbies (id, name, category, description, status, createdAt, updatedAt) VALUES (@id, @name, @category, @description, @status, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.hobbies || []) {
      hobbyStmt.run(row);
    }

    const hobbySessionStmt = db.prepare(
      "INSERT INTO hobby_sessions (id, hobbyId, date, durationMinutes, notes, mood, energy, progressRating, createdAt, updatedAt) VALUES (@id, @hobbyId, @date, @durationMinutes, @notes, @mood, @energy, @progressRating, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.hobby_sessions || []) {
      hobbySessionStmt.run(row);
    }

    const hobbyProjectStmt = db.prepare(
      "INSERT INTO hobby_projects (id, hobbyId, name, description, status, targetDate, completedAt, createdAt, updatedAt) VALUES (@id, @hobbyId, @name, @description, @status, @targetDate, @completedAt, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.hobby_projects || []) {
      hobbyProjectStmt.run(row);
    }

    const hobbyMilestoneStmt = db.prepare(
      "INSERT INTO hobby_milestones (id, projectId, name, description, targetDate, completedAt, createdAt, updatedAt) VALUES (@id, @projectId, @name, @description, @targetDate, @completedAt, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.hobby_milestones || []) {
      hobbyMilestoneStmt.run(row);
    }

    const hobbySupplyStmt = db.prepare(
      "INSERT INTO hobby_supplies (id, hobbyId, projectId, name, type, cost, purchaseDate, source, notes, createdAt, updatedAt) VALUES (@id, @hobbyId, @projectId, @name, @type, @cost, @purchaseDate, @source, @notes, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.hobby_supplies || []) {
      hobbySupplyStmt.run(row);
    }

    const connectedAccountStmt = db.prepare(
      "INSERT INTO connected_accounts (id, provider, accountLabel, email, enabledFeatures, syncState, lastSyncAt, syncError, createdAt, updatedAt) VALUES (@id, @provider, @accountLabel, @email, @enabledFeatures, @syncState, @lastSyncAt, @syncError, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.connected_accounts || []) {
      connectedAccountStmt.run(row);
    }

    const externalCalendarEventStmt = db.prepare(
      `INSERT INTO external_calendar_events (
        id, accountId, provider, externalId, calendarId, calendarName, title, startAt, endAt, allDay,
        location, status, attendeesCount, htmlLink, etag, updatedAtProvider, isOnlineMeeting, onlineMeetingProvider,
        onlineMeetingUrl, createdAt, updatedAt
      ) VALUES (
        @id, @accountId, @provider, @externalId, @calendarId, @calendarName, @title, @startAt, @endAt, @allDay,
        @location, @status, @attendeesCount, @htmlLink, @etag, @updatedAtProvider, @isOnlineMeeting, @onlineMeetingProvider,
        @onlineMeetingUrl, @createdAt, @updatedAt
      )`
    );
    for (const row of actualPayload.external_calendar_events || []) {
      externalCalendarEventStmt.run({
        ...row,
        isOnlineMeeting: row.isOnlineMeeting ?? 0,
        onlineMeetingProvider: row.onlineMeetingProvider ?? null,
        onlineMeetingUrl: row.onlineMeetingUrl ?? null
      });
    }

    const externalCalendarSyncStateStmt = db.prepare(
      `INSERT INTO external_calendar_sync_state (
        id, accountId, calendarId, provider, syncToken, deltaLink, lastFullSyncAt, createdAt, updatedAt
      ) VALUES (
        @id, @accountId, @calendarId, @provider, @syncToken, @deltaLink, @lastFullSyncAt, @createdAt, @updatedAt
      )`
    );
    for (const row of actualPayload.external_calendar_sync_state || []) {
      externalCalendarSyncStateStmt.run(row);
    }

    const settingStmt = db.prepare(
      "INSERT INTO app_settings (key, value, updatedAt) VALUES (@key, @value, @updatedAt)"
    );
    for (const row of actualPayload.app_settings || []) {
      // Reject secret settings from import
      if (isSecretSettingKey(row.key)) {
        rejectedSecretSettings++;
        continue;
      }
      settingStmt.run(row);
    }
  })();

  return {
    notes: actualPayload.notes?.length ?? 0,
    reminders: actualPayload.reminders?.length ?? 0,
    tasks: actualPayload.tasks?.length ?? 0,
    automation_rules: actualPayload.automation_rules?.length ?? 0,
    finance_bills: actualPayload.finance_bills?.length ?? 0,
    finance_expenses: actualPayload.finance_expenses?.length ?? 0,
    car_vehicles: actualPayload.car_vehicles?.length ?? 0,
    car_fuel_entries: actualPayload.car_fuel_entries?.length ?? 0,
    car_maintenance: actualPayload.car_maintenance?.length ?? 0,
    car_recurring_bills: actualPayload.car_recurring_bills?.length ?? 0,
    car_mileage: actualPayload.car_mileage?.length ?? 0,
    car_service_reminders: actualPayload.car_service_reminders?.length ?? 0,
    family_members: actualPayload.family_members?.length ?? 0,
    family_occasions: actualPayload.family_occasions?.length ?? 0,
    family_obligations: actualPayload.family_obligations?.length ?? 0,
    health_appointments: actualPayload.health_appointments?.length ?? 0,
    health_medications: actualPayload.health_medications?.length ?? 0,
    health_symptoms: actualPayload.health_symptoms?.length ?? 0,
    health_measurements: actualPayload.health_measurements?.length ?? 0,
    health_obligations: actualPayload.health_obligations?.length ?? 0,
    hobbies: actualPayload.hobbies?.length ?? 0,
    hobby_sessions: actualPayload.hobby_sessions?.length ?? 0,
    hobby_projects: actualPayload.hobby_projects?.length ?? 0,
    hobby_milestones: actualPayload.hobby_milestones?.length ?? 0,
    hobby_supplies: actualPayload.hobby_supplies?.length ?? 0,
    connected_accounts: actualPayload.connected_accounts?.length ?? 0,
    external_calendar_events: actualPayload.external_calendar_events?.length ?? 0,
    external_calendar_sync_state: actualPayload.external_calendar_sync_state?.length ?? 0,
    app_settings: (actualPayload.app_settings?.length ?? 0) - rejectedSecretSettings,
    rejected_secret_settings: rejectedSecretSettings
  };
}

export function resetAllData(): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM notes").run();
    db.prepare("DELETE FROM reminders").run();
    db.prepare("DELETE FROM tasks").run();
    db.prepare("DELETE FROM automation_rules").run();
    db.prepare("DELETE FROM finance_bills").run();
    db.prepare("DELETE FROM finance_expenses").run();
    db.prepare("DELETE FROM car_vehicles").run();
    db.prepare("DELETE FROM car_fuel_entries").run();
    db.prepare("DELETE FROM car_maintenance").run();
    db.prepare("DELETE FROM car_recurring_bills").run();
    db.prepare("DELETE FROM car_mileage").run();
    db.prepare("DELETE FROM car_service_reminders").run();
    db.prepare("DELETE FROM family_members").run();
    db.prepare("DELETE FROM family_occasions").run();
    db.prepare("DELETE FROM family_obligations").run();
    db.prepare("DELETE FROM health_appointments").run();
    db.prepare("DELETE FROM health_medications").run();
    db.prepare("DELETE FROM health_symptoms").run();
    db.prepare("DELETE FROM health_measurements").run();
    db.prepare("DELETE FROM health_obligations").run();
    db.prepare("DELETE FROM hobbies").run();
    db.prepare("DELETE FROM hobby_sessions").run();
    db.prepare("DELETE FROM hobby_projects").run();
    db.prepare("DELETE FROM hobby_milestones").run();
    db.prepare("DELETE FROM hobby_supplies").run();
    db.prepare("DELETE FROM external_calendar_events").run();
    db.prepare("DELETE FROM external_calendar_sync_state").run();
    db.prepare("DELETE FROM connected_accounts").run();
    db.prepare("DELETE FROM app_settings").run();
    db.prepare("DELETE FROM execution_logs").run();
    db.prepare("DELETE FROM renderer_errors").run();
    db.prepare("DELETE FROM devices_cache").run();
  })();
}
