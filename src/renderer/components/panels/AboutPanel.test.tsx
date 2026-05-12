import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AboutPanel } from "./AboutPanel";

describe("AboutPanel", () => {
  it("renders version from props", () => {
    render(<AboutPanel version="1.4.3" onClose={vi.fn()} />);
    expect(screen.getByText("PersonalAssistant 1.4.3")).toBeInTheDocument();
  });

  it("renders local-first description", () => {
    render(<AboutPanel version="1.4.3" onClose={vi.fn()} />);
    expect(screen.getByText(/notes, tasks, reminders/)).toBeInTheDocument();
  });

  it("renders close button when onClose is provided", () => {
    render(<AboutPanel version="1.4.3" onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("does not render close button when onClose is omitted", () => {
    render(<AboutPanel version="1.4.3" />);
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });
});
