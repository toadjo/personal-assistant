import * as fs from "node:fs";
import { dirname } from "node:path";
import { app } from "electron";
import { getDb } from "../db";

export interface DiskSpaceInfo {
  /** Available bytes on the file system containing the requested path. */
  freeBytes: number;
  /** Total bytes on the file system containing the requested path. */
  totalBytes: number;
  /** Uncompressed database size plus WAL file size as a proxy for the next backup. */
  estimatedBackupBytes: number;
  /** Whether estimated backup size fits comfortably within free space (>= 2x headroom). */
  sufficient: boolean;
}

export interface DiskSpaceStats {
  freeBytes: number;
  totalBytes: number;
}

/**
 * Return free/total disk space for the file system containing `path`.
 * Falls back to the userData directory when no path is provided.
 */
export function getDiskSpaceStats(path = app.getPath("userData")): DiskSpaceStats {
  try {
    const stats = fs.statfsSync(path);
    const bsize = BigInt(stats.bsize);
    return {
      freeBytes: Number(BigInt(stats.bavail) * bsize),
      totalBytes: Number(BigInt(stats.blocks) * bsize)
    };
  } catch {
    // Try the parent directory if the path itself doesn't exist yet.
    try {
      return getDiskSpaceStats(dirname(path));
    } catch {
      return { freeBytes: 0, totalBytes: 0 };
    }
  }
}

/**
 * Estimate the size of the next backup payload.
 * Uses the live database file size plus the WAL file as a safe proxy.
 */
export function estimateBackupBytes(): number {
  try {
    const db = getDb();
    const dbPath = (db as unknown as { name?: string }).name;
    if (!dbPath) return 0;

    const dbSize = fileSize(dbPath);
    const walSize = fileSize(`${dbPath}-wal`);
    return dbSize + walSize;
  } catch {
    return 0;
  }
}

function fileSize(path: string): number {
  try {
    return fs.statSync(path).size;
  } catch {
    return 0;
  }
}

/**
 * Return a disk-space check suitable for guarding backup writes.
 * Requires at least 2x the estimated backup size to be available
 * so the export and any temporary copies have room.
 */
export function checkBackupDiskSpace(path?: string): DiskSpaceInfo {
  const estimatedBackupBytes = estimateBackupBytes();
  const { freeBytes, totalBytes } = getDiskSpaceStats(path);
  const requiredBytes = estimatedBackupBytes * 2;
  return {
    freeBytes,
    totalBytes,
    estimatedBackupBytes,
    sufficient: freeBytes >= requiredBytes
  };
}
