/**
 * Saved searches for quick access.
 * Stores search queries in localStorage.
 */

import { STORAGE_SAVED_SEARCHES } from "../../constants/storageKeys";

const MAX_SAVED_SEARCHES = 20;

export type SavedSearch = {
  query: string;
  timestamp: number;
};

export type SavedSearchesStorage = {
  searches: SavedSearch[];
};

function getStorage(): SavedSearchesStorage {
  try {
    const raw = localStorage.getItem(STORAGE_SAVED_SEARCHES);
    if (!raw) return { searches: [] };
    return JSON.parse(raw);
  } catch {
    return { searches: [] };
  }
}

function setStorage(storage: SavedSearchesStorage): void {
  try {
    localStorage.setItem(STORAGE_SAVED_SEARCHES, JSON.stringify(storage));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function addSavedSearch(query: string): void {
  if (!query.trim()) return;
  
  const storage = getStorage();
  const trimmedQuery = query.trim();
  
  // Remove existing entry if present (to update timestamp)
  const filtered = storage.searches.filter((s) => s.query !== trimmedQuery);
  
  // Add new entry at the beginning
  filtered.unshift({ query: trimmedQuery, timestamp: Date.now() });
  
  // Enforce max limit
  const limited = filtered.slice(0, MAX_SAVED_SEARCHES);
  
  setStorage({ searches: limited });
}

export function getSavedSearches(): SavedSearch[] {
  const storage = getStorage();
  return storage.searches;
}

export function removeSavedSearch(query: string): void {
  const storage = getStorage();
  const filtered = storage.searches.filter((s) => s.query !== query);
  setStorage({ searches: filtered });
}

export function clearSavedSearches(): void {
  try {
    localStorage.removeItem(STORAGE_SAVED_SEARCHES);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}