/**
 * Helper to compute default time for calendar quick create.
 * - Future dates default to 09:00
 * - Today defaults to the next hour, at least one minute in the future
 */

export function getDefaultTimeForDate(date: Date): string {
  const now = new Date();
  const isToday = 
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    // Next hour, at least one minute in the future
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    return nextHour.toTimeString().slice(0, 5); // HH:MM
  } else {
    // Future dates default to 09:00
    return "09:00";
  }
}
