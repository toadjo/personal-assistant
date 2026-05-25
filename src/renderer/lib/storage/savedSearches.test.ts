import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { addSavedSearch, getSavedSearches, removeSavedSearch, clearSavedSearches } from "./savedSearches";

describe("savedSearches", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("adds a saved search", () => {
    addSavedSearch("overdue");
    const searches = getSavedSearches();
    expect(searches.some((s) => s.query === "overdue")).toBe(true);
  });

  it("does not add empty searches", () => {
    addSavedSearch("");
    addSavedSearch("   ");
    const searches = getSavedSearches();
    expect(searches.length).toBe(0);
  });

  it("updates timestamp for existing search", () => {
    addSavedSearch("overdue");
    const firstTimestamp = getSavedSearches()[0]?.timestamp;
    
    // Force a different timestamp by mocking Date.now
    const originalNow = Date.now;
    Date.now = () => (firstTimestamp || 0) + 1000;
    
    addSavedSearch("overdue");
    const secondTimestamp = getSavedSearches()[0]?.timestamp;
    expect(secondTimestamp).toBeGreaterThan(firstTimestamp || 0);
    
    Date.now = originalNow;
  });

  it("limits to max saved searches", () => {
    for (let i = 0; i < 25; i++) {
      addSavedSearch(`search ${i}`);
    }
    const searches = getSavedSearches();
    expect(searches.length).toBeLessThanOrEqual(20);
  });

  it("removes a specific saved search", () => {
    addSavedSearch("overdue");
    addSavedSearch("today");
    removeSavedSearch("overdue");
    const searches = getSavedSearches();
    expect(searches.some((s) => s.query === "overdue")).toBe(false);
    expect(searches.some((s) => s.query === "today")).toBe(true);
  });

  it("clears all saved searches", () => {
    addSavedSearch("overdue");
    addSavedSearch("today");
    clearSavedSearches();
    const searches = getSavedSearches();
    expect(searches.length).toBe(0);
  });

  it("handles localStorage errors gracefully", () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error("localStorage unavailable");
    };
    
    expect(() => addSavedSearch("overdue")).not.toThrow();
    
    localStorage.setItem = originalSetItem;
  });
});