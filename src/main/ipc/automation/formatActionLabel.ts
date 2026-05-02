export function formatAutomationActionLabel(actionType: string | null, actionConfigRaw: string | null): string {
  let actionConfig: Record<string, string> = {};
  if (actionConfigRaw) {
    try {
      actionConfig = JSON.parse(actionConfigRaw) as Record<string, string>;
    } catch {
      // Keep API resilient if config parsing fails for legacy rows.
    }
  }
  if (actionType === "localReminder") {
    return `Create reminder${actionConfig.text ? `: ${actionConfig.text}` : ""}`;
  }
  if (actionType === "haToggle") {
    return `Toggle device${actionConfig.entityId ? `: ${actionConfig.entityId}` : ""}`;
  }
  return "Run automation action";
}
