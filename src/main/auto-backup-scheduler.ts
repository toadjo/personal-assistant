import { getAutoBackupStatus, runAutoBackup } from "./services/autoBackup";
import { mainLog } from "./log";

/**
 * Interval between auto-backup checks. The scheduler runs every hour and
 * only triggers a backup if the last successful backup was more than 24
 * hours ago. This makes it resilient to the app being closed overnight
 * while still producing roughly one daily backup.
 */
export const AUTO_BACKUP_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Determine whether a backup should run now, based on the last success time.
 * Returns true if no backup has ever succeeded, or if the last success was
 * more than 24 hours ago.
 */
export function shouldRunBackupNow(lastSuccessAt: string | null, now: Date = new Date()): boolean {
  if (!lastSuccessAt) return true;
  const last = new Date(lastSuccessAt).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= ONE_DAY_MS;
}

/**
 * Start the auto-backup scheduler. Checks every hour whether a backup is
 * due (last success > 24h ago) and runs one if needed. The scheduler is
 * self-correcting: if the app was closed for days, it will back up on the
 * first check after startup.
 *
 * @returns a stop function that clears the timer.
 */
export function startAutoBackupScheduler(): () => void {
  mainLog.info("[scheduler:autoBackup] started");
  let timer: NodeJS.Timeout | null = null;
  let isStopped = false;
  let isRunning = false;

  const checkAndRun = () => {
    if (isStopped || isRunning) return;
    const status = getAutoBackupStatus();
    if (!status.enabled) return;

    if (!shouldRunBackupNow(status.lastSuccessAt)) return;

    isRunning = true;
    try {
      const result = runAutoBackup();
      if (result.success) {
        mainLog.info(`[scheduler:autoBackup] backup completed: ${result.filePath}`);
      } else if (result.error) {
        mainLog.warn(`[scheduler:autoBackup] backup skipped: ${result.error}`);
      }
    } catch (error) {
      mainLog.error(`[scheduler:autoBackup] unexpected error: ${toErrorMessage(error)}`);
    } finally {
      isRunning = false;
    }
  };

  const scheduleNext = () => {
    if (isStopped) return;
    timer = setTimeout(() => {
      checkAndRun();
      scheduleNext();
    }, AUTO_BACKUP_CHECK_INTERVAL_MS);
    timer.unref();
  };

  // Run an initial check shortly after startup (after a short delay to let
  // the app settle — DB, window, etc.).
  const initialTimer = setTimeout(() => {
    checkAndRun();
  }, 30_000);
  initialTimer.unref();

  scheduleNext();

  return () => {
    isStopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    clearTimeout(initialTimer);
    mainLog.info("[scheduler:autoBackup] stopped");
  };
}
