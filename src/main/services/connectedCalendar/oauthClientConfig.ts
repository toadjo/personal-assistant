import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CONNECTED_CALENDAR_OAUTH_NOT_CONFIGURED_CODE,
  type ConnectedCalendarOAuthSetupStatus
} from "../../../shared/connectedCalendarOAuth";

type BundledCalendarOAuthClients = {
  googleClientId?: string;
  googleClientSecret?: string;
  microsoftClientId?: string;
};

let cachedBundledClients: BundledCalendarOAuthClients | null | undefined;

function bundledConfigCandidates(): string[] {
  const generatedName = "calendar-oauth-clients.json";
  const localName = "calendar-oauth-clients.local.json";
  return [
    resolve(process.cwd(), "assets", localName),
    resolve(process.cwd(), "assets", "generated", generatedName),
    resolve(__dirname, "../../../../..", "assets", localName),
    resolve(__dirname, "../../../../..", "assets", "generated", generatedName),
    resolve(__dirname, "../../../..", "assets", localName),
    resolve(__dirname, "../../../..", "assets", "generated", generatedName)
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
    const googleClientSecret =
      typeof parsed.googleClientSecret === "string" ? parsed.googleClientSecret.trim() : "";
    const microsoftClientId = typeof parsed.microsoftClientId === "string" ? parsed.microsoftClientId.trim() : "";
    if (!googleClientId && !googleClientSecret && !microsoftClientId) {
      cachedBundledClients = null;
      return null;
    }
    cachedBundledClients = {
      ...(googleClientId ? { googleClientId } : {}),
      ...(googleClientSecret ? { googleClientSecret } : {}),
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

function resolveClientSecret(envKey: "GOOGLE_CALENDAR_CLIENT_SECRET", bundledKey: keyof BundledCalendarOAuthClients): string {
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

/** OAuth desktop client secret for Google Calendar. This is an app credential, not a user password. */
export function getGoogleCalendarClientSecret(): string {
  return resolveClientSecret("GOOGLE_CALENDAR_CLIENT_SECRET", "googleClientSecret");
}

/** Public OAuth client ID for Microsoft Graph calendar (PKCE public client). Never a secret. */
export function getMicrosoftCalendarClientId(): string {
  return resolveClientId("MICROSOFT_CALENDAR_CLIENT_ID", "microsoftClientId");
}

export function getConnectedCalendarOAuthSetupStatus(): ConnectedCalendarOAuthSetupStatus {
  return {
    googleConfigured: Boolean(getGoogleCalendarClientId() && getGoogleCalendarClientSecret()),
    microsoftConfigured: Boolean(getMicrosoftCalendarClientId())
  };
}

export function assertGoogleCalendarClientIdConfigured(): void {
  if (!getGoogleCalendarClientId() || !getGoogleCalendarClientSecret()) {
    throw new Error(`${CONNECTED_CALENDAR_OAUTH_NOT_CONFIGURED_CODE}:google`);
  }
}

export function assertMicrosoftCalendarClientIdConfigured(): void {
  if (!getMicrosoftCalendarClientId()) {
    throw new Error(`${CONNECTED_CALENDAR_OAUTH_NOT_CONFIGURED_CODE}:microsoft`);
  }
}
