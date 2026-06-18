export type HomeAssistantUi = {
  haReady: boolean;
  hasHaUrl: boolean;
  canSaveHa: boolean;
  haStatusText: string;
};

export function homeAssistantUi(haUrl: string, haToken: string, hasHaToken: boolean): HomeAssistantUi {
  const hasHaUrl = Boolean(haUrl.trim());
  const haReady = Boolean(hasHaUrl && (hasHaToken || haToken.trim()));
  const canSaveHa = hasHaUrl && (hasHaToken || Boolean(haToken.trim()));
  const haStatusText = !hasHaUrl
    ? "URL missing. Add URL and token, then Save."
    : !hasHaToken && !haToken.trim()
      ? "Token missing. Add token, then Save."
      : haReady
        ? "Ready. Test connection and refresh entities."
        : "Configuration incomplete. Review URL/token and Save.";
  return { haReady, hasHaUrl, canSaveHa, haStatusText };
}
