import type Database from "better-sqlite3";

export const migration = {
  up: (db: Database.Database): void => {
    // Vehicles table
    db.exec(`
      CREATE TABLE IF NOT EXISTS car_vehicles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        licensePlate TEXT,
        vin TEXT,
        color TEXT,
        purchaseDate TEXT,
        purchasePrice INTEGER,
        currentMileage INTEGER DEFAULT 0,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Fuel entries table
    db.exec(`
      CREATE TABLE IF NOT EXISTS car_fuel_entries (
        id TEXT PRIMARY KEY,
        vehicleId TEXT NOT NULL,
        date TEXT NOT NULL,
        odometer INTEGER NOT NULL,
        fuelAmount REAL NOT NULL,
        fuelUnit TEXT DEFAULT 'L',
        pricePerUnit INTEGER NOT NULL,
        totalPrice INTEGER NOT NULL,
        station TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (vehicleId) REFERENCES car_vehicles(id) ON DELETE CASCADE
      )
    `);

    // Maintenance/repair expenses table
    db.exec(`
      CREATE TABLE IF NOT EXISTS car_maintenance (
        id TEXT PRIMARY KEY,
        vehicleId TEXT NOT NULL,
        date TEXT NOT NULL,
        odometer INTEGER,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        cost INTEGER NOT NULL,
        shop TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (vehicleId) REFERENCES car_vehicles(id) ON DELETE CASCADE
      )
    `);

    // Recurring car bills (insurance, registration, inspection, road tax)
    db.exec(`
      CREATE TABLE IF NOT EXISTS car_recurring_bills (
        id TEXT PRIMARY KEY,
        vehicleId TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        dueDate TEXT NOT NULL,
        frequency TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        lastPaidDate TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (vehicleId) REFERENCES car_vehicles(id) ON DELETE CASCADE
      )
    `);

    // Mileage entries table
    db.exec(`
      CREATE TABLE IF NOT EXISTS car_mileage (
        id TEXT PRIMARY KEY,
        vehicleId TEXT NOT NULL,
        date TEXT NOT NULL,
        odometer INTEGER NOT NULL,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (vehicleId) REFERENCES car_vehicles(id) ON DELETE CASCADE
      )
    `);

    // Service reminders table
    db.exec(`
      CREATE TABLE IF NOT EXISTS car_service_reminders (
        id TEXT PRIMARY KEY,
        vehicleId TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        dueOdometer INTEGER,
        dueDate TEXT,
        status TEXT DEFAULT 'pending',
        completedAt TEXT,
        completedOdometer INTEGER,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (vehicleId) REFERENCES car_vehicles(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_car_fuel_vehicle ON car_fuel_entries(vehicleId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_car_fuel_date ON car_fuel_entries(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_car_maintenance_vehicle ON car_maintenance(vehicleId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_car_maintenance_date ON car_maintenance(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_car_recurring_vehicle ON car_recurring_bills(vehicleId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_car_recurring_status ON car_recurring_bills(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_car_mileage_vehicle ON car_mileage(vehicleId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_car_mileage_date ON car_mileage(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_car_service_vehicle ON car_service_reminders(vehicleId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_car_service_status ON car_service_reminders(status)`);
  },
  down: (db: Database.Database) => {
    db.exec(`DROP INDEX IF EXISTS idx_car_service_status`);
    db.exec(`DROP INDEX IF EXISTS idx_car_service_vehicle`);
    db.exec(`DROP INDEX IF EXISTS idx_car_mileage_date`);
    db.exec(`DROP INDEX IF EXISTS idx_car_mileage_vehicle`);
    db.exec(`DROP INDEX IF EXISTS idx_car_recurring_status`);
    db.exec(`DROP INDEX IF EXISTS idx_car_recurring_vehicle`);
    db.exec(`DROP INDEX IF EXISTS idx_car_maintenance_date`);
    db.exec(`DROP INDEX IF EXISTS idx_car_maintenance_vehicle`);
    db.exec(`DROP INDEX IF EXISTS idx_car_fuel_date`);
    db.exec(`DROP INDEX IF EXISTS idx_car_fuel_vehicle`);
    db.exec(`DROP TABLE IF EXISTS car_service_reminders`);
    db.exec(`DROP TABLE IF EXISTS car_mileage`);
    db.exec(`DROP TABLE IF EXISTS car_recurring_bills`);
    db.exec(`DROP TABLE IF EXISTS car_maintenance`);
    db.exec(`DROP TABLE IF EXISTS car_fuel_entries`);
    db.exec(`DROP TABLE IF EXISTS car_vehicles`);
  }
};