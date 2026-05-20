import { useEffect, useState } from "react";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { logRendererWarning } from "../../lib/log";
import { getAssistantApi, requireAssistantApi } from "../../lib/assistantApi";

type SetStatus = (value: string) => void;
type SetError = (value: string) => void;

export function useUserProfileSettings(setError: SetError, setStatus: SetStatus) {
  const [userPreferredName, setUserPreferredName] = useState("");
  const [userPreferredNameIsSet, setUserPreferredNameIsSet] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const api = getAssistantApi();
        if (!api) return;
        const s = await api.getAssistantSettings();
        setUserPreferredName(s.userPreferredName);
        setUserPreferredNameIsSet(s.userPreferredNameIsSet);
      } catch (err) {
        logRendererWarning("settings", "Could not load assistant settings (non-fatal).", err);
      }
    })();
  }, []);

  async function persistUserPreferredName(raw: string): Promise<void> {
    try {
      setError("");
      const api = requireAssistantApi();
      const s = await api.setUserPreferredName(raw);
      setUserPreferredName(s.userPreferredName);
      setUserPreferredNameIsSet(s.userPreferredNameIsSet);
      setStatus(
        s.userPreferredNameIsSet
          ? `I'll greet you as "${s.userPreferredName}" from now on.`
          : "Cleared your name - I'll use a simple time-of-day greeting."
      );
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  return { userPreferredName, userPreferredNameIsSet, persistUserPreferredName };
}
