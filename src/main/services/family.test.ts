import { beforeEach, describe, expect, it, vi } from "vitest";
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
  listFamilyMembers,
  createFamilyMember,
  _updateFamilyMember,
  _deleteFamilyMember,
  listFamilyOccasions,
  createFamilyOccasion,
  _updateFamilyOccasion,
  _deleteFamilyOccasion,
  listFamilyObligations,
  createFamilyObligation,
  _updateFamilyObligation,
  completeFamilyObligation,
  _deleteFamilyObligation,
  getFamilySummary
} from "./family";

beforeEach(() => {
  testDb = createMemoryDatabase();
});

describe("family service", () => {
  describe("family members", () => {
    it("creates and lists family members", () => {
      const member = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: "+1234567890",
        email: "john@example.com",
        address: "123 Main St",
        preferredContactMethod: "any",
        notes: "Important family member",
        isImportant: 1
      });

      expect(member.name).toBe("John Doe");
      expect(member.relationship).toBe("Father");
      expect(member.isImportant).toBe(1);

      const members = listFamilyMembers();
      expect(members).toHaveLength(1);
      expect(members[0]?.id).toBe(member.id);
    });

    it("updates family member", () => {
      const member = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 0
      });

      const updated = _updateFamilyMember(member.id, {
        name: "John Smith",
        relationship: "Stepfather"
      });

      expect(updated?.name).toBe("John Smith");
      expect(updated?.relationship).toBe("Stepfather");
    });

    it("deletes family member", () => {
      const member = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 0
      });

      _deleteFamilyMember(member.id);

      const members = listFamilyMembers();
      expect(members).toHaveLength(0);
    });

    it("deleting member cascades to occasions and obligations", () => {
      const member = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 0
      });

      const _occasion = createFamilyOccasion({
        memberId: member.id,
        type: "birthday",
        title: "Birthday",
        date: "2026-06-15T00:00:00Z",
        recurrence: "yearly",
        remindDaysBefore: 7,
        lastAcknowledgedAt: null,
        notes: ""
      });

      const _obligation = createFamilyObligation({
        memberId: member.id,
        occasionId: null,
        type: "call",
        title: "Call John",
        dueAt: "2026-06-20T10:00:00Z",
        status: "open",
        priority: "normal",
        completedAt: null,
        notes: ""
      });

      _deleteFamilyMember(member.id);

      expect(listFamilyOccasions()).toHaveLength(0);
      expect(listFamilyObligations()).toHaveLength(0);
    });
  });

  describe("family occasions", () => {
    it("creates and lists family occasions", () => {
      const member = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 0
      });

      const occasion = createFamilyOccasion({
        memberId: member.id,
        type: "birthday",
        title: "Birthday",
        date: "2026-06-15T00:00:00Z",
        recurrence: "yearly",
        remindDaysBefore: 7,
        lastAcknowledgedAt: null,
        notes: "Annual celebration"
      });

      expect(occasion?.title).toBe("Birthday");
      expect(occasion?.type).toBe("birthday");

      const occasions = listFamilyOccasions(member.id);
      expect(occasions).toHaveLength(1);
      expect(occasions[0]?.id).toBe(occasion?.id);
    });

    it("updates family occasion", () => {
      const member = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 0
      });

      const occasion = createFamilyOccasion({
        memberId: member.id,
        type: "birthday",
        title: "Birthday",
        date: "2026-06-15T00:00:00Z",
        recurrence: "yearly",
        remindDaysBefore: 7,
        lastAcknowledgedAt: null,
        notes: ""
      });

      const updated = _updateFamilyOccasion(occasion.id, {
        title: "Name Day",
        type: "name_day"
      });

      expect(updated?.title).toBe("Name Day");
      expect(updated?.type).toBe("name_day");
    });

    it("deletes family occasion", () => {
      const member = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 0
      });

      const occasion = createFamilyOccasion({
        memberId: member.id,
        type: "birthday",
        title: "Birthday",
        date: "2026-06-15T00:00:00Z",
        recurrence: "yearly",
        remindDaysBefore: 7,
        lastAcknowledgedAt: null,
        notes: ""
      });

      _deleteFamilyOccasion(occasion.id);

      const occasions = listFamilyOccasions(member.id);
      expect(occasions).toHaveLength(0);
    });
  });

  describe("family obligations", () => {
    it("creates and lists family obligations", () => {
      const member = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 0
      });

      const obligation = createFamilyObligation({
        memberId: member.id,
        occasionId: null,
        type: "call",
        title: "Call John",
        dueAt: "2026-06-20T10:00:00Z",
        status: "open",
        priority: "normal",
        completedAt: null,
        notes: "Weekly check-in"
      });

      expect(obligation?.title).toBe("Call John");
      expect(obligation?.type).toBe("call");

      const obligations = listFamilyObligations(member.id);
      expect(obligations).toHaveLength(1);
      expect(obligations[0]?.id).toBe(obligation?.id);
    });

    it("updates family obligation", () => {
      const member = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 0
      });

      const obligation = createFamilyObligation({
        memberId: member.id,
        occasionId: null,
        type: "call",
        title: "Call John",
        dueAt: "2026-06-20T10:00:00Z",
        status: "open",
        priority: "normal",
        completedAt: null,
        notes: ""
      });

      const updated = _updateFamilyObligation(obligation.id, {
        title: "Visit John",
        type: "visit",
        priority: "high"
      });

      expect(updated?.title).toBe("Visit John");
      expect(updated?.type).toBe("visit");
      expect(updated?.priority).toBe("high");
    });

    it("completes family obligation", () => {
      const member = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 0
      });

      const obligation = createFamilyObligation({
        memberId: member.id,
        occasionId: null,
        type: "call",
        title: "Call John",
        dueAt: "2026-06-20T10:00:00Z",
        status: "open",
        priority: "normal",
        completedAt: null,
        notes: ""
      });

      const completed = completeFamilyObligation(obligation.id);

      expect(completed?.status).toBe("done");
      expect(completed?.completedAt).toBeDefined();
    });

    it("deletes family obligation", () => {
      const member = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 0
      });

      const obligation = createFamilyObligation({
        memberId: member.id,
        occasionId: null,
        type: "call",
        title: "Call John",
        dueAt: "2026-06-20T10:00:00Z",
        status: "open",
        priority: "normal",
        completedAt: null,
        notes: ""
      });

      _deleteFamilyObligation(obligation.id);

      const obligations = listFamilyObligations(member.id);
      expect(obligations).toHaveLength(0);
    });

    it("identifies overdue obligations", () => {
      const member = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 0
      });

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const obligation = createFamilyObligation({
        memberId: member.id,
        occasionId: null,
        type: "call",
        title: "Overdue call",
        dueAt: pastDate.toISOString(),
        status: "open",
        priority: "normal",
        completedAt: null,
        notes: ""
      });

      const obligations = listFamilyObligations(member.id);
      expect(obligations).toHaveLength(1);
      expect(obligations[0]?.id).toBe(obligation?.id);
    });
  });

  describe("family summary", () => {
    it("returns correct summary counts", () => {
      const member1 = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 1
      });

      const member2 = createFamilyMember({
        name: "Jane Doe",
        relationship: "Mother",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 0
      });

      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 15);

      createFamilyOccasion({
        memberId: member1.id,
        type: "birthday",
        title: "Birthday",
        date: futureDate.toISOString(),
        recurrence: "yearly",
        remindDaysBefore: 7,
        lastAcknowledgedAt: null,
        notes: ""
      });

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      createFamilyObligation({
        memberId: member1.id,
        occasionId: null,
        type: "call",
        title: "Overdue call",
        dueAt: pastDate.toISOString(),
        status: "open",
        priority: "normal",
        completedAt: null,
        notes: ""
      });

      createFamilyObligation({
        memberId: member2.id,
        occasionId: null,
        type: "visit",
        title: "Visit",
        dueAt: futureDate.toISOString(),
        status: "open",
        priority: "normal",
        completedAt: null,
        notes: ""
      });

      const summary = getFamilySummary();

      expect(summary.totalMembers).toBe(2);
      expect(summary.importantMembers).toBe(1);
      expect(summary.upcomingOccasions).toBe(1);
      expect(summary.openObligations).toBe(2);
      expect(summary.overdueObligations).toBe(1);
    });

    it("counts yearly occasions by month/day", () => {
      const member = createFamilyMember({
        name: "John Doe",
        relationship: "Father",
        phone: null,
        email: null,
        address: null,
        preferredContactMethod: "any",
        notes: "",
        isImportant: 0
      });

      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      createFamilyOccasion({
        memberId: member.id,
        type: "birthday",
        title: "Birthday",
        date: `2020-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}T00:00:00Z`,
        recurrence: "yearly",
        remindDaysBefore: 7,
        lastAcknowledgedAt: null,
        notes: ""
      });

      const summary = getFamilySummary();
      expect(summary.upcomingOccasions).toBe(1);
    });
  });
});
