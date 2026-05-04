import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandExamples } from "./CommandExamples";

describe("CommandExamples (v1.2.7)", () => {
  it("shows base examples when HA is not ready", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={false} onRunPreset={onRunPreset} />);

    expect(screen.getByText("Try these commands:")).toBeDefined();
    expect(screen.getByText("Create a note")).toBeDefined();
    expect(screen.getByText("Set a reminder")).toBeDefined();
    expect(screen.getByText("Show reminders")).toBeDefined();
    expect(screen.getByText("Show all notes")).toBeDefined();

    // HA-specific examples should not be shown
    expect(screen.queryByText("Toggle a device")).toBeNull();
    expect(screen.queryByText("List all devices")).toBeNull();
    expect(screen.queryByText("Open Household window")).toBeNull();
  });

  it("shows HA-specific examples when HA is ready", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={true} onRunPreset={onRunPreset} />);

    expect(screen.getByText("Try these commands:")).toBeDefined();
    expect(screen.getByText("Create a note")).toBeDefined();
    expect(screen.getByText("Set a reminder")).toBeDefined();
    expect(screen.getByText("Show reminders")).toBeDefined();
    expect(screen.getByText("Show all notes")).toBeDefined();

    // HA-specific examples should be shown
    expect(screen.getByText("Toggle a device")).toBeDefined();
    expect(screen.getByText("List all devices")).toBeDefined();
    expect(screen.getByText("Open Household window")).toBeDefined();
  });

  it("calls onRunPreset when example button is clicked", () => {
    const onRunPreset = vi.fn();
    render(<CommandExamples haReady={false} onRunPreset={onRunPreset} />);

    const button = screen.getByText("Create a note");
    button.click();

    expect(onRunPreset).toHaveBeenCalledWith("new note meeting with team");
  });
});
