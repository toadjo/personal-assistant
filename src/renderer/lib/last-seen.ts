const LAST_SEEN_KEY = "assistant-desk-last-seen-at";

export function getLastSeenAt(): string | null {
  try {
    const value = localStorage.getItem(LAST_SEEN_KEY);
    return value;
  } catch {
    return null;
  }
}

export function setLastSeenAt(timestamp: string): void {
  try {
    localStorage.setItem(LAST_SEEN_KEY, timestamp);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function clearLastSeenAt(): void {
  try {
    localStorage.removeItem(LAST_SEEN_KEY);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
