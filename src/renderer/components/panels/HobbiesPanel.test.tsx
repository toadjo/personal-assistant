import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import type { ReactElement } from "react";
import { HobbiesPanel } from "./HobbiesPanel";
import type { Hobby, HobbySession, HobbyProject, HobbyMilestone, HobbySupply, HobbySummary } from "../../../shared/types";
import { createQueryTestWrapper } from "../../test/queryTestUtils";

function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: createQueryTestWrapper() });
}

function makeHobby(overrides: Partial<Hobby> = {}): Hobby {
  return {
    id: `hobby-${Math.random()}`,
    name: "Guitar",
    category: "Music",
    description: "",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function _makeSession(overrides: Partial<HobbySession> = {}): HobbySession {
  return {
    id: `session-${Math.random()}`,
    hobbyId: "hobby-1",
    date: "2024-06-15T00:00:00Z",
    durationMinutes: 30,
    notes: "",
    mood: "",
    energy: 3,
    progressRating: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function _makeProject(overrides: Partial<HobbyProject> = {}): HobbyProject {
  return {
    id: `project-${Math.random()}`,
    hobbyId: "hobby-1",
    name: "Learn a Song",
    description: "",
    status: "active",
    targetDate: null,
    completedAt: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function _makeMilestone(overrides: Partial<HobbyMilestone> = {}): HobbyMilestone {
  return {
    id: `milestone-${Math.random()}`,
    projectId: "project-1",
    name: "Master Chords",
    description: "",
    targetDate: "2024-06-15T00:00:00Z",
    completedAt: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function _makeSupply(overrides: Partial<HobbySupply> = {}): HobbySupply {
  return {
    id: `supply-${Math.random()}`,
    hobbyId: "hobby-1",
    projectId: null,
    name: "Guitar Strings",
    type: "equipment",
    cost: 500,
    purchaseDate: "2024-06-01T00:00:00Z",
    source: "",
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function makeSummary(overrides: Partial<HobbySummary> = {}): HobbySummary {
  return {
    activeHobbies: 2,
    sessionsThisMonth: 10,
    openProjects: 3,
    openMilestones: 4,
    recentSessions: 5,
    ...overrides
  };
}

const mockApi = {
  listHobbies: vi.fn(),
  createHobby: vi.fn(),
  updateHobby: vi.fn(),
  deleteHobby: vi.fn(),
  listHobbySessions: vi.fn(),
  createHobbySession: vi.fn(),
  updateHobbySession: vi.fn(),
  deleteHobbySession: vi.fn(),
  listHobbyProjects: vi.fn(),
  createHobbyProject: vi.fn(),
  updateHobbyProject: vi.fn(),
  completeHobbyProject: vi.fn(),
  deleteHobbyProject: vi.fn(),
  listHobbyMilestones: vi.fn(),
  createHobbyMilestone: vi.fn(),
  updateHobbyMilestone: vi.fn(),
  deleteHobbyMilestone: vi.fn(),
  listHobbySupplies: vi.fn(),
  createHobbySupply: vi.fn(),
  updateHobbySupply: vi.fn(),
  deleteHobbySupply: vi.fn(),
  getHobbiesSummary: vi.fn()
};

vi.mock("../../lib/assistantApi", () => ({
  requireAssistantApi: () => mockApi,
  getAssistantApi: () => mockApi
}));

describe("HobbiesPanel", () => {
  const defaultProps = {
    isRefreshing: false,
    onRefresh: vi.fn(),
    onError: vi.fn(),
    onShowSuccess: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.listHobbies.mockResolvedValue([]);
    mockApi.listHobbySessions.mockResolvedValue([]);
    mockApi.listHobbyProjects.mockResolvedValue([]);
    mockApi.listHobbyMilestones.mockResolvedValue([]);
    mockApi.listHobbySupplies.mockResolvedValue([]);
    mockApi.getHobbiesSummary.mockResolvedValue(makeSummary());
  });

  it("renders empty state when no data", async () => {
    render(<HobbiesPanel {...defaultProps} />);
    
    await screen.findByText("No hobbies yet");
    expect(screen.getByText("Start tracking your hobbies and personal progress")).toBeInTheDocument();
  });

  it("renders hobbies list", async () => {
    const hobbies = [makeHobby({ name: "Guitar", category: "Music" })];
    mockApi.listHobbies.mockResolvedValue(hobbies);

    render(<HobbiesPanel {...defaultProps} />);
    
    await screen.findByText("Guitar");
  });

  it("shows hobby form when add hobby clicked", async () => {
    render(<HobbiesPanel {...defaultProps} />);

    await screen.findByText("No hobbies yet");

    const allButtons = screen.getAllByRole("button");
    const addButton = allButtons[0];
    if (!addButton) throw new Error("Add button not found");
    await userEvent.click(addButton);

    expect(screen.getByText("Create Hobby")).toBeInTheDocument();
  });

  it("calls deleteHobby when delete clicked", async () => {
    const hobbies = [makeHobby({ id: "hobby-1", name: "Guitar" })];
    mockApi.listHobbies.mockResolvedValue(hobbies);
    mockApi.deleteHobby.mockResolvedValue(undefined);
    window.confirm = vi.fn().mockReturnValue(true);

    render(<HobbiesPanel {...defaultProps} />);
    
    await screen.findByText("Guitar");
    
    const deleteButton = screen.getByLabelText("Delete hobby");
    await userEvent.click(deleteButton);

    expect(mockApi.deleteHobby).toHaveBeenCalledWith("hobby-1");
  });
});