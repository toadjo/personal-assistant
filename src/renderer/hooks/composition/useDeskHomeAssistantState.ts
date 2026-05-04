/**
 * Home Assistant state composition hook.
 *
 * Ownership:
 * - HA credentials (URL, token)
 * - HA readiness UI (derived from credentials)
 * - Device toggling state and actions
 *
 * Dependencies:
 * - setStatus, setError: for UI feedback during save/test/refresh/toggle operations
 * - refreshAll: for syncing after entity toggles and HA refresh
 *
 * This hook takes only the minimal dependencies it needs and does not depend
 * on broader workspace state like command or onboarding.
 */
import { useMemo } from "react";
import { homeAssistantUi } from "../../lib/derived/homeAssistantUi";
import { useHomeAssistantCredentials } from "../homeAssistant/useHomeAssistantCredentials";
import { useDeviceToggle } from "../homeAssistant/useDeviceToggle";

export type DeskHomeAssistantState = {
  haUrl: string;
  setHaUrl: (value: string) => void;
  haToken: string;
  setHaToken: (value: string) => void;
  hasHaToken: boolean;
  isRefreshingHa: boolean;
  isSavingHa: boolean;
  saveHomeAssistantConfig: () => Promise<void>;
  testHomeAssistant: () => Promise<void>;
  refreshHomeAssistantEntities: () => void;
  haReady: boolean;
  hasHaUrl: boolean;
  canSaveHa: boolean;
  haStatusText: string;
  isEntityTogglePending: (entityId: string) => boolean;
  runDeviceToggle: (entityId: string, friendlyName: string) => Promise<void>;
};

export function useDeskHomeAssistantState(
  setStatus: (value: string) => void,
  setError: (value: string) => void,
  refreshAll: () => Promise<void>
): DeskHomeAssistantState {
  const ha = useHomeAssistantCredentials({ setStatus, setError });
  const { isEntityTogglePending, runDeviceToggle } = useDeviceToggle(refreshAll, setStatus, setError);

  const haUi = useMemo(
    () => homeAssistantUi(ha.haUrl, ha.haToken, ha.hasHaToken),
    [ha.haUrl, ha.haToken, ha.hasHaToken]
  );

  return {
    haUrl: ha.haUrl,
    setHaUrl: ha.setHaUrl,
    haToken: ha.haToken,
    setHaToken: ha.setHaToken,
    hasHaToken: ha.hasHaToken,
    isRefreshingHa: ha.isRefreshingHa,
    isSavingHa: ha.isSavingHa,
    saveHomeAssistantConfig: ha.saveHomeAssistantConfig,
    testHomeAssistant: ha.testHomeAssistant,
    refreshHomeAssistantEntities: () => {
      void ha.refreshHomeAssistantEntities(refreshAll);
    },
    haReady: haUi.haReady,
    hasHaUrl: haUi.hasHaUrl,
    canSaveHa: haUi.canSaveHa,
    haStatusText: haUi.haStatusText,
    isEntityTogglePending,
    runDeviceToggle
  };
}
