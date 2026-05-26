import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;

vi.mock("../db", () => ({
  getDb: () => testDb
}));

import {
  createBill,
  createExpense,
  deleteBill,
  deleteExpense,
  getMonthlySummary,
  listBills,
  listExpenses,
  markBillPaid,
  updateBill,
  updateExpense
} from "./finance";

describe("finance service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb.close();
  });

  describe("listBills", () => {
    it("returns empty array when no bills exist", () => {
      const result = listBills();
      expect(result).toEqual([]);
    });

    it("returns all bills when no filter specified", () => {
      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b1", "Rent", 100000, "2026-01-15T00:00:00Z", "monthly", "Housing", "unpaid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);
      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b2", "Electricity", 5000, "2026-01-20T00:00:00Z", "monthly", "Utilities", "unpaid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);

      const result = listBills();
      expect(result).toHaveLength(2);
    });

    it("filters by this_month correctly", () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const _endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b1", "This month", 100000, startOfMonth, "monthly", "Housing", "unpaid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);
      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b2", "Next month", 5000, "2026-02-15T00:00:00Z", "monthly", "Utilities", "unpaid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);

      const result = listBills("this_month");
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("b1");
    });

    it("filters by upcoming correctly", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 86400000 * 7).toISOString(); // 7 days from now
      const past = new Date(now.getTime() - 86400000 * 7).toISOString(); // 7 days ago

      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b1", "Future bill", 100000, future, "monthly", "Housing", "unpaid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);
      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b2", "Past bill", 5000, past, "monthly", "Utilities", "unpaid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);

      const result = listBills("upcoming");
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("b1");
    });

    it("filters by overdue correctly", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000 * 7).toISOString(); // 7 days ago
      const future = new Date(now.getTime() + 86400000 * 7).toISOString(); // 7 days from now

      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b1", "Overdue bill", 100000, past, "monthly", "Housing", "unpaid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);
      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b2", "Future bill", 5000, future, "monthly", "Utilities", "unpaid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);

      const result = listBills("overdue");
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("b1");
    });

    it("filters by unpaid correctly", () => {
      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b1", "Unpaid bill", 100000, "2026-01-15T00:00:00Z", "monthly", "Housing", "unpaid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);
      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b2", "Paid bill", 5000, "2026-01-10T00:00:00Z", "monthly", "Utilities", "paid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", "2026-01-10T00:00:00Z");

      const result = listBills("unpaid");
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("b1");
    });

    it("filters by paid correctly", () => {
      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b1", "Unpaid bill", 100000, "2026-01-15T00:00:00Z", "monthly", "Housing", "unpaid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);
      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b2", "Paid bill", 5000, "2026-01-10T00:00:00Z", "monthly", "Utilities", "paid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", "2026-01-10T00:00:00Z");

      const result = listBills("paid");
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("b2");
    });
  });

  describe("createBill", () => {
    it("creates a bill with correct defaults", () => {
      const result = createBill({
        name: "Rent",
        amount: 100000,
        dueAt: "2026-01-15T00:00:00Z",
        recurrence: "monthly",
        category: "housing"
      });

      expect(result.name).toBe("Rent");
      expect(result.amount).toBe(100000);
      expect(result.status).toBe("unpaid");
      expect(result.notes).toBe("");
      expect(result.lastPaidAt).toBeNull();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("creates a bill with notes", () => {
      const result = createBill({
        name: "Internet",
        amount: 5000,
        dueAt: "2026-01-20T00:00:00Z",
        recurrence: "monthly",
        category: "utilities",
        notes: "Fiber connection"
      });

      expect(result.notes).toBe("Fiber connection");
    });
  });

  describe("updateBill", () => {
    it("updates bill fields correctly", () => {
      const created = createBill({
        name: "Rent",
        amount: 100000,
        dueAt: "2026-01-15T00:00:00Z",
        recurrence: "monthly",
        category: "housing"
      });

      const updated = updateBill({
        id: created.id,
        name: "New Rent",
        amount: 120000
      });

      expect(updated.name).toBe("New Rent");
      expect(updated.amount).toBe(120000);
      expect(updated.recurrence).toBe("monthly"); // unchanged
    });

    it("throws error for non-existent bill", () => {
      expect(() =>
        updateBill({
          id: "non-existent-id",
          name: "Test"
        })
      ).toThrow("Bill not found");
    });
  });

  describe("deleteBill", () => {
    it("deletes a bill", () => {
      const created = createBill({
        name: "Rent",
        amount: 100000,
        dueAt: "2026-01-15T00:00:00Z",
        recurrence: "monthly",
        category: "housing"
      });

      deleteBill(created.id);

      const result = listBills();
      expect(result).toHaveLength(0);
    });
  });

  describe("markBillPaid", () => {
    it("marks non-recurring bill as paid", () => {
      const created = createBill({
        name: "One-time bill",
        amount: 100000,
        dueAt: "2026-01-15T00:00:00Z",
        recurrence: "none",
        category: "housing"
      });

      const updated = markBillPaid(created.id);

      expect(updated.status).toBe("paid");
      expect(updated.lastPaidAt).not.toBeNull();
    });

    it("advances due date for weekly recurring bill", () => {
      const created = createBill({
        name: "Weekly service",
        amount: 5000,
        dueAt: "2026-01-15T00:00:00Z",
        recurrence: "weekly",
        category: "subscriptions"
      });

      const updated = markBillPaid(created.id);

      expect(updated.status).toBe("unpaid"); // still unpaid
      expect(updated.lastPaidAt).not.toBeNull();
      expect(updated.dueAt).not.toBe("2026-01-15T00:00:00Z"); // due date advanced
    });

    it("advances due date for monthly recurring bill", () => {
      const created = createBill({
        name: "Rent",
        amount: 100000,
        dueAt: "2026-01-15T00:00:00Z",
        recurrence: "monthly",
        category: "housing"
      });

      const updated = markBillPaid(created.id);

      expect(updated.status).toBe("unpaid"); // still unpaid
      expect(updated.lastPaidAt).not.toBeNull();
      expect(updated.dueAt).not.toBe("2026-01-15T00:00:00Z"); // due date advanced
    });

    it("advances due date for yearly recurring bill", () => {
      const created = createBill({
        name: "Insurance",
        amount: 50000,
        dueAt: "2026-01-15T00:00:00Z",
        recurrence: "yearly",
        category: "health"
      });

      const updated = markBillPaid(created.id);

      expect(updated.status).toBe("unpaid"); // still unpaid
      expect(updated.lastPaidAt).not.toBeNull();
      expect(updated.dueAt).not.toBe("2026-01-15T00:00:00Z"); // due date advanced
    });

    it("throws error for non-existent bill", () => {
      expect(() => markBillPaid("non-existent-id")).toThrow("Bill not found");
    });
  });

  describe("listExpenses", () => {
    it("returns empty array when no expenses exist", () => {
      const result = listExpenses();
      expect(result).toEqual([]);
    });

    it("returns all expenses when no filter specified", () => {
      testDb
        .prepare(
          "INSERT INTO finance_expenses (id, description, amount, date, category, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("e1", "Groceries", 5000, "2026-01-15T00:00:00Z", "food", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      testDb
        .prepare(
          "INSERT INTO finance_expenses (id, description, amount, date, category, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("e2", "Gas", 3000, "2026-01-16T00:00:00Z", "transport", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const result = listExpenses();
      expect(result).toHaveLength(2);
    });

    it("filters by this_month correctly", () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const _endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      testDb
        .prepare(
          "INSERT INTO finance_expenses (id, description, amount, date, category, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("e1", "This month", 5000, startOfMonth, "food", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      testDb
        .prepare(
          "INSERT INTO finance_expenses (id, description, amount, date, category, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("e2", "Next month", 3000, "2026-02-15T00:00:00Z", "transport", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const result = listExpenses("this_month");
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("e1");
    });
  });

  describe("createExpense", () => {
    it("creates an expense with correct defaults", () => {
      const result = createExpense({
        description: "Groceries",
        amount: 5000,
        date: "2026-01-15T00:00:00Z",
        category: "food"
      });

      expect(result.description).toBe("Groceries");
      expect(result.amount).toBe(5000);
      expect(result.notes).toBe("");
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("creates an expense with notes", () => {
      const result = createExpense({
        description: "Gas",
        amount: 3000,
        date: "2026-01-16T00:00:00Z",
        category: "transport",
        notes: "Weekly fill-up"
      });

      expect(result.notes).toBe("Weekly fill-up");
    });
  });

  describe("updateExpense", () => {
    it("updates expense fields correctly", () => {
      const created = createExpense({
        description: "Groceries",
        amount: 5000,
        date: "2026-01-15T00:00:00Z",
        category: "food"
      });

      const updated = updateExpense({
        id: created.id,
        description: "Weekly groceries",
        amount: 6000
      });

      expect(updated.description).toBe("Weekly groceries");
      expect(updated.amount).toBe(6000);
      expect(updated.category).toBe("food"); // unchanged
    });

    it("throws error for non-existent expense", () => {
      expect(() =>
        updateExpense({
          id: "non-existent-id",
          description: "Test"
        })
      ).toThrow("Expense not found");
    });
  });

  describe("deleteExpense", () => {
    it("deletes an expense", () => {
      const created = createExpense({
        description: "Groceries",
        amount: 5000,
        date: "2026-01-15T00:00:00Z",
        category: "food"
      });

      deleteExpense(created.id);

      const result = listExpenses();
      expect(result).toHaveLength(0);
    });
  });

  describe("getMonthlySummary", () => {
    it("returns zero summary when no data exists", () => {
      const result = getMonthlySummary();
      expect(result.upcomingBills).toBe(0);
      expect(result.paidBills).toBe(0);
      expect(result.unpaidBills).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.totalCommittedAmount).toBe(0);
    });

    it("calculates summary correctly with integer cents", () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const _endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      // Create upcoming bill
      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b1", "Rent", 100000, startOfMonth, "monthly", "housing", "unpaid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", null);

      // Create paid bill
      testDb
        .prepare(
          "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("b2", "Insurance", 50000, startOfMonth, "yearly", "health", "paid", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", startOfMonth);

      // Create expense
      testDb
        .prepare(
          "INSERT INTO finance_expenses (id, description, amount, date, category, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("e1", "Groceries", 2500, startOfMonth, "food", "", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");

      const result = getMonthlySummary();

      expect(result.upcomingBills).toBe(1);
      expect(result.paidBills).toBe(1);
      expect(result.unpaidBills).toBe(1);
      expect(result.totalExpenses).toBe(2500); // 25.00 EUR in cents
      expect(result.totalCommittedAmount).toBe(100000); // 1000.00 EUR in cents (upcoming unpaid)
    });
  });
});
