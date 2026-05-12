import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandExamples } from "./CommandExamples";

describe("CommandExamples (v1.2.7)", () => {
  it("shows base examples when HA is not ready", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={false} onRunPreset={onRunPreset} />);

    expect(screen.getByText("Try these commands:")).toBeDefined();
    expect(screen.getByText("New note")).toBeDefined();
    expect(screen.getByText("Add task")).toBeDefined();
    expect(screen.getByText("Set reminder")).toBeDefined();
    expect(screen.getByText("Overdue tasks")).toBeDefined();
    expect(screen.getByText("Plan ahead")).toBeDefined();

    // HA-specific examples should not be shown
    expect(screen.queryByText("Toggle device")).toBeNull();
    expect(screen.queryByText("Devices")).toBeNull();
  });

  it("shows HA-specific examples when HA is ready", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={true} onRunPreset={onRunPreset} />);

    expect(screen.getByText("Try these commands:")).toBeDefined();
    expect(screen.getByText("New note")).toBeDefined();
    expect(screen.getByText("Add task")).toBeDefined();
    expect(screen.getByText("Set reminder")).toBeDefined();
    expect(screen.getByText("Overdue tasks")).toBeDefined();
    expect(screen.getByText("Plan ahead")).toBeDefined();

    // HA-specific examples should be shown
    expect(screen.getByText("Toggle device")).toBeDefined();
    expect(screen.getByText("Devices")).toBeDefined();
  });

  it("calls onRunPreset when example button is clicked", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={false} onRunPreset={onRunPreset} />);

    const button = screen.getByText("New note");
    button.click();

    expect(onRunPreset).toHaveBeenCalledWith("new note project update");
  });

  it("calls onRunPreset for task example", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={false} onRunPreset={onRunPreset} />);

    const button = screen.getByText("Add task");
    button.click();

    expect(onRunPreset).toHaveBeenCalledWith("add task review budget");
  });

  it("calls onRunPreset for Daily Command Center example", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={false} onRunPreset={onRunPreset} />);

    const button = screen.getByText("Overdue tasks");
    button.click();

    expect(onRunPreset).toHaveBeenCalledWith("show overdue tasks");
  });
});
