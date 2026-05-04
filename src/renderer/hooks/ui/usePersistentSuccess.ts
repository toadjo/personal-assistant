/**
 * Hook for managing persistent success feedback (v1.2.7).
 * Success messages that stay visible longer than transient status updates.
 */

import { useState, useCallback } from "react";

export interface SuccessMessage {
  id: string;
  message: string;
  timestamp: number;
}

export function usePersistentSuccess() {
  const [successes, setSuccesses] = useState<SuccessMessage[]>([]);

  const showSuccess = useCallback((message: string): void => {
    const id = Date.now().toString();
    setSuccesses((prev) => [...prev, { id, message, timestamp: Date.now() }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setSuccesses((prev) => prev.filter((s) => s.id !== id));
    }, 5000);
  }, []);

  const dismissSuccess = useCallback((id: string): void => {
    setSuccesses((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const dismissAll = useCallback((): void => {
    setSuccesses([]);
  }, []);

  return {
    successes,
    showSuccess,
    dismissSuccess,
    dismissAll,
  };
}
