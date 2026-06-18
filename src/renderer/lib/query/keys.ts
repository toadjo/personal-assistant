export const workspaceQueryKeys = {
  root: ["workspace"] as const,
  notes: (query: string) => ["workspace", "notes", query] as const,
  reminders: () => ["workspace", "reminders"] as const,
  tasks: () => ["workspace", "tasks"] as const,
  devices: () => ["workspace", "devices"] as const,
  logs: () => ["workspace", "logs"] as const,
  rules: () => ["workspace", "rules"] as const,
  finance: {
    root: ["workspace", "finance"] as const,
    bills: () => ["workspace", "finance", "bills"] as const,
    expenses: () => ["workspace", "finance", "expenses"] as const,
    summary: () => ["workspace", "finance", "summary"] as const
  },
  family: {
    root: ["workspace", "family"] as const,
    members: () => ["workspace", "family", "members"] as const,
    summary: () => ["workspace", "family", "summary"] as const,
    occasions: (memberId: string) => ["workspace", "family", "occasions", memberId] as const,
    obligations: (memberId: string) => ["workspace", "family", "obligations", memberId] as const
  },
  health: {
    root: ["workspace", "health"] as const,
    all: () => ["workspace", "health", "all"] as const
  },
  hobbies: {
    root: ["workspace", "hobbies"] as const,
    all: () => ["workspace", "hobbies", "all"] as const
  },
  car: {
    root: ["workspace", "car"] as const,
    vehicles: () => ["workspace", "car", "vehicles"] as const,
    details: (vehicleId: string) => ["workspace", "car", "details", vehicleId] as const
  },
  calendar: {
    root: ["workspace", "calendar"] as const,
    externalEvents: (startAt: string, endAt: string, refreshKey: number) =>
      ["workspace", "calendar", "externalEvents", startAt, endAt, refreshKey] as const
  }
};

