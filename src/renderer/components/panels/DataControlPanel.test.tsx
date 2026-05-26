import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DataControlPanel } from "./DataControlPanel";

describe("DataControlPanel", () => {
  const defaultProps = {
    onExport: vi.fn(),
    onImport: vi.fn(),
    onReset: vi.fn(),
    onHealthCheck: vi.fn(),
    onOptimize: vi.fn(),
    isExporting: false,
    isImporting: false,
    isResetting: false,
    isHealthChecking: false,
    isOptimizing: false
  };

  it("renders export, import, health check, optimize, and reset buttons when health check and optimize are provided", () => {
    render(<DataControlPanel {...defaultProps} />);

    expect(screen.getByText("Export backup")).toBeInTheDocument();
    expect(screen.getByText("Import backup")).toBeInTheDocument();
    expect(screen.getByText("Health check")).toBeInTheDocument();
    expect(screen.getByText("Optimize database")).toBeInTheDocument();
    expect(screen.getByText("Delete all data")).toBeInTheDocument();
  });

  it("renders export, import, and reset buttons when health check and optimize are not provided", () => {
    const propsWithoutHealth = {
      ...defaultProps,
      onHealthCheck: undefined,
      onOptimize: undefined
    };
    render(<DataControlPanel {...propsWithoutHealth} />);

    expect(screen.getByText("Export backup")).toBeInTheDocument();
    expect(screen.getByText("Import backup")).toBeInTheDocument();
    expect(screen.queryByText("Health check")).not.toBeInTheDocument();
    expect(screen.queryByText("Optimize database")).not.toBeInTheDocument();
    expect(screen.getByText("Delete all data")).toBeInTheDocument();
  });

  it("calls onExport when export button is clicked", () => {
    const onExport = vi.fn();
    render(<DataControlPanel {...defaultProps} onExport={onExport} />);

    fireEvent.click(screen.getByText("Export backup"));
    expect(onExport).toHaveBeenCalled();
  });

  it("opens file input when import button is clicked", () => {
    const { container } = render(<DataControlPanel {...defaultProps} />);

    const importButton = screen.getByText("Import backup");
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");

    expect(fileInput).not.toBeVisible();
    fireEvent.click(importButton);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("calls onImport when a JSON file is selected", async () => {
    const onImport = vi.fn();
    const { container } = render(<DataControlPanel {...defaultProps} onImport={onImport} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["{}"], "backup.json", { type: "application/json" });

    Object.defineProperty(fileInput, "files", {
      value: [file],
      writable: false
    });

    fireEvent.change(fileInput);
    await waitFor(() => expect(onImport).toHaveBeenCalledWith(file));
  });

  it("clears file input after import", async () => {
    const onImport = vi.fn().mockResolvedValue(null);
    const { container } = render(<DataControlPanel {...defaultProps} onImport={onImport} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["{}"], "backup.json", { type: "application/json" });

    Object.defineProperty(fileInput, "files", {
      value: [file],
      writable: false
    });

    fireEvent.change(fileInput);
    await waitFor(() => expect(fileInput.value).toBe(""));
  });

  it("calls onReset when reset button is clicked", () => {
    const onReset = vi.fn();
    render(<DataControlPanel {...defaultProps} onReset={onReset} />);

    fireEvent.click(screen.getByText("Delete all data"));
    expect(onReset).toHaveBeenCalled();
  });

  it("calls onHealthCheck when health check button is clicked", () => {
    const onHealthCheck = vi.fn();
    render(<DataControlPanel {...defaultProps} onHealthCheck={onHealthCheck} />);

    fireEvent.click(screen.getByText("Health check"));
    expect(onHealthCheck).toHaveBeenCalled();
  });

  it("calls onOptimize when optimize button is clicked", () => {
    const onOptimize = vi.fn();
    render(<DataControlPanel {...defaultProps} onOptimize={onOptimize} />);

    fireEvent.click(screen.getByText("Optimize database"));
    expect(onOptimize).toHaveBeenCalled();
  });

  it("disables all buttons when exporting", () => {
    render(<DataControlPanel {...defaultProps} isExporting={true} />);

    expect(screen.getByText("Exporting...")).toBeInTheDocument();
    expect(screen.getByText("Import backup")).toBeDisabled();
    expect(screen.getByText("Health check")).toBeDisabled();
    expect(screen.getByText("Optimize database")).toBeDisabled();
    expect(screen.getByText("Delete all data")).toBeDisabled();
  });

  it("disables all buttons when importing", () => {
    render(<DataControlPanel {...defaultProps} isImporting={true} />);

    expect(screen.getByText("Export backup")).toBeDisabled();
    expect(screen.getByText("Importing...")).toBeInTheDocument();
    expect(screen.getByText("Health check")).toBeDisabled();
    expect(screen.getByText("Optimize database")).toBeDisabled();
    expect(screen.getByText("Delete all data")).toBeDisabled();
  });

  it("disables all buttons when resetting", () => {
    render(<DataControlPanel {...defaultProps} isResetting={true} />);

    expect(screen.getByText("Export backup")).toBeDisabled();
    expect(screen.getByText("Import backup")).toBeDisabled();
    expect(screen.getByText("Health check")).toBeDisabled();
    expect(screen.getByText("Optimize database")).toBeDisabled();
    expect(screen.getByText("Resetting...")).toBeInTheDocument();
  });

  it("disables all buttons when health checking", () => {
    render(<DataControlPanel {...defaultProps} isHealthChecking={true} />);

    expect(screen.getByText("Export backup")).toBeDisabled();
    expect(screen.getByText("Import backup")).toBeDisabled();
    expect(screen.getByText("Checking...")).toBeInTheDocument();
    expect(screen.getByText("Optimize database")).toBeDisabled();
    expect(screen.getByText("Delete all data")).toBeDisabled();
  });

  it("disables all buttons when optimizing", () => {
    render(<DataControlPanel {...defaultProps} isOptimizing={true} />);

    expect(screen.getByText("Export backup")).toBeDisabled();
    expect(screen.getByText("Import backup")).toBeDisabled();
    expect(screen.getByText("Health check")).toBeDisabled();
    expect(screen.getByText("Optimizing...")).toBeInTheDocument();
    expect(screen.getByText("Delete all data")).toBeDisabled();
  });

  it("does not call onImport when no file is selected", () => {
    const onImport = vi.fn();
    const { container } = render(<DataControlPanel {...defaultProps} onImport={onImport} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, "files", {
      value: null,
      writable: false
    });

    fireEvent.change(fileInput);
    expect(onImport).not.toHaveBeenCalled();
  });
});
