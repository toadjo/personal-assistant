export type ConnectedCalendarOAuthSetupStatus = {
  googleConfigured: boolean;
  microsoftConfigured: boolean;
};

export const CONNECTED_CALENDAR_OAUTH_NOT_CONFIGURED_CODE = "connected_calendar_oauth_not_configured";

export function isConnectedCalendarOAuthSetupError(message: string): boolean {
  return (
    message.includes(CONNECTED_CALENDAR_OAUTH_NOT_CONFIGURED_CODE) ||
    /client id is not configured/i.test(message)
  );
}

export function connectedCalendarOAuthSetupMessage(status: ConnectedCalendarOAuthSetupStatus): string {
  if (status.googleConfigured || status.microsoftConfigured) {
    return "";
  }
  return "Calendar sign-in is not available in this build. Install the calendar-enabled build or contact the app maintainer.";
}

export function connectedCalendarOAuthProviderErrorMessage(
  status: ConnectedCalendarOAuthSetupStatus | null
): string {
  const banner = status ? connectedCalendarOAuthSetupMessage(status) : "";
  if (banner) return banner;
  return "Calendar sign-in is not available for this provider in this build.";
}
