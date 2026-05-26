import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { HealthPanel } from "./HealthPanel";
import type { HealthAppointment, HealthMedication, HealthSymptom, HealthMeasurement, HealthObligation, HealthSummary } from "../../../shared/types";

function makeAppointment(overrides: Partial<HealthAppointment> = {}): HealthAppointment {
  return {
    id: `appointment-${Math.random()}`,
    type: "checkup",
    title: "Annual Checkup",
    provider: "Dr. Smith",
    location: "Medical Center",
    date: "2024-06-15T00:00:00Z",
    time: "10:00",
    duration: 30,
    status: "scheduled",
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function makeMedication(overrides: Partial<HealthMedication> = {}): HealthMedication {
  return {
    id: `medication-${Math.random()}`,
    name: "Aspirin",
    dosage: "100mg",
    frequency: "daily",
    route: "oral",
    status: "active",
    startDate: "2024-01-01T00:00:00Z",
    endDate: null,
    prescriber: "Dr. Smith",
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function makeSymptom(overrides: Partial<HealthSymptom> = {}): HealthSymptom {
  return {
    id: `symptom-${Math.random()}`,
    name: "Headache",
    severity: "mild",
    startDate: "2024-06-01T00:00:00Z",
    endDate: null,
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function makeMeasurement(overrides: Partial<HealthMeasurement> = {}): HealthMeasurement {
  return {
    id: `measurement-${Math.random()}`,
    type: "weight",
    value: "70",
    unit: "kg",
    date: "2024-06-01T00:00:00Z",
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function makeObligation(overrides: Partial<HealthObligation> = {}): HealthObligation {
  return {
    id: `obligation-${Math.random()}`,
    type: "refill",
    title: "Refill Prescription",
    dueAt: "2024-06-20T10:00:00Z",
    status: "open",
    priority: "normal",
    completedAt: null,
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function makeSummary(overrides: Partial<HealthSummary> = {}): HealthSummary {
  return {
    upcomingAppointments: 3,
    activeMedications: 2,
    activeSymptoms: 1,
    recentMeasurements: 5,
    openObligations: 4,
    overdueObligations: 1,
    ...overrides
  };
}

const mockApi = {
  listHealthAppointments: vi.fn(),
  createHealthAppointment: vi.fn(),
  updateHealthAppointment: vi.fn(),
  deleteHealthAppointment: vi.fn(),
  listHealthMedications: vi.fn(),
  createHealthMedication: vi.fn(),
  updateHealthMedication: vi.fn(),
  deleteHealthMedication: vi.fn(),
  listHealthSymptoms: vi.fn(),
  createHealthSymptom: vi.fn(),
  updateHealthSymptom: vi.fn(),
  deleteHealthSymptom: vi.fn(),
  listHealthMeasurements: vi.fn(),
  createHealthMeasurement: vi.fn(),
  updateHealthMeasurement: vi.fn(),
  deleteHealthMeasurement: vi.fn(),
  listHealthObligations: vi.fn(),
  createHealthObligation: vi.fn(),
  updateHealthObligation: vi.fn(),
  completeHealthObligation: vi.fn(),
  deleteHealthObligation: vi.fn(),
  getHealthSummary: vi.fn()
};

vi.mock("../../lib/assistantApi", () => ({
  requireAssistantApi: () => mockApi
}));

describe("HealthPanel", () => {
  const defaultProps = {
    isRefreshing: false,
    onRefresh: vi.fn(),
    onError: vi.fn(),
    onShowSuccess: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.listHealthAppointments.mockResolvedValue([]);
    mockApi.listHealthMedications.mockResolvedValue([]);
    mockApi.listHealthSymptoms.mockResolvedValue([]);
    mockApi.listHealthMeasurements.mockResolvedValue([]);
    mockApi.listHealthObligations.mockResolvedValue([]);
    mockApi.getHealthSummary.mockResolvedValue(makeSummary());
  });

  it("renders loading state initially", () => {
    render(<HealthPanel {...defaultProps} />);
    expect(screen.getByText("Loading health data...")).toBeInTheDocument();
  });

  it("renders empty state when no data", async () => {
    render(<HealthPanel {...defaultProps} />);
    
    await screen.findByText("No appointments yet");
    expect(screen.getByText("Add your first appointment to get started")).toBeInTheDocument();
    expect(screen.getByText("No medications yet")).toBeInTheDocument();
    expect(screen.getByText("No symptoms recorded")).toBeInTheDocument();
    expect(screen.getByText("No measurements recorded")).toBeInTheDocument();
    expect(screen.getByText("No obligations yet")).toBeInTheDocument();
  });

  it("renders summary statistics", async () => {
    const summary = makeSummary({ upcomingAppointments: 3, activeMedications: 2, activeSymptoms: 1, recentMeasurements: 5, openObligations: 4, overdueObligations: 1 });
    mockApi.getHealthSummary.mockResolvedValue(summary);

    render(<HealthPanel {...defaultProps} />);
    
    await screen.findAllByText("3");
    await screen.findByText("2");
    expect(screen.getAllByText("1")).toHaveLength(2);
    await screen.findByText("5");
    await screen.findByText("4");
  });

  it("renders appointments list", async () => {
    const appointments = [makeAppointment({ title: "Annual Checkup" })];
    mockApi.listHealthAppointments.mockResolvedValue(appointments);

    render(<HealthPanel {...defaultProps} />);
    
    await screen.findByText("Annual Checkup");
    expect(screen.getByText("checkup")).toBeInTheDocument();
  });

  it("renders medications list", async () => {
    const medications = [makeMedication({ name: "Aspirin" })];
    mockApi.listHealthMedications.mockResolvedValue(medications);

    render(<HealthPanel {...defaultProps} />);
    
    await screen.findByText("Aspirin");
    expect(screen.getByText("100mg")).toBeInTheDocument();
  });

  it("renders symptoms list", async () => {
    const symptoms = [makeSymptom({ name: "Headache" })];
    mockApi.listHealthSymptoms.mockResolvedValue(symptoms);

    render(<HealthPanel {...defaultProps} />);
    
    await screen.findByText("Headache");
    expect(screen.getByText("mild")).toBeInTheDocument();
  });

  it("renders measurements list", async () => {
    const measurements = [makeMeasurement({ type: "weight", value: "70", unit: "kg" })];
    mockApi.listHealthMeasurements.mockResolvedValue(measurements);

    render(<HealthPanel {...defaultProps} />);
    
    await screen.findByText("weight");
    expect(screen.getByText("70 kg")).toBeInTheDocument();
  });

  it("renders obligations list", async () => {
    const obligations = [makeObligation({ title: "Refill Prescription" })];
    mockApi.listHealthObligations.mockResolvedValue(obligations);

    render(<HealthPanel {...defaultProps} />);
    
    await screen.findByText("Refill Prescription");
    expect(screen.getByText("refill")).toBeInTheDocument();
  });

  it("shows appointment form when add appointment clicked", async () => {
    render(<HealthPanel {...defaultProps} />);

    await screen.findByText("No appointments yet");

    const allButtons = screen.getAllByRole("button");
    const addButton = allButtons[0];
    if (!addButton) throw new Error("Add button not found");
    await userEvent.click(addButton);

    expect(screen.getByText("Add Appointment")).toBeInTheDocument();
  });

  it("calls completeHealthObligation when complete clicked", async () => {
    const obligations = [makeObligation({ id: "obligation-1", title: "Refill Prescription", status: "open" })];
    mockApi.listHealthObligations.mockResolvedValue(obligations);
    mockApi.completeHealthObligation.mockResolvedValue(makeObligation({ status: "done" }));

    render(<HealthPanel {...defaultProps} />);
    
    await screen.findByText("Refill Prescription");
    
    const completeButton = screen.getByLabelText("Complete obligation");
    await userEvent.click(completeButton);
    
    expect(mockApi.completeHealthObligation).toHaveBeenCalledWith("obligation-1");
  });

  it("calls onError when API call fails", async () => {
    mockApi.listHealthAppointments.mockRejectedValue(new Error("API error"));

    render(<HealthPanel {...defaultProps} />);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(defaultProps.onError).toHaveBeenCalledWith("Failed to load health data");
  });

  it("shows medication form when add medication clicked", async () => {
    render(<HealthPanel {...defaultProps} />);

    await screen.findByText("No medications yet");

    const allButtons = screen.getAllByRole("button");
    const addButton = allButtons[1];
    if (!addButton) throw new Error("Add button not found");
    await userEvent.click(addButton);

    expect(screen.getByText("Add Medication")).toBeInTheDocument();
  });

  it("shows symptom form when add symptom clicked", async () => {
    render(<HealthPanel {...defaultProps} />);

    await screen.findByText("No symptoms recorded");

    const allButtons = screen.getAllByRole("button");
    const addButton = allButtons[2];
    if (!addButton) throw new Error("Add button not found");
    await userEvent.click(addButton);

    expect(screen.getByText("Add Symptom")).toBeInTheDocument();
  });

  it("shows measurement form when add measurement clicked", async () => {
    render(<HealthPanel {...defaultProps} />);

    await screen.findByText("No measurements recorded");

    const allButtons = screen.getAllByRole("button");
    const addButton = allButtons[3];
    if (!addButton) throw new Error("Add button not found");
    await userEvent.click(addButton);

    expect(screen.getByText("Add Measurement")).toBeInTheDocument();
  });

  it("shows obligation form when add obligation clicked", async () => {
    render(<HealthPanel {...defaultProps} />);

    await screen.findByText("No obligations yet");

    const allButtons = screen.getAllByRole("button");
    const addButton = allButtons[4];
    if (!addButton) throw new Error("Add button not found");
    await userEvent.click(addButton);

    expect(screen.getByText("Add Obligation")).toBeInTheDocument();
  });
});