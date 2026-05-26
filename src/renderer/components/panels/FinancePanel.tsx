import { useState, useEffect, memo } from "react";
import { DollarSign, Plus, Trash2, Check, Calendar, Clock } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { EmptyState } from "../ui/EmptyState";
import { requireAssistantApi } from "../../lib/assistantApi";
import type { FinanceBill, FinanceExpense, FinanceMonthlySummary, FinanceCategory } from "../../../shared/types";

type Props = {
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onShowSuccess?: (message: string) => void;
};

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

function formatEur(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const FinancePanel = memo(function FinancePanel({
  isRefreshing: _isRefreshing,
  onRefresh: _onRefresh,
  onError,
  onShowSuccess
}: Props): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [bills, setBills] = useState<FinanceBill[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [summary, setSummary] = useState<FinanceMonthlySummary | null>(null);
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

  async function loadData() {
    setIsLoading(true);
    try {
      const [billsData, expensesData, summaryData] = await Promise.all([
        api.listBills(),
        api.listExpenses(),
        api.getMonthlySummary()
      ]);
      setBills(billsData);
      setExpenses(expensesData);
      setSummary(summaryData);
    } catch {
      onError("Failed to load finance data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateBill(e: React.FormEvent) {
    e.preventDefault();
    try {
      const amountCents = Math.round(parseFloat(billForm.amount) * 100);
      await api.createBill({
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
      await loadData();
    } catch {
      onError("Failed to create bill");
    }
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    try {
      const amountCents = Math.round(parseFloat(expenseForm.amount) * 100);
      await api.createExpense({
        description: expenseForm.description,
        amount: amountCents,
        date: new Date(expenseForm.date).toISOString(),
        category: expenseForm.category,
        notes: expenseForm.notes
      });
      setShowExpenseForm(false);
      setExpenseForm({ description: "", amount: "", date: "", category: "other", notes: "" });
      onShowSuccess?.("Expense created");
      await loadData();
    } catch {
      onError("Failed to create expense");
    }
  }

  async function handleMarkBillPaid(id: string) {
    try {
      await api.markBillPaid(id);
      onShowSuccess?.("Bill marked as paid");
      await loadData();
    } catch {
      onError("Failed to mark bill as paid");
    }
  }

  async function handleDeleteBill(id: string) {
    if (!window.confirm("Delete this bill?")) return;
    try {
      await api.deleteBill(id);
      onShowSuccess?.("Bill deleted");
      await loadData();
    } catch {
      onError("Failed to delete bill");
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api.deleteExpense(id);
      onShowSuccess?.("Expense deleted");
      await loadData();
    } catch {
      onError("Failed to delete expense");
    }
  }

  const unpaidBills = bills.filter((b) => b.status === "unpaid").sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const paidBills = bills.filter((b) => b.status === "paid").sort((a, b) => b.lastPaidAt ? b.lastPaidAt.localeCompare(a.lastPaidAt) : 0);

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
          <div className="loadingState">Loading finance data...</div>
        ) : (
          <>
            {/* Summary Row */}
            {summary && (
              <div className="financeSummary">
                <div className="summaryCard">
                  <div className="summaryLabel">Upcoming</div>
                  <div className="summaryValue">{summary.upcomingBills}</div>
                </div>
                <div className="summaryCard">
                  <div className="summaryLabel">Paid</div>
                  <div className="summaryValue">{summary.paidBills}</div>
                </div>
                <div className="summaryCard">
                  <div className="summaryLabel">Unpaid/Overdue</div>
                  <div className="summaryValue">{summary.unpaidBills}</div>
                </div>
                <div className="summaryCard">
                  <div className="summaryLabel">Expenses</div>
                  <div className="summaryValue">{formatEur(summary.totalExpenses)}</div>
                </div>
                <div className="summaryCard">
                  <div className="summaryLabel">Committed</div>
                  <div className="summaryValue">{formatEur(summary.totalCommittedAmount)}</div>
                </div>
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
