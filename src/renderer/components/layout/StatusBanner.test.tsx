import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBanner } from "./StatusBanner";

describe("StatusBanner", () => {
  it("renders status when status is non-empty", () => {
    render(<StatusBanner status="Synced." error="" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Synced.")).toBeInTheDocument();
  });

  it("renders error when error is non-empty", () => {
    render(<StatusBanner status="" error="Network failed." />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Network failed.")).toBeInTheDocument();
  });

  it("renders nothing when both are empty", () => {
    const { container } = render(<StatusBanner status="" error="" />);
    expect(container.firstChild).toBeNull();
  });
});
