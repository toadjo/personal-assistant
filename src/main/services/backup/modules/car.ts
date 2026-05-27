import type { BackupModule, BackupPayload } from "../types";

export const carModule: BackupModule = {
  id: "car",
  payloadKeys: [
    "car_vehicles",
    "car_fuel_entries",
    "car_maintenance",
    "car_recurring_bills",
    "car_mileage",
    "car_service_reminders"
  ],

  exportData(db) {
    const car_vehicles = db.prepare("SELECT * FROM car_vehicles").all() as BackupPayload["car_vehicles"];
    const car_fuel_entries = db.prepare("SELECT * FROM car_fuel_entries").all() as BackupPayload["car_fuel_entries"];
    const car_maintenance = db.prepare("SELECT * FROM car_maintenance").all() as BackupPayload["car_maintenance"];
    const car_recurring_bills = db
      .prepare("SELECT * FROM car_recurring_bills")
      .all() as BackupPayload["car_recurring_bills"];
    const car_mileage = db.prepare("SELECT * FROM car_mileage").all() as BackupPayload["car_mileage"];
    const car_service_reminders = db
      .prepare("SELECT * FROM car_service_reminders")
      .all() as BackupPayload["car_service_reminders"];
    return {
      car_vehicles,
      car_fuel_entries,
      car_maintenance,
      car_recurring_bills,
      car_mileage,
      car_service_reminders
    };
  },

  ensureDefaults(payload) {
    if (!payload.car_vehicles) payload.car_vehicles = [];
    if (!payload.car_fuel_entries) payload.car_fuel_entries = [];
    if (!payload.car_maintenance) payload.car_maintenance = [];
    if (!payload.car_recurring_bills) payload.car_recurring_bills = [];
    if (!payload.car_mileage) payload.car_mileage = [];
    if (!payload.car_service_reminders) payload.car_service_reminders = [];
  },

  deleteAll(db) {
    db.prepare("DELETE FROM car_service_reminders").run();
    db.prepare("DELETE FROM car_mileage").run();
    db.prepare("DELETE FROM car_recurring_bills").run();
    db.prepare("DELETE FROM car_maintenance").run();
    db.prepare("DELETE FROM car_fuel_entries").run();
    db.prepare("DELETE FROM car_vehicles").run();
  },

  importData(db, payload) {
    const vehicleStmt = db.prepare(
      "INSERT INTO car_vehicles (id, name, make, model, year, licensePlate, vin, color, purchaseDate, purchasePrice, currentMileage, notes, createdAt, updatedAt) VALUES (@id, @name, @make, @model, @year, @licensePlate, @vin, @color, @purchaseDate, @purchasePrice, @currentMileage, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.car_vehicles || []) {
      vehicleStmt.run(row);
    }

    const fuelStmt = db.prepare(
      "INSERT INTO car_fuel_entries (id, vehicleId, date, odometer, fuelAmount, fuelUnit, pricePerUnit, totalPrice, station, notes, createdAt, updatedAt) VALUES (@id, @vehicleId, @date, @odometer, @fuelAmount, @fuelUnit, @pricePerUnit, @totalPrice, @station, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.car_fuel_entries || []) {
      fuelStmt.run(row);
    }

    const maintenanceStmt = db.prepare(
      "INSERT INTO car_maintenance (id, vehicleId, date, odometer, type, description, cost, shop, notes, createdAt, updatedAt) VALUES (@id, @vehicleId, @date, @odometer, @type, @description, @cost, @shop, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.car_maintenance || []) {
      maintenanceStmt.run(row);
    }

    const recurringBillStmt = db.prepare(
      "INSERT INTO car_recurring_bills (id, vehicleId, name, type, amount, dueDate, frequency, status, lastPaidDate, notes, createdAt, updatedAt) VALUES (@id, @vehicleId, @name, @type, @amount, @dueDate, @frequency, @status, @lastPaidDate, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.car_recurring_bills || []) {
      recurringBillStmt.run(row);
    }

    const mileageStmt = db.prepare(
      "INSERT INTO car_mileage (id, vehicleId, date, odometer, notes, createdAt, updatedAt) VALUES (@id, @vehicleId, @date, @odometer, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.car_mileage || []) {
      mileageStmt.run(row);
    }

    const serviceReminderStmt = db.prepare(
      "INSERT INTO car_service_reminders (id, vehicleId, type, description, dueOdometer, dueDate, status, completedAt, completedOdometer, notes, createdAt, updatedAt) VALUES (@id, @vehicleId, @type, @description, @dueOdometer, @dueDate, @status, @completedAt, @completedOdometer, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.car_service_reminders || []) {
      serviceReminderStmt.run(row);
    }

    return {
      car_vehicles: payload.car_vehicles?.length ?? 0,
      car_fuel_entries: payload.car_fuel_entries?.length ?? 0,
      car_maintenance: payload.car_maintenance?.length ?? 0,
      car_recurring_bills: payload.car_recurring_bills?.length ?? 0,
      car_mileage: payload.car_mileage?.length ?? 0,
      car_service_reminders: payload.car_service_reminders?.length ?? 0
    };
  },

  previewSection(payload) {
    return {
      valid: true,
      counts: {
        car_vehicles: payload.car_vehicles?.length ?? 0,
        car_fuel_entries: payload.car_fuel_entries?.length ?? 0,
        car_maintenance: payload.car_maintenance?.length ?? 0,
        car_recurring_bills: payload.car_recurring_bills?.length ?? 0,
        car_mileage: payload.car_mileage?.length ?? 0,
        car_service_reminders: payload.car_service_reminders?.length ?? 0
      }
    };
  }
};
