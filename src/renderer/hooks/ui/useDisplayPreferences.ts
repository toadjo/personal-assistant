import { useEffect, useState, useCallback } from "react";
import { applyDisplayPreferences } from "../../lib/display/applyDisplay";
import { readDisplayPreferences, writeDisplayPreferences } from "../../lib/display/storage";
import type { DisplayPreferences, Density, PanelRadius } from "../../lib/display/types";

export function useDisplayPreferences() {
  const [prefs, setPrefs] = useState<DisplayPreferences>(readDisplayPreferences);

  useEffect(() => {
    applyDisplayPreferences(prefs);
  }, [prefs]);

  const setDensity = useCallback((density: Density) => {
    setPrefs((prev) => {
      const next = { ...prev, density };
      writeDisplayPreferences(next);
      return next;
    });
  }, []);

  const setPanelRadius = useCallback((panelRadius: PanelRadius) => {
    setPrefs((prev) => {
      const next = { ...prev, panelRadius };
      writeDisplayPreferences(next);
      return next;
    });
  }, []);

  const setShadows = useCallback((shadows: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, shadows };
      writeDisplayPreferences(next);
      return next;
    });
  }, []);

  const setGlassBlur = useCallback((glassBlur: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, glassBlur };
      writeDisplayPreferences(next);
      return next;
    });
  }, []);

  const setDccShowAllSecondary = useCallback((dccShowAllSecondary: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, dccShowAllSecondary };
      writeDisplayPreferences(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = {
      density: "comfortable" as Density,
      panelRadius: "soft" as PanelRadius,
      shadows: true,
      glassBlur: true,
      dccShowAllSecondary: false
    };
    writeDisplayPreferences(next);
    setPrefs(next);
  }, []);

  return {
    prefs,
    setDensity,
    setPanelRadius,
    setShadows,
    setGlassBlur,
    setDccShowAllSecondary,
    reset
  };
}
