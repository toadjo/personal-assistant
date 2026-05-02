import { runAutomationCycle } from "./services/automation";
import { mainLog } from "./log";

export const AUTOMATION_CYCLE_INTERVAL_MS = 60_000;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function startAutomationScheduler(): () => void {
  let automationTimer: NodeJS.Timeout | null = null;
  let isStopped = false;
  let isRunningCycle = false;

  const scheduleNext = () => {
    if (isStopped) return;
    automationTimer = setTimeout(() => {
      if (isRunningCycle) {
        scheduleNext();
        return;
      }
      isRunningCycle = true;
      void runAutomationCycle()
        .catch((error) => {
          mainLog.error(`Automation cycle failed: ${toErrorMessage(error)}`);
        })
        .finally(() => {
          isRunningCycle = false;
          scheduleNext();
        });
    }, AUTOMATION_CYCLE_INTERVAL_MS);
    automationTimer.unref();
  };
  scheduleNext();

  return () => {
    isStopped = true;
    if (automationTimer) {
      clearTimeout(automationTimer);
      automationTimer = null;
    }
  };
}
