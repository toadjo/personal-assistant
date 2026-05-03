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

import { getHaToken, saveHaToken } from "./secrets";
import { mainLog } from "../log";

describe("secrets service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
    isEncryptionAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    testDb?.close();
  });

  it("round-trips HA token when encryption is available", async () => {
    await saveHaToken("  secret  ");
    expect(await getHaToken()).toBe("secret");
  });

  it("falls back to plaintext and warns when encryption is unavailable", async () => {
    isEncryptionAvailable.mockReturnValue(false);
    await saveHaToken("plain");
    expect(await getHaToken()).toBe("plain");
    expect(mainLog.warn).toHaveBeenCalled();
  });
});
