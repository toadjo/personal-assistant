import { useState, useCallback, useMemo } from "react";
import { X, Palette, RotateCcw, Copy, Download, Upload, AlertTriangle } from "lucide-react";
import {
  THEME_PRESETS,
  type ThemeMode,
  type ThemeTokenKey,
  type CustomTheme,
  resolveTokens
} from "../../lib/theme/tokens";
import { isContrastSafe } from "../../lib/theme/contrast";
import type { DisplayPreferences, Density, PanelRadius } from "../../lib/display/types";
import { IconButton } from "../ui/IconButton";

const TOKEN_LABELS: Record<ThemeTokenKey, string> = {
  bg: "Background",
  text: "Text",
  title: "Title",
  subtitle: "Subtitle",
  panelBg: "Panel background",
  panelBorder: "Panel border",
  surfaceBorderStrong: "Strong border",
  statBg: "Stat background",
  statBorder: "Stat border",
  statText: "Stat text",
  inputBg: "Input background",
  inputBorder: "Input border",
  inputText: "Input text",
  primary: "Primary",
  primaryHover: "Primary hover",
  primarySoft: "Primary soft",
  focusRing: "Focus ring",
  muted: "Muted",
  listText: "List text",
  ghostBg: "Ghost background",
  ghostText: "Ghost text",
  ghostBorder: "Ghost border",
  successBg: "Success background",
  successBorder: "Success border",
  successText: "Success text",
  errorBg: "Error background",
  errorBorder: "Error border",
  errorText: "Error text"
};

const TOKEN_GROUPS: { label: string; keys: ThemeTokenKey[] }[] = [
  { label: "Surface", keys: ["bg", "panelBg", "panelBorder", "surfaceBorderStrong"] },
  { label: "Text", keys: ["text", "title", "subtitle", "muted", "listText"] },
  {
    label: "Controls",
    keys: ["inputBg", "inputBorder", "inputText", "focusRing", "ghostBg", "ghostText", "ghostBorder"]
  },
  { label: "Accent", keys: ["primary", "primaryHover", "primarySoft"] },
  { label: "Status", keys: ["successBg", "successBorder", "successText", "errorBg", "errorBorder", "errorText"] },
  { label: "Stats", keys: ["statBg", "statBorder", "statText"] }
];

type Props = {
  theme: ThemeMode;
  custom: CustomTheme | undefined;
  display: DisplayPreferences & {
    setDensity: (density: Density) => void;
    setPanelRadius: (radius: PanelRadius) => void;
    setShadows: (value: boolean) => void;
    setGlassBlur: (value: boolean) => void;
    setDccShowAllSecondary: (value: boolean) => void;
    resetDisplay: () => void;
  };
  onPresetChange: (preset: ThemeMode) => void;
  onOverride: (key: ThemeTokenKey, value: string | undefined) => void;
  onReset: (preset?: ThemeMode) => void;
  onClose: () => void;
};

function hexFromColorInput(value: string): string {
  const trimmed = value.trim();
  if (/^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  }
  if (/^#?[0-9a-fA-F]{3}$/.test(trimmed)) {
    const full = trimmed
      .replace("#", "")
      .split("")
      .map((c) => c + c)
      .join("");
    return `#${full}`;
  }
  // Convert rgba(r,g,b,a) to hex. Color input does not support alpha.
  const rgbaMatch = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/.exec(trimmed);
  if (rgbaMatch) {
    const [, rawR, rawG, rawB] = rgbaMatch;
    const r = parseInt(rawR ?? "0", 10)
      .toString(16)
      .padStart(2, "0");
    const g = parseInt(rawG ?? "0", 10)
      .toString(16)
      .padStart(2, "0");
    const b = parseInt(rawB ?? "0", 10)
      .toString(16)
      .padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  return trimmed;
}

export function AppearancePanel({
  theme,
  custom,
  display,
  onPresetChange,
  onOverride,
  onReset,
  onClose
}: Props): JSX.Element {
  const [activePreset, setActivePreset] = useState<ThemeMode>(theme);

  const currentTokens = useMemo(() => resolveTokens(theme, custom?.overrides), [theme, custom]);

  const contrastIssues = useMemo(() => {
    const issues: { label: string; ratio: number }[] = [];
    const check = (fg: string, bg: string, label: string) => {
      const ratio = isContrastSafe(fg, bg) ? 0 : 1; // rough: only flag unsafe
      if (ratio > 0) {
        // Compute actual ratio for display
        const r = isContrastSafe(fg, bg);
        if (!r) {
          // import contrastRatio lazily or inline — skip detailed calc for now
          issues.push({ label, ratio: 0 });
        }
      }
    };
    check(currentTokens.text, currentTokens.bg, "Text on background");
    check(currentTokens.title, currentTokens.bg, "Title on background");
    check(currentTokens.primary, currentTokens.bg, "Primary on background");
    return issues;
  }, [currentTokens]);

  const handleExport = useCallback(() => {
    const payload = {
      preset: theme,
      custom: custom ?? null,
      tokens: currentTokens
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `personal-assistant-theme-${theme}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [theme, custom, currentTokens]);

  const handleImport = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>;
          if (typeof parsed.preset === "string") {
            onPresetChange(parsed.preset as ThemeMode);
          }
          if (parsed.custom && typeof parsed.custom === "object") {
            const c = parsed.custom as CustomTheme;
            if (c.overrides) {
              Object.entries(c.overrides).forEach(([k, v]) => {
                if (typeof v === "string") {
                  onOverride(k as ThemeTokenKey, v);
                }
              });
            }
          }
        } catch {
          // ignore invalid import
        }
      };
      reader.readAsText(file);
    },
    [onPresetChange, onOverride]
  );

  const duplicatePreset = useCallback(() => {
    const base = THEME_PRESETS.find((p) => p.id === activePreset);
    if (!base) return;
    Object.entries(base.tokens).forEach(([k, v]) => {
      onOverride(k as ThemeTokenKey, v);
    });
  }, [activePreset, onOverride]);

  return (
    <div className="panel appearancePanel">
      <div className="appearancePanelHeader">
        <h3 className="subheading">
          <Palette size={16} /> Appearance
        </h3>
        <IconButton icon={X} label="Close appearance panel" title="Close" onClick={onClose} variant="ghost" size={16} />
      </div>

      <div className="appearanceSection">
        <label className="muted">Preset</label>
        <div className="row appearancePresetRow">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`pillButton ${theme === p.id && !custom ? "pillButtonActive" : ""}`}
              onClick={() => {
                setActivePreset(p.id);
                onPresetChange(p.id);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="appearanceSection">
        <label className="muted">Density</label>
        <div className="row appearancePresetRow">
          {(["comfortable", "compact", "spacious"] as Density[]).map((d) => (
            <button
              key={d}
              type="button"
              className={`pillButton ${display.density === d ? "pillButtonActive" : ""}`}
              onClick={() => display.setDensity(d)}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="appearanceSection">
        <label className="muted">Panel radius</label>
        <div className="row appearancePresetRow">
          {(["sharp", "soft", "rounded"] as PanelRadius[]).map((r) => (
            <button
              key={r}
              type="button"
              className={`pillButton ${display.panelRadius === r ? "pillButtonActive" : ""}`}
              onClick={() => display.setPanelRadius(r)}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="appearanceSection appearanceToggles">
        <label className="appearanceToggle">
          <input type="checkbox" checked={display.shadows} onChange={(e) => display.setShadows(e.target.checked)} />
          Shadows
        </label>
        <label className="appearanceToggle">
          <input type="checkbox" checked={display.glassBlur} onChange={(e) => display.setGlassBlur(e.target.checked)} />
          Glass blur
        </label>
        <label className="appearanceToggle">
          <input
            type="checkbox"
            checked={display.dccShowAllSecondary}
            onChange={(e) => display.setDccShowAllSecondary(e.target.checked)}
          />
          Show all DCC sections
        </label>
      </div>

      <div className="appearanceActions">
        <button type="button" className="ghostButton" onClick={() => onReset(activePreset)}>
          <RotateCcw size={14} /> Reset theme
        </button>
        <button type="button" className="ghostButton" onClick={duplicatePreset}>
          <Copy size={14} /> Duplicate
        </button>
        <button type="button" className="ghostButton" onClick={handleExport}>
          <Download size={14} /> Export
        </button>
        <label className="ghostButton fileButton">
          <Upload size={14} /> Import
          <input
            type="file"
            accept="application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
        <button type="button" className="ghostButton" onClick={display.resetDisplay}>
          <RotateCcw size={14} /> Reset layout
        </button>
      </div>

      {contrastIssues.length > 0 && (
        <div className="appearanceWarning">
          <AlertTriangle size={14} />
          <span>Low contrast detected for some color pairs.</span>
        </div>
      )}

      <div className="appearanceTokens">
        {TOKEN_GROUPS.map((group) => (
          <div key={group.label} className="appearanceGroup">
            <h4 className="appearanceGroupLabel">{group.label}</h4>
            <div className="appearanceGroupGrid">
              {group.keys.map((key) => {
                const value = currentTokens[key];
                const overridden = custom?.overrides?.[key] !== undefined;
                return (
                  <div key={key} className={`appearanceTokenRow ${overridden ? "appearanceTokenOverridden" : ""}`}>
                    <label className="appearanceTokenLabel">{TOKEN_LABELS[key]}</label>
                    <div className="appearanceTokenInputRow">
                      <input
                        type="color"
                        value={hexFromColorInput(value)}
                        onChange={(e) => onOverride(key, e.target.value)}
                        aria-label={`${TOKEN_LABELS[key]} color`}
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => onOverride(key, e.target.value)}
                        className="appearanceTokenText"
                        aria-label={`${TOKEN_LABELS[key]} value`}
                      />
                      {overridden && (
                        <IconButton
                          icon={RotateCcw}
                          label={`Reset ${TOKEN_LABELS[key]}`}
                          title="Reset"
                          onClick={() => onOverride(key, undefined)}
                          variant="ghost"
                          size={14}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
