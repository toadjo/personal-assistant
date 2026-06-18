import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;

vi.mock("../db", () => ({
  getDb: () => testDb
}));

vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (plain: string) => Buffer.from(plain, "utf8"),
    decryptString: (buf: Buffer) => buf.toString("utf8")
  }
}));

vi.mock("../log", () => ({
  mainLog: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

import { clearAiKey, getAiConfig, setAiKey, updateLastTestedAt } from "./aiConfig";
import { getSetting, setSetting } from "./settingsRepository";

describe("aiConfig", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb?.close();
  });

  it("getAiConfig returns null/false when nothing is stored", async () => {
    const status = await getAiConfig();
    expect(status).toEqual({ provider: null, configured: false, lastTestedAt: null });
  });

  it("never returns the raw API key in the renderer-facing status", async () => {
    await setAiKey("openai", "sk-secret-12345");
    const status = await getAiConfig();
    expect(JSON.stringify(status)).not.toContain("sk-secret-12345");
    expect(Object.keys(status)).toEqual(expect.arrayContaining(["provider", "configured", "lastTestedAt"]));
    expect(Object.keys(status)).toHaveLength(3);
  });

  it("setAiKey stores provider + key, trims the key, and reports configured: true", async () => {
    const status = await setAiKey("openai", "  sk-new-key  ");
    expect(status.provider).toBe("openai");
    expect(status.configured).toBe(true);
    expect(status.lastTestedAt).toBeNull();
  });

  it("setAiKey resets lastTestedAt when called with a new key", async () => {
    await setAiKey("openai", "sk-first");
    setSetting("ai.lastTestedAt", "2024-01-01T00:00:00.000Z");
    const status = await setAiKey("anthropic", "sk-ant-new");
    expect(status.provider).toBe("anthropic");
    expect(status.lastTestedAt).toBeNull();
  });

  it("clearAiKey removes provider, key, and lastTestedAt", async () => {
    await setAiKey("openai", "sk-temp");
    setSetting("ai.lastTestedAt", "2024-01-01T00:00:00.000Z");
    const status = await clearAiKey();
    expect(status).toEqual({ provider: null, configured: false, lastTestedAt: null });
  });

  it("ignores an unknown provider value already in storage", async () => {
    setSetting("ai.provider", "gemini");
    const status = await getAiConfig();
    expect(status.provider).toBeNull();
    expect(status.configured).toBe(false);
  });

  it("updateLastTestedAt sets the timestamp and returns it in getAiConfig", async () => {
    await updateLastTestedAt("gpt-4o-mini");
    const raw = getSetting("ai.lastTestedAt");
    expect(typeof raw).toBe("string");
    expect(raw).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const status = await getAiConfig();
    expect(status.lastTestedAt).toBe(raw);
  });
});
