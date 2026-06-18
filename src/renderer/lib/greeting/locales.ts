/** UI locale keys for greetings (extend with new languages). */
export type GreetingLocale = "en";

const en = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening"
} as const;

const catalogs: Record<GreetingLocale, typeof en> = {
  en
};

export function greetingCatalog(locale: GreetingLocale): typeof en {
  return catalogs[locale] ?? en;
}

export function resolveGreetingLocale(navLanguages: readonly string[] | undefined): GreetingLocale {
  const first = navLanguages?.[0]?.toLowerCase() ?? "en";
  if (first.startsWith("en")) return "en";
  return "en";
}
