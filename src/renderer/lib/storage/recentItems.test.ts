import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { addRecentItem, getRecentItemIds, clearRecentItems, getRecentItems } from "./recentItems";

describe("recentItems", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("adds a recent item", () => {
    addRecentItem("note:123");
    const ids = getRecentItemIds();
    expect(ids.has("note:123")).toBe(true);
  });

  it("updates timestamp for existing item", () => {
    addRecentItem("note:123");
    const firstTimestamp = getRecentItems()[0]?.timestamp;
    
    // Force a different timestamp by mocking Date.now
    const originalNow = Date.now;
    Date.now = () => (firstTimestamp || 0) + 1000;
    
    addRecentItem("note:123");
    const secondTimestamp = getRecentItems()[0]?.timestamp;
    expect(secondTimestamp).toBeGreaterThan(firstTimestamp || 0);
    
    Date.now = originalNow;
  });

  it("limits to max recent items", () => {
    for (let i = 0; i < 60; i++) {
      addRecentItem(`item:${i}`);
    }
    const items = getRecentItems();
    expect(items.length).toBeLessThanOrEqual(50);
  });

  it("removes old items beyond TTL", () => {
    const oldTimestamp = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days ago
    const storage = { items: [{ id: "old-item", timestamp: oldTimestamp }] };
    localStorage.setItem("assistant-recent-items", JSON.stringify(storage));
    
    const items = getRecentItems();
    expect(items.length).toBe(0);
  });

  it("clears all recent items", () => {
    addRecentItem("note:123");
    addRecentItem("task:456");
    clearRecentItems();
    const ids = getRecentItemIds();
    expect(ids.size).toBe(0);
  });

  it("handles localStorage errors gracefully", () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error("localStorage unavailable");
    };
    
    expect(() => addRecentItem("note:123")).not.toThrow();
    
    localStorage.setItem = originalSetItem;
  });
});