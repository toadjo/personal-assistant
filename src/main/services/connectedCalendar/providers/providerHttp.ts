import type { ConnectedCalendarProvider } from "../../../../shared/types";
import {
  checkConnectedCalendarAllowed,
  checkGoogleCalendarAllowed,
  checkHostAllowed,
  checkMicrosoftCalendarAllowed
} from "../../../security/outboundGuard";
import type { ProviderFetch } from "./types";

export function assertProviderHttpAllowed(provider: ConnectedCalendarProvider, url: string): void {
  checkConnectedCalendarAllowed();
  if (provider === "google") {
    checkGoogleCalendarAllowed();
  } else {
    checkMicrosoftCalendarAllowed();
  }
  checkHostAllowed(new URL(url).hostname);
}

export async function providerFetch(
  provider: ConnectedCalendarProvider,
  input: string,
  init: RequestInit | undefined,
  fetchImpl: ProviderFetch = fetch
): Promise<Response> {
  assertProviderHttpAllowed(provider, input);
  return fetchImpl(input, init);
}
