import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { FinancePanel } from "./FinancePanel";
import type { FinanceBill, FinanceExpense, FinanceMonthlySummary } from "../../../shared/types";

function makeBill(overrides: Partial<FinanceBill> = {}): FinanceBill {
  return {
    id: `bill-${Math.random()}`,
    name: "Test Bill",
    amount: 10000,
    dueAt: "2024-01-15T00:00:00Z",
    recurrence: "monthly",
    category: "utilities",
    status: "unpaid",
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    lastPaidAt: null,
    ...overrides
  };
}

function makeExpense(overrides: Partial<FinanceExpense> = {}): FinanceExpense {
  return {
    id: `expense-${Math.random()}`,
    description: "Test Expense",
    amount: 5000,
    date: "2024-01-10T00:00:00Z",
    category: "food",
    notes: "",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides
  };
}

function makeSummary(overrides: Partial<FinanceMonthlySummary> = {}): FinanceMonthlySummary {
  return {
    upcomingBills: 3,
    paidBills: 5,
    unpaidBills: 2,
    totalExpenses: 15000,
    totalCommittedAmount: 35000,
    ...overrides
  };
}

// Mock the assistant API
const mockApi = {
  listBills: vi.fn().mockResolvedValue([]),
  listExpenses: vi.fn().mockResolvedValue([]),
  getMonthlySummary: vi.fn().mockResolvedValue(null),
  createBill: vi.fn().mockResolvedValue(undefined),
  createExpense: vi.fn().mockResolvedValue(undefined),
  markBillPaid: vi.fn().mockResolvedValue(undefined),
  deleteBill: vi.fn().mockResolvedValue(undefined),
  deleteExpense: vi.fn().mockResolvedValue(undefined)
};

vi.mock("../../lib/assistantApi", () => ({
  requireAssistantApi: vi.fn(() => mockApi)
}));

describe("FinancePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.listBills.mockResolvedValue([]);
    mockApi.listExpenses.mockResolvedValue([]);
    mockApi.getMonthlySummary.mockResolvedValue(null);
  });

  it("renders loading state initially", () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();

    render(
      <FinancePanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    expect(screen.getByText("Loading finance data...")).toBeDefined();
  });

  it("renders empty state when no data", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();

    render(
      <FinancePanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    // Wait for loading to complete
    await screen.findByText("No bills yet");
    expect(screen.getByText("Add your first bill to start tracking")).toBeDefined();
  });

  it("renders summary when data is available", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();
    
    const summary = makeSummary();
    mockApi.getMonthlySummary.mockResolvedValue(summary);

    render(
      <FinancePanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("Upcoming");
    expect(screen.getByText("3")).toBeDefined(); // upcomingBills
    expect(screen.getByText("5")).toBeDefined(); // paidBills
    expect(screen.getByText("2")).toBeDefined(); // unpaidBills
    expect(screen.getByText("€150.00")).toBeDefined(); // totalExpenses
    expect(screen.getByText("€350.00")).toBeDefined(); // totalCommittedAmount
  });

  it("renders bills list when bills exist", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();
    
    const bills = [makeBill({ name: "Electric Bill" }), makeBill({ name: "Internet Bill" })];
    mockApi.listBills.mockResolvedValue(bills);

    render(
      <FinancePanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("Electric Bill");
    expect(screen.getByText("Internet Bill")).toBeDefined();
  });

  it("renders expenses list when expenses exist", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();
    
    const expenses = [makeExpense({ description: "Groceries" }), makeExpense({ description: "Gas" })];
    mockApi.listExpenses.mockResolvedValue(expenses);

    render(
      <FinancePanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("Groceries");
    expect(screen.getByText("Gas")).toBeDefined();
  });

  it("shows bill form when add bill button is clicked", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();

    render(
      <FinancePanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("No bills yet");

    const buttons = screen.getAllByRole("button");
    const addButton = buttons[0]; // First button is add bill
    await userEvent.click(addButton);

    expect(screen.getByText("Add Bill")).toBeDefined();
  });

  it("shows expense form when add expense button is clicked", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();

    render(
      <FinancePanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("No bills yet");

    const buttons = screen.getAllByRole("button");
    const addButton = buttons[1]; // Second button is add expense
    await userEvent.click(addButton);

    expect(screen.getByText("Add Expense")).toBeDefined();
  });

  it("calls markBillPaid when mark as paid button is clicked", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();
    
    const bill = makeBill({ id: "bill-1", name: "Electric Bill" });
    mockApi.listBills.mockResolvedValue([bill]);
    mockApi.markBillPaid.mockResolvedValue(undefined);

    render(
      <FinancePanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("Electric Bill");

    const buttons = screen.getAllByRole("button");
    const markPaidButton = buttons.find((btn) => btn.getAttribute("aria-label") === "Mark as paid");
    expect(markPaidButton).toBeDefined();
    await userEvent.click(markPaidButton!);

    expect(mockApi.markBillPaid).toHaveBeenCalledWith("bill-1");
  });

  it("calls deleteBill when delete button is clicked", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();
    
    const bill = makeBill({ id: "bill-1", name: "Electric Bill" });
    mockApi.listBills.mockResolvedValue([bill]);
    mockApi.deleteBill.mockResolvedValue(undefined);

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <FinancePanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("Electric Bill");

    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons.find((btn) => btn.getAttribute("aria-label") === "Delete bill");
    expect(deleteButton).toBeDefined();
    await userEvent.click(deleteButton!);

    expect(mockApi.deleteBill).toHaveBeenCalledWith("bill-1");
    confirmSpy.mockRestore();
  });

  it("calls deleteExpense when delete button is clicked", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();
    
    const expense = makeExpense({ id: "expense-1", description: "Groceries" });
    mockApi.listExpenses.mockResolvedValue([expense]);
    mockApi.deleteExpense.mockResolvedValue(undefined);

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <FinancePanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("Groceries");

    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons.find((btn) => btn.getAttribute("aria-label") === "Delete expense");
    expect(deleteButton).toBeDefined();
    await userEvent.click(deleteButton!);

    expect(mockApi.deleteExpense).toHaveBeenCalledWith("expense-1");
    confirmSpy.mockRestore();
  });

  it("calls onError when API call fails", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onShowSuccess = vi.fn();

    mockApi.listBills.mockRejectedValue(new Error("API Error"));

    render(
      <FinancePanel
        isRefreshing={false}
        onRefresh={onRefresh}
        onError={onError}
        onShowSuccess={onShowSuccess}
      />
    );

    await screen.findByText("No bills yet");

    expect(onError).toHaveBeenCalledWith("Failed to load finance data");
  });
});