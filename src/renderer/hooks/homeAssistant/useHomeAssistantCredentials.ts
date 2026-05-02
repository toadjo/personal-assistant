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
        if (config.hasToken) setStatus("I already have a Home Assistant token on file for the Household window.");
      } catch {
        // Non-fatal on startup.
      }
    })();
  }, [setStatus]);

  const saveHomeAssistantConfig = useCallback(async () => {
    try {
      setError("");
      setIsSavingHa(true);
      setStatus("Saving your Home Assistant settings…");
      await window.assistantApi.configureHomeAssistant({ url: haUrl, token: haToken });
      const config = await window.assistantApi.getHomeAssistantConfig();
      setHasHaToken(config.hasToken);
      setHaToken("");
      setStatus("Saved. Next step: Test connection, then Refresh devices so I see your entities.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSavingHa(false);
    }
  }, [haUrl, haToken, setError, setStatus]);

  const testHomeAssistant = useCallback(async () => {
    try {
      setError("");
      setStatus("Pinging Home Assistant…");
      setStatus(
        (await window.assistantApi.testHomeAssistant())
          ? "Connection looks good—we can talk to Home Assistant."
          : "That test did not succeed. Double-check the URL, token, and that HA allows this machine."
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
        setStatus("Pulling the latest device list from Home Assistant…");
        await window.assistantApi.refreshHomeAssistantEntities();
        setStatus("Entities updated—syncing this app…");
        await refreshAll();
        setStatus("All synced. You should see fresh states below.");
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
