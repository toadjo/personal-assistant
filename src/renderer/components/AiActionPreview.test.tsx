import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiActionPreview } from "./AiActionPreview";

describe("AiActionPreview", () => {
  it("renders create_note draft", () => {
    render(
      <AiActionPreview
        draft={{ type: "create_note", title: "Test Note", content: "Test content" }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isConfirming={false}
      />
    );
    expect(screen.getByText(/AI Suggestion:/i)).toBeInTheDocument();
    expect(screen.getByText(/Create note: "Test Note"/i)).toBeInTheDocument();
  });

  it("renders create_note draft without content", () => {
    render(
      <AiActionPreview
        draft={{ type: "create_note", title: "Test Note" }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isConfirming={false}
      />
    );
    expect(screen.getByText(/Create note: "Test Note"/i)).toBeInTheDocument();
  });

  it("renders create_task draft with all fields", () => {
    render(
      <AiActionPreview
        draft={{
          type: "create_task",
          title: "Test Task",
          notes: "Some notes",
          dueAt: "2024-12-31T23:59:59Z",
          priority: "high"
        }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isConfirming={false}
      />
    );
    expect(screen.getByText(/Create task: "Test Task"/i)).toBeInTheDocument();
  });

  it("renders create_task draft with minimal fields", () => {
    render(
      <AiActionPreview
        draft={{ type: "create_task", title: "Test Task" }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isConfirming={false}
      />
    );
    expect(screen.getByText(/Create task: "Test Task"/i)).toBeInTheDocument();
  });

  it("renders create_reminder draft", () => {
    render(
      <AiActionPreview
        draft={{ type: "create_reminder", text: "Buy milk", dueAt: "2024-01-01T00:00:00Z" }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isConfirming={false}
      />
    );
    expect(screen.getByText(/Create reminder: "Buy milk"/i)).toBeInTheDocument();
  });

  it("renders toggle_device draft with friendlyName", () => {
    render(
      <AiActionPreview
        draft={{ type: "toggle_device", entityId: "light.living_room", friendlyName: "Living Room Light" }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isConfirming={false}
      />
    );
    expect(screen.getByText(/Toggle device: Living Room Light/i)).toBeInTheDocument();
  });

  it("renders toggle_device draft without friendlyName", () => {
    render(
      <AiActionPreview
        draft={{ type: "toggle_device", entityId: "light.living_room" }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isConfirming={false}
      />
    );
    expect(screen.getByText(/Toggle device: light.living_room/i)).toBeInTheDocument();
  });

  it("calls onConfirm when Confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    render(
      <AiActionPreview
        draft={{ type: "create_note", title: "Test Note" }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        isConfirming={false}
      />
    );
    const confirmButton = screen.getByText(/Confirm/i);
    confirmButton.click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <AiActionPreview
        draft={{ type: "create_note", title: "Test Note" }}
        onConfirm={vi.fn()}
        onCancel={onCancel}
        isConfirming={false}
      />
    );
    const cancelButton = screen.getByText(/Cancel/i);
    cancelButton.click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables buttons when isConfirming is true", () => {
    render(
      <AiActionPreview
        draft={{ type: "create_note", title: "Test Note" }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isConfirming={true}
      />
    );
    const confirmButton = screen.getByText(/Confirming.../i);
    const cancelButton = screen.getByText(/Cancel/i);
    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });
});
