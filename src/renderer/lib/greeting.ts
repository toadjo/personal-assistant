/** Time-of-day greeting for the desk header (local clock). */
export function timeOfDayGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function deskWelcomeLine(preferredName: string | undefined, isSet: boolean, date?: Date): string {
  const t = timeOfDayGreeting(date);
  if (isSet && preferredName?.trim()) {
    return `${t}, ${preferredName.trim()}.`;
  }
  return `${t}.`;
}
