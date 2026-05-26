import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { CarPanel } from "./CarPanel";
import type { CarVehicle, CarFuelEntry, CarMaintenance, CarRecurringBill, CarMileage, CarServiceReminder } from "../../../shared/types";

function makeVehicle(overrides: Partial<CarVehicle> = {}): CarVehicle {
  return {
    id: `vehicle-${Math.random()}`,
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
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function _makeFuelEntry(overrides: Partial<CarFuelEntry> = {}): CarFuelEntry {
  return {
    id: `fuel-${Math.random()}`,
    vehicleId: "vehicle-1",
    date: "2024-01-15T00:00:00Z",
    odometer: 51000,
    fuelAmount: 45.5,
    fuelUnit: "L",
    pricePerUnit: 150,
    totalPrice: 6825,
    station: "Shell",
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function _makeMaintenance(overrides: Partial<CarMaintenance> = {}): CarMaintenance {
  return {
    id: `maintenance-${Math.random()}`,
    vehicleId: "vehicle-1",
    date: "2024-01-15T00:00:00Z",
    odometer: 51000,
    type: "Oil Change",
    description: "Regular oil change",
    cost: 5000,
    shop: "Auto Shop",
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function _makeRecurringBill(overrides: Partial<CarRecurringBill> = {}): CarRecurringBill {
  return {
    id: `bill-${Math.random()}`,
    vehicleId: "vehicle-1",
    name: "Insurance",
    type: "Insurance",
    amount: 120000,
    dueDate: "2024-01-15T00:00:00Z",
    frequency: "yearly",
    status: "pending",
    lastPaidDate: null,
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function _makeMileage(overrides: Partial<CarMileage> = {}): CarMileage {
  return {
    id: `mileage-${Math.random()}`,
    vehicleId: "vehicle-1",
    date: "2024-01-15T00:00:00Z",
    odometer: 51000,
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function _makeServiceReminder(overrides: Partial<CarServiceReminder> = {}): CarServiceReminder {
  return {
    id: `reminder-${Math.random()}`,
    vehicleId: "vehicle-1",
    type: "Oil Change",
    description: "Regular oil change",
    dueOdometer: 60000,
    dueDate: null,
    status: "pending",
    completedAt: null,
    completedOdometer: null,
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

// Mock the assistant API
const mockApi = {
  listVehicles: vi.fn().mockResolvedValue([]),
  createVehicle: vi.fn().mockResolvedValue(undefined),
  updateVehicle: vi.fn().mockResolvedValue(undefined),
  deleteVehicle: vi.fn().mockResolvedValue(undefined),
  listFuelEntries: vi.fn().mockResolvedValue([]),
  createFuelEntry: vi.fn().mockResolvedValue(undefined),
  _updateFuelEntry: vi.fn().mockResolvedValue(undefined),
  _deleteFuelEntry: vi.fn().mockResolvedValue(undefined),
  _listMaintenance: vi.fn().mockResolvedValue([]),
  createMaintenance: vi.fn().mockResolvedValue(undefined),
  _updateMaintenance: vi.fn().mockResolvedValue(undefined),
  _deleteMaintenance: vi.fn().mockResolvedValue(undefined),
  _listRecurringBills: vi.fn().mockResolvedValue([]),
  createRecurringBill: vi.fn().mockResolvedValue(undefined),
  _updateRecurringBill: vi.fn().mockResolvedValue(undefined),
  markRecurringBillPaid: vi.fn().mockResolvedValue(undefined),
  _deleteRecurringBill: vi.fn().mockResolvedValue(undefined),
  _listMileage: vi.fn().mockResolvedValue([]),
  createMileage: vi.fn().mockResolvedValue(undefined),
  _updateMileage: vi.fn().mockResolvedValue(undefined),
  _deleteMileage: vi.fn().mockResolvedValue(undefined),
  _listServiceReminders: vi.fn().mockResolvedValue([]),
  createServiceReminder: vi.fn().mockResolvedValue(undefined),
  _updateServiceReminder: vi.fn().mockResolvedValue(undefined),
  completeServiceReminder: vi.fn().mockResolvedValue(undefined),
  _deleteServiceReminder: vi.fn().mockResolvedValue(undefined)
};

vi.mock("../../lib/assistantApi", () => ({
  requireAssistantApi: vi.fn(() => mockApi)
}));

describe("CarPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.listVehicles.mockResolvedValue([]);
  });

  it("renders loading state initially", () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();

    render(
      <CarPanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    expect(screen.getByText("Loading car data...")).toBeDefined();
  });

  it("renders empty state when no vehicles", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();

    render(
      <CarPanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("No vehicles yet");
    expect(screen.getByText("Add your first vehicle to start tracking")).toBeDefined();
  });

  it("renders vehicles list when vehicles exist", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();

    const vehicles = [makeVehicle({ name: "Vehicle 1" }), makeVehicle({ name: "Vehicle 2" })];
    mockApi.listVehicles.mockResolvedValue(vehicles);

    render(
      <CarPanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("Vehicle 1");
    expect(screen.getByText("Vehicle 2")).toBeDefined();
  });

  it("shows vehicle form when add vehicle button is clicked", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();

    render(
      <CarPanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("No vehicles yet");

    const buttons = screen.getAllByRole("button");
    const addButton = buttons[0];
    await userEvent.click(addButton);

    expect(screen.getByText("Add Vehicle")).toBeDefined();
    expect(screen.getByLabelText("Name")).toBeDefined();
    expect(screen.getByLabelText("Make")).toBeDefined();
    expect(screen.getByLabelText("Model")).toBeDefined();
  });

  it("calls createVehicle when vehicle form is submitted", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();

    mockApi.createVehicle.mockResolvedValue(undefined);

    render(
      <CarPanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("No vehicles yet");

    const buttons = screen.getAllByRole("button");
    const addButton = buttons[0];
    await userEvent.click(addButton);

    const nameInput = screen.getByLabelText("Name");
    const makeInput = screen.getByLabelText("Make");
    const modelInput = screen.getByLabelText("Model");
    const yearInput = screen.getByLabelText("Year");
    const mileageInput = screen.getByLabelText("Current Mileage (km)");

    await userEvent.type(nameInput, "Test Vehicle");
    await userEvent.type(makeInput, "Toyota");
    await userEvent.type(modelInput, "Camry");
    await userEvent.type(yearInput, "2020");
    await userEvent.type(mileageInput, "50000");

    const submitButton = screen.getByText("Create Vehicle");
    await userEvent.click(submitButton);

    expect(mockApi.createVehicle).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Vehicle",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        currentMileage: 50000
      })
    );
  });

  it("calls deleteVehicle when delete button is clicked", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();

    const vehicle = makeVehicle({ id: "vehicle-1", name: "Test Vehicle" });
    mockApi.listVehicles.mockResolvedValue([vehicle]);
    mockApi.deleteVehicle.mockResolvedValue(undefined);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <CarPanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("Test Vehicle");

    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons.find((btn) => btn.getAttribute("aria-label") === "Delete vehicle");
    expect(deleteButton).toBeDefined();
    await userEvent.click(deleteButton!);

    expect(mockApi.deleteVehicle).toHaveBeenCalledWith("vehicle-1");
    confirmSpy.mockRestore();
  });

  it("displays vehicle details when vehicle is selected", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();

    const vehicle = makeVehicle({ id: "vehicle-1", name: "Test Vehicle", make: "Toyota", model: "Camry", year: 2020, currentMileage: 50000 });
    mockApi.listVehicles.mockResolvedValue([vehicle]);
    mockApi.listFuelEntries.mockResolvedValue([]);
    mockApi._listMaintenance.mockResolvedValue([]);
    mockApi._listRecurringBills.mockResolvedValue([]);
    mockApi._listMileage.mockResolvedValue([]);
    mockApi._listServiceReminders.mockResolvedValue([]);

    render(
      <CarPanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("Test Vehicle");

    // Click on the vehicle to select it
    const vehicleItem = screen.getByText("Test Vehicle");
    await userEvent.click(vehicleItem);

    expect(screen.getByText("Toyota Camry")).toBeDefined();
    expect(screen.getByText("2020")).toBeDefined();
  });

  it("calls onError when API call fails", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();

    mockApi.listVehicles.mockRejectedValue(new Error("API Error"));

    render(
      <CarPanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("No vehicles yet");

    expect(onError).toHaveBeenCalledWith("Failed to load car data");
  });
});