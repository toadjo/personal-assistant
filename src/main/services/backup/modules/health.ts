import type { BackupModule, BackupPayload } from "../types";
import { invalidArrayPreview } from "../types";

export const healthModule: BackupModule = {
  id: "health",
  payloadKeys: [
    "health_appointments",
    "health_medications",
    "health_symptoms",
    "health_measurements",
    "health_obligations"
  ],

  exportData(db) {
    const health_appointments = db
      .prepare("SELECT * FROM health_appointments")
      .all() as BackupPayload["health_appointments"];
    const health_medications = db
      .prepare("SELECT * FROM health_medications")
      .all() as BackupPayload["health_medications"];
    const health_symptoms = db.prepare("SELECT * FROM health_symptoms").all() as BackupPayload["health_symptoms"];
    const health_measurements = db
      .prepare("SELECT * FROM health_measurements")
      .all() as BackupPayload["health_measurements"];
    const health_obligations = db
      .prepare("SELECT * FROM health_obligations")
      .all() as BackupPayload["health_obligations"];
    return {
      health_appointments,
      health_medications,
      health_symptoms,
      health_measurements,
      health_obligations
    };
  },

  ensureDefaults(payload) {
    if (!payload.health_appointments) payload.health_appointments = [];
    if (!payload.health_medications) payload.health_medications = [];
    if (!payload.health_symptoms) payload.health_symptoms = [];
    if (!payload.health_measurements) payload.health_measurements = [];
    if (!payload.health_obligations) payload.health_obligations = [];
  },

  deleteAll(db) {
    db.prepare("DELETE FROM health_appointments").run();
    db.prepare("DELETE FROM health_medications").run();
    db.prepare("DELETE FROM health_symptoms").run();
    db.prepare("DELETE FROM health_measurements").run();
    db.prepare("DELETE FROM health_obligations").run();
  },

  importData(db, payload) {
    const healthAppointmentStmt = db.prepare(
      "INSERT INTO health_appointments (id, type, title, provider, location, date, time, duration, status, notes, createdAt, updatedAt) VALUES (@id, @type, @title, @provider, @location, @date, @time, @duration, @status, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.health_appointments || []) {
      healthAppointmentStmt.run(row);
    }

    const healthMedicationStmt = db.prepare(
      "INSERT INTO health_medications (id, name, dosage, frequency, route, status, startDate, endDate, prescriber, notes, createdAt, updatedAt) VALUES (@id, @name, @dosage, @frequency, @route, @status, @startDate, @endDate, @prescriber, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.health_medications || []) {
      healthMedicationStmt.run(row);
    }

    const healthSymptomStmt = db.prepare(
      "INSERT INTO health_symptoms (id, name, severity, startDate, endDate, notes, createdAt, updatedAt) VALUES (@id, @name, @severity, @startDate, @endDate, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.health_symptoms || []) {
      healthSymptomStmt.run(row);
    }

    const healthMeasurementStmt = db.prepare(
      "INSERT INTO health_measurements (id, type, value, unit, date, notes, createdAt, updatedAt) VALUES (@id, @type, @value, @unit, @date, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.health_measurements || []) {
      healthMeasurementStmt.run(row);
    }

    const healthObligationStmt = db.prepare(
      "INSERT INTO health_obligations (id, type, title, dueAt, status, priority, completedAt, notes, createdAt, updatedAt) VALUES (@id, @type, @title, @dueAt, @status, @priority, @completedAt, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.health_obligations || []) {
      healthObligationStmt.run(row);
    }

    return {
      health_appointments: payload.health_appointments?.length ?? 0,
      health_medications: payload.health_medications?.length ?? 0,
      health_symptoms: payload.health_symptoms?.length ?? 0,
      health_measurements: payload.health_measurements?.length ?? 0,
      health_obligations: payload.health_obligations?.length ?? 0
    };
  },

  previewSection(payload) {
    const invalidAppointments = invalidArrayPreview(payload, "health_appointments", "health_appointments");
    if (invalidAppointments) return invalidAppointments;
    const invalidMedications = invalidArrayPreview(payload, "health_medications", "health_medications");
    if (invalidMedications) return invalidMedications;
    const invalidSymptoms = invalidArrayPreview(payload, "health_symptoms", "health_symptoms");
    if (invalidSymptoms) return invalidSymptoms;
    return {
      valid: true,
      counts: {
        health_appointments: payload.health_appointments?.length ?? 0,
        health_medications: payload.health_medications?.length ?? 0,
        health_symptoms: payload.health_symptoms?.length ?? 0,
        health_measurements: payload.health_measurements?.length ?? 0,
        health_obligations: payload.health_obligations?.length ?? 0
      }
    };
  }
};
