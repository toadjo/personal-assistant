export function getGoogleOAuthClientId(): string {
  return process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() ?? "";
}

export function getMicrosoftOAuthClientId(): string {
  return process.env.MICROSOFT_CALENDAR_CLIENT_ID?.trim() ?? "";
}

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
export const MICROSOFT_CALENDAR_SCOPE = "Calendars.ReadBasic offline_access openid profile email";
