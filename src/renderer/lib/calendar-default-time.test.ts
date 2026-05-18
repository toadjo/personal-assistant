/**
 * Tests for getDefaultTimeForDate helper.
 */

import { describe, expect, it } from "vitest";
import { getDefaultTimeForDate } from "./calendar-default-time";

describe("getDefaultTimeForDate", () => {
  const fixedNow = new Date(2024, 0, 1, 10, 30, 0); // January 1, 2024 10:30:00

  it("future dates default to 09:00", () => {
    const tomorrow = new Date(2024, 0, 2);
    
    const result = getDefaultTimeForDate(tomorrow, fixedNow);
    
    expect(result).toBe("09:00");
  });

  it("today defaults to the next hour, at least one minute in the future", () => {
    const today = new Date(2024, 0, 1);
    
    const result = getDefaultTimeForDate(today, fixedNow);
    
    // Next hour from 10:30 is 11:00
    expect(result).toBe("11:00");
  });

  it("handles dates in the past (should default to 09:00)", () => {
    const yesterday = new Date(2023, 11, 31);
    
    const result = getDefaultTimeForDate(yesterday, fixedNow);
    
    expect(result).toBe("09:00");
  });

  it("without now argument uses current time", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    
    const result = getDefaultTimeForDate(futureDate);
    
    expect(result).toBe("09:00");
  });
});
