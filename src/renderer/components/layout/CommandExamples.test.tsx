import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandExamples } from "./CommandExamples";

describe("CommandExamples", () => {
  it("shows base examples when HA is not ready", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={false} onRunPreset={onRunPreset} />);

    expect(screen.getByText("Try these commands:")).toBeDefined();
    expect(screen.getByText("Capture note")).toBeDefined();
    expect(screen.getByText("Capture task")).toBeDefined();
    expect(screen.getByText("Capture reminder")).toBeDefined();
    expect(screen.getByText("Find overdue")).toBeDefined();
    expect(screen.getByText("Plan today")).toBeDefined();

    // HA-specific examples should not be shown
    expect(screen.queryByText("Toggle device")).toBeNull();
    expect(screen.queryByText("Devices")).toBeNull();
  });

  it("shows HA-specific examples when HA is ready", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={true} onRunPreset={onRunPreset} />);

    expect(screen.getByText("Try these commands:")).toBeDefined();
    expect(screen.getByText("Capture note")).toBeDefined();
    expect(screen.getByText("Capture task")).toBeDefined();
    expect(screen.getByText("Capture reminder")).toBeDefined();
    expect(screen.getByText("Find overdue")).toBeDefined();
    expect(screen.getByText("Plan today")).toBeDefined();

    // HA-specific examples should be shown
    expect(screen.getByText("Toggle device")).toBeDefined();
    expect(screen.getByText("Devices")).toBeDefined();
  });

  it("calls onRunPreset when example button is clicked", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={false} onRunPreset={onRunPreset} />);

    const button = screen.getByText("Capture note");
    button.click();

    expect(onRunPreset).toHaveBeenCalledWith("capture note project update");
  });

  it("calls onRunPreset for task example", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={false} onRunPreset={onRunPreset} />);

    const button = screen.getByText("Capture task");
    button.click();

    expect(onRunPreset).toHaveBeenCalledWith("capture task review budget");
  });

  it("calls onRunPreset for Daily Command Center example", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={false} onRunPreset={onRunPreset} />);

    const button = screen.getByText("Find overdue");
    button.click();

    expect(onRunPreset).toHaveBeenCalledWith("find overdue");
  });

  it("calls onRunPreset for reminder example", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={false} onRunPreset={onRunPreset} />);

    const button = screen.getByText("Capture reminder");
    button.click();

    expect(onRunPreset).toHaveBeenCalledWith("capture reminder follow-up in 1h");
  });

  it("calls onRunPreset for plan today example", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={false} onRunPreset={onRunPreset} />);

    const button = screen.getByText("Plan today");
    button.click();

    expect(onRunPreset).toHaveBeenCalledWith("plan today");
  });
});
