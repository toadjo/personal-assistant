import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataControlPanel } from "./DataControlPanel";

describe("DataControlPanel", () => {
  const defaultProps = {
    onExport: vi.fn(),
    onImport: vi.fn(),
    onReset: vi.fn(),
    isExporting: false,
    isImporting: false,
    isResetting: false
  };

  it("renders export, import, and reset buttons", () => {
    render(<DataControlPanel {...defaultProps} />);

    expect(screen.getByText("Export backup")).toBeInTheDocument();
    expect(screen.getByText("Import backup")).toBeInTheDocument();
    expect(screen.getByText("Delete all data")).toBeInTheDocument();
  });

  it("calls onExport when export button is clicked", () => {
    const onExport = vi.fn();
    render(<DataControlPanel {...defaultProps} onExport={onExport} />);

    fireEvent.click(screen.getByText("Export backup"));
    expect(onExport).toHaveBeenCalled();
  });

  it("opens file input when import button is clicked", () => {
    render(<DataControlPanel {...defaultProps} />);

    const importButton = screen.getByText("Import backup");
    const fileInput = screen.getByRole("textbox", { hidden: true }) as HTMLInputElement;

    expect(fileInput).not.toBeVisible();
    fireEvent.click(importButton);
    // The file input is hidden but should be present and clickable via ref
    expect(fileInput).toBeInTheDocument();
  });

  it("calls onImport when a JSON file is selected", async () => {
    const onImport = vi.fn();
    render(<DataControlPanel {...defaultProps} onImport={onImport} />);

    const fileInput = screen.getByRole("textbox", { hidden: true }) as HTMLInputElement;
    const file = new File(["{}"], "backup.json", { type: "application/json" });

    Object.defineProperty(fileInput, "files", {
      value: [file],
      writable: false
    });

    fireEvent.change(fileInput);
    expect(onImport).toHaveBeenCalledWith(file);
  });

  it("clears file input after import", async () => {
    const onImport = vi.fn().mockResolvedValue(null);
    render(<DataControlPanel {...defaultProps} onImport={onImport} />);

    const fileInput = screen.getByRole("textbox", { hidden: true }) as HTMLInputElement;
    const file = new File(["{}"], "backup.json", { type: "application/json" });

    Object.defineProperty(fileInput, "files", {
      value: [file],
      writable: false
    });

    fireEvent.change(fileInput);
    // After the change event, the file input value should be cleared
    expect(fileInput.value).toBe("");
  });

  it("calls onReset when reset button is clicked", () => {
    const onReset = vi.fn();
    render(<DataControlPanel {...defaultProps} onReset={onReset} />);

    fireEvent.click(screen.getByText("Delete all data"));
    expect(onReset).toHaveBeenCalled();
  });

  it("disables all buttons when exporting", () => {
    render(<DataControlPanel {...defaultProps} isExporting={true} />);

    expect(screen.getByText("Exporting...")).toBeInTheDocument();
    expect(screen.getByText("Import backup")).toBeDisabled();
    expect(screen.getByText("Delete all data")).toBeDisabled();
  });

  it("disables all buttons when importing", () => {
    render(<DataControlPanel {...defaultProps} isImporting={true} />);

    expect(screen.getByText("Export backup")).toBeDisabled();
    expect(screen.getByText("Importing...")).toBeInTheDocument();
    expect(screen.getByText("Delete all data")).toBeDisabled();
  });

  it("disables all buttons when resetting", () => {
    render(<DataControlPanel {...defaultProps} isResetting={true} />);

    expect(screen.getByText("Export backup")).toBeDisabled();
    expect(screen.getByText("Import backup")).toBeDisabled();
    expect(screen.getByText("Resetting...")).toBeInTheDocument();
  });

  it("does not call onImport when no file is selected", () => {
    const onImport = vi.fn();
    render(<DataControlPanel {...defaultProps} onImport={onImport} />);

    const fileInput = screen.getByRole("textbox", { hidden: true }) as HTMLInputElement;

    Object.defineProperty(fileInput, "files", {
      value: null,
      writable: false
    });

    fireEvent.change(fileInput);
    expect(onImport).not.toHaveBeenCalled();
  });
});
