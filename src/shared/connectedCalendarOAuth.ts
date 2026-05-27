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
  return (
    "Connected calendar sign-in is not available in this build. " +
    "For development, set GOOGLE_CALENDAR_CLIENT_ID and/or MICROSOFT_CALENDAR_CLIENT_ID before starting the app. " +
    "For release builds, bundle public OAuth client IDs at build time (see docs/CONNECTED_CALENDAR_OAUTH.md)."
  );
}

export function connectedCalendarOAuthProviderErrorMessage(
  status: ConnectedCalendarOAuthSetupStatus | null
): string {
  const banner = status ? connectedCalendarOAuthSetupMessage(status) : "";
  if (banner) return banner;
  return "Connected calendar sign-in is not configured for this provider in this build.";
}
