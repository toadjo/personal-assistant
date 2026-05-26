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

import {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  listFuelEntries,
  createFuelEntry,
  _updateFuelEntry,
  _deleteFuelEntry,
  _listMaintenance,
  createMaintenance,
  _updateMaintenance,
  _deleteMaintenance,
  _listRecurringBills,
  createRecurringBill,
  _updateRecurringBill,
  markRecurringBillPaid,
  _deleteRecurringBill,
  _listMileage,
  createMileage,
  _updateMileage,
  _deleteMileage,
  _listServiceReminders,
  createServiceReminder,
  _updateServiceReminder,
  completeServiceReminder,
  _deleteServiceReminder
} from "./car";

describe("car service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb.close();
  });

  describe("vehicles", () => {
    it("lists vehicles when none exist", () => {
      const result = listVehicles();
      expect(result).toEqual([]);
    });

    it("creates a vehicle with correct defaults", () => {
      const result = createVehicle({
        name: "My Car",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      expect(result.name).toBe("My Car");
      expect(result.make).toBe("Toyota");
      expect(result.model).toBe("Camry");
      expect(result.year).toBe(2020);
      expect(result.currentMileage).toBe(50000);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("lists vehicles after creation", () => {
      createVehicle({
        name: "Car 1",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      const result = listVehicles();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Car 1");
    });

    it("updates a vehicle", () => {
      const vehicle = createVehicle({
        name: "My Car",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      const updated = updateVehicle(vehicle.id, { name: "Updated Car", currentMileage: 55000 });
      expect(updated?.name).toBe("Updated Car");
      expect(updated?.currentMileage).toBe(55000);
    });

    it("deletes a vehicle", () => {
      const vehicle = createVehicle({
        name: "My Car",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      deleteVehicle(vehicle.id);
      const result = listVehicles();
      expect(result).toHaveLength(0);
    });
  });

  describe("fuel entries", () => {
    it("creates a fuel entry", () => {
      const vehicle = createVehicle({
        name: "My Car",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      const result = createFuelEntry({
        vehicleId: vehicle.id,
        date: "2024-01-15T00:00:00Z",
        odometer: 51000,
        fuelAmount: 45.5,
        fuelUnit: "L",
        pricePerUnit: 150, // 1.50 EUR per liter in cents
        totalPrice: 6825, // 45.5 * 1.50 = 68.25 EUR = 6825 cents
        station: "Shell",
        notes: ""
      });

      expect(result.vehicleId).toBe(vehicle.id);
      expect(result.odometer).toBe(51000);
      expect(result.fuelAmount).toBe(45.5);
      expect(result.totalPrice).toBe(6825);
    });

    it("updates vehicle mileage when fuel entry has higher odometer", () => {
      const vehicle = createVehicle({
        name: "My Car",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      createFuelEntry({
        vehicleId: vehicle.id,
        date: "2024-01-15T00:00:00Z",
        odometer: 51000,
        fuelAmount: 45.5,
        fuelUnit: "L",
        pricePerUnit: 150,
        totalPrice: 6825,
        station: null,
        notes: ""
      });

      const updatedVehicle = listVehicles()[0];
      expect(updatedVehicle?.currentMileage).toBe(51000);
    });

    it("lists fuel entries for a specific vehicle", () => {
      const vehicle1 = createVehicle({
        name: "Car 1",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      const vehicle2 = createVehicle({
        name: "Car 2",
        make: "Honda",
        model: "Civic",
        year: 2021,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 30000,
        notes: ""
      });

      createFuelEntry({
        vehicleId: vehicle1.id,
        date: "2024-01-15T00:00:00Z",
        odometer: 51000,
        fuelAmount: 45.5,
        fuelUnit: "L",
        pricePerUnit: 150,
        totalPrice: 6825,
        station: null,
        notes: ""
      });

      createFuelEntry({
        vehicleId: vehicle2.id,
        date: "2024-01-15T00:00:00Z",
        odometer: 31000,
        fuelAmount: 40.0,
        fuelUnit: "L",
        pricePerUnit: 160,
        totalPrice: 6400,
        station: null,
        notes: ""
      });

      const result = listFuelEntries(vehicle1.id);
      expect(result).toHaveLength(1);
      expect(result[0]?.vehicleId).toBe(vehicle1.id);
    });
  });

  describe("maintenance", () => {
    it("creates a maintenance record", () => {
      const vehicle = createVehicle({
        name: "My Car",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      const result = createMaintenance({
        vehicleId: vehicle.id,
        date: "2024-01-15T00:00:00Z",
        odometer: 51000,
        type: "Oil Change",
        description: "Regular oil change",
        cost: 5000, // 50 EUR
        shop: "Auto Shop",
        notes: ""
      });

      expect(result.type).toBe("Oil Change");
      expect(result.cost).toBe(5000);
      expect(result.shop).toBe("Auto Shop");
    });

    it("updates vehicle mileage when maintenance has higher odometer", () => {
      const vehicle = createVehicle({
        name: "My Car",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      createMaintenance({
        vehicleId: vehicle.id,
        date: "2024-01-15T00:00:00Z",
        odometer: 52000,
        type: "Oil Change",
        description: "Regular oil change",
        cost: 5000,
        shop: null,
        notes: ""
      });

      const updatedVehicle = listVehicles()[0];
      expect(updatedVehicle?.currentMileage).toBe(52000);
    });
  });

  describe("recurring bills", () => {
    it("creates a recurring bill", () => {
      const vehicle = createVehicle({
        name: "My Car",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      const result = createRecurringBill({
        vehicleId: vehicle.id,
        name: "Insurance",
        type: "Insurance",
        amount: 120000, // 1200 EUR
        dueDate: "2024-01-15T00:00:00Z",
        frequency: "yearly",
        status: "pending",
        lastPaidDate: null,
        notes: ""
      });

      expect(result.name).toBe("Insurance");
      expect(result.amount).toBe(120000);
      expect(result.frequency).toBe("yearly");
      expect(result.status).toBe("pending");
    });

    it("marks a recurring bill as paid", () => {
      const vehicle = createVehicle({
        name: "My Car",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      const bill = createRecurringBill({
        vehicleId: vehicle.id,
        name: "Insurance",
        type: "Insurance",
        amount: 120000,
        dueDate: "2024-01-15T00:00:00Z",
        frequency: "yearly",
        status: "pending",
        lastPaidDate: null,
        notes: ""
      });

      const updated = markRecurringBillPaid(bill.id);
      expect(updated?.status).toBe("paid");
      expect(updated?.lastPaidDate).toBeDefined();
    });
  });

  describe("mileage", () => {
    it("creates a mileage record", () => {
      const vehicle = createVehicle({
        name: "My Car",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      const result = createMileage({
        vehicleId: vehicle.id,
        date: "2024-01-15T00:00:00Z",
        odometer: 51000,
        notes: ""
      });

      expect(result.odometer).toBe(51000);
      expect(result.vehicleId).toBe(vehicle.id);
    });

    it("updates vehicle mileage when mileage record has higher odometer", () => {
      const vehicle = createVehicle({
        name: "My Car",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      createMileage({
        vehicleId: vehicle.id,
        date: "2024-01-15T00:00:00Z",
        odometer: 53000,
        notes: ""
      });

      const updatedVehicle = listVehicles()[0];
      expect(updatedVehicle?.currentMileage).toBe(53000);
    });
  });

  describe("service reminders", () => {
    it("creates a service reminder", () => {
      const vehicle = createVehicle({
        name: "My Car",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      const result = createServiceReminder({
        vehicleId: vehicle.id,
        type: "Oil Change",
        description: "Regular oil change every 10000 km",
        dueOdometer: 60000,
        dueDate: null,
        status: "pending",
        completedAt: null,
        completedOdometer: null,
        notes: ""
      });

      expect(result.type).toBe("Oil Change");
      expect(result.dueOdometer).toBe(60000);
      expect(result.status).toBe("pending");
    });

    it("completes a service reminder", () => {
      const vehicle = createVehicle({
        name: "My Car",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        licensePlate: null,
        vin: null,
        color: null,
        purchaseDate: null,
        purchasePrice: null,
        currentMileage: 50000,
        notes: ""
      });

      const reminder = createServiceReminder({
        vehicleId: vehicle.id,
        type: "Oil Change",
        description: "Regular oil change",
        dueOdometer: 60000,
        dueDate: null,
        status: "pending",
        completedAt: null,
        completedOdometer: null,
        notes: ""
      });

      const updated = completeServiceReminder(reminder.id, 60000);
      expect(updated?.status).toBe("completed");
      expect(updated?.completedAt).toBeDefined();
      expect(updated?.completedOdometer).toBe(60000);
    });
  });
});