import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
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
} from "../../services/finance";
import { registerInvoke } from "../invoke-handle";
import {
  financeBillCreateSchema,
  financeBillUpdateSchema,
  financeBillFilterSchema,
  financeExpenseCreateSchema,
  financeExpenseUpdateSchema,
  financeExpenseFilterSchema,
  uuidSchema
} from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for finance operations (bills, expenses, summary). */
export function registerFinanceHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.financeBillsList, assertSender, (_event, filter) => {
    return listBills(financeBillFilterSchema.parse(filter));
  });
  registerInvoke(IpcInvoke.financeBillsCreate, assertSender, (_event, payload) => {
    return createBill(financeBillCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.financeBillsUpdate, assertSender, (_event, payload) => {
    return updateBill(financeBillUpdateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.financeBillsDelete, assertSender, (_event, id) => {
    deleteBill(uuidSchema.parse(id));
  });
  registerInvoke(IpcInvoke.financeBillsMarkPaid, assertSender, (_event, id) => {
    return markBillPaid(uuidSchema.parse(id));
  });
  registerInvoke(IpcInvoke.financeExpensesList, assertSender, (_event, filter) => {
    return listExpenses(financeExpenseFilterSchema.parse(filter));
  });
  registerInvoke(IpcInvoke.financeExpensesCreate, assertSender, (_event, payload) => {
    return createExpense(financeExpenseCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.financeExpensesUpdate, assertSender, (_event, payload) => {
    return updateExpense(financeExpenseUpdateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.financeExpensesDelete, assertSender, (_event, id) => {
    deleteExpense(uuidSchema.parse(id));
  });
  registerInvoke(IpcInvoke.financeSummaryGet, assertSender, () => {
    return getMonthlySummary();
  });
}
