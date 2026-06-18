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

import {
  clearConnectedCalendarTokens,
  getConnectedCalendarTokens,
  isConnectedCalendarTokenSettingKey,
  saveConnectedCalendarTokens
} from "./connectedCalendarSecrets";
import { mainLog } from "../log";
import { setSetting } from "./settingsRepository";

describe("connectedCalendarSecrets", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
    isEncryptionAvailable.mockReturnValue(true);
    vi.mocked(mainLog.warn).mockReset();
  });

  afterEach(() => {
    testDb.close();
  });

  it("saves and loads encrypted token set", async () => {
    await saveConnectedCalendarTokens("acc-1", {
      accessToken: "access-1",
      refreshToken: "refresh-1",
      tokenType: "Bearer"
    });

    const loaded = await getConnectedCalendarTokens("acc-1");
    expect(loaded?.accessToken).toBe("access-1");
    expect(loaded?.refreshToken).toBe("refresh-1");
  });

  it("clears stored tokens", async () => {
    await saveConnectedCalendarTokens("acc-1", { accessToken: "access-1" });
    clearConnectedCalendarTokens("acc-1");
    const loaded = await getConnectedCalendarTokens("acc-1");
    expect(loaded).toBeNull();
  });

  it("returns null for legacy plaintext token value", async () => {
    setSetting("connectedCalendar.acc-1.tokens", "{\"accessToken\":\"plain\"}");
    const loaded = await getConnectedCalendarTokens("acc-1");
    expect(loaded).toBeNull();
    expect(mainLog.warn).toHaveBeenCalled();
  });

  it("validates connected calendar token key pattern", () => {
    expect(isConnectedCalendarTokenSettingKey("connectedCalendar.123.tokens")).toBe(true);
    expect(isConnectedCalendarTokenSettingKey("connectedCalendar.123")).toBe(false);
  });
});
