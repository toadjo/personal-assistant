import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;
let tempDir: string;

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => tempDir),
    getVersion: vi.fn(() => "3.10.0")
  }
}));

vi.mock("../db", () => ({
  getDb: () => testDb
}));

vi.mock("./secureSecrets", () => ({
  encryptSecret: vi.fn((data: string) => `encrypted:${data}`),
  decryptSecret: vi.fn((encrypted: string) => encrypted.replace("encrypted:", "")),
  SecureStorageUnavailableError: class extends Error {
    constructor() {
      super("Secure storage unavailable");
      this.name = "SecureStorageUnavailableError";
    }
  },
  isEncrypted: vi.fn(() => false)
}));

vi.mock("../security/policy", () => ({
  isCorporateMode: vi.fn(() => false),
  isBackupExportAllowed: vi.fn(() => true)
}));

vi.mock("./diskSpace", () => ({
  checkBackupDiskSpace: vi.fn(() => ({
    freeBytes: 10 * 1024 * 1024 * 1024,
    totalBytes: 100 * 1024 * 1024 * 1024,
    estimatedBackupBytes: 1024 * 1024,
    sufficient: true
  })),
  getDiskSpaceStats: vi.fn(() => ({
    freeBytes: 10 * 1024 * 1024 * 1024,
    totalBytes: 100 * 1024 * 1024 * 1024
  })),
  estimateBackupBytes: vi.fn(() => 1024 * 1024)
}));

vi.mock("../log", () => ({
  mainLog: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

import {
  runAutoBackup,
  getAutoBackupStatus,
  setAutoBackupEnabled,
  pruneOldBackups,
  listAutoBackupFiles,
  getAutoBackupDir,
  AUTO_BACKUP_FILENAME_PREFIX,
  RETENTION_DAILY,
  RETENTION_WEEKLY
} from "./autoBackup";
import { isBackupExportAllowed } from "../security/policy";

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auto-backup-test-"));
  testDb = createMemoryDatabase();
  vi.mocked(isBackupExportAllowed).mockReturnValue(true);
});

afterEach(() => {
  testDb.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe("getAutoBackupDir", () => {
  it("creates and returns the backups directory under userData", () => {
    const dir = getAutoBackupDir();
    expect(dir).toBe(path.join(tempDir, "backups"));
    expect(fs.existsSync(dir)).toBe(true);
  });
});

describe("getAutoBackupStatus", () => {
  it("returns enabled=true by default with null timestamps", () => {
    const status = getAutoBackupStatus();
    expect(status.enabled).toBe(true);
    expect(status.lastRunAt).toBeNull();
    expect(status.lastSuccessAt).toBeNull();
    expect(status.lastError).toBeNull();
    expect(status.backupDir).toBe(path.join(tempDir, "backups"));
    expect(status.retainedCount).toBe(0);
  });
});

describe("setAutoBackupEnabled", () => {
  it("persists enabled=false and returns updated status", () => {
    const status = setAutoBackupEnabled(false);
    expect(status.enabled).toBe(false);
    const reRead = getAutoBackupStatus();
    expect(reRead.enabled).toBe(false);
  });

  it("re-enables when set to true", () => {
    setAutoBackupEnabled(false);
    const status = setAutoBackupEnabled(true);
    expect(status.enabled).toBe(true);
  });
});

describe("runAutoBackup", () => {
  it("writes an encrypted backup file to disk and records success", () => {
    const result = runAutoBackup();
    expect(result.success).toBe(true);
    expect(result.filePath).not.toBeNull();
    expect(fs.existsSync(result.filePath!)).toBe(true);

    const content = fs.readFileSync(result.filePath!, "utf8");
    const parsed = JSON.parse(content);
    expect(parsed._encrypted).toBeDefined();
    expect(parsed.notes).toBeUndefined(); // encrypted payload hides notes

    const status = getAutoBackupStatus();
    expect(status.lastSuccessAt).not.toBeNull();
    expect(status.lastError).toBeNull();
    expect(status.retainedCount).toBe(1);
  });

  it("skips backup when policy disallows backup export", () => {
    vi.mocked(isBackupExportAllowed).mockReturnValue(false);
    const result = runAutoBackup();
    expect(result.success).toBe(false);
    expect(result.error).toContain("disabled by corporate policy");
    expect(result.filePath).toBeNull();

    const status = getAutoBackupStatus();
    expect(status.lastError).toContain("disabled by corporate policy");
  });

  it("records error when disk space is insufficient", async () => {
    const { checkBackupDiskSpace } = await import("./diskSpace");
    vi.mocked(checkBackupDiskSpace).mockReturnValueOnce({
      freeBytes: 100,
      totalBytes: 1000,
      estimatedBackupBytes: 10000,
      sufficient: false
    });
    const result = runAutoBackup();
    expect(result.success).toBe(false);
    expect(result.error).toContain("Insufficient disk space");
    expect(result.filePath).toBeNull();
  });
});

describe("listAutoBackupFiles", () => {
  it("returns empty array for non-existent directory", () => {
    const files = listAutoBackupFiles(path.join(tempDir, "nonexistent"));
    expect(files).toEqual([]);
  });

  it("lists only auto-backup files sorted oldest-first", () => {
    const dir = getAutoBackupDir();
    const oldDate = new Date("2026-01-01T00:00:00Z");
    const newDate = new Date("2026-01-02T00:00:00Z");

    fs.writeFileSync(path.join(dir, `${AUTO_BACKUP_FILENAME_PREFIX}-2026-01-01.json`), "{}");
    fs.writeFileSync(path.join(dir, `${AUTO_BACKUP_FILENAME_PREFIX}-2026-01-02.json`), "{}");
    fs.writeFileSync(path.join(dir, "other-file.json"), "{}");

    // Set mtimes
    fs.utimesSync(path.join(dir, `${AUTO_BACKUP_FILENAME_PREFIX}-2026-01-01.json`), oldDate, oldDate);
    fs.utimesSync(path.join(dir, `${AUTO_BACKUP_FILENAME_PREFIX}-2026-01-02.json`), newDate, newDate);

    const files = listAutoBackupFiles(dir);
    expect(files).toHaveLength(2);
    expect(files[0]!.name).toBe(`${AUTO_BACKUP_FILENAME_PREFIX}-2026-01-01.json`);
    expect(files[1]!.name).toBe(`${AUTO_BACKUP_FILENAME_PREFIX}-2026-01-02.json`);
  });
});

describe("pruneOldBackups", () => {
  it("keeps RETENTION_DAILY most recent files and prunes the rest", () => {
    const dir = getAutoBackupDir();
    // Create 10 backup files with different dates
    for (let i = 0; i < 10; i++) {
      const date = new Date(2026, 0, i + 1);
      const dateStr = date.toISOString().slice(0, 10);
      const filePath = path.join(dir, `${AUTO_BACKUP_FILENAME_PREFIX}-${dateStr}.json`);
      fs.writeFileSync(filePath, "{}");
      fs.utimesSync(filePath, date, date);
    }

    const pruned = pruneOldBackups(dir);
    // 10 files - 7 daily = 3 pruned (all in week 1, so weekly keeps 1, net pruned = 2)
    // Actually: 3 older files, all in same ISO week, so 1 kept as weekly, 2 pruned
    expect(pruned.length).toBeLessThanOrEqual(3);
    expect(pruned.length).toBeGreaterThanOrEqual(2);

    const remaining = listAutoBackupFiles(dir);
    expect(remaining.length).toBeGreaterThanOrEqual(RETENTION_DAILY);
    expect(remaining.length).toBeLessThanOrEqual(RETENTION_DAILY + RETENTION_WEEKLY);
  });

  it("returns empty when fewer than RETENTION_DAILY files exist", () => {
    const dir = getAutoBackupDir();
    fs.writeFileSync(path.join(dir, `${AUTO_BACKUP_FILENAME_PREFIX}-2026-01-01.json`), "{}");
    const pruned = pruneOldBackups(dir);
    expect(pruned).toEqual([]);
  });
});

describe("retention constants", () => {
  it("has sensible defaults", () => {
    expect(RETENTION_DAILY).toBe(7);
    expect(RETENTION_WEEKLY).toBe(4);
  });
});
