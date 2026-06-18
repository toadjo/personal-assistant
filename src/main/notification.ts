import { Notification } from "electron";
import { mainLog } from "./log";

export type NotificationResult = "shown" | "unsupported" | "failed";

/**
 * Attempts to show a desktop notification with resilient error handling.
 *
 * Checks for notification support, catches creation and show failures,
 * logs stable messages, and returns a status indicating the outcome.
 *
 * Returns:
 * - "shown": Notification was created and shown successfully
 * - "unsupported": Desktop notifications are not supported on this platform
 * - "failed": Notification creation or show threw an error
 */
export function showNotificationSafe(
  options: { title: string; body: string },
  onClick?: () => void
): NotificationResult {
  if (!Notification.isSupported()) {
    mainLog.warn(`Desktop notifications not supported. Notification suppressed: "${options.title}"`);
    return "unsupported";
  }

  try {
    const notification = new Notification(options);
    if (onClick) {
      notification.on("click", onClick);
    }
    notification.show();
    return "shown";
  } catch (error) {
    mainLog.warn(
      `Failed to show desktop notification "${options.title}": ${error instanceof Error ? error.message : String(error)}`
    );
    return "failed";
  }
}
