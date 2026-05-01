import { useCallback, useEffect, useState } from "react";
import { FEEDBACK_AUTO_CLEAR_MS } from "../../constants/timing";
import { getErrorMessage } from "../../lib/errors";

export function useWorkspaceMessages() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!status && !error) return;
    const id = setTimeout(() => {
      setStatus("");
      setError("");
    }, FEEDBACK_AUTO_CLEAR_MS);
    return () => clearTimeout(id);
  }, [status, error]);

  const reportError = useCallback((err: unknown) => {
    setError(getErrorMessage(err));
  }, []);

  return { status, setStatus, error, setError, reportError };
}
