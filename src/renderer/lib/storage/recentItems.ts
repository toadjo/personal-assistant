/**
 * Recent items tracking for search ranking.
 * Stores item IDs and timestamps in localStorage.
 */

import { STORAGE_RECENT_ITEMS } from "../../constants/storageKeys";

const MAX_RECENT_ITEMS = 50;
const RECENT_ITEM_TTL_DAYS = 30;

export type RecentItem = {
  id: string;
  timestamp: number;
};

export type RecentItemsStorage = {
  items: RecentItem[];
};

function getStorage(): RecentItemsStorage {
  try {
    const raw = localStorage.getItem(STORAGE_RECENT_ITEMS);
    if (!raw) return { items: [] };
    return JSON.parse(raw);
  } catch {
    return { items: [] };
  }
}

function setStorage(storage: RecentItemsStorage): void {
  try {
    localStorage.setItem(STORAGE_RECENT_ITEMS, JSON.stringify(storage));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

function cleanupOldItems(items: RecentItem[]): RecentItem[] {
  const cutoff = Date.now() - RECENT_ITEM_TTL_DAYS * 24 * 60 * 60 * 1000;
  return items.filter((item) => item.timestamp > cutoff);
}

export function addRecentItem(itemId: string): void {
  const storage = getStorage();
  const now = Date.now();
  
  // Remove existing entry if present (to update timestamp)
  const filtered = storage.items.filter((item) => item.id !== itemId);
  
  // Add new entry at the beginning
  filtered.unshift({ id: itemId, timestamp: now });
  
  // Cleanup old items and enforce max limit
  const cleaned = cleanupOldItems(filtered).slice(0, MAX_RECENT_ITEMS);
  
  setStorage({ items: cleaned });
}

export function getRecentItemIds(): Set<string> {
  const storage = getStorage();
  const cleaned = cleanupOldItems(storage.items);
  return new Set(cleaned.map((item) => item.id));
}

export function clearRecentItems(): void {
  try {
    localStorage.removeItem(STORAGE_RECENT_ITEMS);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function getRecentItems(): RecentItem[] {
  const storage = getStorage();
  return cleanupOldItems(storage.items);
}