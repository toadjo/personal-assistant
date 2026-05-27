import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CONNECTED_CALENDAR_OAUTH_NOT_CONFIGURED_CODE,
  type ConnectedCalendarOAuthSetupStatus
} from "../../../shared/connectedCalendarOAuth";

type BundledCalendarOAuthClients = {
  googleClientId?: string;
  microsoftClientId?: string;
};

let cachedBundledClients: BundledCalendarOAuthClients | null | undefined;

function bundledConfigCandidates(): string[] {
  const fileName = "calendar-oauth-clients.json";
  return [
    resolve(process.cwd(), "assets", "generated", fileName),
    resolve(__dirname, "../../../../..", "assets", "generated", fileName),
    resolve(__dirname, "../../../..", "assets", "generated", fileName)
  ];
}

function readBundledCalendarOAuthClients(): BundledCalendarOAuthClients | null {
  if (cachedBundledClients !== undefined) {
    return cachedBundledClients;
  }

  const configPath = bundledConfigCandidates().find((candidate) => existsSync(candidate));
  if (!configPath) {
    cachedBundledClients = null;
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as Partial<BundledCalendarOAuthClients>;
    const googleClientId = typeof parsed.googleClientId === "string" ? parsed.googleClientId.trim() : "";
    const microsoftClientId = typeof parsed.microsoftClientId === "string" ? parsed.microsoftClientId.trim() : "";
    if (!googleClientId && !microsoftClientId) {
      cachedBundledClients = null;
      return null;
    }
    cachedBundledClients = {
      ...(googleClientId ? { googleClientId } : {}),
      ...(microsoftClientId ? { microsoftClientId } : {})
    };
    return cachedBundledClients;
  } catch {
    cachedBundledClients = null;
    return null;
  }
}

function resolveClientId(envKey: "GOOGLE_CALENDAR_CLIENT_ID" | "MICROSOFT_CALENDAR_CLIENT_ID", bundledKey: keyof BundledCalendarOAuthClients): string {
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  const bundled = readBundledCalendarOAuthClients();
  const fromBundle = bundled?.[bundledKey]?.trim();
  return fromBundle ?? "";
}

/** Public OAuth client ID for Google Calendar (PKCE desktop flow). Never a secret. */
export function getGoogleCalendarClientId(): string {
  return resolveClientId("GOOGLE_CALENDAR_CLIENT_ID", "googleClientId");
}

/** Public OAuth client ID for Microsoft Graph calendar (PKCE public client). Never a secret. */
export function getMicrosoftCalendarClientId(): string {
  return resolveClientId("MICROSOFT_CALENDAR_CLIENT_ID", "microsoftClientId");
}

/** @deprecated Use getGoogleCalendarClientId */
export function getGoogleOAuthClientId(): string {
  return getGoogleCalendarClientId();
}

/** @deprecated Use getMicrosoftCalendarClientId */
export function getMicrosoftOAuthClientId(): string {
  return getMicrosoftCalendarClientId();
}

export function getConnectedCalendarOAuthSetupStatus(): ConnectedCalendarOAuthSetupStatus {
  return {
    googleConfigured: Boolean(getGoogleCalendarClientId()),
    microsoftConfigured: Boolean(getMicrosoftCalendarClientId())
  };
}

export function assertGoogleCalendarClientIdConfigured(): void {
  if (!getGoogleCalendarClientId()) {
    throw new Error(`${CONNECTED_CALENDAR_OAUTH_NOT_CONFIGURED_CODE}:google`);
  }
}

export function assertMicrosoftCalendarClientIdConfigured(): void {
  if (!getMicrosoftCalendarClientId()) {
    throw new Error(`${CONNECTED_CALENDAR_OAUTH_NOT_CONFIGURED_CODE}:microsoft`);
  }
}
