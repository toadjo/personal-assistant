import { useEffect, useState } from "react";
import { getErrorMessage } from "../../lib/errors";
import { logRendererWarning } from "../../lib/log";

type SetStatus = (value: string) => void;
type SetError = (value: string) => void;

export function useUserProfileSettings(setError: SetError, setStatus: SetStatus) {
  const [userPreferredName, setUserPreferredName] = useState("");
  const [userPreferredNameIsSet, setUserPreferredNameIsSet] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const s = await window.assistantApi.getAssistantSettings();
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
      const s = await window.assistantApi.setUserPreferredName(raw);
      setUserPreferredName(s.userPreferredName);
      setUserPreferredNameIsSet(s.userPreferredNameIsSet);
      setStatus(
        s.userPreferredNameIsSet
          ? `I'll greet you as “${s.userPreferredName}” from now on.`
          : "Cleared your name—I'll use a simple time-of-day greeting."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return { userPreferredName, userPreferredNameIsSet, persistUserPreferredName };
}
