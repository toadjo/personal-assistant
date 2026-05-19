/**
 * Shared AI types crossing the main / renderer boundary.
 *
 * Renderer-facing status never carries the raw API key; the key lives in main process only.
 */
export const AI_PROVIDERS = ["openai", "anthropic"] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export type AiConfigStatus = {
  provider: AiProvider | null;
  configured: boolean;
  lastTestedAt: string | null;
};
