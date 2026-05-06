import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SuccessBanner } from "./SuccessBanner";

describe("SuccessBanner (v1.2.7)", () => {
  it("renders nothing when no success messages", () => {
    const { container } = render(<SuccessBanner successes={[]} onDismiss={vi.fn()} onDismissAll={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders single success message", () => {
    render(
      <SuccessBanner
        successes={[{ id: "1", message: "Note created", timestamp: Date.now() }]}
        onDismiss={vi.fn()}
        onDismissAll={vi.fn()}
      />
    );

    expect(screen.getByText("Note created")).toBeDefined();
    expect(screen.getByLabelText("Dismiss success message")).toBeDefined();
  });

  it("renders multiple success messages", () => {
    render(
      <SuccessBanner
        successes={[
          { id: "1", message: "Note created", timestamp: Date.now() },
          { id: "2", message: "Reminder created", timestamp: Date.now() }
        ]}
        onDismiss={vi.fn()}
        onDismissAll={vi.fn()}
      />
    );

    expect(screen.getByText("Note created")).toBeDefined();
    expect(screen.getByText("Reminder created")).toBeDefined();
  });

  it("calls onDismiss with message id when dismiss button clicked", () => {
    const onDismiss = vi.fn();
    render(
      <SuccessBanner
        successes={[{ id: "1", message: "Note created", timestamp: Date.now() }]}
        onDismiss={onDismiss}
        onDismissAll={vi.fn()}
      />
    );

    const dismissButton = screen.getByLabelText("Dismiss success message");
    dismissButton.click();

    expect(onDismiss).toHaveBeenCalledWith("1");
  });

  it("calls onDismissAll when dismiss all button clicked", () => {
    const onDismissAll = vi.fn();
    render(
      <SuccessBanner
        successes={[
          { id: "1", message: "Note created", timestamp: Date.now() },
          { id: "2", message: "Reminder created", timestamp: Date.now() }
        ]}
        onDismiss={vi.fn()}
        onDismissAll={onDismissAll}
      />
    );

    const dismissAllButton = screen.getByLabelText("Dismiss all success messages");
    dismissAllButton.click();

    expect(onDismissAll).toHaveBeenCalled();
  });
});
