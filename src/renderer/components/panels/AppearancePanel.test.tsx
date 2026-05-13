import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppearancePanel } from "./AppearancePanel";
import type { ThemeMode, ThemeTokenKey } from "../../lib/theme/tokens";
import type { DisplayPreferences, Density, PanelRadius } from "../../lib/display/types";

function makeDisplay(overrides?: Partial<DisplayPreferences>): DisplayPreferences & {
  setDensity: (d: Density) => void;
  setPanelRadius: (r: PanelRadius) => void;
  setShadows: (v: boolean) => void;
  setGlassBlur: (v: boolean) => void;
  setDccShowAllSecondary: (v: boolean) => void;
  resetDisplay: () => void;
} {
  return {
    density: "comfortable",
    panelRadius: "soft",
    shadows: true,
    glassBlur: true,
    dccShowAllSecondary: false,
    setDensity: vi.fn(),
    setPanelRadius: vi.fn(),
    setShadows: vi.fn(),
    setGlassBlur: vi.fn(),
    setDccShowAllSecondary: vi.fn(),
    resetDisplay: vi.fn(),
    ...overrides
  };
}

function makeProps(overrides?: {
  theme?: ThemeMode;
  custom?: { basePreset: ThemeMode; overrides: Partial<Record<ThemeTokenKey, string>> };
  display?: Partial<DisplayPreferences>;
}) {
  return {
    theme: (overrides?.theme ?? "paper") as ThemeMode,
    custom: overrides?.custom,
    display: makeDisplay(overrides?.display),
    onPresetChange: vi.fn(),
    onOverride: vi.fn(),
    onReset: vi.fn(),
    onClose: vi.fn()
  };
}

describe("AppearancePanel", () => {
  it("default render shows preset, accent, density, radius, and toggles but no raw token inputs", () => {
    render(<AppearancePanel {...makeProps()} />);

    expect(screen.getByText(/Preset/i)).toBeInTheDocument();
    expect(screen.getByText(/Accent/i)).toBeInTheDocument();
    expect(screen.getByText(/Density/i)).toBeInTheDocument();
    expect(screen.getByText(/Panel radius/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Shadows/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Glass blur/i)).toBeInTheDocument();

    expect(screen.queryByLabelText("Background color")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Primary color")).not.toBeInTheDocument();
  });

  it("advanced button reveals token groups and import/export actions", () => {
    render(<AppearancePanel {...makeProps()} />);

    const advancedBtn = screen.getByRole("button", { name: /Advanced/i });
    fireEvent.click(advancedBtn);

    expect(screen.getByLabelText("Background color")).toBeInTheDocument();
    expect(screen.getByLabelText("Primary color")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Duplicate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export/i })).toBeInTheDocument();
    expect(screen.getByText(/Import/i)).toBeInTheDocument();
  });

  it("existing custom overrides appear when Advanced is opened", () => {
    const props = makeProps({
      custom: {
        basePreset: "paper",
        overrides: { primary: "#ff0000" }
      }
    });
    render(<AppearancePanel {...props} />);

    const advancedBtn = screen.getByRole("button", { name: /Advanced/i });
    fireEvent.click(advancedBtn);

    const primaryText = screen.getByLabelText(/Primary value/i);
    expect(primaryText).toHaveValue("#ff0000");
  });

  it("accent choice calls onOverride for grouped accent tokens", () => {
    const onOverride = vi.fn();
    render(<AppearancePanel {...makeProps({ theme: "paper" })} onOverride={onOverride} />);

    const greenBtn = screen.getByRole("button", { name: /Green/i });
    fireEvent.click(greenBtn);

    expect(onOverride).toHaveBeenCalledTimes(4);
    expect(onOverride).toHaveBeenCalledWith("primary", expect.any(String));
    expect(onOverride).toHaveBeenCalledWith("primaryHover", expect.any(String));
    expect(onOverride).toHaveBeenCalledWith("primarySoft", expect.any(String));
    expect(onOverride).toHaveBeenCalledWith("focusRing", expect.any(String));
  });

  it("contrast warning renders when unsafe text/background pair is active", () => {
    render(
      <AppearancePanel
        {...makeProps({
          theme: "paper",
          custom: {
            basePreset: "paper",
            overrides: { text: "#eeeeee", bg: "#ffffff" }
          }
        })}
      />
    );

    expect(screen.getByText(/Low contrast detected/i)).toBeInTheDocument();
  });
});
