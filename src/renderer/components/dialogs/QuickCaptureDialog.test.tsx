import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickCaptureDialog } from "./QuickCaptureDialog";

describe("QuickCaptureDialog", () => {
  const mockOnShowSuccess = vi.fn();
  const mockOnError = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSaved = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    // Mock the assistantApi directly on window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).assistantApi = {
      createNote: vi.fn().mockResolvedValue(undefined),
      createTask: vi.fn().mockResolvedValue(undefined),
      createReminder: vi.fn().mockResolvedValue(undefined)
    };
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).assistantApi;
    vi.restoreAllMocks();
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <QuickCaptureDialog
        isOpen={false}
        onClose={mockOnClose}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders dialog when isOpen is true", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByText("Quick Capture")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("What do you want to capture?")).toBeInTheDocument();
  });

  it("renders type selector with all options", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByText("Note")).toBeInTheDocument();
    expect(screen.getByText("Task")).toBeInTheDocument();
    expect(screen.getByText("Reminder")).toBeInTheDocument();
    expect(screen.getByText("Inbox")).toBeInTheDocument();
  });

  it("defaults to inbox type", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const inboxButton = screen.getByText("Inbox");
    expect(inboxButton.parentElement).toHaveClass("quick-capture-type-button");
    expect(inboxButton.parentElement).toHaveClass("active");
  });

  it("respects initialType prop", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        initialType="task"
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const taskButton = screen.getByText("Task");
    expect(taskButton.parentElement).toHaveClass("active");
  });

  it("respects initialText prop", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        initialText="buy milk"
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const input = screen.getByPlaceholderText("What do you want to capture?");
    expect(input).toHaveValue("buy milk");
  });

  it("switches capture type when type button clicked", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const taskButton = screen.getByText("Task");
    fireEvent.click(taskButton);

    expect(taskButton.parentElement).toHaveClass("active");
  });

  it("shows task options when task type selected", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        initialType="task"
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByLabelText("Due date (optional):")).toBeInTheDocument();
    expect(screen.getByLabelText("Priority:")).toBeInTheDocument();
  });

  it("shows reminder options when reminder type selected", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        initialType="reminder"
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByLabelText("Due date:")).toBeInTheDocument();
  });

  it("does not show options for note or inbox types", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        initialType="note"
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.queryByLabelText("Due date (optional):")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Priority:")).not.toBeInTheDocument();
  });

  it("creates note when note type selected and submitted", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).assistantApi;
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        initialType="note"
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const input = screen.getByPlaceholderText("What do you want to capture?");
    fireEvent.change(input, { target: { value: "test note" } });

    const submitButton = screen.getByText("Capture");
    fireEvent.click(submitButton);

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(api.createNote).toHaveBeenCalledWith({
      title: "test note",
      content: "test note",
      tags: [],
      pinned: false
    });
    expect(mockOnSaved).toHaveBeenCalledWith("note");
    expect(mockOnShowSuccess).toHaveBeenCalledWith("Note created.");
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("creates task when task type selected and submitted", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).assistantApi;
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        initialType="task"
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const input = screen.getByPlaceholderText("What do you want to capture?");
    fireEvent.change(input, { target: { value: "test task" } });

    const submitButton = screen.getByText("Capture");
    fireEvent.click(submitButton);

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(api.createTask).toHaveBeenCalledWith({
      title: "test task",
      notes: "",
      dueAt: null,
      priority: "normal",
      recurrence: "none"
    });
    expect(mockOnSaved).toHaveBeenCalledWith("task");
    expect(mockOnShowSuccess).toHaveBeenCalledWith("Task created.");
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("creates reminder when reminder type selected and submitted", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).assistantApi;
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        initialType="reminder"
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const input = screen.getByPlaceholderText("What do you want to capture?");
    fireEvent.change(input, { target: { value: "test reminder" } });

    const submitButton = screen.getByText("Capture");
    fireEvent.click(submitButton);

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(api.createReminder).toHaveBeenCalledWith({
      text: "test reminder",
      dueAt: expect.any(String),
      recurrence: "none"
    });
    expect(mockOnSaved).toHaveBeenCalledWith("reminder");
    expect(mockOnShowSuccess).toHaveBeenCalledWith("Reminder created.");
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("creates inbox note when inbox type selected and submitted", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).assistantApi;
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        initialType="inbox"
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const input = screen.getByPlaceholderText("What do you want to capture?");
    fireEvent.change(input, { target: { value: "test inbox" } });

    const submitButton = screen.getByText("Capture");
    fireEvent.click(submitButton);

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(api.createNote).toHaveBeenCalledWith({
      title: "test inbox",
      content: "test inbox",
      tags: [],
      pinned: false
    });
    expect(mockOnSaved).toHaveBeenCalledWith("inbox");
    expect(mockOnShowSuccess).toHaveBeenCalledWith("Captured to Inbox.");
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows error when text is empty", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByText("Capture");
    // Button is disabled when text is empty, so it can't be clicked
    expect(submitButton).toBeDisabled();
  });

  it("disables submit button when text is empty", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByText("Capture");
    expect(submitButton).toBeDisabled();
  });

  it("closes dialog when cancel button clicked", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("closes dialog when close button clicked", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("closes dialog when overlay clicked", () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const overlay = screen.getByText("Quick Capture").closest(".quick-capture-overlay");
    if (overlay) fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows error when creation fails", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).assistantApi;
    api.createNote.mockRejectedValue(new Error("Creation failed"));

    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        initialType="note"
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const input = screen.getByPlaceholderText("What do you want to capture?");
    fireEvent.change(input, { target: { value: "test note" } });

    const submitButton = screen.getByText("Capture");
    fireEvent.click(submitButton);

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockOnError).toHaveBeenCalled();
  });

  it("resets state when dialog reopens", () => {
    const { rerender } = render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        initialType="task"
        initialText="initial text"
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const input = screen.getByPlaceholderText("What do you want to capture?");
    expect(input).toHaveValue("initial text");

    // Change state
    fireEvent.change(input, { target: { value: "changed text" } });
    expect(input).toHaveValue("changed text");

    // Close dialog completely
    rerender(
      <QuickCaptureDialog
        isOpen={false}
        onClose={mockOnClose}
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    // Dialog should be gone
    expect(screen.queryByPlaceholderText("What do you want to capture?")).not.toBeInTheDocument();

    // Reopen with different initial text - state should reset to new value
    rerender(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        initialType="note"
        initialText="new initial"
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const newInput = screen.getByPlaceholderText("What do you want to capture?");
    expect(newInput).toHaveValue("new initial");
  });

  it("calls onSaved with correct type after successful capture", async () => {
    render(
      <QuickCaptureDialog
        isOpen={true}
        onClose={mockOnClose}
        initialType="task"
        onShowSuccess={mockOnShowSuccess}
        onError={mockOnError}
        onSaved={mockOnSaved}
      />
    );

    const input = screen.getByPlaceholderText("What do you want to capture?");
    fireEvent.change(input, { target: { value: "test task" } });

    const submitButton = screen.getByText("Capture");
    fireEvent.click(submitButton);

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockOnSaved).toHaveBeenCalledWith("task");
  });
});
