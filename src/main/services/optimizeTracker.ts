import { getSetting, setSetting } from "./settingsRepository";

const WRITES_SINCE_OPTIMIZE_KEY = "db.writesSinceOptimize";
const DEFAULT_THRESHOLD = 500;

export interface OptimizeSuggestion {
  shouldOptimize: boolean;
  writesSinceOptimize: number;
  threshold: number;
}

/**
 * Record n writes to the database since last optimize.
 * Persists the counter in app_settings.
 */
export function recordWrites(n: number): void {
  const current = parseInt(getSetting(WRITES_SINCE_OPTIMIZE_KEY) ?? "0", 10);
  const updated = current + n;
  setSetting(WRITES_SINCE_OPTIMIZE_KEY, String(updated));
}

/**
 * Get the current optimize suggestion state.
 * Returns whether the user should be prompted to optimize,
 * along with the current write count and threshold.
 */
export function getOptimizeSuggestion(threshold: number = DEFAULT_THRESHOLD): OptimizeSuggestion {
  const writesSinceOptimize = parseInt(getSetting(WRITES_SINCE_OPTIMIZE_KEY) ?? "0", 10);
  return {
    shouldOptimize: writesSinceOptimize >= threshold,
    writesSinceOptimize,
    threshold,
  };
}

/**
 * Reset the write counter (typically after a successful optimize).
 */
export function resetWriteCounter(): void {
  setSetting(WRITES_SINCE_OPTIMIZE_KEY, "0");
}
