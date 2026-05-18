import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  setAutomationFocusIntent,
  getAutomationFocusIntent,
  clearAutomationFocusIntent
} from "./automation-focus-intent";

describe("automation focus intent", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves a focus intent", () => {
    setAutomationFocusIntent("rule-123");
    const ruleId = getAutomationFocusIntent();
    expect(ruleId).toBe("rule-123");
  });

  it("returns null when no intent is stored", () => {
    const ruleId = getAutomationFocusIntent();
    expect(ruleId).toBeNull();
  });

  it("clears a stored intent", () => {
    setAutomationFocusIntent("rule-123");
    clearAutomationFocusIntent();
    const ruleId = getAutomationFocusIntent();
    expect(ruleId).toBeNull();
  });

  it("ignores intents older than 30 seconds", () => {
    const oldIntent = {
      ruleId: "rule-123",
      createdAt: Date.now() - 31000 // 31 seconds ago
    };
    localStorage.setItem("assistant-automation-focus-intent", JSON.stringify(oldIntent));
    
    const ruleId = getAutomationFocusIntent();
    expect(ruleId).toBeNull();
  });

  it("returns intent for recent intents within 30 seconds", () => {
    const recentIntent = {
      ruleId: "rule-123",
      createdAt: Date.now() - 29000 // 29 seconds ago
    };
    localStorage.setItem("assistant-automation-focus-intent", JSON.stringify(recentIntent));
    
    const ruleId = getAutomationFocusIntent();
    expect(ruleId).toBe("rule-123");
  });

  it("overwrites existing intent when setting new one", () => {
    setAutomationFocusIntent("rule-123");
    setAutomationFocusIntent("rule-456");
    const ruleId = getAutomationFocusIntent();
    expect(ruleId).toBe("rule-456");
  });

  it("handles localStorage errors gracefully when setting", () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn(() => {
      throw new Error("localStorage unavailable");
    });
    
    expect(() => setAutomationFocusIntent("rule-123")).not.toThrow();
    
    localStorage.setItem = originalSetItem;
  });

  it("handles localStorage errors gracefully when getting", () => {
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = vi.fn(() => {
      throw new Error("localStorage unavailable");
    });
    
    expect(() => getAutomationFocusIntent()).not.toThrow();
    expect(getAutomationFocusIntent()).toBeNull();
    
    localStorage.getItem = originalGetItem;
  });

  it("handles localStorage errors gracefully when clearing", () => {
    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = vi.fn(() => {
      throw new Error("localStorage unavailable");
    });
    
    expect(() => clearAutomationFocusIntent()).not.toThrow();
    
    localStorage.removeItem = originalRemoveItem;
  });
});
