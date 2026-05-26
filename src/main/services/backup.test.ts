import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/tmp"),
    getVersion: vi.fn(() => "1.7.1")
  }
}));

vi.mock("../db", () => ({
  getDb: () => testDb
}));

vi.mock("./secureSecrets", () => ({
  encryptSecret: vi.fn((data: string) => `encrypted:${data}`),
  decryptSecret: vi.fn((encrypted: string) => encrypted.replace("encrypted:", "")),
  SecureStorageUnavailableError: class extends Error {
    constructor() {
      super("Secure storage unavailable");
      this.name = "SecureStorageUnavailableError";
    }
  },
  isEncrypted: vi.fn(() => false)
}));

vi.mock("../security/policy", () => ({
  isCorporateMode: vi.fn(() => false)
}));

import { exportBackup, importBackup, previewBackup, resetAllData } from "./backup";
import { encryptSecret, SecureStorageUnavailableError } from "./secureSecrets";
import { isCorporateMode } from "../security/policy";

describe("backup service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb.close();
  });

  it("exports empty data when no rows exist", () => {
    const result = exportBackup();
    expect(result.version).toBe("1.7.1");
    expect(result.notes).toEqual([]);
    expect(result.reminders).toEqual([]);
    expect(result.tasks).toEqual([]);
    expect(result.automation_rules).toEqual([]);
    expect(result.finance_bills).toEqual([]);
    expect(result.finance_expenses).toEqual([]);
    expect(result.car_vehicles).toEqual([]);
    expect(result.car_fuel_entries).toEqual([]);
    expect(result.car_maintenance).toEqual([]);
    expect(result.car_recurring_bills).toEqual([]);
    expect(result.car_mileage).toEqual([]);
    expect(result.car_service_reminders).toEqual([]);
    expect(result.family_members).toEqual([]);
    expect(result.family_occasions).toEqual([]);
    expect(result.family_obligations).toEqual([]);
    expect(result.health_appointments).toEqual([]);
    expect(result.health_medications).toEqual([]);
    expect(result.health_symptoms).toEqual([]);
    expect(result.health_measurements).toEqual([]);
    expect(result.health_obligations).toEqual([]);
    expect(result.hobbies).toEqual([]);
    expect(result.hobby_sessions).toEqual([]);
    expect(result.hobby_projects).toEqual([]);
    expect(result.hobby_milestones).toEqual([]);
    expect(result.hobby_supplies).toEqual([]);
    expect(result.app_settings).toEqual([]);
  });

  it("exports and imports round-trip", () => {
    testDb
      .prepare(
        "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare("INSERT INTO reminders (id, text, dueAt, recurrence, status, notifyChannel) VALUES (?, ?, ?, ?, ?, ?)")
      .run("r1", "Test", "2026-01-01T00:00:00Z", "none", "pending", "desktop");
    testDb
      .prepare(
        "INSERT INTO tasks (id, title, notes, dueAt, priority, status, recurrence, notifyChannel, createdAt, updatedAt, lastCompletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        "t1",
        "Task",
        "",
        null,
        "normal",
        "open",
        "none",
        "desktop",
        "2026-01-01T00:00:00Z",
        "2026-01-01T00:00:00Z",
        null
      );
    testDb
      .prepare(
        "INSERT INTO automation_rules (id, name, triggerType, triggerConfig, actionType, actionConfig, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("a1", "Rule", "time", '{"at":"08:00"}', "localReminder", '{"text":"hello"}', 1);
    testDb
      .prepare(
        "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("b1", "Rent", 100000, "2026-01-01T00:00:00Z", "monthly", "Housing", "pending", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);
    testDb
      .prepare(
        "INSERT INTO finance_expenses (id, description, amount, date, category, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("e1", "Groceries", 5000, "2026-01-01T00:00:00Z", "Food", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO car_vehicles (id, name, make, model, year, licensePlate, vin, color, purchaseDate, purchasePrice, currentMileage, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("v1", "My Car", "Toyota", "Camry", 2020, "ABC123", "VIN123", null, "2020-01-01T00:00:00Z", 2500000, 50000, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO car_fuel_entries (id, vehicleId, date, odometer, fuelAmount, fuelUnit, pricePerUnit, totalPrice, station, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("f1", "v1", "2026-01-01T00:00:00Z", 50000, 12.5, "L", 350, 4375, null, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO car_maintenance (id, vehicleId, date, odometer, type, description, cost, shop, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("m1", "v1", "2026-01-01T00:00:00Z", 50000, "Oil Change", "Oil change", 5000, null, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO car_recurring_bills (id, vehicleId, name, type, amount, dueDate, frequency, status, lastPaidDate, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("rb1", "v1", "Insurance", "Insurance", 100000, "2026-01-01T00:00:00Z", "monthly", "pending", null, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO car_mileage (id, vehicleId, date, odometer, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("mi1", "v1", "2026-01-01T00:00:00Z", 50000, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO car_service_reminders (id, vehicleId, type, description, dueOdometer, dueDate, status, completedAt, completedOdometer, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("sr1", "v1", "Maintenance", "Brake inspection", 60000, "2026-06-01T00:00:00Z", "pending", null, null, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO family_members (id, name, relationship, phone, email, address, preferredContactMethod, notes, isImportant, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("fm1", "John Doe", "Father", "+1234567890", "john@example.com", "123 Main St", "any", "", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO family_occasions (id, memberId, type, title, date, recurrence, remindDaysBefore, lastAcknowledgedAt, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("fo1", "fm1", "birthday", "Birthday", "2026-06-15T00:00:00Z", "yearly", 7, null, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO family_obligations (id, memberId, occasionId, type, title, dueAt, status, priority, completedAt, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("fob1", "fm1", null, "call", "Call John", "2026-06-20T10:00:00Z", "open", "normal", null, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO health_appointments (id, type, title, provider, location, date, time, duration, status, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("ha1", "checkup", "Annual Checkup", "Dr. Smith", "Medical Center", "2026-06-15T00:00:00Z", "10:00", 30, "scheduled", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO health_medications (id, name, dosage, frequency, route, status, startDate, endDate, prescriber, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("hm1", "Aspirin", "100mg", "daily", "oral", "active", "2026-01-01T00:00:00Z", null, "Dr. Smith", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO health_symptoms (id, name, severity, startDate, endDate, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("hs1", "Headache", "mild", "2026-06-01T00:00:00Z", null, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO health_measurements (id, type, value, unit, date, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("hme1", "weight", "70", "kg", "2026-06-01T00:00:00Z", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO health_obligations (id, type, title, dueAt, status, priority, completedAt, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("ho1", "refill", "Refill Prescription", "2026-06-20T10:00:00Z", "open", "normal", null, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO hobbies (id, name, category, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("h1", "Guitar", "Music", "", "active", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO hobby_sessions (id, hobbyId, date, durationMinutes, notes, mood, energy, progressRating, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("hs1", "h1", "2026-06-15T00:00:00Z", 30, "", "", 3, null, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO hobby_projects (id, hobbyId, name, description, status, targetDate, completedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("hp1", "h1", "Learn a Song", "", "active", null, null, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO hobby_milestones (id, projectId, name, description, targetDate, completedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("hmi1", "hp1", "Master Chords", "", "2026-06-15T00:00:00Z", null, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO hobby_supplies (id, hobbyId, projectId, name, type, cost, purchaseDate, source, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("hsu1", "h1", null, "Guitar Strings", "equipment", 500, "2026-06-01T00:00:00Z", "", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare("INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?)")
      .run("assistant.name", "Test", "2026-01-01T00:00:00Z");

    const exported = exportBackup();
    expect(exported.notes).toHaveLength(1);
    expect(exported.reminders).toHaveLength(1);
    expect(exported.tasks).toHaveLength(1);
    expect(exported.automation_rules).toHaveLength(1);
    expect(exported.finance_bills).toHaveLength(1);
    expect(exported.finance_expenses).toHaveLength(1);
    expect(exported.car_vehicles).toHaveLength(1);
    expect(exported.car_fuel_entries).toHaveLength(1);
    expect(exported.car_maintenance).toHaveLength(1);
    expect(exported.car_recurring_bills).toHaveLength(1);
    expect(exported.car_mileage).toHaveLength(1);
    expect(exported.car_service_reminders).toHaveLength(1);
    expect(exported.family_members).toHaveLength(1);
    expect(exported.family_occasions).toHaveLength(1);
    expect(exported.family_obligations).toHaveLength(1);
    expect(exported.health_appointments).toHaveLength(1);
    expect(exported.health_medications).toHaveLength(1);
    expect(exported.health_symptoms).toHaveLength(1);
    expect(exported.health_measurements).toHaveLength(1);
    expect(exported.health_obligations).toHaveLength(1);
    expect(exported.hobbies).toHaveLength(1);
    expect(exported.hobby_sessions).toHaveLength(1);
    expect(exported.hobby_projects).toHaveLength(1);
    expect(exported.hobby_milestones).toHaveLength(1);
    expect(exported.hobby_supplies).toHaveLength(1);
    expect(exported.app_settings).toHaveLength(1);

    // Clear everything
    testDb.prepare("DELETE FROM notes").run();
    testDb.prepare("DELETE FROM reminders").run();
    testDb.prepare("DELETE FROM tasks").run();
    testDb.prepare("DELETE FROM automation_rules").run();
    testDb.prepare("DELETE FROM finance_bills").run();
    testDb.prepare("DELETE FROM finance_expenses").run();
    testDb.prepare("DELETE FROM car_vehicles").run();
    testDb.prepare("DELETE FROM car_fuel_entries").run();
    testDb.prepare("DELETE FROM car_maintenance").run();
    testDb.prepare("DELETE FROM car_recurring_bills").run();
    testDb.prepare("DELETE FROM car_mileage").run();
    testDb.prepare("DELETE FROM car_service_reminders").run();
    testDb.prepare("DELETE FROM family_members").run();
    testDb.prepare("DELETE FROM family_occasions").run();
    testDb.prepare("DELETE FROM family_obligations").run();
    testDb.prepare("DELETE FROM health_appointments").run();
    testDb.prepare("DELETE FROM health_medications").run();
    testDb.prepare("DELETE FROM health_symptoms").run();
    testDb.prepare("DELETE FROM health_measurements").run();
    testDb.prepare("DELETE FROM health_obligations").run();
    testDb.prepare("DELETE FROM hobbies").run();
    testDb.prepare("DELETE FROM hobby_sessions").run();
    testDb.prepare("DELETE FROM hobby_projects").run();
    testDb.prepare("DELETE FROM hobby_milestones").run();
    testDb.prepare("DELETE FROM hobby_supplies").run();
    testDb.prepare("DELETE FROM app_settings").run();

    const imported = importBackup(exported);
    expect(imported.notes).toBe(1);
    expect(imported.reminders).toBe(1);
    expect(imported.tasks).toBe(1);
    expect(imported.automation_rules).toBe(1);
    expect(imported.finance_bills).toBe(1);
    expect(imported.finance_expenses).toBe(1);
    expect(imported.car_vehicles).toBe(1);
    expect(imported.car_fuel_entries).toBe(1);
    expect(imported.car_maintenance).toBe(1);
    expect(imported.car_recurring_bills).toBe(1);
    expect(imported.car_mileage).toBe(1);
    expect(imported.car_service_reminders).toBe(1);
    expect(imported.family_members).toBe(1);
    expect(imported.family_occasions).toBe(1);
    expect(imported.family_obligations).toBe(1);
    expect(imported.health_appointments).toBe(1);
    expect(imported.health_medications).toBe(1);
    expect(imported.health_symptoms).toBe(1);
    expect(imported.health_measurements).toBe(1);
    expect(imported.health_obligations).toBe(1);
    expect(imported.hobbies).toBe(1);
    expect(imported.hobby_sessions).toBe(1);
    expect(imported.hobby_projects).toBe(1);
    expect(imported.hobby_milestones).toBe(1);
    expect(imported.hobby_supplies).toBe(1);
    expect(imported.app_settings).toBe(1);

    const reExported = exportBackup();
    expect(reExported.notes?.[0]?.id).toBe("n1");
    expect(reExported.reminders?.[0]?.id).toBe("r1");
    expect(reExported.tasks?.[0]?.id).toBe("t1");
    expect(reExported.automation_rules?.[0]?.id).toBe("a1");
    expect(reExported.finance_bills?.[0]?.id).toBe("b1");
    expect(reExported.finance_expenses?.[0]?.id).toBe("e1");
    expect(reExported.car_vehicles?.[0]?.id).toBe("v1");
    expect(reExported.car_fuel_entries?.[0]?.id).toBe("f1");
    expect(reExported.car_maintenance?.[0]?.id).toBe("m1");
    expect(reExported.car_recurring_bills?.[0]?.id).toBe("rb1");
    expect(reExported.car_mileage?.[0]?.id).toBe("mi1");
    expect(reExported.car_service_reminders?.[0]?.id).toBe("sr1");
    expect(reExported.family_members?.[0]?.id).toBe("fm1");
    expect(reExported.family_occasions?.[0]?.id).toBe("fo1");
    expect(reExported.family_obligations?.[0]?.id).toBe("fob1");
    expect(reExported.app_settings?.[0]?.key).toBe("assistant.name");
  });

  it("resetAllData clears all user tables", () => {
    testDb
      .prepare(
        "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO execution_logs (id, ruleId, status, startedAt, endedAt, error, attemptCount, retryCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("l1", "r1", "success", "2026-01-01T00:00:00Z", "2026-01-01T00:00:01Z", null, 1, 0);
    testDb
      .prepare("INSERT INTO renderer_errors (id, createdAt, message, stack, componentStack) VALUES (?, ?, ?, ?, ?)")
      .run("e1", "2026-01-01T00:00:00Z", "err", null, null);
    testDb
      .prepare(
        "INSERT INTO devices_cache (id, entityId, friendlyName, domain, state, attributes, lastSeenAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("d1", "light.test", "Test", "light", "on", "{}", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("b1", "Rent", 100000, "2026-01-01T00:00:00Z", "monthly", "Housing", "pending", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);
    testDb
      .prepare(
        "INSERT INTO finance_expenses (id, description, amount, date, category, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("e1", "Groceries", 5000, "2026-01-01T00:00:00Z", "Food", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO car_vehicles (id, name, make, model, year, licensePlate, vin, color, purchaseDate, purchasePrice, currentMileage, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("v1", "My Car", "Toyota", "Camry", 2020, "ABC123", "VIN123", null, "2020-01-01T00:00:00Z", 2500000, 50000, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO car_fuel_entries (id, vehicleId, date, odometer, fuelAmount, fuelUnit, pricePerUnit, totalPrice, station, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("f1", "v1", "2026-01-01T00:00:00Z", 50000, 12.5, "L", 350, 4375, null, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO family_members (id, name, relationship, phone, email, address, preferredContactMethod, notes, isImportant, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("fm1", "John Doe", "Father", "+1234567890", "john@example.com", "123 Main St", "any", "", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO health_appointments (id, type, title, provider, location, date, time, duration, status, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("ha1", "checkup", "Annual Checkup", "Dr. Smith", "Medical Center", "2026-06-15T00:00:00Z", "10:00", 30, "scheduled", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    testDb
      .prepare(
        "INSERT INTO hobbies (id, name, category, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("h1", "Guitar", "Music", "", "active", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

    resetAllData();

    const noteCount = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
    expect(noteCount.c).toBe(0);
    const logCount = testDb.prepare("SELECT COUNT(*) as c FROM execution_logs").get() as { c: number };
    expect(logCount.c).toBe(0);
    const errorCount = testDb.prepare("SELECT COUNT(*) as c FROM renderer_errors").get() as { c: number };
    expect(errorCount.c).toBe(0);
    const deviceCount = testDb.prepare("SELECT COUNT(*) as c FROM devices_cache").get() as { c: number };
    expect(deviceCount.c).toBe(0);
    const billCount = testDb.prepare("SELECT COUNT(*) as c FROM finance_bills").get() as { c: number };
    expect(billCount.c).toBe(0);
    const expenseCount = testDb.prepare("SELECT COUNT(*) as c FROM finance_expenses").get() as { c: number };
    expect(expenseCount.c).toBe(0);
    const vehicleCount = testDb.prepare("SELECT COUNT(*) as c FROM car_vehicles").get() as { c: number };
    expect(vehicleCount.c).toBe(0);
    const fuelCount = testDb.prepare("SELECT COUNT(*) as c FROM car_fuel_entries").get() as { c: number };
    expect(fuelCount.c).toBe(0);
    const familyMemberCount = testDb.prepare("SELECT COUNT(*) as c FROM family_members").get() as { c: number };
    expect(familyMemberCount.c).toBe(0);
    const healthAppointmentCount = testDb.prepare("SELECT COUNT(*) as c FROM health_appointments").get() as { c: number };
    expect(healthAppointmentCount.c).toBe(0);
    const hobbyCount = testDb.prepare("SELECT COUNT(*) as c FROM hobbies").get() as { c: number };
    expect(hobbyCount.c).toBe(0);
  });

  describe("backup preview", () => {
    beforeEach(() => {
      testDb = createMemoryDatabase();
    });

    it("valid backup shows correct counts", () => {
      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      testDb
        .prepare("INSERT INTO reminders (id, text, dueAt, recurrence, status, notifyChannel) VALUES (?, ?, ?, ?, ?, ?)")
        .run("r1", "Test", "2026-01-01T00:00:00Z", "none", "pending", "desktop");
      testDb
        .prepare(
          "INSERT INTO tasks (id, title, notes, dueAt, priority, status, recurrence, notifyChannel, createdAt, updatedAt, lastCompletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(
          "t1",
          "Task",
          "",
          null,
          "normal",
          "open",
          "none",
          "desktop",
          "2026-01-01T00:00:00Z",
          "2026-01-01T00:00:00Z",
          null
        );
      testDb
        .prepare(
          "INSERT INTO automation_rules (id, name, triggerType, triggerConfig, actionType, actionConfig, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("a1", "Rule", "time", '{"at":"08:00"}', "localReminder", '{"text":"hello"}', 1);
      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b1", "Rent", 100000, "2026-01-01T00:00:00Z", "monthly", "Housing", "pending", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);
      testDb
        .prepare(
          "INSERT INTO finance_expenses (id, description, amount, date, category, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("e1", "Groceries", 5000, "2026-01-01T00:00:00Z", "Food", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      testDb
        .prepare(
          "INSERT INTO car_vehicles (id, name, make, model, year, licensePlate, vin, color, purchaseDate, purchasePrice, currentMileage, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("v1", "My Car", "Toyota", "Camry", 2020, "ABC123", "VIN123", null, "2020-01-01T00:00:00Z", 2500000, 50000, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      testDb
        .prepare(
          "INSERT INTO car_fuel_entries (id, vehicleId, date, odometer, fuelAmount, fuelUnit, pricePerUnit, totalPrice, station, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("f1", "v1", "2026-01-01T00:00:00Z", 50000, 12.5, "L", 350, 4375, null, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      testDb
        .prepare(
          "INSERT INTO family_members (id, name, relationship, phone, email, address, preferredContactMethod, notes, isImportant, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("fm1", "John Doe", "Father", "+1234567890", "john@example.com", "123 Main St", "any", "", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      testDb
        .prepare("INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?)")
        .run("assistant.name", "Test", "2026-01-01T00:00:00Z");

      const exported = exportBackup();
      const preview = previewBackup(exported);

      expect(preview.valid).toBe(true);
      expect(preview.notes).toBe(1);
      expect(preview.reminders).toBe(1);
      expect(preview.tasks).toBe(1);
      expect(preview.automation_rules).toBe(1);
      expect(preview.finance_bills).toBe(1);
      expect(preview.finance_expenses).toBe(1);
      expect(preview.car_vehicles).toBe(1);
      expect(preview.car_fuel_entries).toBe(1);
      expect(preview.family_members).toBe(1);
      expect(preview.family_occasions).toBe(0);
      expect(preview.family_obligations).toBe(0);
      expect(preview.health_appointments).toBe(0);
      expect(preview.health_medications).toBe(0);
      expect(preview.health_symptoms).toBe(0);
      expect(preview.health_measurements).toBe(0);
      expect(preview.health_obligations).toBe(0);
      expect(preview.hobbies).toBe(0);
      expect(preview.hobby_sessions).toBe(0);
      expect(preview.hobby_projects).toBe(0);
      expect(preview.hobby_milestones).toBe(0);
      expect(preview.hobby_supplies).toBe(0);
      expect(preview.app_settings).toBe(1);
      expect(preview.unsupported_sections).toEqual([]);
      expect(preview.has_encrypted_content).toBe(false);
      expect(preview.version).toBe("1.7.1");
      expect(preview.exportedAt).toBeDefined();
    });

    it("malformed backup is rejected", () => {
      const invalidPayload = { invalid: "data" } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(invalidPayload);

      expect(preview.valid).toBe(false);
      expect(preview.error).toBe("Invalid backup: missing version or exportedAt field");
      expect(preview.notes).toBe(0);
      expect(preview.reminders).toBe(0);
      expect(preview.tasks).toBe(0);
      expect(preview.automation_rules).toBe(0);
      expect(preview.finance_bills).toBe(0);
      expect(preview.finance_expenses).toBe(0);
      expect(preview.car_vehicles).toBe(0);
      expect(preview.car_fuel_entries).toBe(0);
      expect(preview.car_maintenance).toBe(0);
      expect(preview.car_recurring_bills).toBe(0);
      expect(preview.car_mileage).toBe(0);
      expect(preview.car_service_reminders).toBe(0);
      expect(preview.family_members).toBe(0);
      expect(preview.family_occasions).toBe(0);
      expect(preview.family_obligations).toBe(0);
      expect(preview.health_appointments).toBe(0);
      expect(preview.health_medications).toBe(0);
      expect(preview.health_symptoms).toBe(0);
      expect(preview.health_measurements).toBe(0);
      expect(preview.health_obligations).toBe(0);
      expect(preview.hobbies).toBe(0);
      expect(preview.hobby_sessions).toBe(0);
      expect(preview.hobby_projects).toBe(0);
      expect(preview.hobby_milestones).toBe(0);
      expect(preview.hobby_supplies).toBe(0);
      expect(preview.app_settings).toBe(0);
    });

    it("backup with missing version is rejected", () => {
      const invalidPayload = {
        exportedAt: "2026-01-01T00:00:00Z",
        notes: []
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(invalidPayload);

      expect(preview.valid).toBe(false);
      expect(preview.error).toBe("Invalid backup: missing version or exportedAt field");
    });

    it("backup with invalid notes array is rejected", () => {
      const invalidPayload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: "not an array" as any // eslint-disable-line @typescript-eslint/no-explicit-any
      };
      const preview = previewBackup(invalidPayload);

      expect(preview.valid).toBe(false);
      expect(preview.error).toBe("Invalid backup: notes field is not an array");
    });

    it("backup with unsupported fields reports them", () => {
      const payload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: [],
        unsupportedField: "data"
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(payload);

      expect(preview.valid).toBe(true);
      expect(preview.unsupported_sections).toContain("unsupportedField");
    });

    it("encrypted backup shows metadata only", () => {
      const encryptedPayload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        _encrypted: "encrypted:data"
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(encryptedPayload);

      expect(preview.valid).toBe(true);
      expect(preview.has_encrypted_content).toBe(true);
      expect(preview.notes).toBe(0);
      expect(preview.reminders).toBe(0);
      expect(preview.tasks).toBe(0);
      expect(preview.automation_rules).toBe(0);
      expect(preview.finance_bills).toBe(0);
      expect(preview.finance_expenses).toBe(0);
      expect(preview.car_vehicles).toBe(0);
      expect(preview.car_fuel_entries).toBe(0);
      expect(preview.car_maintenance).toBe(0);
      expect(preview.car_recurring_bills).toBe(0);
      expect(preview.car_mileage).toBe(0);
      expect(preview.car_service_reminders).toBe(0);
      expect(preview.family_members).toBe(0);
      expect(preview.family_occasions).toBe(0);
      expect(preview.family_obligations).toBe(0);
      expect(preview.health_appointments).toBe(0);
      expect(preview.health_medications).toBe(0);
      expect(preview.health_symptoms).toBe(0);
      expect(preview.health_measurements).toBe(0);
      expect(preview.health_obligations).toBe(0);
      expect(preview.hobbies).toBe(0);
      expect(preview.hobby_sessions).toBe(0);
      expect(preview.hobby_projects).toBe(0);
      expect(preview.hobby_milestones).toBe(0);
      expect(preview.hobby_supplies).toBe(0);
      expect(preview.app_settings).toBe(0);
    });

    it("empty backup shows zero counts", () => {
      const emptyPayload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: [],
        reminders: [],
        tasks: [],
        automation_rules: [],
        finance_bills: [],
        finance_expenses: [],
        app_settings: []
      };
      const preview = previewBackup(emptyPayload);

      expect(preview.valid).toBe(true);
      expect(preview.notes).toBe(0);
      expect(preview.reminders).toBe(0);
      expect(preview.tasks).toBe(0);
      expect(preview.automation_rules).toBe(0);
      expect(preview.finance_bills).toBe(0);
      expect(preview.finance_expenses).toBe(0);
      expect(preview.app_settings).toBe(0);
    });
  });

  describe("backup import security", () => {
    beforeEach(() => {
      testDb = createMemoryDatabase();
    });

    it("secret fields remain rejected during import", () => {
      const payloadWithSecrets = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: [],
        reminders: [],
        tasks: [],
        automation_rules: [],
        finance_bills: [],
        finance_expenses: [],
        app_settings: [
          { key: "assistant.name", value: "Test", updatedAt: "2026-01-01T00:00:00Z" },
          { key: "ha.token", value: "secret123", updatedAt: "2026-01-01T00:00:00Z" }
        ]
      };

      const imported = importBackup(payloadWithSecrets);
      expect(imported.rejected_secret_settings).toBe(1);
      expect(imported.app_settings).toBe(1); // Only non-secret settings imported
    });

    it("cancel path performs no import", () => {
      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const noteCountBefore = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
      expect(noteCountBefore.c).toBe(1);

      // Preview should not modify database
      const exported = exportBackup();
      const preview = previewBackup(exported);
      expect(preview.valid).toBe(true);

      const noteCountAfter = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
      expect(noteCountAfter.c).toBe(1); // Should still be 1, not deleted
    });
  });

  describe("encrypted backup security", () => {
    beforeEach(() => {
      testDb = createMemoryDatabase();
    });

    it("corporate export returns no plaintext arrays when encrypted", () => {
      vi.mocked(isCorporateMode).mockReturnValue(true);

      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const exported = exportBackup({ encrypt: true });

      expect(exported.version).toBe("1.7.1");
      expect(exported.exportedAt).toBeDefined();
      expect(exported._encrypted).toBeDefined();
      expect(exported.notes).toBeUndefined();
      expect(exported.reminders).toBeUndefined();
      expect(exported.tasks).toBeUndefined();
      expect(exported.automation_rules).toBeUndefined();
      expect(exported.app_settings).toBeUndefined();
    });

    it("corporate export fails when secure storage is unavailable", () => {
      vi.mocked(isCorporateMode).mockReturnValue(true);
      vi.mocked(encryptSecret).mockImplementation(() => {
        throw new SecureStorageUnavailableError();
      });

      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      expect(() => exportBackup({ encrypt: true })).toThrow(
        "Corporate mode requires encrypted backup, but secure storage is unavailable"
      );
    });

    it("personal mode falls back to unencrypted when secure storage unavailable", () => {
      vi.mocked(isCorporateMode).mockReturnValue(false);
      vi.mocked(encryptSecret).mockImplementation(() => {
        throw new SecureStorageUnavailableError();
      });

      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const exported = exportBackup({ encrypt: true });

      expect(exported._encrypted).toBeUndefined();
      expect(exported.notes).toBeDefined();
      expect(exported.notes?.length).toBe(1);
    });

    it("encrypted import decrypts and restores data", () => {
      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const exported = exportBackup({ encrypt: true });

      // Clear the database
      testDb.prepare("DELETE FROM notes").run();

      // Import encrypted backup
      const imported = importBackup(exported);
      expect(imported.notes).toBe(1);

      // Verify data was restored
      const noteCount = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
      expect(noteCount.c).toBe(1);
    });

    it("plaintext import still works in personal mode", () => {
      const plaintextPayload = {
        version: "1.7.1",
        exportedAt: new Date().toISOString(),
        notes: [
          {
            id: "n1",
            title: "Hello",
            content: "World",
            tags: "[]",
            pinned: 0,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z"
          }
        ],
        reminders: [],
        tasks: [],
        automation_rules: [],
        app_settings: []
      };

      const imported = importBackup(plaintextPayload);
      expect(imported.notes).toBe(1);

      const noteCount = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
      expect(noteCount.c).toBe(1);
    });
  });

  describe("backup preview", () => {
    beforeEach(() => {
      testDb = createMemoryDatabase();
    });

    it("valid backup shows correct counts", () => {
      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      testDb
        .prepare("INSERT INTO reminders (id, text, dueAt, recurrence, status, notifyChannel) VALUES (?, ?, ?, ?, ?, ?)")
        .run("r1", "Test", "2026-01-01T00:00:00Z", "none", "pending", "desktop");
      testDb
        .prepare(
          "INSERT INTO tasks (id, title, notes, dueAt, priority, status, recurrence, notifyChannel, createdAt, updatedAt, lastCompletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(
          "t1",
          "Task",
          "",
          null,
          "normal",
          "open",
          "none",
          "desktop",
          "2026-01-01T00:00:00Z",
          "2026-01-01T00:00:00Z",
          null
        );
      testDb
        .prepare(
          "INSERT INTO automation_rules (id, name, triggerType, triggerConfig, actionType, actionConfig, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("a1", "Rule", "time", '{"at":"08:00"}', "localReminder", '{"text":"hello"}', 1);
      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b1", "Rent", 100000, "2026-01-01T00:00:00Z", "monthly", "Housing", "pending", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);
      testDb
        .prepare(
          "INSERT INTO finance_expenses (id, description, amount, date, category, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("e1", "Groceries", 5000, "2026-01-01T00:00:00Z", "Food", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      testDb
        .prepare(
          "INSERT INTO car_vehicles (id, name, make, model, year, licensePlate, vin, color, purchaseDate, purchasePrice, currentMileage, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("v1", "My Car", "Toyota", "Camry", 2020, "ABC123", "VIN123", null, "2020-01-01T00:00:00Z", 2500000, 50000, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      testDb
        .prepare(
          "INSERT INTO car_fuel_entries (id, vehicleId, date, odometer, fuelAmount, fuelUnit, pricePerUnit, totalPrice, station, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("f1", "v1", "2026-01-01T00:00:00Z", 50000, 12.5, "L", 350, 4375, null, "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      testDb
        .prepare(
          "INSERT INTO family_members (id, name, relationship, phone, email, address, preferredContactMethod, notes, isImportant, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("fm1", "John Doe", "Father", "+1234567890", "john@example.com", "123 Main St", "any", "", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      testDb
        .prepare("INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?)")
        .run("assistant.name", "Test", "2026-01-01T00:00:00Z");

      const exported = exportBackup();
      const preview = previewBackup(exported);

      expect(preview.valid).toBe(true);
      expect(preview.notes).toBe(1);
      expect(preview.reminders).toBe(1);
      expect(preview.tasks).toBe(1);
      expect(preview.automation_rules).toBe(1);
      expect(preview.finance_bills).toBe(1);
      expect(preview.finance_expenses).toBe(1);
      expect(preview.car_vehicles).toBe(1);
      expect(preview.car_fuel_entries).toBe(1);
      expect(preview.family_members).toBe(1);
      expect(preview.family_occasions).toBe(0);
      expect(preview.family_obligations).toBe(0);
      expect(preview.health_appointments).toBe(0);
      expect(preview.health_medications).toBe(0);
      expect(preview.health_symptoms).toBe(0);
      expect(preview.health_measurements).toBe(0);
      expect(preview.health_obligations).toBe(0);
      expect(preview.hobbies).toBe(0);
      expect(preview.hobby_sessions).toBe(0);
      expect(preview.hobby_projects).toBe(0);
      expect(preview.hobby_milestones).toBe(0);
      expect(preview.hobby_supplies).toBe(0);
      expect(preview.app_settings).toBe(1);
      expect(preview.unsupported_sections).toEqual([]);
      expect(preview.has_encrypted_content).toBe(false);
      expect(preview.version).toBe("1.7.1");
      expect(preview.exportedAt).toBeDefined();
    });

    it("malformed backup is rejected", () => {
      const invalidPayload = { invalid: "data" } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(invalidPayload);

      expect(preview.valid).toBe(false);
      expect(preview.error).toBe("Invalid backup: missing version or exportedAt field");
      expect(preview.notes).toBe(0);
      expect(preview.reminders).toBe(0);
      expect(preview.tasks).toBe(0);
      expect(preview.automation_rules).toBe(0);
      expect(preview.finance_bills).toBe(0);
      expect(preview.finance_expenses).toBe(0);
      expect(preview.car_vehicles).toBe(0);
      expect(preview.car_fuel_entries).toBe(0);
      expect(preview.car_maintenance).toBe(0);
      expect(preview.car_recurring_bills).toBe(0);
      expect(preview.car_mileage).toBe(0);
      expect(preview.car_service_reminders).toBe(0);
      expect(preview.family_members).toBe(0);
      expect(preview.family_occasions).toBe(0);
      expect(preview.family_obligations).toBe(0);
      expect(preview.health_appointments).toBe(0);
      expect(preview.health_medications).toBe(0);
      expect(preview.health_symptoms).toBe(0);
      expect(preview.health_measurements).toBe(0);
      expect(preview.health_obligations).toBe(0);
      expect(preview.hobbies).toBe(0);
      expect(preview.hobby_sessions).toBe(0);
      expect(preview.hobby_projects).toBe(0);
      expect(preview.hobby_milestones).toBe(0);
      expect(preview.hobby_supplies).toBe(0);
      expect(preview.app_settings).toBe(0);
    });

    it("backup with missing version is rejected", () => {
      const invalidPayload = {
        exportedAt: "2026-01-01T00:00:00Z",
        notes: []
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(invalidPayload);

      expect(preview.valid).toBe(false);
      expect(preview.error).toBe("Invalid backup: missing version or exportedAt field");
    });

    it("backup with invalid notes array is rejected", () => {
      const invalidPayload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: "not an array" as any // eslint-disable-line @typescript-eslint/no-explicit-any
      };
      const preview = previewBackup(invalidPayload);

      expect(preview.valid).toBe(false);
      expect(preview.error).toBe("Invalid backup: notes field is not an array");
    });

    it("backup with unsupported fields reports them", () => {
      const payload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: [],
        unsupportedField: "data"
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(payload);

      expect(preview.valid).toBe(true);
      expect(preview.unsupported_sections).toContain("unsupportedField");
    });

    it("encrypted backup shows metadata only", () => {
      const encryptedPayload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        _encrypted: "encrypted:data"
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const preview = previewBackup(encryptedPayload);

      expect(preview.valid).toBe(true);
      expect(preview.has_encrypted_content).toBe(true);
      expect(preview.notes).toBe(0);
      expect(preview.reminders).toBe(0);
      expect(preview.tasks).toBe(0);
      expect(preview.automation_rules).toBe(0);
      expect(preview.finance_bills).toBe(0);
      expect(preview.finance_expenses).toBe(0);
      expect(preview.car_vehicles).toBe(0);
      expect(preview.car_fuel_entries).toBe(0);
      expect(preview.car_maintenance).toBe(0);
      expect(preview.car_recurring_bills).toBe(0);
      expect(preview.car_mileage).toBe(0);
      expect(preview.car_service_reminders).toBe(0);
      expect(preview.family_members).toBe(0);
      expect(preview.family_occasions).toBe(0);
      expect(preview.family_obligations).toBe(0);
      expect(preview.health_appointments).toBe(0);
      expect(preview.health_medications).toBe(0);
      expect(preview.health_symptoms).toBe(0);
      expect(preview.health_measurements).toBe(0);
      expect(preview.health_obligations).toBe(0);
      expect(preview.hobbies).toBe(0);
      expect(preview.hobby_sessions).toBe(0);
      expect(preview.hobby_projects).toBe(0);
      expect(preview.hobby_milestones).toBe(0);
      expect(preview.hobby_supplies).toBe(0);
      expect(preview.app_settings).toBe(0);
    });

    it("empty backup shows zero counts", () => {
      const emptyPayload = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: [],
        reminders: [],
        tasks: [],
        automation_rules: [],
        finance_bills: [],
        finance_expenses: [],
        app_settings: []
      };
      const preview = previewBackup(emptyPayload);

      expect(preview.valid).toBe(true);
      expect(preview.notes).toBe(0);
      expect(preview.reminders).toBe(0);
      expect(preview.tasks).toBe(0);
      expect(preview.automation_rules).toBe(0);
      expect(preview.finance_bills).toBe(0);
      expect(preview.finance_expenses).toBe(0);
      expect(preview.app_settings).toBe(0);
    });
  });

  describe("backup import security", () => {
    beforeEach(() => {
      testDb = createMemoryDatabase();
    });

    it("secret fields remain rejected during import", () => {
      const payloadWithSecrets = {
        version: "1.7.1",
        exportedAt: "2026-01-01T00:00:00Z",
        notes: [],
        reminders: [],
        tasks: [],
        automation_rules: [],
        finance_bills: [],
        finance_expenses: [],
        app_settings: [
          { key: "assistant.name", value: "Test", updatedAt: "2026-01-01T00:00:00Z" },
          { key: "ha.token", value: "secret123", updatedAt: "2026-01-01T00:00:00Z" }
        ]
      };

      const imported = importBackup(payloadWithSecrets);
      expect(imported.rejected_secret_settings).toBe(1);
      expect(imported.app_settings).toBe(1); // Only non-secret settings imported
    });

    it("cancel path performs no import", () => {
      testDb
        .prepare(
          "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("n1", "Hello", "World", "[]", 0, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const noteCountBefore = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
      expect(noteCountBefore.c).toBe(1);

      // Preview should not modify database
      const exported = exportBackup();
      const preview = previewBackup(exported);
      expect(preview.valid).toBe(true);

      const noteCountAfter = testDb.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number };
      expect(noteCountAfter.c).toBe(1); // Should still be 1, not deleted
    });
  });
});
