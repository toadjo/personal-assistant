import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutomationRulesPanel } from "./AutomationRulesPanel";
import type { AutomationRuleListItem, HaDeviceRow } from "../../types";

describe("AutomationRulesPanel", () => {
  const mockRules: AutomationRuleListItem[] = [
    {
      id: "rule-1",
      name: "Morning reminder",
      triggerType: "time",
      triggerConfig: { at: "08:00" },
      actionType: "localReminder",
      enabled: true,
      lastExecutedAt: undefined
    },
    {
      id: "rule-2",
      name: "Evening lights",
      triggerType: "time",
      triggerConfig: { at: "20:00" },
      actionType: "haToggle",
      enabled: false,
      lastExecutedAt: "2024-01-15T20:00:00Z"
    }
  ];

  const mockDevices: HaDeviceRow[] = [
    { entityId: "light.kitchen", friendlyName: "Kitchen Light", state: "on" }
  ];

  const defaultProps = {
    isRefreshing: false,
    rules: mockRules,
    devices: mockDevices,
    onRefresh: vi.fn(),
    onError: vi.fn(),
    onDeleteRule: vi.fn(),
    onSetRuleEnabled: vi.fn()
  };

  it("renders rules without highlight when focusedRuleId is not provided", () => {
    render(<AutomationRulesPanel {...defaultProps} />);

    expect(screen.getByText(/Morning reminder/)).toBeInTheDocument();
    expect(screen.getByText(/Evening lights/)).toBeInTheDocument();
    
    const listRows = document.querySelectorAll(".listRow");
    expect(listRows).toHaveLength(2);
    expect(listRows[0]).not.toHaveClass("listRowFocused");
    expect(listRows[1]).not.toHaveClass("listRowFocused");
  });

  it("renders rules without highlight when focusedRuleId is null", () => {
    render(<AutomationRulesPanel {...defaultProps} focusedRuleId={null} />);

    const listRows = document.querySelectorAll(".listRow");
    expect(listRows).toHaveLength(2);
    expect(listRows[0]).not.toHaveClass("listRowFocused");
    expect(listRows[1]).not.toHaveClass("listRowFocused");
  });

  it("renders highlight class on matching rule when focusedRuleId is provided", () => {
    render(<AutomationRulesPanel {...defaultProps} focusedRuleId="rule-1" />);

    const listRows = document.querySelectorAll(".listRow");
    expect(listRows).toHaveLength(2);
    expect(listRows[0]).toHaveClass("listRowFocused");
    expect(listRows[1]).not.toHaveClass("listRowFocused");
  });

  it("renders highlight class on second rule when focusedRuleId matches second rule", () => {
    render(<AutomationRulesPanel {...defaultProps} focusedRuleId="rule-2" />);

    const listRows = document.querySelectorAll(".listRow");
    expect(listRows).toHaveLength(2);
    expect(listRows[0]).not.toHaveClass("listRowFocused");
    expect(listRows[1]).toHaveClass("listRowFocused");
  });

  it("renders highlight class on first rule when focusedRuleId matches first rule", () => {
    render(<AutomationRulesPanel {...defaultProps} focusedRuleId="rule-1" />);

    const listRows = document.querySelectorAll(".listRow");
    expect(listRows[0]).toHaveClass("listRowFocused");
  });

  it("renders no highlight when focusedRuleId does not match any rule", () => {
    render(<AutomationRulesPanel {...defaultProps} focusedRuleId="rule-999" />);

    const listRows = document.querySelectorAll(".listRow");
    expect(listRows).toHaveLength(2);
    expect(listRows[0]).not.toHaveClass("listRowFocused");
    expect(listRows[1]).not.toHaveClass("listRowFocused");
  });
});
