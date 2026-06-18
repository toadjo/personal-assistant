import { useState } from "react";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { requireAssistantApi } from "../../lib/assistantApi";

export function useDeviceToggle(
  refreshDevices: () => Promise<void>,
  setStatus: (value: string) => void,
  setError: (value: string) => void
) {
  const [togglingEntityIds, setTogglingEntityIds] = useState<Set<string>>(new Set());

  const isEntityTogglePending = (entityId: string): boolean => togglingEntityIds.has(entityId);

  async function runDeviceToggle(entityId: string, friendlyName: string): Promise<void> {
    if (togglingEntityIds.has(entityId)) {
      setStatus(`Still working on ${friendlyName} - give me a second.`);
      return;
    }
    try {
      setError("");
      setStatus(`Switching ${friendlyName}...`);
      setTogglingEntityIds((prev) => new Set(prev).add(entityId));
      const api = requireAssistantApi();
      await api.toggleDevice(entityId);
      setStatus(`${friendlyName} updated - refreshing devices...`);
      await refreshDevices();
      setStatus(`${friendlyName} is in sync now.`);
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
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
