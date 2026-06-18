import path from "node:path";
import { existsSync, readFileSync, constants, accessSync } from "node:fs";
import { z } from "zod";
import { mainLog } from "../log";

export const SecurityPolicySchema = z.object({
  schemaVersion: z.literal(1),
  mode: z.enum(["personal", "corporate"]),
  allowAi: z.boolean(),
  allowTeamSync: z.boolean(),
  allowHomeAssistant: z.boolean(),
  allowConnectedCalendar: z.boolean(),
  allowGoogleCalendar: z.boolean(),
  allowMicrosoftCalendar: z.boolean(),
  allowCrashReporting: z.boolean(),
  allowBackupExport: z.boolean(),
  allowBackupImport: z.boolean(),
  allowExternalUrls: z.boolean(),
  requireSecureSecretStorage: z.boolean(),
  allowedHosts: z.array(z.string()).default([])
});

export type SecurityPolicy = z.infer<typeof SecurityPolicySchema>;

export const PERSONAL_DEFAULTS: SecurityPolicy = {
  schemaVersion: 1,
  mode: "personal",
  allowAi: true,
  allowTeamSync: true,
  allowHomeAssistant: true,
  allowConnectedCalendar: true,
  allowGoogleCalendar: true,
  allowMicrosoftCalendar: true,
  allowCrashReporting: true,
  allowBackupExport: true,
  allowBackupImport: true,
  allowExternalUrls: true,
  requireSecureSecretStorage: false,
  allowedHosts: []
};

export const CORPORATE_DEFAULTS: SecurityPolicy = {
  schemaVersion: 1,
  mode: "corporate",
  allowAi: false,
  allowTeamSync: false,
  allowHomeAssistant: false,
  allowConnectedCalendar: false,
  allowGoogleCalendar: false,
  allowMicrosoftCalendar: false,
  allowCrashReporting: false,
  allowBackupExport: false,
  allowBackupImport: false,
  allowExternalUrls: false,
  requireSecureSecretStorage: true,
  allowedHosts: []
};

function getPolicyFilePath(): string {
  if (process.platform === "win32") {
    return path.join(process.env.PROGRAMDATA || "C:\\ProgramData", "PersonalAssistant", "policy.json");
  }
  // On non-Windows platforms, policy file is not supported
  return "";
}

function parsePolicyFile(content: string): SecurityPolicy {
  try {
    const parsed = JSON.parse(content);
    const result = SecurityPolicySchema.safeParse(parsed);

    if (!result.success) {
      mainLog.warn("Security policy validation failed, using corporate-deny defaults", result.error);
      return CORPORATE_DEFAULTS;
    }

    const policy = result.data;
    mainLog.info(`Security policy validated: schemaVersion=${policy.schemaVersion}, mode=${policy.mode}`);
    return policy;
  } catch (error) {
    mainLog.warn("Failed to parse security policy file, using corporate-deny defaults", error);
    return CORPORATE_DEFAULTS;
  }
}

/**
 * Check if the policy file is user-writable on Windows.
 * Returns true if the file is writable by the current user.
 */
function isPolicyFileUserWritable(filePath: string): boolean {
  try {
    accessSync(filePath, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function loadSecurityPolicy(): SecurityPolicy {
  const policyFilePath = getPolicyFilePath();

  // On non-Windows platforms, always use personal defaults
  if (!policyFilePath) {
    policySource = "defaults";
    loadedAt = new Date();
    return PERSONAL_DEFAULTS;
  }

  // If policy file doesn't exist, use personal defaults
  if (!existsSync(policyFilePath)) {
    policySource = "defaults";
    loadedAt = new Date();
    return PERSONAL_DEFAULTS;
  }

  // Check if policy file is user-writable in corporate mode
  const isUserWritable = isPolicyFileUserWritable(policyFilePath);
  if (isUserWritable) {
    mainLog.warn(
      "Security policy file is user-writable. In corporate mode, this may indicate a security risk. Recommended ACL: Administrators write, Users read."
    );
  }

  try {
    const content = readFileSync(policyFilePath, "utf-8");
    const policy = parsePolicyFile(content);

    // In corporate mode, fail closed if policy file is user-writable
    if (policy.mode === "corporate" && isUserWritable) {
      mainLog.error(
        "Security policy file is user-writable in corporate mode. Failing closed to corporate-deny defaults for security."
      );
      policySource = "defaults";
      loadedAt = new Date();
      return CORPORATE_DEFAULTS;
    }

    policySource = "file";
    loadedAt = new Date();
    mainLog.info(
      `Security policy loaded: mode=${policy.mode}, allowAi=${policy.allowAi}, allowTeamSync=${policy.allowTeamSync}, allowHomeAssistant=${policy.allowHomeAssistant}, allowCrashReporting=${policy.allowCrashReporting}, allowBackupExport=${policy.allowBackupExport}, allowBackupImport=${policy.allowBackupImport}, allowExternalUrls=${policy.allowExternalUrls}, requireSecureSecretStorage=${policy.requireSecureSecretStorage}`
    );
    return policy;
  } catch (error) {
    mainLog.warn("Failed to read security policy file, using corporate-deny defaults", error);
    policySource = "defaults";
    loadedAt = new Date();
  }

  return CORPORATE_DEFAULTS;
}

let cachedPolicy: SecurityPolicy | null = null;
let policySource: "file" | "defaults" | "none" = "none";
let loadedAt: Date | null = null;

export function getSecurityPolicy(): SecurityPolicy {
  if (cachedPolicy === null) {
    cachedPolicy = loadSecurityPolicy();
  }
  return cachedPolicy;
}

export function getPolicySource(): "file" | "defaults" | "none" {
  return policySource;
}

export function getPolicyLoadedAt(): Date | null {
  return loadedAt;
}

/**
 * Test-only helper to reset cached policy. Call this in tests to reload policy.
 */
export function resetPolicyCache(): void {
  cachedPolicy = null;
  policySource = "none";
  loadedAt = null;
}

export function isCorporateMode(): boolean {
  return getSecurityPolicy().mode === "corporate";
}

export function isAiAllowed(): boolean {
  return getSecurityPolicy().allowAi;
}

export function isTeamSyncAllowed(): boolean {
  return getSecurityPolicy().allowTeamSync;
}

export function isHomeAssistantAllowed(): boolean {
  return getSecurityPolicy().allowHomeAssistant;
}

export function isCrashReportingAllowed(): boolean {
  return getSecurityPolicy().allowCrashReporting;
}

export function isConnectedCalendarAllowed(): boolean {
  return getSecurityPolicy().allowConnectedCalendar;
}

export function isGoogleCalendarAllowed(): boolean {
  return getSecurityPolicy().allowGoogleCalendar;
}

export function isMicrosoftCalendarAllowed(): boolean {
  return getSecurityPolicy().allowMicrosoftCalendar;
}

export function isBackupExportAllowed(): boolean {
  return getSecurityPolicy().allowBackupExport;
}

export function isBackupImportAllowed(): boolean {
  return getSecurityPolicy().allowBackupImport;
}

export function isExternalUrlsAllowed(): boolean {
  return getSecurityPolicy().allowExternalUrls;
}

export function isSecureSecretStorageRequired(): boolean {
  return getSecurityPolicy().requireSecureSecretStorage;
}

/**
 * Checks if a hostname is allowed based on the policy's allowedHosts list.
 *
 * In personal mode: empty allowedHosts means unrestricted (current behavior).
 * In corporate mode: empty allowedHosts means no public outbound hosts allowed.
 * If allowedHosts is non-empty in either mode, only hosts in the list are allowed.
 */
export function isHostAllowed(hostname: string): boolean {
  const policy = getSecurityPolicy();
  const allowedHosts = policy.allowedHosts;

  // If the list is empty, behavior depends on mode
  if (allowedHosts.length === 0) {
    // Personal mode: unrestricted
    // Corporate mode: block all public hosts
    return policy.mode === "personal";
  }

  // If the list is non-empty, check if hostname is in the list
  return allowedHosts.includes(hostname);
}
