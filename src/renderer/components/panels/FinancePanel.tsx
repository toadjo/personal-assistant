import { useEffect, useState, memo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus, Trash2, Check, Calendar, Clock } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { EmptyState } from "../ui/EmptyState";
import { LoadingState } from "../life-areas/LoadingState";
import { SummaryCard } from "../life-areas/SummaryCard";
import { LifeAreaPanelProps } from "../life-areas/types";
import { formatDate, formatEur } from "../../lib/dateFormat";
import { requireAssistantApi } from "../../lib/assistantApi";
import { workspaceQueryKeys } from "../../lib/query/keys";
import { fetchFinanceBills, fetchFinanceExpenses, fetchFinanceSummary } from "../../lib/query/lifeAreas";
import type { FinanceBill, FinanceExpense, FinanceMonthlySummary, FinanceCategory } from "../../../shared/types";

const FINANCE_CATEGORIES: FinanceCategory[] = [
  "housing",
  "utilities",
  "food",
  "transport",
  "health",
  "subscriptions",
  "debt",
  "income",
  "other"
];

const RECURRENCE_OPTIONS = [
  { value: "none", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" }
] as const;

export const FinancePanel = memo(function FinancePanel({
  isRefreshing: _isRefreshing,
  onRefresh: _onRefresh,
  onError,
  onShowSuccess
}: LifeAreaPanelProps): JSX.Element {
  const queryClient = useQueryClient();
  const billsQuery = useQuery({ queryKey: workspaceQueryKeys.finance.bills(), queryFn: fetchFinanceBills });
  const expensesQuery = useQuery({ queryKey: workspaceQueryKeys.finance.expenses(), queryFn: fetchFinanceExpenses });
  const summaryQuery = useQuery({ queryKey: workspaceQueryKeys.finance.summary(), queryFn: fetchFinanceSummary });
  const bills: FinanceBill[] = billsQuery.data ?? [];
  const expenses: FinanceExpense[] = expensesQuery.data ?? [];
  const summary: FinanceMonthlySummary | null = summaryQuery.data ?? null;
  const isLoading = billsQuery.isLoading || expensesQuery.isLoading || summaryQuery.isLoading;

  useEffect(() => {
    if (billsQuery.error || expensesQuery.error || summaryQuery.error) {
      onError("Failed to load finance data");
    }
  }, [billsQuery.error, expensesQuery.error, onError, summaryQuery.error]);
  const [showBillForm, setShowBillForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [billForm, setBillForm] = useState({
    name: "",
    amount: "",
    dueAt: "",
    recurrence: "none" as const,
    category: "other" as FinanceCategory,
    notes: ""
  });
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    date: "",
    category: "other" as FinanceCategory,
    notes: ""
  });

  const api = requireAssistantApi();

  const invalidateFinance = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.finance.bills() }),
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.finance.expenses() }),
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.finance.summary() })
    ]);
  };

  const createBillMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      amount: number;
      dueAt: string;
      recurrence: "none" | "weekly" | "monthly" | "yearly";
      category: FinanceCategory;
      notes: string;
    }) => api.createBill(payload),
    onError: () => onError("Failed to create bill"),
    onSettled: async () => invalidateFinance()
  });
  const createExpenseMutation = useMutation({
    mutationFn: async (payload: {
      description: string;
      amount: number;
      date: string;
      category: FinanceCategory;
      notes: string;
    }) => api.createExpense(payload),
    onError: () => onError("Failed to create expense"),
    onSettled: async () => invalidateFinance()
  });
  const markBillPaidMutation = useMutation({
    mutationFn: async (id: string) => api.markBillPaid(id),
    onError: () => onError("Failed to mark bill as paid"),
    onSettled: async () => invalidateFinance()
  });
  const deleteBillMutation = useMutation({
    mutationFn: async (id: string) => api.deleteBill(id),
    onError: () => onError("Failed to delete bill"),
    onSettled: async () => invalidateFinance()
  });
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => api.deleteExpense(id),
    onError: () => onError("Failed to delete expense"),
    onSettled: async () => invalidateFinance()
  });

  async function handleCreateBill(e: React.FormEvent) {
    e.preventDefault();
    try {
      const amountCents = Math.round(parseFloat(billForm.amount) * 100);
      await createBillMutation.mutateAsync({
        name: billForm.name,
        amount: amountCents,
        dueAt: new Date(billForm.dueAt).toISOString(),
        recurrence: billForm.recurrence,
        category: billForm.category,
        notes: billForm.notes
      });
      setShowBillForm(false);
      setBillForm({ name: "", amount: "", dueAt: "", recurrence: "none", category: "other", notes: "" });
      onShowSuccess?.("Bill created");
    } catch {
      onError("Failed to create bill");
    }
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    try {
      const amountCents = Math.round(parseFloat(expenseForm.amount) * 100);
      await createExpenseMutation.mutateAsync({
        description: expenseForm.description,
        amount: amountCents,
        date: new Date(expenseForm.date).toISOString(),
        category: expenseForm.category,
        notes: expenseForm.notes
      });
      setShowExpenseForm(false);
      setExpenseForm({ description: "", amount: "", date: "", category: "other", notes: "" });
      onShowSuccess?.("Expense created");
    } catch {
      onError("Failed to create expense");
    }
  }

  async function handleMarkBillPaid(id: string) {
    try {
      await markBillPaidMutation.mutateAsync(id);
      onShowSuccess?.("Bill marked as paid");
    } catch {
      onError("Failed to mark bill as paid");
    }
  }

  async function handleDeleteBill(id: string) {
    if (!window.confirm("Delete this bill?")) return;
    try {
      await deleteBillMutation.mutateAsync(id);
      onShowSuccess?.("Bill deleted");
    } catch {
      onError("Failed to delete bill");
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await deleteExpenseMutation.mutateAsync(id);
      onShowSuccess?.("Expense deleted");
    } catch {
      onError("Failed to delete expense");
    }
  }

  const unpaidBills = bills.filter((b) => b.status === "unpaid").sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const paidBills = bills.filter((b) => b.status === "paid").sort((a, b) => {
    if (!b.lastPaidAt && !a.lastPaidAt) return 0;
    if (!b.lastPaidAt) return 1;
    if (!a.lastPaidAt) return -1;
    return b.lastPaidAt.localeCompare(a.lastPaidAt);
  });

  return (
    <section className="panel" aria-labelledby="finance-panel-heading">
      <PanelHeader
        icon={DollarSign}
        title="Finance"
        actions={
          <div className="panelActions">
            <button
              type="button"
              className="iconButton"
              aria-label="Add bill"
              onClick={() => setShowBillForm(true)}
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              className="iconButton"
              aria-label="Add expense"
              onClick={() => setShowExpenseForm(true)}
            >
              <Plus size={16} />
            </button>
          </div>
        }
      />

      <div className="panelContent">
        {isLoading ? (
          <LoadingState message="Loading finance data..." />
        ) : (
          <>
            {/* Summary Row */}
            {summary && (
              <div className="financeSummary">
                <SummaryCard label="Upcoming" value={summary.upcomingBills} />
                <SummaryCard label="Paid" value={summary.paidBills} />
                <SummaryCard label="Unpaid/Overdue" value={summary.unpaidBills} />
                <SummaryCard label="Expenses" value={formatEur(summary.totalExpenses)} />
                <SummaryCard label="Committed" value={formatEur(summary.totalCommittedAmount)} />
              </div>
            )}

            {/* Bill Form */}
            {showBillForm && (
              <div className="formPanel">
                <h3>Add Bill</h3>
                <form onSubmit={handleCreateBill}>
                  <div className="formRow">
                    <label>
                      Name
                      <input
                        type="text"
                        value={billForm.name}
                        onChange={(e) => setBillForm({ ...billForm, name: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Amount (EUR)
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={billForm.amount}
                        onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Due Date
                      <input
                        type="date"
                        value={billForm.dueAt}
                        onChange={(e) => setBillForm({ ...billForm, dueAt: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Recurrence
                      <select
                        value={billForm.recurrence}
                        onChange={(e) => setBillForm({ ...billForm, recurrence: e.target.value as typeof billForm.recurrence })}
                      >
                        {RECURRENCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Category
                      <select
                        value={billForm.category}
                        onChange={(e) => setBillForm({ ...billForm, category: e.target.value as FinanceCategory })}
                      >
                        {FINANCE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Notes
                      <textarea
                        value={billForm.notes}
                        onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                        rows={2}
                      />
                    </label>
                  </div>
                  <div className="formActions">
                    <button type="button" onClick={() => setShowBillForm(false)}>
                      Cancel
                    </button>
                    <button type="submit">Create Bill</button>
                  </div>
                </form>
              </div>
            )}

            {/* Expense Form */}
            {showExpenseForm && (
              <div className="formPanel">
                <h3>Add Expense</h3>
                <form onSubmit={handleCreateExpense}>
                  <div className="formRow">
                    <label>
                      Description
                      <input
                        type="text"
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Amount (EUR)
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Date
                      <input
                        type="date"
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Category
                      <select
                        value={expenseForm.category}
                        onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as FinanceCategory })}
                      >
                        {FINANCE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Notes
                      <textarea
                        value={expenseForm.notes}
                        onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                        rows={2}
                      />
                    </label>
                  </div>
                  <div className="formActions">
                    <button type="button" onClick={() => setShowExpenseForm(false)}>
                      Cancel
                    </button>
                    <button type="submit">Create Expense</button>
                  </div>
                </form>
              </div>
            )}

            {/* Bills List */}
            <div className="financeSection">
              <h3 className="sectionHeader">
                <Clock size={16} />
                Bills
              </h3>
              {unpaidBills.length === 0 && paidBills.length === 0 ? (
                <EmptyState
                  icon={DollarSign}
                  title="No bills yet"
                  description="Add your first bill to start tracking"
                />
              ) : (
                <>
                  {unpaidBills.length > 0 && (
                    <div className="billList">
                      <h4>Unpaid</h4>
                      {unpaidBills.map((bill) => (
                        <div key={bill.id} className="billItem">
                          <div className="billInfo">
                            <div className="billName">{bill.name}</div>
                            <div className="billMeta">
                              <span className="billAmount">{formatEur(bill.amount)}</span>
                              <span className="billDue">Due: {formatDate(bill.dueAt)}</span>
                              <span className="billCategory">{bill.category}</span>
                              {bill.recurrence !== "none" && <span className="billRecurrence">{bill.recurrence}</span>}
                            </div>
                          </div>
                          <div className="billActions">
                            <button
                              type="button"
                              className="iconButton"
                              aria-label="Mark as paid"
                              onClick={() => handleMarkBillPaid(bill.id)}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              className="iconButton"
                              aria-label="Delete bill"
                              onClick={() => handleDeleteBill(bill.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {paidBills.length > 0 && (
                    <div className="billList">
                      <h4>Paid</h4>
                      {paidBills.map((bill) => (
                        <div key={bill.id} className="billItem billItemPaid">
                          <div className="billInfo">
                            <div className="billName">{bill.name}</div>
                            <div className="billMeta">
                              <span className="billAmount">{formatEur(bill.amount)}</span>
                              <span className="billDue">Paid: {bill.lastPaidAt ? formatDate(bill.lastPaidAt) : "Recently"}</span>
                              <span className="billCategory">{bill.category}</span>
                            </div>
                          </div>
                          <div className="billActions">
                            <button
                              type="button"
                              className="iconButton"
                              aria-label="Delete bill"
                              onClick={() => handleDeleteBill(bill.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Expenses List */}
            <div className="financeSection">
              <h3 className="sectionHeader">
                <Calendar size={16} />
                Expenses
              </h3>
              {expenses.length === 0 ? (
                <EmptyState
                  icon={DollarSign}
                  title="No expenses yet"
                  description="Add your first expense to start tracking"
                />
              ) : (
                <div className="expenseList">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="expenseItem">
                      <div className="expenseInfo">
                        <div className="expenseDescription">{expense.description}</div>
                        <div className="expenseMeta">
                          <span className="expenseAmount">{formatEur(expense.amount)}</span>
                          <span className="expenseDate">{formatDate(expense.date)}</span>
                          <span className="expenseCategory">{expense.category}</span>
                        </div>
                      </div>
                      <div className="expenseActions">
                        <button
                          type="button"
                          className="iconButton"
                          aria-label="Delete expense"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
});
