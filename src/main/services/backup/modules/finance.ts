import type { BackupModule, BackupPayload } from "../types";
import { invalidArrayPreview } from "../types";

export const financeModule: BackupModule = {
  id: "finance",
  payloadKeys: ["finance_bills", "finance_expenses"],

  exportData(db) {
    const finance_bills = db.prepare("SELECT * FROM finance_bills").all() as BackupPayload["finance_bills"];
    const finance_expenses = db.prepare("SELECT * FROM finance_expenses").all() as BackupPayload["finance_expenses"];
    return { finance_bills, finance_expenses };
  },

  ensureDefaults(payload) {
    if (!payload.finance_bills) payload.finance_bills = [];
    if (!payload.finance_expenses) payload.finance_expenses = [];
  },

  deleteAll(db) {
    db.prepare("DELETE FROM finance_bills").run();
    db.prepare("DELETE FROM finance_expenses").run();
  },

  importData(db, payload) {
    const billStmt = db.prepare(
      "INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt) VALUES (@id, @name, @amount, @dueAt, @recurrence, @category, @status, @notes, @createdAt, @updatedAt, @lastPaidAt)"
    );
    for (const row of payload.finance_bills || []) {
      billStmt.run(row);
    }

    const expenseStmt = db.prepare(
      "INSERT INTO finance_expenses (id, description, amount, date, category, notes, createdAt, updatedAt) VALUES (@id, @description, @amount, @date, @category, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.finance_expenses || []) {
      expenseStmt.run(row);
    }

    return {
      finance_bills: payload.finance_bills?.length ?? 0,
      finance_expenses: payload.finance_expenses?.length ?? 0
    };
  },

  previewSection(payload) {
    const invalidBills = invalidArrayPreview(payload, "finance_bills", "finance_bills");
    if (invalidBills) return invalidBills;
    const invalidExpenses = invalidArrayPreview(payload, "finance_expenses", "finance_expenses");
    if (invalidExpenses) return invalidExpenses;
    return {
      valid: true,
      counts: {
        finance_bills: payload.finance_bills?.length ?? 0,
        finance_expenses: payload.finance_expenses?.length ?? 0
      }
    };
  }
};
