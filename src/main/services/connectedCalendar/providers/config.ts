export {
  getGoogleCalendarClientId,
  getGoogleOAuthClientId,
  getMicrosoftCalendarClientId,
  getMicrosoftOAuthClientId
} from "../oauthClientConfig";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
export const MICROSOFT_CALENDAR_SCOPE = "Calendars.ReadBasic offline_access openid profile email";
