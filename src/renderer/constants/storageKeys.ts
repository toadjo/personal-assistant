export const STORAGE_THEME = "assistant-theme";
export const STORAGE_DISPLAY = "assistant-display";
export const STORAGE_COMMAND_HISTORY = "assistant-command-history";
export const STORAGE_ONBOARDED = "assistant-onboarded";
/** User dismissed the intro panel without finishing; do not show again until cleared. */
export const STORAGE_ONBOARDING_DEFERRED = "assistant-onboarding-deferred";
/** Tracks progress through the guided first-run flow. JSON string with completed steps. */
export const STORAGE_ONBOARDING_PROGRESS = "assistant-onboarding-progress";
/** Tracks the last app version for which release notes were shown. */
export const STORAGE_LAST_SEEN_RELEASE_VERSION = "assistant-last-seen-release-version";
/** Tracks recently opened items for search ranking. JSON string of item IDs with timestamps. */
export const STORAGE_RECENT_ITEMS = "assistant-recent-items";
/** Tracks saved searches for quick access. JSON string of saved search queries. */
export const STORAGE_SAVED_SEARCHES = "assistant-saved-searches";
