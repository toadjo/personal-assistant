import type { ConnectedCalendarProvider } from "../../../../shared/types";
import { createGoogleCalendarAdapter } from "./googleAdapter";
import { createMicrosoftCalendarAdapter } from "./microsoftAdapter";
import type { ConnectedCalendarProviderAdapter, ProviderFetch } from "./types";

export type { ConnectedCalendarProviderAdapter, NormalizedExternalEvent, ProviderFetch, SyncResult } from "./types";
export { mapGoogleCalendarEvent } from "./googleAdapter";
export { mapMicrosoftCalendarEvent } from "./microsoftAdapter";
export { assertProviderHttpAllowed } from "./providerHttp";

export function getConnectedCalendarProviderAdapter(
  provider: ConnectedCalendarProvider,
  fetchImpl?: ProviderFetch
): ConnectedCalendarProviderAdapter {
  if (provider === "google") {
    return createGoogleCalendarAdapter(fetchImpl);
  }
  return createMicrosoftCalendarAdapter(fetchImpl);
}
