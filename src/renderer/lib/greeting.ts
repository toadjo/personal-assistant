import { greetingCatalog, resolveGreetingLocale, type GreetingLocale } from "./greeting/locales";

/** Time-of-day greeting for the desk header (local clock). */
export function timeOfDayGreeting(date: Date = new Date(), locale: GreetingLocale = "en"): string {
  const cat = greetingCatalog(locale);
  const h = date.getHours();
  if (h < 12) return cat.morning;
  if (h < 17) return cat.afternoon;
  return cat.evening;
}

export function deskWelcomeLine(
  preferredName: string | undefined,
  isSet: boolean,
  date?: Date,
  locale: GreetingLocale = resolveGreetingLocale(typeof navigator !== "undefined" ? navigator.languages : ["en"])
): string {
  const t = timeOfDayGreeting(date ?? new Date(), locale);
  if (isSet && preferredName?.trim()) {
    return `${t}, ${preferredName.trim()}.`;
  }
  return `${t}.`;
}
