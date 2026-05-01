import { MAX_COMMAND_HISTORY } from "../../constants/command";
import { STORAGE_COMMAND_HISTORY } from "../../constants/storageKeys";

export function loadCommandHistory(): string[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_COMMAND_HISTORY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_COMMAND_HISTORY);
  } catch {
    return [];
  }
}

export function persistCommandHistory(items: string[]): void {
  window.localStorage.setItem(STORAGE_COMMAND_HISTORY, JSON.stringify(items.slice(0, MAX_COMMAND_HISTORY)));
}
