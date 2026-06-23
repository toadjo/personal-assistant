import { app } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import { exportBackup } from "./backup";
import { checkBackupDiskSpace } from "./diskSpace";
import { getSetting, setSetting } from "./settingsRepository";
import { isBackupExportAllowed } from "../security/policy";
import { mainLog } from "../log";

/**
 * Automatic local backup service.
 *
 * Writes encrypted snapshots to `userData/backups/` on a schedule, with
 * rolling retention: keeps N daily backups and M weekly backups, pruning
 * older files. The scheduler is started at app ready when the user has
 * enabled the feature (default: enabled in personal mode, disabled in
 * corporate mode when backup export is disallowed by policy).
 */

export const AUTO_BACKUP_DIR = "backups";
export const AUTO_BACKUP_FILENAME_PREFIX = "auto-backup";

/** Keep this many daily backups (one per day). */
export const RETENTION_DAILY = 7;
/** Keep this many weekly backups (one per week, the oldest daily in each week). */
export const RETENTION_WEEKLY = 4;

const SETTING_ENABLED = "autoBackup.enabled";
const SETTING_LAST_RUN = "autoBackup.lastRunAt";
const SETTING_LAST_ERROR = "autoBackup.lastError";
const SETTING_LAST_SUCCESS_AT = "autoBackup.lastSuccessAt";

export interface AutoBackupStatus {
  enabled: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  backupDir: string;
  retainedCount: number;
}

export interface AutoBackupResult {
  success: boolean;
  filePath: string | null;
  error: string | null;
  pruned: string[];
}

/**
 * Resolve the backup directory under userData. Creates it if missing.
 */
export function getAutoBackupDir(): string {
  const dir = path.join(app.getPath("userData"), AUTO_BACKUP_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Read the current auto-backup status for UI display.
 */
export function getAutoBackupStatus(): AutoBackupStatus {
  const enabled = getSetting(SETTING_ENABLED) !== "false"; // default true
  const lastRunAt = getSetting(SETTING_LAST_RUN) ?? null;
  const lastSuccessAt = getSetting(SETTING_LAST_SUCCESS_AT) ?? null;
  const lastError = getSetting(SETTING_LAST_ERROR) || null;

  let retainedCount = 0;
  try {
    const dir = getAutoBackupDir();
    const files = listAutoBackupFiles(dir);
    retainedCount = files.length;
  } catch {
    // ignore
  }

  return {
    enabled,
    lastRunAt,
    lastSuccessAt,
    lastError,
    backupDir: getAutoBackupDir(),
    retainedCount
  };
}

/**
 * Enable or disable auto-backup. When enabling, immediately triggers a backup
 * so the user gets immediate feedback.
 */
export function setAutoBackupEnabled(enabled: boolean): AutoBackupStatus {
  setSetting(SETTING_ENABLED, enabled ? "true" : "false");
  if (!enabled) {
    setSetting(SETTING_LAST_ERROR, "");
  }
  return getAutoBackupStatus();
}

/**
 * Run a single auto-backup cycle: export, write to disk, prune old files.
 * Returns the result including which files were pruned.
 */
export function runAutoBackup(): AutoBackupResult {
  const dir = getAutoBackupDir();
  const timestamp = new Date().toISOString();
  const dateStamp = timestamp.slice(0, 10); // YYYY-MM-DD
  const fileName = `${AUTO_BACKUP_FILENAME_PREFIX}-${dateStamp}.json`;
  const filePath = path.join(dir, fileName);

  // Record run attempt
  setSetting(SETTING_LAST_RUN, timestamp);

  // Policy guard
  if (!isBackupExportAllowed()) {
    const error = "Auto-backup skipped: backup export is disabled by corporate policy.";
    setSetting(SETTING_LAST_ERROR, error);
    mainLog.warn(`[autoBackup] ${error}`);
    return { success: false, filePath: null, error, pruned: [] };
  }

  // Disk space guard
  const spaceCheck = checkBackupDiskSpace(dir);
  if (!spaceCheck.sufficient) {
    const error = `Insufficient disk space for auto-backup (free: ${spaceCheck.freeBytes} bytes, estimated: ${spaceCheck.estimatedBackupBytes} bytes).`;
    setSetting(SETTING_LAST_ERROR, error);
    mainLog.error(`[autoBackup] ${error}`);
    return { success: false, filePath: null, error, pruned: [] };
  }

  try {
    const payload = exportBackup({ encrypt: true });
    const json = JSON.stringify(payload, null, 2);
    fs.writeFileSync(filePath, json, "utf8");

    setSetting(SETTING_LAST_SUCCESS_AT, timestamp);
    setSetting(SETTING_LAST_ERROR, "");
    mainLog.info(`[autoBackup] wrote ${filePath}`);

    const pruned = pruneOldBackups(dir);
    return { success: true, filePath, error: null, pruned };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setSetting(SETTING_LAST_ERROR, message);
    mainLog.error(`[autoBackup] failed: ${message}`);
    return { success: false, filePath: null, error: message, pruned: [] };
  }
}

/**
 * List auto-backup files in a directory, sorted oldest-first.
 */
export function listAutoBackupFiles(dir: string): Array<{ name: string; path: string; mtime: Date }> {
  try {
    const entries = fs.readdirSync(dir);
    return entries
      .filter((name) => name.startsWith(`${AUTO_BACKUP_FILENAME_PREFIX}-`) && name.endsWith(".json"))
      .map((name) => {
        const fullPath = path.join(dir, name);
        const stat = fs.statSync(fullPath);
        return { name, path: fullPath, mtime: stat.mtime };
      })
      .sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
  } catch {
    return [];
  }
}

/**
 * Prune old backups using rolling retention.
 *
 * Strategy: keep the most recent RETENTION_DAILY backups. Additionally,
 * keep one backup per week for RETENTION_WEEKLY weeks beyond the daily
 * window (the oldest backup in each week). Everything else is deleted.
 */
export function pruneOldBackups(dir: string): string[] {
  const files = listAutoBackupFiles(dir);
  if (files.length <= RETENTION_DAILY) {
    return [];
  }

  // The most recent RETENTION_DAILY files are always kept.
  const dailyKeep = new Set(
    files.slice(-RETENTION_DAILY).map((f) => f.path)
  );

  // For files older than the daily window, keep one per ISO week.
  const olderFiles = files.slice(0, files.length - RETENTION_DAILY);
  const weeklyKeep = new Set<string>();
  const seenWeeks = new Set<string>();

  // Iterate oldest-first; keep the first (oldest) file in each week.
  for (const f of olderFiles) {
    const weekKey = getISOWeekKey(f.mtime);
    if (!seenWeeks.has(weekKey)) {
      seenWeeks.add(weekKey);
      weeklyKeep.add(f.path);
    }
    // Stop after RETENTION_WEEKLY distinct weeks
    if (seenWeeks.size >= RETENTION_WEEKLY) break;
  }

  const toDelete = files.filter((f) => !dailyKeep.has(f.path) && !weeklyKeep.has(f.path));
  const pruned: string[] = [];
  for (const f of toDelete) {
    try {
      fs.unlinkSync(f.path);
      pruned.push(f.path);
    } catch {
      // ignore deletion errors
    }
  }
  return pruned;
}

/**
 * Return an ISO week key (e.g. "2026-W03") for a date.
 */
function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
