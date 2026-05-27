import { describe, expect, it } from "vitest";
import { classifyMicrosoftCalendarDisplaySource, isTeamsMeetingUrl } from "./connectedCalendarDisplay";

describe("connectedCalendarDisplay", () => {
  it("detects Teams meeting URLs", () => {
    expect(isTeamsMeetingUrl("https://teams.microsoft.com/l/meetup-join/abc")).toBe(true);
    expect(isTeamsMeetingUrl("https://outlook.office.com/calendar")).toBe(false);
  });

  it("classifies teamsForBusiness as teams display source", () => {
    expect(
      classifyMicrosoftCalendarDisplaySource({
        isOnlineMeeting: true,
        onlineMeetingProvider: "teamsForBusiness",
        onlineMeetingUrl: null
      })
    ).toBe("teams");
  });

  it("classifies online meeting with Teams join URL as teams", () => {
    expect(
      classifyMicrosoftCalendarDisplaySource({
        isOnlineMeeting: true,
        onlineMeetingProvider: null,
        onlineMeetingUrl: "https://teams.live.com/meet/123"
      })
    ).toBe("teams");
  });

  it("keeps normal Outlook events as microsoft display source", () => {
    expect(
      classifyMicrosoftCalendarDisplaySource({
        isOnlineMeeting: false,
        onlineMeetingProvider: null,
        onlineMeetingUrl: null
      })
    ).toBe("microsoft");
  });
});
