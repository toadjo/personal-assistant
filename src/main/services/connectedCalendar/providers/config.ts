export {
  getGoogleCalendarClientId,
  getMicrosoftCalendarClientId
} from "../oauthClientConfig";

export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/userinfo.email";
export const MICROSOFT_CALENDAR_SCOPE = "Calendars.ReadBasic offline_access openid profile email";
