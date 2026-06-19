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
  listHobbies,
  createHobby,
  updateHobby,
  deleteHobby,
  listHobbySessions,
  createHobbySession,
  updateHobbySession,
  deleteHobbySession,
  listHobbyProjects,
  createHobbyProject,
  updateHobbyProject,
  completeHobbyProject,
  deleteHobbyProject,
  listHobbyMilestones,
  createHobbyMilestone,
  updateHobbyMilestone,
  deleteHobbyMilestone,
  listHobbySupplies,
  createHobbySupply,
  updateHobbySupply,
  deleteHobbySupply,
  getHobbiesSummary
} from "./hobbies";

describe("hobbies service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb.close();
  });

  describe("hobbies", () => {
    it("lists hobbies when none exist", () => {
      const result = listHobbies();
      expect(result).toEqual([]);
    });

    it("creates a hobby with correct defaults", () => {
      const result = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      expect(result.name).toBe("Guitar");
      expect(result.category).toBe("Music");
      expect(result.status).toBe("active");
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("lists hobbies after creation", () => {
      createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const result = listHobbies();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Guitar");
    });

    it("updates a hobby", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const updated = updateHobby(hobby.id, { name: "Piano", status: "paused" });
      expect(updated?.name).toBe("Piano");
      expect(updated?.status).toBe("paused");
    });

    it("deletes a hobby", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      deleteHobby(hobby.id);
      const result = listHobbies();
      expect(result).toHaveLength(0);
    });
  });

  describe("hobby sessions", () => {
    it("creates a hobby session", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const result = createHobbySession({
        hobbyId: hobby.id,
        date: "2024-06-15T00:00:00Z",
        durationMinutes: 30,
        notes: "",
        mood: "",
        energy: 3,
        progressRating: null
      });

      expect(result.hobbyId).toBe(hobby.id);
      expect(result.durationMinutes).toBe(30);
      expect(result.energy).toBe(3);
    });

    it("lists hobby sessions for a specific hobby", () => {
      const hobby1 = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const _hobby2 = createHobby({
        name: "Piano",
        category: "Music",
        status: "paused",
        description: ""
      });

      createHobbySession({
        hobbyId: hobby1.id,
        date: "2024-06-15T00:00:00Z",
        durationMinutes: 30,
        notes: "",
        mood: "",
        energy: 3,
        progressRating: null
      });

      createHobbySession({
        hobbyId: _hobby2.id,
        date: "2024-06-15T00:00:00Z",
        durationMinutes: 45,
        notes: "",
        mood: "",
        energy: 4,
        progressRating: null
      });

      const result = listHobbySessions(hobby1.id);
      expect(result).toHaveLength(1);
      expect(result[0]?.hobbyId).toBe(hobby1.id);
    });

    it("updates a hobby session", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const session = createHobbySession({
        hobbyId: hobby.id,
        date: "2024-06-15T00:00:00Z",
        durationMinutes: 30,
        notes: "",
        mood: "",
        energy: 3,
        progressRating: null
      });

      const updated = updateHobbySession(session.id, { durationMinutes: 45, energy: 4 });
      expect(updated?.durationMinutes).toBe(45);
      expect(updated?.energy).toBe(4);
    });

    it("deletes a hobby session", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const session = createHobbySession({
        hobbyId: hobby.id,
        date: "2024-06-15T00:00:00Z",
        durationMinutes: 30,
        notes: "",
        mood: "",
        energy: 3,
        progressRating: null
      });

      deleteHobbySession(session.id);
      const result = listHobbySessions(hobby.id);
      expect(result).toHaveLength(0);
    });
  });

  describe("hobby projects", () => {
    it("creates a hobby project", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const result = createHobbyProject({
        hobbyId: hobby.id,
        name: "Learn a Song",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      expect(result.hobbyId).toBe(hobby.id);
      expect(result.name).toBe("Learn a Song");
      expect(result.status).toBe("active");
    });

    it("lists hobby projects for a specific hobby", () => {
      const hobby1 = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const _hobby2 = createHobby({
        name: "Piano",
        category: "Music",
        status: "active",
        description: ""
      });

      createHobbyProject({
        hobbyId: hobby1.id,
        name: "Learn a Song",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      createHobbyProject({
        hobbyId: _hobby2.id,
        name: "Master Chords",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      const result = listHobbyProjects(hobby1.id);
      expect(result).toHaveLength(1);
      expect(result[0]?.hobbyId).toBe(hobby1.id);
    });

    it("updates a hobby project", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const project = createHobbyProject({
        hobbyId: hobby.id,
        name: "Learn a Song",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      const updated = updateHobbyProject(project.id, { name: "Master the Song", status: "paused" });
      expect(updated?.name).toBe("Master the Song");
      expect(updated?.status).toBe("paused");
    });

    it("completes a hobby project", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const project = createHobbyProject({
        hobbyId: hobby.id,
        name: "Learn a Song",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      const completed = completeHobbyProject(project.id);
      expect(completed?.status).toBe("completed");
      expect(completed?.completedAt).toBeDefined();
    });

    it("deletes a hobby project", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const project = createHobbyProject({
        hobbyId: hobby.id,
        name: "Learn a Song",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      deleteHobbyProject(project.id);
      const result = listHobbyProjects(hobby.id);
      expect(result).toHaveLength(0);
    });
  });

  describe("hobby milestones", () => {
    it("creates a hobby milestone", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const project = createHobbyProject({
        hobbyId: hobby.id,
        name: "Learn a Song",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      const result = createHobbyMilestone({
        projectId: project.id,
        name: "Master Chords",
        description: "",
        targetDate: "2024-06-15T00:00:00Z",
        completedAt: null
      });

      expect(result.projectId).toBe(project.id);
      expect(result.name).toBe("Master Chords");
    });

    it("lists hobby milestones for a specific project", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const project1 = createHobbyProject({
        hobbyId: hobby.id,
        name: "Learn a Song",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      const _project2 = createHobbyProject({
        hobbyId: hobby.id,
        name: "Master Chords",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      createHobbyMilestone({
        projectId: project1.id,
        name: "Learn Verse",
        description: "",
        targetDate: "2024-06-15T00:00:00Z",
        completedAt: null
      });

      createHobbyMilestone({
        projectId: _project2.id,
        name: "Learn Chorus",
        description: "",
        targetDate: "2024-06-20T00:00:00Z",
        completedAt: null
      });

      const result = listHobbyMilestones(project1.id);
      expect(result).toHaveLength(1);
      expect(result[0]?.projectId).toBe(project1.id);
    });

    it("updates a hobby milestone", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const project = createHobbyProject({
        hobbyId: hobby.id,
        name: "Learn a Song",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      const milestone = createHobbyMilestone({
        projectId: project.id,
        name: "Master Chords",
        description: "",
        targetDate: "2024-06-15T00:00:00Z",
        completedAt: null
      });

      const updated = updateHobbyMilestone(milestone.id, { name: "Master All Chords" });
      expect(updated?.name).toBe("Master All Chords");
    });

    it("deletes a hobby milestone", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const project = createHobbyProject({
        hobbyId: hobby.id,
        name: "Learn a Song",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      const milestone = createHobbyMilestone({
        projectId: project.id,
        name: "Master Chords",
        description: "",
        targetDate: "2024-06-15T00:00:00Z",
        completedAt: null
      });

      deleteHobbyMilestone(milestone.id);
      const result = listHobbyMilestones(project.id);
      expect(result).toHaveLength(0);
    });
  });

  describe("hobby supplies", () => {
    it("creates a hobby supply", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const result = createHobbySupply({
        hobbyId: hobby.id,
        projectId: null,
        name: "Guitar Strings",
        type: "equipment",
        cost: 500,
        purchaseDate: "2024-06-01T00:00:00Z",
        source: "",
        notes: ""
      });

      expect(result.hobbyId).toBe(hobby.id);
      expect(result.name).toBe("Guitar Strings");
      expect(result.cost).toBe(500);
    });

    it("lists hobby supplies for a specific hobby", () => {
      const hobby1 = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const _hobby2 = createHobby({
        name: "Piano",
        category: "Music",
        status: "active",
        description: ""
      });

      createHobbySupply({
        hobbyId: hobby1.id,
        projectId: null,
        name: "Guitar Strings",
        type: "equipment",
        cost: 500,
        purchaseDate: "2024-06-01T00:00:00Z",
        source: "",
        notes: ""
      });

      createHobbySupply({
        hobbyId: _hobby2.id,
        projectId: null,
        name: "Piano Book",
        type: "book",
        cost: 2000,
        purchaseDate: "2024-06-01T00:00:00Z",
        source: "",
        notes: ""
      });

      const result = listHobbySupplies(hobby1.id);
      expect(result).toHaveLength(1);
      expect(result[0]?.hobbyId).toBe(hobby1.id);
    });

    it("lists hobby supplies for a specific project", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const project1 = createHobbyProject({
        hobbyId: hobby.id,
        name: "Learn a Song",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      const _project2 = createHobbyProject({
        hobbyId: hobby.id,
        name: "Master Chords",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      createHobbySupply({
        hobbyId: hobby.id,
        projectId: project1.id,
        name: "Song Book",
        type: "book",
        cost: 1500,
        purchaseDate: "2024-06-01T00:00:00Z",
        source: "",
        notes: ""
      });

      createHobbySupply({
        hobbyId: hobby.id,
        projectId: _project2.id,
        name: "Chord Chart",
        type: "chart",
        cost: 500,
        purchaseDate: "2024-06-01T00:00:00Z",
        source: "",
        notes: ""
      });

      const result = listHobbySupplies(hobby.id);
      expect(result).toHaveLength(2);
      const project1Supply = result.find((s) => s.projectId === project1.id);
      expect(project1Supply).toBeDefined();
      expect(project1Supply?.name).toBe("Song Book");
    });

    it("updates a hobby supply", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const supply = createHobbySupply({
        hobbyId: hobby.id,
        projectId: null,
        name: "Guitar Strings",
        type: "equipment",
        cost: 500,
        purchaseDate: "2024-06-01T00:00:00Z",
        source: "",
        notes: ""
      });

      const updated = updateHobbySupply(supply.id, { cost: 1000 });
      expect(updated?.cost).toBe(1000);
    });

    it("deletes a hobby supply", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const supply = createHobbySupply({
        hobbyId: hobby.id,
        projectId: null,
        name: "Guitar Strings",
        type: "equipment",
        cost: 500,
        purchaseDate: "2024-06-01T00:00:00Z",
        source: "",
        notes: ""
      });

      deleteHobbySupply(supply.id);
      const result = listHobbySupplies(hobby.id);
      expect(result).toHaveLength(0);
    });
  });

  describe("hobby summary", () => {
    it("returns summary with zero counts when no data", () => {
      const result = getHobbiesSummary();
      expect(result.activeHobbies).toBe(0);
      expect(result.sessionsThisMonth).toBe(0);
      expect(result.openProjects).toBe(0);
      expect(result.openMilestones).toBe(0);
      expect(result.recentSessions).toBe(0);
    });

    it("calculates summary correctly with data", () => {
      const hobby1 = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const _hobby2 = createHobby({
        name: "Piano",
        category: "Music",
        status: "paused",
        description: ""
      });

      createHobbySession({
        hobbyId: hobby1.id,
        date: "2024-06-15T00:00:00Z",
        durationMinutes: 30,
        notes: "",
        mood: "",
        energy: 3,
        progressRating: null
      });

      createHobbySession({
        hobbyId: hobby1.id,
        date: "2024-06-16T00:00:00Z",
        durationMinutes: 60,
        notes: "",
        mood: "",
        energy: 4,
        progressRating: null
      });

      const project1 = createHobbyProject({
        hobbyId: hobby1.id,
        name: "Learn a Song",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      const _project2 = createHobbyProject({
        hobbyId: hobby1.id,
        name: "Master Chords",
        status: "completed",
        description: "",
        targetDate: null,
        completedAt: null
      });

      createHobbyMilestone({
        projectId: project1.id,
        name: "Learn Verse",
        description: "",
        targetDate: "2024-06-15T00:00:00Z",
        completedAt: null
      });

      createHobbySupply({
        hobbyId: hobby1.id,
        projectId: null,
        name: "Guitar Strings",
        type: "equipment",
        cost: 500,
        purchaseDate: "2024-06-01T00:00:00Z",
        source: "",
        notes: ""
      });

      const result = getHobbiesSummary();
      expect(result.activeHobbies).toBe(1);
      expect(result.openProjects).toBe(1);
      expect(result.openMilestones).toBe(1);
    });
  });

  describe("cascade delete", () => {
    it("deletes sessions when hobby is deleted", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      createHobbySession({
        hobbyId: hobby.id,
        date: "2024-06-15T00:00:00Z",
        durationMinutes: 30,
        notes: "",
        mood: "",
        energy: 3,
        progressRating: null
      });

      deleteHobby(hobby.id);
      const result = listHobbySessions(hobby.id);
      expect(result).toHaveLength(0);
    });

    it("deletes projects when hobby is deleted", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      createHobbyProject({
        hobbyId: hobby.id,
        name: "Learn a Song",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      deleteHobby(hobby.id);
      const result = listHobbyProjects(hobby.id);
      expect(result).toHaveLength(0);
    });

    it("deletes supplies when hobby is deleted", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      createHobbySupply({
        hobbyId: hobby.id,
        projectId: null,
        name: "Guitar Strings",
        type: "equipment",
        cost: 500,
        purchaseDate: "2024-06-01T00:00:00Z",
        source: "",
        notes: ""
      });

      deleteHobby(hobby.id);
      const result = listHobbySupplies(hobby.id);
      expect(result).toHaveLength(0);
    });

    it("deletes milestones when project is deleted", () => {
      const hobby = createHobby({
        name: "Guitar",
        category: "Music",
        status: "active",
        description: ""
      });

      const project = createHobbyProject({
        hobbyId: hobby.id,
        name: "Learn a Song",
        status: "active",
        description: "",
        targetDate: null,
        completedAt: null
      });

      createHobbyMilestone({
        projectId: project.id,
        name: "Master Chords",
        description: "",
        targetDate: "2024-06-15T00:00:00Z",
        completedAt: null
      });

      deleteHobbyProject(project.id);
      const result = listHobbyMilestones(project.id);
      expect(result).toHaveLength(0);
    });
  });
});