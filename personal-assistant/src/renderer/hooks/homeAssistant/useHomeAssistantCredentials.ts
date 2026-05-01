import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../../lib/errors";

type Messages = { setStatus: (value: string) => void; setError: (value: string) => void };

export function useHomeAssistantCredentials({ setStatus, setError }: Messages) {
  const [haUrl, setHaUrl] = useState("");
  const [haToken, setHaToken] = useState("");
  const [hasHaToken, setHasHaToken] = useState(false);
  const [isSavingHa, setIsSavingHa] = useState(false);
  const [isRefreshingHa, setIsRefreshingHa] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const config = await window.assistantApi.getHomeAssistantConfig();
        if (config.url) setHaUrl(config.url);
        setHasHaToken(config.hasToken);
        if (config.hasToken) setStatus("Stored Home Assistant token detected.");
      } catch {
        // Non-fatal on startup.
      }
    })();
  }, [setStatus]);

  const saveHomeAssistantConfig = useCallback(async () => {
    try {
      setError("");
      setIsSavingHa(true);
      setStatus("Saving Home Assistant configuration...");
      await window.assistantApi.configureHomeAssistant({ url: haUrl, token: haToken });
      const config = await window.assistantApi.getHomeAssistantConfig();
      setHasHaToken(config.hasToken);
      setHaToken("");
      setStatus("Configuration saved. Next: Test connection, then Refresh Entities.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSavingHa(false);
    }
  }, [haUrl, haToken, setError, setStatus]);

  const testHomeAssistant = useCallback(async () => {
    try {
      setError("");
      setStatus("Testing Home Assistant connection...");
      setStatus(
        (await window.assistantApi.testHomeAssistant())
          ? "Home Assistant connected."
          : "Home Assistant test failed. Confirm URL, token, and API access."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [setError, setStatus]);

  const refreshHomeAssistantEntities = useCallback(
    async (refreshAll: () => Promise<void>) => {
      try {
        setError("");
        setIsRefreshingHa(true);
        setStatus("Refreshing Home Assistant entities...");
        await window.assistantApi.refreshHomeAssistantEntities();
        setStatus("Entities refreshed. Syncing local view...");
        await refreshAll();
        setStatus("Entities refreshed and synced.");
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsRefreshingHa(false);
      }
    },
    [setError, setStatus]
  );

  return {
    haUrl,
    setHaUrl,
    haToken,
    setHaToken,
    hasHaToken,
    isSavingHa,
    isRefreshingHa,
    saveHomeAssistantConfig,
    testHomeAssistant,
    refreshHomeAssistantEntities
  };
}
