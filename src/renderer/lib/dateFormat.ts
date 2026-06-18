export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(isoString: string | null): string {
  if (!isoString) return "No date";
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatEur(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export function formatMileage(km: number): string {
  return `${km.toLocaleString()} km`;
}
