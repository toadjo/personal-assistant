/**
 * Security policy shape shared between main and renderer.
 *
 * The main process owns the canonical zod schema and validation in
 * `src/main/security/policy.ts`; this interface keeps the renderer's
 * typed preload bridge in sync without importing main-process code.
 */
export interface SecurityPolicy {
  schemaVersion: 1;
  mode: "personal" | "corporate";
  allowAi: boolean;
  allowTeamSync: boolean;
  allowHomeAssistant: boolean;
  allowConnectedCalendar: boolean;
  allowGoogleCalendar: boolean;
  allowMicrosoftCalendar: boolean;
  allowCrashReporting: boolean;
  allowBackupExport: boolean;
  allowBackupImport: boolean;
  allowExternalUrls: boolean;
  requireSecureSecretStorage: boolean;
  allowedHosts: string[];
}
