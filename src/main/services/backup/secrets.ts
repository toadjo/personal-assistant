import { isConnectedCalendarTokenSettingKey } from "../connectedCalendarSecrets";

/**
 * Secret setting keys that should never be included in backups.
 */
export const SECRET_SETTING_KEYS = ["ha.token", "ai.apiKey", "ai.provider", "ai.configured", "ai.lastTestedAt"] as const;

export function isSecretSettingKey(key: string): boolean {
  return (
    SECRET_SETTING_KEYS.includes(key as (typeof SECRET_SETTING_KEYS)[number]) || isConnectedCalendarTokenSettingKey(key)
  );
}
