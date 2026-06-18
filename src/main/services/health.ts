import { getDb } from "../db";
import type {
  HealthAppointment,
  HealthMedication,
  HealthSymptom,
  HealthMeasurement,
  HealthObligation,
  HealthSummary
} from "../../shared/types";

// Health appointments
export function listHealthAppointments(): HealthAppointment[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM health_appointments ORDER BY date ASC, time ASC")
    .all() as HealthAppointment[];
  return rows;
}

export function createHealthAppointment(appointment: Omit<HealthAppointment, "id" | "createdAt" | "updatedAt">): HealthAppointment {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO health_appointments (id, type, title, provider, location, date, time, duration, status, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    appointment.type,
    appointment.title,
    appointment.provider,
    appointment.location,
    appointment.date,
    appointment.time,
    appointment.duration,
    appointment.status,
    appointment.notes,
    now,
    now
  );
  
  return { ...appointment, id, createdAt: now, updatedAt: now };
}

export function _updateHealthAppointment(id: string, updates: Partial<Omit<HealthAppointment, "id" | "createdAt" | "updatedAt">>): HealthAppointment | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.type !== undefined) { fields.push("type = ?"); values.push(updates.type); }
  if (updates.title !== undefined) { fields.push("title = ?"); values.push(updates.title); }
  if (updates.provider !== undefined) { fields.push("provider = ?"); values.push(updates.provider); }
  if (updates.location !== undefined) { fields.push("location = ?"); values.push(updates.location); }
  if (updates.date !== undefined) { fields.push("date = ?"); values.push(updates.date); }
  if (updates.time !== undefined) { fields.push("time = ?"); values.push(updates.time); }
  if (updates.duration !== undefined) { fields.push("duration = ?"); values.push(updates.duration); }
  if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE health_appointments SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getHealthAppointmentById(id);
}

export function _deleteHealthAppointment(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM health_appointments WHERE id = ?").run(id);
}

export function getHealthAppointmentById(id: string): HealthAppointment | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM health_appointments WHERE id = ?").get(id) as HealthAppointment | undefined;
  return row || null;
}

// Health medications
export function listHealthMedications(): HealthMedication[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM health_medications ORDER BY createdAt DESC")
    .all() as HealthMedication[];
  return rows;
}

export function createHealthMedication(medication: Omit<HealthMedication, "id" | "createdAt" | "updatedAt">): HealthMedication {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO health_medications (id, name, dosage, frequency, route, status, startDate, endDate, prescriber, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    medication.name,
    medication.dosage,
    medication.frequency,
    medication.route,
    medication.status,
    medication.startDate,
    medication.endDate,
    medication.prescriber,
    medication.notes,
    now,
    now
  );
  
  return { ...medication, id, createdAt: now, updatedAt: now };
}

export function _updateHealthMedication(id: string, updates: Partial<Omit<HealthMedication, "id" | "createdAt" | "updatedAt">>): HealthMedication | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
  if (updates.dosage !== undefined) { fields.push("dosage = ?"); values.push(updates.dosage); }
  if (updates.frequency !== undefined) { fields.push("frequency = ?"); values.push(updates.frequency); }
  if (updates.route !== undefined) { fields.push("route = ?"); values.push(updates.route); }
  if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.startDate !== undefined) { fields.push("startDate = ?"); values.push(updates.startDate); }
  if (updates.endDate !== undefined) { fields.push("endDate = ?"); values.push(updates.endDate); }
  if (updates.prescriber !== undefined) { fields.push("prescriber = ?"); values.push(updates.prescriber); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE health_medications SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getHealthMedicationById(id);
}

export function _deleteHealthMedication(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM health_medications WHERE id = ?").run(id);
}

export function getHealthMedicationById(id: string): HealthMedication | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM health_medications WHERE id = ?").get(id) as HealthMedication | undefined;
  return row || null;
}

// Health symptoms
export function listHealthSymptoms(): HealthSymptom[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM health_symptoms ORDER BY createdAt DESC")
    .all() as HealthSymptom[];
  return rows;
}

export function createHealthSymptom(symptom: Omit<HealthSymptom, "id" | "createdAt" | "updatedAt">): HealthSymptom {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO health_symptoms (id, name, severity, startDate, endDate, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    symptom.name,
    symptom.severity,
    symptom.startDate,
    symptom.endDate,
    symptom.notes,
    now,
    now
  );
  
  return { ...symptom, id, createdAt: now, updatedAt: now };
}

export function _updateHealthSymptom(id: string, updates: Partial<Omit<HealthSymptom, "id" | "createdAt" | "updatedAt">>): HealthSymptom | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
  if (updates.severity !== undefined) { fields.push("severity = ?"); values.push(updates.severity); }
  if (updates.startDate !== undefined) { fields.push("startDate = ?"); values.push(updates.startDate); }
  if (updates.endDate !== undefined) { fields.push("endDate = ?"); values.push(updates.endDate); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE health_symptoms SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getHealthSymptomById(id);
}

export function _deleteHealthSymptom(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM health_symptoms WHERE id = ?").run(id);
}

export function getHealthSymptomById(id: string): HealthSymptom | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM health_symptoms WHERE id = ?").get(id) as HealthSymptom | undefined;
  return row || null;
}

// Health measurements
export function listHealthMeasurements(): HealthMeasurement[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM health_measurements ORDER BY date DESC")
    .all() as HealthMeasurement[];
  return rows;
}

export function createHealthMeasurement(measurement: Omit<HealthMeasurement, "id" | "createdAt" | "updatedAt">): HealthMeasurement {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO health_measurements (id, type, value, unit, date, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    measurement.type,
    measurement.value,
    measurement.unit,
    measurement.date,
    measurement.notes,
    now,
    now
  );
  
  return { ...measurement, id, createdAt: now, updatedAt: now };
}

export function _updateHealthMeasurement(id: string, updates: Partial<Omit<HealthMeasurement, "id" | "createdAt" | "updatedAt">>): HealthMeasurement | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.type !== undefined) { fields.push("type = ?"); values.push(updates.type); }
  if (updates.value !== undefined) { fields.push("value = ?"); values.push(updates.value); }
  if (updates.unit !== undefined) { fields.push("unit = ?"); values.push(updates.unit); }
  if (updates.date !== undefined) { fields.push("date = ?"); values.push(updates.date); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE health_measurements SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getHealthMeasurementById(id);
}

export function _deleteHealthMeasurement(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM health_measurements WHERE id = ?").run(id);
}

export function getHealthMeasurementById(id: string): HealthMeasurement | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM health_measurements WHERE id = ?").get(id) as HealthMeasurement | undefined;
  return row || null;
}

// Health obligations
export function listHealthObligations(): HealthObligation[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM health_obligations 
    ORDER BY 
      CASE WHEN status = 'open' AND dueAt IS NOT NULL AND dueAt < datetime('now') THEN 0 ELSE 1 END,
      CASE WHEN status = 'open' AND dueAt IS NOT NULL THEN dueAt ELSE 999999999999999 END ASC,
      createdAt DESC
  `).all() as HealthObligation[];
  return rows;
}

export function createHealthObligation(obligation: Omit<HealthObligation, "id" | "createdAt" | "updatedAt">): HealthObligation {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO health_obligations (id, type, title, dueAt, status, priority, completedAt, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    obligation.type,
    obligation.title,
    obligation.dueAt,
    obligation.status,
    obligation.priority,
    obligation.completedAt,
    obligation.notes,
    now,
    now
  );
  
  return { ...obligation, id, createdAt: now, updatedAt: now };
}

export function _updateHealthObligation(id: string, updates: Partial<Omit<HealthObligation, "id" | "createdAt" | "updatedAt">>): HealthObligation | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.type !== undefined) { fields.push("type = ?"); values.push(updates.type); }
  if (updates.title !== undefined) { fields.push("title = ?"); values.push(updates.title); }
  if (updates.dueAt !== undefined) { fields.push("dueAt = ?"); values.push(updates.dueAt); }
  if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.priority !== undefined) { fields.push("priority = ?"); values.push(updates.priority); }
  if (updates.completedAt !== undefined) { fields.push("completedAt = ?"); values.push(updates.completedAt); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE health_obligations SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getHealthObligationById(id);
}

export function completeHealthObligation(id: string): HealthObligation | null {
  return _updateHealthObligation(id, {
    status: "done",
    completedAt: new Date().toISOString()
  });
}

export function _deleteHealthObligation(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM health_obligations WHERE id = ?").run(id);
}

export function getHealthObligationById(id: string): HealthObligation | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM health_obligations WHERE id = ?").get(id) as HealthObligation | undefined;
  return row || null;
}

// Health summary
export function getHealthSummary(): HealthSummary {
  const db = getDb();
  
  const today = new Date().toISOString().split('T')[0];
  
  const upcomingAppointments = db.prepare(`
    SELECT COUNT(*) as count FROM health_appointments 
    WHERE date >= ? AND status = 'scheduled'
  `).get(today) as { count: number };
  
  const activeMedications = db.prepare(`
    SELECT COUNT(*) as count FROM health_medications 
    WHERE status = 'active' AND (endDate IS NULL OR endDate >= ?)
  `).get(today) as { count: number };
  
  const activeSymptoms = db.prepare(`
    SELECT COUNT(*) as count FROM health_symptoms 
    WHERE endDate IS NULL OR endDate >= ?
  `).get(today) as { count: number };
  
  const recentMeasurements = db.prepare(`
    SELECT COUNT(*) as count FROM health_measurements 
    WHERE date >= datetime('now', '-30 days')
  `).get() as { count: number };
  
  const openObligations = db.prepare(`
    SELECT COUNT(*) as count FROM health_obligations 
    WHERE status = 'open'
  `).get() as { count: number };
  
  const overdueObligations = db.prepare(`
    SELECT COUNT(*) as count FROM health_obligations 
    WHERE status = 'open' AND dueAt IS NOT NULL AND dueAt < datetime('now')
  `).get() as { count: number };
  
  return {
    upcomingAppointments: upcomingAppointments.count,
    activeMedications: activeMedications.count,
    activeSymptoms: activeSymptoms.count,
    recentMeasurements: recentMeasurements.count,
    openObligations: openObligations.count,
    overdueObligations: overdueObligations.count
  };
}