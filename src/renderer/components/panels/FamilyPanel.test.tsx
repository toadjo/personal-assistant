import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { FamilyPanel } from "./FamilyPanel";
import type { FamilyMember, FamilyOccasion, FamilyObligation, FamilySummary } from "../../../shared/types";

function makeMember(overrides: Partial<FamilyMember> = {}): FamilyMember {
  return {
    id: `member-${Math.random()}`,
    name: "John Doe",
    relationship: "Father",
    phone: "+1234567890",
    email: "john@example.com",
    address: "123 Main St",
    preferredContactMethod: "any",
    notes: "",
    isImportant: 0,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function _makeOccasion(overrides: Partial<FamilyOccasion> = {}): FamilyOccasion {
  return {
    id: `occasion-${Math.random()}`,
    memberId: "member-1",
    type: "birthday",
    title: "Birthday",
    date: "2024-06-15T00:00:00Z",
    recurrence: "yearly",
    remindDaysBefore: 7,
    lastAcknowledgedAt: null,
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function _makeObligation(overrides: Partial<FamilyObligation> = {}): FamilyObligation {
  return {
    id: `obligation-${Math.random()}`,
    memberId: "member-1",
    occasionId: null,
    type: "call",
    title: "Call John",
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

function makeSummary(overrides: Partial<FamilySummary> = {}): FamilySummary {
  return {
    totalMembers: 5,
    importantMembers: 2,
    upcomingOccasions: 3,
    openObligations: 4,
    overdueObligations: 1,
    ...overrides
  };
}

const mockApi = {
  listFamilyMembers: vi.fn(),
  createFamilyMember: vi.fn(),
  updateFamilyMember: vi.fn(),
  deleteFamilyMember: vi.fn(),
  listFamilyOccasions: vi.fn(),
  createFamilyOccasion: vi.fn(),
  updateFamilyOccasion: vi.fn(),
  deleteFamilyOccasion: vi.fn(),
  listFamilyObligations: vi.fn(),
  createFamilyObligation: vi.fn(),
  updateFamilyObligation: vi.fn(),
  completeFamilyObligation: vi.fn(),
  deleteFamilyObligation: vi.fn(),
  getFamilySummary: vi.fn()
};

vi.mock("../../lib/assistantApi", () => ({
  requireAssistantApi: () => mockApi
}));

describe("FamilyPanel", () => {
  const defaultProps = {
    isRefreshing: false,
    onRefresh: vi.fn(),
    onError: vi.fn(),
    onShowSuccess: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.listFamilyMembers.mockResolvedValue([]);
    mockApi.getFamilySummary.mockResolvedValue(makeSummary());
    mockApi.listFamilyOccasions.mockResolvedValue([]);
    mockApi.listFamilyObligations.mockResolvedValue([]);
  });

  it("renders empty state when no members", async () => {
    render(<FamilyPanel {...defaultProps} />);
    
    await screen.findByText("No family members yet");
    expect(screen.getByText("Add your first family member to get started")).toBeInTheDocument();
    expect(screen.getByText("Add Member")).toBeInTheDocument();
  });

  it("renders member list", async () => {
    const members = [makeMember({ name: "John Doe", relationship: "Father" })];
    mockApi.listFamilyMembers.mockResolvedValue(members);

    render(<FamilyPanel {...defaultProps} />);
    
    await screen.findByText("John Doe");
    expect(screen.getByText("Father")).toBeInTheDocument();
  });

  it("shows summary statistics", async () => {
    const summary = makeSummary({ totalMembers: 5, upcomingOccasions: 3, openObligations: 4, overdueObligations: 1 });
    mockApi.getFamilySummary.mockResolvedValue(summary);

    render(<FamilyPanel {...defaultProps} />);
    
    await screen.findByText("5");
    await screen.findByText("3");
    await screen.findByText("4");
    await screen.findByText("1");
  });

  it("opens member form when add member clicked", async () => {
    render(<FamilyPanel {...defaultProps} />);
    
    const addButton = await screen.findByText("Add Member");
    await userEvent.click(addButton);
    
    expect(screen.getByText("Add Family Member")).toBeInTheDocument();
  });

  it("calls createFamilyMember when form submitted", async () => {
    mockApi.createFamilyMember.mockResolvedValue(makeMember());

    render(<FamilyPanel {...defaultProps} />);
    
    const addButton = await screen.findByText("Add Member");
    await userEvent.click(addButton);
    
    // Wait for modal to appear
    await screen.findByText("Add Family Member");
    
    const nameInput = screen.getByLabelText(/name/i);
    await userEvent.type(nameInput, "Jane Doe");
    
    const relationshipInput = screen.getByLabelText(/relationship/i);
    await userEvent.type(relationshipInput, "Mother");
    
    // Find the submit button by looking for all buttons and finding the submit one
    const buttons = screen.getAllByRole("button");
    const submitButton = buttons.find(b => b.getAttribute("type") === "submit");
    if (!submitButton) {
      throw new Error("Submit button not found");
    }
    await userEvent.click(submitButton);
    
    expect(mockApi.createFamilyMember).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Jane Doe",
        relationship: "Mother"
      })
    );
  });

  it("displays occasions for selected member", async () => {
    const members = [makeMember({ id: "member-1", name: "John Doe" })];
    const occasions = [_makeOccasion({ title: "Birthday" })];
    mockApi.listFamilyMembers.mockResolvedValue(members);
    mockApi.listFamilyOccasions.mockResolvedValue(occasions);

    render(<FamilyPanel {...defaultProps} />);
    
    await screen.findByText("John Doe");
    await userEvent.click(screen.getByText("John Doe"));
    
    await screen.findByText("Birthday");
  });

  it("displays obligations for selected member", async () => {
    const members = [makeMember({ id: "member-1", name: "John Doe" })];
    const obligations = [_makeObligation({ title: "Call John" })];
    mockApi.listFamilyMembers.mockResolvedValue(members);
    mockApi.listFamilyObligations.mockResolvedValue(obligations);

    render(<FamilyPanel {...defaultProps} />);
    
    await screen.findByText("John Doe");
    await userEvent.click(screen.getByText("John Doe"));
    
    await screen.findByText("Call John");
  });

  it("calls completeFamilyObligation when complete clicked", async () => {
    const members = [makeMember({ id: "member-1", name: "John Doe" })];
    const obligations = [_makeObligation({ id: "obligation-1", title: "Call John", status: "open" })];
    mockApi.listFamilyMembers.mockResolvedValue(members);
    mockApi.listFamilyObligations.mockResolvedValue(obligations);
    mockApi.completeFamilyObligation.mockResolvedValue(_makeObligation({ status: "done" }));

    render(<FamilyPanel {...defaultProps} />);
    
    await screen.findByText("John Doe");
    await userEvent.click(screen.getByText("John Doe"));
    
    await screen.findByText("Call John");
    
    // Find the complete button by aria-label
    const completeButton = screen.getByLabelText("Complete obligation");
    await userEvent.click(completeButton);
    
    expect(mockApi.completeFamilyObligation).toHaveBeenCalledWith("obligation-1");
  });

  it("calls onError when API call fails", async () => {
    mockApi.listFamilyMembers.mockRejectedValue(new Error("API error"));

    render(<FamilyPanel {...defaultProps} />);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(defaultProps.onError).toHaveBeenCalledWith("Failed to load family data");
  });
});
