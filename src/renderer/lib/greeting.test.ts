import { describe, expect, it } from "vitest";
import { deskWelcomeLine, timeOfDayGreeting } from "./greeting";

describe("timeOfDayGreeting", () => {
  it("returns morning before noon", () => {
    expect(timeOfDayGreeting(new Date(2026, 0, 2, 9, 0, 0))).toBe("Good morning");
  });

  it("returns afternoon before 17:00", () => {
    expect(timeOfDayGreeting(new Date(2026, 0, 2, 14, 0, 0))).toBe("Good afternoon");
  });

  it("returns evening from 17:00", () => {
    expect(timeOfDayGreeting(new Date(2026, 0, 2, 19, 0, 0))).toBe("Good evening");
  });
});

describe("deskWelcomeLine", () => {
  it("includes name when set", () => {
    expect(deskWelcomeLine("Alex", true, new Date(2026, 0, 2, 9, 0, 0))).toBe("Good morning, Alex.");
  });

  it("omits name when not set", () => {
    expect(deskWelcomeLine("", false, new Date(2026, 0, 2, 9, 0, 0))).toBe("Good morning.");
  });
});
