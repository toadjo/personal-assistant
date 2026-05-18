/**
 * Tests for getDefaultTimeForDate helper.
 */

import { describe, expect, it } from "vitest";
import { getDefaultTimeForDate } from "./calendar-default-time";

describe("getDefaultTimeForDate", () => {
  it("future dates default to 09:00", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const result = getDefaultTimeForDate(tomorrow);
    
    expect(result).toBe("09:00");
  });

  it("today defaults to the next hour, at least one minute in the future", () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const expectedTime = nextHour.toTimeString().slice(0, 5);
    
    const result = getDefaultTimeForDate(now);
    
    expect(result).toBe(expectedTime);
  });

  it("handles dates in the past (should default to 09:00)", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const result = getDefaultTimeForDate(yesterday);
    
    expect(result).toBe("09:00");
  });
});
