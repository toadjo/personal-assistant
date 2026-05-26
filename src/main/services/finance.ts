import type { FinanceBill, FinanceExpense, FinanceMonthlySummary, FinanceCategory } from "../../shared/types";
import { getDb } from "../db";

export function listBills(filter?: "this_month" | "upcoming" | "overdue" | "unpaid" | "paid"): FinanceBill[] {
  const db = getDb();
  let sql = "SELECT * FROM finance_bills";
  const params: unknown[] = [];

  if (filter === "this_month") {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    sql += " WHERE dueAt >= ? AND dueAt <= ?";
    params.push(startOfMonth, endOfMonth);
  } else if (filter === "upcoming") {
    const now = new Date().toISOString();
    sql += " WHERE status = 'unpaid' AND dueAt >= ?";
    params.push(now);
  } else if (filter === "overdue") {
    const now = new Date().toISOString();
    sql += " WHERE status = 'unpaid' AND dueAt < ?";
    params.push(now);
  } else if (filter === "unpaid") {
    sql += " WHERE status = 'unpaid'";
  } else if (filter === "paid") {
    sql += " WHERE status = 'paid'";
  }

  sql += " ORDER BY dueAt ASC";
  const stmt = db.prepare(sql);
  return stmt.all(...params) as FinanceBill[];
}

export function listExpenses(filter?: "this_month"): FinanceExpense[] {
  const db = getDb();
  let sql = "SELECT * FROM finance_expenses";
  const params: unknown[] = [];

  if (filter === "this_month") {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    sql += " WHERE date >= ? AND date <= ?";
    params.push(startOfMonth, endOfMonth);
  }

  sql += " ORDER BY date DESC";
  const stmt = db.prepare(sql);
  return stmt.all(...params) as FinanceExpense[];
}

export function createBill(payload: {
  name: string;
  amount: number;
  dueAt: string;
  recurrence: "none" | "weekly" | "monthly" | "yearly";
  category: FinanceCategory;
  notes?: string;
}): FinanceBill {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO finance_bills (id, name, amount, dueAt, recurrence, category, status, notes, createdAt, updatedAt, lastPaidAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    payload.name,
    payload.amount,
    payload.dueAt,
    payload.recurrence,
    payload.category,
    "unpaid",
    payload.notes ?? "",
    now,
    now,
    null
  );
  return getBillById(id)!;
}

export function updateBill(payload: {
  id: string;
  name?: string;
  amount?: number;
  dueAt?: string;
  recurrence?: "none" | "weekly" | "monthly" | "yearly";
  category?: FinanceCategory;
  status?: "unpaid" | "paid";
  notes?: string;
}): FinanceBill {
  const db = getDb();
  const existing = getBillById(payload.id);
  if (!existing) {
    throw new Error(`Bill not found: ${payload.id}`);
  }
  const updates: string[] = [];
  const params: unknown[] = [];

  if (payload.name !== undefined) {
    updates.push("name = ?");
    params.push(payload.name);
  }
  if (payload.amount !== undefined) {
    updates.push("amount = ?");
    params.push(payload.amount);
  }
  if (payload.dueAt !== undefined) {
    updates.push("dueAt = ?");
    params.push(payload.dueAt);
  }
  if (payload.recurrence !== undefined) {
    updates.push("recurrence = ?");
    params.push(payload.recurrence);
  }
  if (payload.category !== undefined) {
    updates.push("category = ?");
    params.push(payload.category);
  }
  if (payload.status !== undefined) {
    updates.push("status = ?");
    params.push(payload.status);
  }
  if (payload.notes !== undefined) {
    updates.push("notes = ?");
    params.push(payload.notes);
  }

  updates.push("updatedAt = ?");
  params.push(new Date().toISOString());

  const sql = `UPDATE finance_bills SET ${updates.join(", ")} WHERE id = ?`;
  params.push(payload.id);
  db.prepare(sql).run(...params);
  return getBillById(payload.id)!;
}

export function deleteBill(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM finance_bills WHERE id = ?").run(id);
}

export function markBillPaid(id: string): FinanceBill {
  const db = getDb();
  const bill = getBillById(id);
  if (!bill) {
    throw new Error(`Bill not found: ${id}`);
  }

  const now = new Date().toISOString();

  if (bill.recurrence === "none") {
    const stmt = db.prepare(`
      UPDATE finance_bills
      SET status = ?, lastPaidAt = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run("paid", now, now, id);
    return getBillById(id)!;
  }

  // For recurring bills, advance due date and keep status unpaid
  const nextDueAt = advanceDueDate(bill.dueAt, bill.recurrence, true);
  const stmt = db.prepare(`
    UPDATE finance_bills
    SET dueAt = ?, lastPaidAt = ?, updatedAt = ?
    WHERE id = ?
  `);
  stmt.run(nextDueAt, now, now, id);
  return getBillById(id)!;
}

export function createExpense(payload: {
  description: string;
  amount: number;
  date: string;
  category: FinanceCategory;
  notes?: string;
}): FinanceExpense {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO finance_expenses (id, description, amount, date, category, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    payload.description,
    payload.amount,
    payload.date,
    payload.category,
    payload.notes ?? "",
    now,
    now
  );
  return getExpenseById(id)!;
}

export function updateExpense(payload: {
  id: string;
  description?: string;
  amount?: number;
  date?: string;
  category?: FinanceCategory;
  notes?: string;
}): FinanceExpense {
  const db = getDb();
  const existing = getExpenseById(payload.id);
  if (!existing) {
    throw new Error(`Expense not found: ${payload.id}`);
  }
  const updates: string[] = [];
  const params: unknown[] = [];

  if (payload.description !== undefined) {
    updates.push("description = ?");
    params.push(payload.description);
  }
  if (payload.amount !== undefined) {
    updates.push("amount = ?");
    params.push(payload.amount);
  }
  if (payload.date !== undefined) {
    updates.push("date = ?");
    params.push(payload.date);
  }
  if (payload.category !== undefined) {
    updates.push("category = ?");
    params.push(payload.category);
  }
  if (payload.notes !== undefined) {
    updates.push("notes = ?");
    params.push(payload.notes);
  }

  updates.push("updatedAt = ?");
  params.push(new Date().toISOString());

  const sql = `UPDATE finance_expenses SET ${updates.join(", ")} WHERE id = ?`;
  params.push(payload.id);
  db.prepare(sql).run(...params);
  return getExpenseById(payload.id)!;
}

export function deleteExpense(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM finance_expenses WHERE id = ?").run(id);
}

export function getMonthlySummary(): FinanceMonthlySummary {
  const db = getDb();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  const upcomingBills = db
    .prepare("SELECT COUNT(*) as count FROM finance_bills WHERE status = 'unpaid' AND dueAt >= ? AND dueAt <= ?")
    .get(startOfMonth, endOfMonth) as { count: number };
  
  const paidBills = db
    .prepare("SELECT COUNT(*) as count FROM finance_bills WHERE status = 'paid' AND lastPaidAt >= ? AND lastPaidAt <= ?")
    .get(startOfMonth, endOfMonth) as { count: number };
  
  const unpaidBills = db
    .prepare("SELECT COUNT(*) as count FROM finance_bills WHERE status = 'unpaid' AND dueAt < ?")
    .get(now.toISOString()) as { count: number };
  
  const totalExpenses = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM finance_expenses WHERE date >= ? AND date <= ?")
    .get(startOfMonth, endOfMonth) as { total: number };
  
  const totalCommittedAmount = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM finance_bills WHERE status = 'unpaid' AND dueAt >= ? AND dueAt <= ?")
    .get(startOfMonth, endOfMonth) as { total: number };

  return {
    upcomingBills: upcomingBills.count,
    paidBills: paidBills.count,
    unpaidBills: unpaidBills.count,
    totalExpenses: totalExpenses.total,
    totalCommittedAmount: totalCommittedAmount.total
  };
}

function getBillById(id: string): FinanceBill | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM finance_bills WHERE id = ?").get(id) as FinanceBill | undefined;
  return row ?? null;
}

function getExpenseById(id: string): FinanceExpense | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM finance_expenses WHERE id = ?").get(id) as FinanceExpense | undefined;
  return row ?? null;
}

function advanceDueDate(
  currentDueAt: string,
  recurrence: "weekly" | "monthly" | "yearly",
  untilFuture = false
): string {
  const date = new Date(currentDueAt);
  if (recurrence === "weekly") {
    date.setDate(date.getDate() + 7);
  } else if (recurrence === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else if (recurrence === "yearly") {
    date.setFullYear(date.getFullYear() + 1);
  }
  if (untilFuture) {
    while (date.getTime() <= Date.now()) {
      if (recurrence === "weekly") date.setDate(date.getDate() + 7);
      if (recurrence === "monthly") date.setMonth(date.getMonth() + 1);
      if (recurrence === "yearly") date.setFullYear(date.getFullYear() + 1);
    }
  }
  return date.toISOString();
}
