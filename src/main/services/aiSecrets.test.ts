import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;

vi.mock("../db", () => ({
  getDb: () => testDb
}));

const isEncryptionAvailable = vi.fn(() => true);

vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: () => isEncryptionAvailable(),
    encryptString: (plain: string) => Buffer.from(plain, "utf8"),
    decryptString: (buf: Buffer) => buf.toString("utf8")
  }
}));

vi.mock("../log", () => ({
  mainLog: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

import { clearAiApiKey, getAiApiKey, hasStoredAiApiKey, saveAiApiKey } from "./aiSecrets";

describe("aiSecrets", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
    isEncryptionAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    testDb?.close();
  });

  it("round-trips AI API key when encryption is available", async () => {
    await saveAiApiKey("  sk-secret  ");
    expect(await getAiApiKey()).toBe("sk-secret");
    expect(hasStoredAiApiKey()).toBe(true);
  });

  it("throws when encryption is unavailable", async () => {
    isEncryptionAvailable.mockReturnValue(false);
    await expect(saveAiApiKey("plain-key")).rejects.toThrow(
      "Secure storage (OS encryption) is required to save API keys and tokens. Please ensure your system supports secure storage."
    );
  });

  it("rejects empty keys", async () => {
    await expect(saveAiApiKey("   ")).rejects.toThrow();
  });

  it("clearAiApiKey removes the stored value", async () => {
    await saveAiApiKey("sk-clear-me");
    clearAiApiKey();
    expect(await getAiApiKey()).toBeNull();
    expect(hasStoredAiApiKey()).toBe(false);
  });
});
