import { describe, expect, it, vi, beforeEach } from "vitest";

const { statfsSyncMock, statSyncMock } = vi.hoisted(() => ({
  statfsSyncMock: vi.fn(),
  statSyncMock: vi.fn()
}));

vi.mock("node:fs", () => ({
  statfsSync: statfsSyncMock,
  statSync: statSyncMock
}));

vi.mock("electron", () => ({
  app: {
    getPath: () => "/fake/userData"
  }
}));

vi.mock("../db", () => ({
  getDb: () =>
    ({
      name: "/fake/db.sqlite"
    } as unknown as import("better-sqlite3").Database)
}));

import { checkBackupDiskSpace, getDiskSpaceStats } from "./diskSpace";

describe("diskSpace", () => {
  beforeEach(() => {
    statfsSyncMock.mockReset();
    statSyncMock.mockReset();
  });

  it("returns zero stats for an invalid path", () => {
    statfsSyncMock.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    const stats = getDiskSpaceStats("/nonexistent/path");
    expect(stats.freeBytes).toBe(0);
    expect(stats.totalBytes).toBe(0);
  });

  it("reports sufficient space when 2x headroom exists", () => {
    statfsSyncMock.mockReturnValue({ bavail: 1_000_000, blocks: 2_000_000, bsize: 1024 });
    statSyncMock.mockReturnValue({ size: 100 });

    const info = checkBackupDiskSpace("/fake");
    expect(info.sufficient).toBe(true);
    expect(info.freeBytes).toBe(1_000_000 * 1024);
    expect(info.totalBytes).toBe(2_000_000 * 1024);
  });

  it("reports insufficient space when headroom is below 2x", () => {
    statfsSyncMock.mockReturnValue({ bavail: 0, blocks: 2_000_000, bsize: 1024 });
    statSyncMock.mockReturnValue({ size: 100 });

    const info = checkBackupDiskSpace("/fake");
    expect(info.sufficient).toBe(false);
  });
});
