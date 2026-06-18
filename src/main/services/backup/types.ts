import type Database from "better-sqlite3";

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

export type BackupImportResult = {
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
};

export type BackupImportContext = {
  rejectedSecretSettings: number;
};

export type ModulePreviewResult =
  | { valid: true; counts: Partial<BackupPreviewResult> }
  | { valid: false; error: string };

export interface BackupModule {
  readonly id: string;
  readonly payloadKeys: readonly (keyof BackupPayload)[];
  exportData(db: Database.Database): Partial<BackupPayload>;
  ensureDefaults(payload: BackupPayload): void;
  importData(db: Database.Database, payload: BackupPayload, ctx?: BackupImportContext): Partial<BackupImportResult>;
  previewSection(payload: BackupPayload): ModulePreviewResult;
  deleteAll(db: Database.Database): void;
}

export const BACKUP_METADATA_KEYS = ["version", "exportedAt", "_encrypted"] as const;

export function emptyPreviewResult(partial: Partial<BackupPreviewResult> = {}): BackupPreviewResult {
  return {
    valid: false,
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
    exportedAt: "unknown",
    ...partial
  };
}

export function invalidArrayPreview(
  payload: BackupPayload,
  field: keyof BackupPayload,
  label: string
): ModulePreviewResult | null {
  const value = payload[field];
  if (value !== undefined && !Array.isArray(value)) {
    return {
      valid: false,
      error: `Invalid backup: ${label} field is not an array`
    };
  }
  return null;
}
