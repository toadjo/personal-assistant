import { getDb } from "../db";
import type {
  CarVehicle,
  CarFuelEntry,
  CarMaintenance,
  CarRecurringBill,
  CarMileage,
  CarServiceReminder
} from "../../shared/types";

// Vehicles
export function listVehicles(): CarVehicle[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM car_vehicles ORDER BY createdAt DESC")
    .all() as CarVehicle[];
  return rows;
}

export function createVehicle(vehicle: Omit<CarVehicle, "id" | "createdAt" | "updatedAt">): CarVehicle {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO car_vehicles (id, name, make, model, year, licensePlate, vin, color, purchaseDate, purchasePrice, currentMileage, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    vehicle.name,
    vehicle.make,
    vehicle.model,
    vehicle.year,
    vehicle.licensePlate,
    vehicle.vin,
    vehicle.color,
    vehicle.purchaseDate,
    vehicle.purchasePrice,
    vehicle.currentMileage,
    vehicle.notes,
    now,
    now
  );
  
  return { ...vehicle, id, createdAt: now, updatedAt: now };
}

export function updateVehicle(id: string, updates: Partial<Omit<CarVehicle, "id" | "createdAt" | "updatedAt">>): CarVehicle | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  
  if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
  if (updates.make !== undefined) { fields.push("make = ?"); values.push(updates.make); }
  if (updates.model !== undefined) { fields.push("model = ?"); values.push(updates.model); }
  if (updates.year !== undefined) { fields.push("year = ?"); values.push(updates.year); }
  if (updates.licensePlate !== undefined) { fields.push("licensePlate = ?"); values.push(updates.licensePlate); }
  if (updates.vin !== undefined) { fields.push("vin = ?"); values.push(updates.vin); }
  if (updates.color !== undefined) { fields.push("color = ?"); values.push(updates.color); }
  if (updates.purchaseDate !== undefined) { fields.push("purchaseDate = ?"); values.push(updates.purchaseDate); }
  if (updates.purchasePrice !== undefined) { fields.push("purchasePrice = ?"); values.push(updates.purchasePrice); }
  if (updates.currentMileage !== undefined) { fields.push("currentMileage = ?"); values.push(updates.currentMileage); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE car_vehicles SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getVehicleById(id);
}

export function deleteVehicle(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM car_vehicles WHERE id = ?").run(id);
}

export function getVehicleById(id: string): CarVehicle | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM car_vehicles WHERE id = ?").get(id) as CarVehicle | undefined;
  return row || null;
}

// Fuel entries
export function listFuelEntries(vehicleId?: string): CarFuelEntry[] {
  const db = getDb();
  let stmt;
  if (vehicleId) {
    stmt = db.prepare("SELECT * FROM car_fuel_entries WHERE vehicleId = ? ORDER BY date DESC");
    return stmt.all(vehicleId) as CarFuelEntry[];
  }
  stmt = db.prepare("SELECT * FROM car_fuel_entries ORDER BY date DESC");
  return stmt.all() as CarFuelEntry[];
}

export function createFuelEntry(entry: Omit<CarFuelEntry, "id" | "createdAt" | "updatedAt">): CarFuelEntry {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO car_fuel_entries (id, vehicleId, date, odometer, fuelAmount, fuelUnit, pricePerUnit, totalPrice, station, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    entry.vehicleId,
    entry.date,
    entry.odometer,
    entry.fuelAmount,
    entry.fuelUnit,
    entry.pricePerUnit,
    entry.totalPrice,
    entry.station,
    entry.notes,
    now,
    now
  );
  
  // Update vehicle mileage if this is the highest odometer reading
  updateVehicleMileageIfHigher(entry.vehicleId, entry.odometer);
  
  return { ...entry, id, createdAt: now, updatedAt: now };
}

export function _updateFuelEntry(id: string, updates: Partial<Omit<CarFuelEntry, "id" | "createdAt" | "updatedAt">>): CarFuelEntry | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  
  if (updates.vehicleId !== undefined) { fields.push("vehicleId = ?"); values.push(updates.vehicleId); }
  if (updates.date !== undefined) { fields.push("date = ?"); values.push(updates.date); }
  if (updates.odometer !== undefined) { fields.push("odometer = ?"); values.push(updates.odometer); }
  if (updates.fuelAmount !== undefined) { fields.push("fuelAmount = ?"); values.push(updates.fuelAmount); }
  if (updates.fuelUnit !== undefined) { fields.push("fuelUnit = ?"); values.push(updates.fuelUnit); }
  if (updates.pricePerUnit !== undefined) { fields.push("pricePerUnit = ?"); values.push(updates.pricePerUnit); }
  if (updates.totalPrice !== undefined) { fields.push("totalPrice = ?"); values.push(updates.totalPrice); }
  if (updates.station !== undefined) { fields.push("station = ?"); values.push(updates.station); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE car_fuel_entries SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getFuelEntryById(id);
}

export function _deleteFuelEntry(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM car_fuel_entries WHERE id = ?").run(id);
}

export function getFuelEntryById(id: string): CarFuelEntry | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM car_fuel_entries WHERE id = ?").get(id) as CarFuelEntry | undefined;
  return row || null;
}

// Maintenance
export function _listMaintenance(vehicleId?: string): CarMaintenance[] {
  const db = getDb();
  let stmt;
  if (vehicleId) {
    stmt = db.prepare("SELECT * FROM car_maintenance WHERE vehicleId = ? ORDER BY date DESC");
    return stmt.all(vehicleId) as CarMaintenance[];
  }
  stmt = db.prepare("SELECT * FROM car_maintenance ORDER BY date DESC");
  return stmt.all() as CarMaintenance[];
}

export function createMaintenance(entry: Omit<CarMaintenance, "id" | "createdAt" | "updatedAt">): CarMaintenance {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO car_maintenance (id, vehicleId, date, odometer, type, description, cost, shop, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    entry.vehicleId,
    entry.date,
    entry.odometer,
    entry.type,
    entry.description,
    entry.cost,
    entry.shop,
    entry.notes,
    now,
    now
  );
  
  // Update vehicle mileage if this is the highest odometer reading
  if (entry.odometer) {
    updateVehicleMileageIfHigher(entry.vehicleId, entry.odometer);
  }
  
  return { ...entry, id, createdAt: now, updatedAt: now };
}

export function _updateMaintenance(id: string, updates: Partial<Omit<CarMaintenance, "id" | "createdAt" | "updatedAt">>): CarMaintenance | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  
  if (updates.vehicleId !== undefined) { fields.push("vehicleId = ?"); values.push(updates.vehicleId); }
  if (updates.date !== undefined) { fields.push("date = ?"); values.push(updates.date); }
  if (updates.odometer !== undefined) { fields.push("odometer = ?"); values.push(updates.odometer); }
  if (updates.type !== undefined) { fields.push("type = ?"); values.push(updates.type); }
  if (updates.description !== undefined) { fields.push("description = ?"); values.push(updates.description); }
  if (updates.cost !== undefined) { fields.push("cost = ?"); values.push(updates.cost); }
  if (updates.shop !== undefined) { fields.push("shop = ?"); values.push(updates.shop); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE car_maintenance SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getMaintenanceById(id);
}

export function _deleteMaintenance(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM car_maintenance WHERE id = ?").run(id);
}

export function getMaintenanceById(id: string): CarMaintenance | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM car_maintenance WHERE id = ?").get(id) as CarMaintenance | undefined;
  return row || null;
}

// Recurring bills
export function _listRecurringBills(vehicleId?: string): CarRecurringBill[] {
  const db = getDb();
  let stmt;
  if (vehicleId) {
    stmt = db.prepare("SELECT * FROM car_recurring_bills WHERE vehicleId = ? ORDER BY dueDate ASC");
    return stmt.all(vehicleId) as CarRecurringBill[];
  }
  stmt = db.prepare("SELECT * FROM car_recurring_bills ORDER BY dueDate ASC");
  return stmt.all() as CarRecurringBill[];
}

export function createRecurringBill(bill: Omit<CarRecurringBill, "id" | "createdAt" | "updatedAt">): CarRecurringBill {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO car_recurring_bills (id, vehicleId, name, type, amount, dueDate, frequency, status, lastPaidDate, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    bill.vehicleId,
    bill.name,
    bill.type,
    bill.amount,
    bill.dueDate,
    bill.frequency,
    bill.status,
    bill.lastPaidDate,
    bill.notes,
    now,
    now
  );
  
  return { ...bill, id, createdAt: now, updatedAt: now };
}

export function _updateRecurringBill(id: string, updates: Partial<Omit<CarRecurringBill, "id" | "createdAt" | "updatedAt">>): CarRecurringBill | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  
  if (updates.vehicleId !== undefined) { fields.push("vehicleId = ?"); values.push(updates.vehicleId); }
  if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
  if (updates.type !== undefined) { fields.push("type = ?"); values.push(updates.type); }
  if (updates.amount !== undefined) { fields.push("amount = ?"); values.push(updates.amount); }
  if (updates.dueDate !== undefined) { fields.push("dueDate = ?"); values.push(updates.dueDate); }
  if (updates.frequency !== undefined) { fields.push("frequency = ?"); values.push(updates.frequency); }
  if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.lastPaidDate !== undefined) { fields.push("lastPaidDate = ?"); values.push(updates.lastPaidDate); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE car_recurring_bills SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getRecurringBillById(id);
}

export function markRecurringBillPaid(id: string): CarRecurringBill | null {
  const now = new Date().toISOString();
  return _updateRecurringBill(id, { status: "paid", lastPaidDate: now });
}

export function _deleteRecurringBill(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM car_recurring_bills WHERE id = ?").run(id);
}

export function getRecurringBillById(id: string): CarRecurringBill | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM car_recurring_bills WHERE id = ?").get(id) as CarRecurringBill | undefined;
  return row || null;
}

// Mileage
export function _listMileage(vehicleId?: string): CarMileage[] {
  const db = getDb();
  let stmt;
  if (vehicleId) {
    stmt = db.prepare("SELECT * FROM car_mileage WHERE vehicleId = ? ORDER BY date DESC");
    return stmt.all(vehicleId) as CarMileage[];
  }
  stmt = db.prepare("SELECT * FROM car_mileage ORDER BY date DESC");
  return stmt.all() as CarMileage[];
}

export function createMileage(entry: Omit<CarMileage, "id" | "createdAt" | "updatedAt">): CarMileage {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO car_mileage (id, vehicleId, date, odometer, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    entry.vehicleId,
    entry.date,
    entry.odometer,
    entry.notes,
    now,
    now
  );
  
  // Update vehicle mileage if this is the highest odometer reading
  updateVehicleMileageIfHigher(entry.vehicleId, entry.odometer);
  
  return { ...entry, id, createdAt: now, updatedAt: now };
}

export function _updateMileage(id: string, updates: Partial<Omit<CarMileage, "id" | "createdAt" | "updatedAt">>): CarMileage | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  
  if (updates.vehicleId !== undefined) { fields.push("vehicleId = ?"); values.push(updates.vehicleId); }
  if (updates.date !== undefined) { fields.push("date = ?"); values.push(updates.date); }
  if (updates.odometer !== undefined) { fields.push("odometer = ?"); values.push(updates.odometer); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE car_mileage SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getMileageById(id);
}

export function _deleteMileage(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM car_mileage WHERE id = ?").run(id);
}

export function getMileageById(id: string): CarMileage | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM car_mileage WHERE id = ?").get(id) as CarMileage | undefined;
  return row || null;
}

// Service reminders
export function _listServiceReminders(vehicleId?: string): CarServiceReminder[] {
  const db = getDb();
  let stmt;
  if (vehicleId) {
    stmt = db.prepare("SELECT * FROM car_service_reminders WHERE vehicleId = ? ORDER BY dueDate ASC, dueOdometer ASC");
    return stmt.all(vehicleId) as CarServiceReminder[];
  }
  stmt = db.prepare("SELECT * FROM car_service_reminders ORDER BY dueDate ASC, dueOdometer ASC");
  return stmt.all() as CarServiceReminder[];
}

export function createServiceReminder(reminder: Omit<CarServiceReminder, "id" | "createdAt" | "updatedAt">): CarServiceReminder {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO car_service_reminders (id, vehicleId, type, description, dueOdometer, dueDate, status, completedAt, completedOdometer, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    reminder.vehicleId,
    reminder.type,
    reminder.description,
    reminder.dueOdometer,
    reminder.dueDate,
    reminder.status,
    reminder.completedAt,
    reminder.completedOdometer,
    reminder.notes,
    now,
    now
  );
  
  return { ...reminder, id, createdAt: now, updatedAt: now };
}

export function _updateServiceReminder(id: string, updates: Partial<Omit<CarServiceReminder, "id" | "createdAt" | "updatedAt">>): CarServiceReminder | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  
  if (updates.vehicleId !== undefined) { fields.push("vehicleId = ?"); values.push(updates.vehicleId); }
  if (updates.type !== undefined) { fields.push("type = ?"); values.push(updates.type); }
  if (updates.description !== undefined) { fields.push("description = ?"); values.push(updates.description); }
  if (updates.dueOdometer !== undefined) { fields.push("dueOdometer = ?"); values.push(updates.dueOdometer); }
  if (updates.dueDate !== undefined) { fields.push("dueDate = ?"); values.push(updates.dueDate); }
  if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.completedAt !== undefined) { fields.push("completedAt = ?"); values.push(updates.completedAt); }
  if (updates.completedOdometer !== undefined) { fields.push("completedOdometer = ?"); values.push(updates.completedOdometer); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE car_service_reminders SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getServiceReminderById(id);
}

export function completeServiceReminder(id: string, completedOdometer?: number): CarServiceReminder | null {
  const now = new Date().toISOString();
  return _updateServiceReminder(id, { 
    status: "completed", 
    completedAt: now,
    completedOdometer: completedOdometer || null
  });
}

export function _deleteServiceReminder(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM car_service_reminders WHERE id = ?").run(id);
}

export function getServiceReminderById(id: string): CarServiceReminder | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM car_service_reminders WHERE id = ?").get(id) as CarServiceReminder | undefined;
  return row || null;
}

// Helper function to update vehicle mileage if the new odometer is higher
function updateVehicleMileageIfHigher(vehicleId: string, odometer: number): void {
  const vehicle = getVehicleById(vehicleId);
  if (vehicle && odometer > vehicle.currentMileage) {
    updateVehicle(vehicleId, { currentMileage: odometer });
  }
}