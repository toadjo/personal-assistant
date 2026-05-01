import { useState } from "react";
import { getErrorMessage } from "../../lib/errors";

export function useDeviceToggle(refreshAll: () => Promise<void>, setStatus: (value: string) => void, setError: (value: string) => void) {
  const [togglingEntityIds, setTogglingEntityIds] = useState<Set<string>>(new Set());

  const isEntityTogglePending = (entityId: string): boolean => togglingEntityIds.has(entityId);

  async function runDeviceToggle(entityId: string, friendlyName: string): Promise<void> {
    if (togglingEntityIds.has(entityId)) {
      setStatus(`Toggle already in progress for ${friendlyName}.`);
      return;
    }
    try {
      setError("");
      setStatus(`Toggling ${friendlyName}...`);
      setTogglingEntityIds((prev) => new Set(prev).add(entityId));
      await window.assistantApi.toggleDevice(entityId);
      setStatus(`${friendlyName} toggled. Refreshing state...`);
      await refreshAll();
      setStatus(`${friendlyName} toggled and synced.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTogglingEntityIds((prev) => {
        const next = new Set(prev);
        next.delete(entityId);
        return next;
      });
    }
  }

  return { isEntityTogglePending, runDeviceToggle };
}
