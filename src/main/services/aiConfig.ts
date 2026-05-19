import type { AiConfigStatus, AiProvider } from "../../shared/ai/types";
import { AI_PROVIDERS } from "../../shared/ai/types";
import { clearAiApiKey, hasStoredAiApiKey, saveAiApiKey } from "./aiSecrets";
import { deleteSetting, getSetting, setSetting } from "./settingsRepository";

const PROVIDER_SETTING = "ai.provider";
const LAST_TESTED_SETTING = "ai.lastTestedAt";

function readProvider(): AiProvider | null {
  const raw = getSetting(PROVIDER_SETTING);
  if (typeof raw !== "string") return null;
  return (AI_PROVIDERS as readonly string[]).includes(raw) ? (raw as AiProvider) : null;
}

/** Renderer-facing status. Never includes the raw API key. */
export async function getAiConfig(): Promise<AiConfigStatus> {
  const provider = readProvider();
  const configured = provider !== null && hasStoredAiApiKey();
  const lastTestedAt = getSetting(LAST_TESTED_SETTING) ?? null;
  return { provider, configured, lastTestedAt };
}

/**
 * Store provider + key together. The provider is only persisted after the key is saved so a
 * partial failure cannot leave us claiming `configured: true` without a key.
 *
 * Resets `lastTestedAt` because the previous test result no longer applies to the new key.
 */
export async function setAiKey(provider: AiProvider, apiKey: string): Promise<AiConfigStatus> {
  await saveAiApiKey(apiKey);
  setSetting(PROVIDER_SETTING, provider);
  deleteSetting(LAST_TESTED_SETTING);
  return getAiConfig();
}

export async function clearAiKey(): Promise<AiConfigStatus> {
  clearAiApiKey();
  deleteSetting(PROVIDER_SETTING);
  deleteSetting(LAST_TESTED_SETTING);
  return getAiConfig();
}
