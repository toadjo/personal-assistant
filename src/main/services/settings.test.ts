import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;

vi.mock("../db", () => ({
  getDb: () => testDb
}));

import { getAssistantSettings, saveAssistantName, saveUserPreferredName } from "./settings";

describe("settings service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb?.close();
  });

  it("saveAssistantName persists and getAssistantSettings reflects it", () => {
    const s = saveAssistantName("  Ada  ");
    expect(s.name).toBe("Ada");
    expect(s.isConfigured).toBe(true);
    expect(getAssistantSettings().name).toBe("Ada");
  });

  it("saveUserPreferredName clears when empty after trim", () => {
    saveAssistantName("Assistant");
    saveUserPreferredName("  Sam  ");
    expect(getAssistantSettings().userPreferredName).toBe("Sam");
    saveUserPreferredName("   ");
    expect(getAssistantSettings().userPreferredName).toBe("");
    expect(getAssistantSettings().userPreferredNameIsSet).toBe(false);
  });

  it("saveAssistantName rejects empty name", () => {
    expect(() => saveAssistantName("   ")).toThrow(/required/i);
  });
});
