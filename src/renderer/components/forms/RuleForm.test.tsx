import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RuleForm } from "./RuleForm";

describe("RuleForm", () => {
  const devices = [
    { entityId: "switch.kitchen", friendlyName: "Kitchen Light", state: "on" },
    { entityId: "switch.bedroom", friendlyName: "Bedroom Light", state: "off" }
  ];

  const onDone = vi.fn(async () => {});
  const onError = vi.fn();
  const onShowSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with localReminder selected by default", () => {
    render(
      <RuleForm devices={devices} onDone={onDone} onError={onError} onShowSuccess={onShowSuccess} />
    );
    expect(screen.getByLabelText("Rule name")).toBeInTheDocument();
    expect(screen.getByLabelText("Rule trigger time")).toHaveValue("08:00");
    expect(screen.getByLabelText("Rule action type")).toHaveValue("localReminder");
    expect(screen.getByLabelText("Reminder text to create")).toBeInTheDocument();
  });

  it("shows task fields when Create task is selected", () => {
    render(
      <RuleForm devices={devices} onDone={onDone} onError={onError} onShowSuccess={onShowSuccess} />
    );

    fireEvent.change(screen.getByLabelText("Rule action type"), {
      target: { value: "localTask" }
    });

    expect(screen.getByLabelText("Task title")).toBeInTheDocument();
    expect(screen.getByLabelText("Task notes")).toBeInTheDocument();
    expect(screen.getByLabelText("Task due date")).toBeInTheDocument();
    expect(screen.getByLabelText("Task priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Task recurrence")).toBeInTheDocument();
    expect(screen.queryByLabelText("Reminder text to create")).not.toBeInTheDocument();
  });

  it("shows device selector when Toggle device is selected", () => {
    render(
      <RuleForm devices={devices} onDone={onDone} onError={onError} onShowSuccess={onShowSuccess} />
    );

    fireEvent.change(screen.getByLabelText("Rule action type"), {
      target: { value: "haToggle" }
    });

    expect(screen.getByLabelText("Device to toggle")).toBeInTheDocument();
    expect(screen.queryByLabelText("Reminder text to create")).not.toBeInTheDocument();
  });

  it("calls createRule with localTask config when submitted", async () => {
    const createRule = vi.fn(async () => ({}));
    (window as unknown as Record<string, unknown>).assistantApi = {
      createRule
    };

    render(
      <RuleForm devices={devices} onDone={onDone} onError={onError} onShowSuccess={onShowSuccess} />
    );

    fireEvent.change(screen.getByLabelText("Rule action type"), {
      target: { value: "localTask" }
    });
    fireEvent.change(screen.getByLabelText("Task title"), {
      target: { value: "Standup prep" }
    });
    fireEvent.change(screen.getByLabelText("Task notes"), {
      target: { value: "Review backlog" }
    });

    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    // Wait for async click handler
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(createRule).toHaveBeenCalledTimes(1);
    const payload = (createRule.mock.calls[0] as unknown[])[0] as {
      actionType: string;
      actionConfig: Record<string, unknown>;
    };
    expect(payload.actionType).toBe("localTask");
    expect(payload.actionConfig.title).toBe("Standup prep");
    expect(payload.actionConfig.notes).toBe("Review backlog");
    expect(payload.actionConfig.priority).toBe("normal");
    expect(payload.actionConfig.recurrence).toBe("none");

    delete (window as unknown as Record<string, unknown>).assistantApi;
  });

  it("blocks recurring task submission without due date", async () => {
    const createRule = vi.fn(async () => ({}));
    (window as unknown as Record<string, unknown>).assistantApi = {
      createRule
    };

    render(
      <RuleForm devices={devices} onDone={onDone} onError={onError} onShowSuccess={onShowSuccess} />
    );

    fireEvent.change(screen.getByLabelText("Rule action type"), {
      target: { value: "localTask" }
    });
    fireEvent.change(screen.getByLabelText("Task title"), {
      target: { value: "Daily check" }
    });
    fireEvent.change(screen.getByLabelText("Task recurrence"), {
      target: { value: "daily" }
    });

    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(createRule).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith("Recurring tasks need a due date.");

    delete (window as unknown as Record<string, unknown>).assistantApi;
  });
});
