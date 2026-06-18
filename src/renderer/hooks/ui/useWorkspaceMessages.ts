import { useCallback, useEffect, useState } from "react";
import { FEEDBACK_AUTO_CLEAR_MS } from "../../constants/timing";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { usePersistentSuccess } from "./usePersistentSuccess";

export function useWorkspaceMessages() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const persistentSuccess = usePersistentSuccess();

  useEffect(() => {
    if (!status && !error) return;
    const id = setTimeout(() => {
      setStatus("");
      setError("");
    }, FEEDBACK_AUTO_CLEAR_MS);
    return () => clearTimeout(id);
  }, [status, error]);

  const reportError = useCallback(
    (err: unknown) => {
      setError(getAssistantInvokeErrorMessage(err));
    },
    [setError]
  );

  return { status, setStatus, error, setError, reportError, persistentSuccess };
}
