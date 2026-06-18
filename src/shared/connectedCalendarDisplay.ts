export type CalendarDisplaySource = "google" | "microsoft" | "teams";

export function isTeamsMeetingUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("teams.microsoft.com") || host.includes("teams.live.com");
  } catch {
    return false;
  }
}

export function classifyMicrosoftCalendarDisplaySource(fields: {
  isOnlineMeeting?: boolean | number | null;
  onlineMeetingProvider?: string | null;
  onlineMeetingUrl?: string | null;
}): "teams" | "microsoft" {
  if (fields.onlineMeetingProvider === "teamsForBusiness") {
    return "teams";
  }
  const isOnline = Boolean(fields.isOnlineMeeting);
  if (isOnline && isTeamsMeetingUrl(fields.onlineMeetingUrl)) {
    return "teams";
  }
  return "microsoft";
}
