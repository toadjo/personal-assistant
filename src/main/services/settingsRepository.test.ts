import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;

vi.mock("../db", () => ({
  getDb: () => testDb
}));

import { deleteSetting, getSetting, setSetting } from "./settingsRepository";

describe("settingsRepository", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb?.close();
  });

  it("setSetting upserts and getSetting reads", () => {
    setSetting("k1", "v1", "2020-01-01T00:00:00.000Z");
    expect(getSetting("k1")).toBe("v1");
    setSetting("k1", "v2");
    expect(getSetting("k1")).toBe("v2");
  });

  it("deleteSetting removes a row", () => {
    setSetting("k2", "x");
    deleteSetting("k2");
    expect(getSetting("k2")).toBeUndefined();
  });
});
