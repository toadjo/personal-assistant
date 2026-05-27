/**
 * Central outbound network guard for corporate security policy.
 *
 * All external fetch/client creation paths must call this guard before making
 * outbound connections. The guard checks the security policy and throws
 * errors if the integration is disabled or the host is not allowed.
 *
 * Behavior:
 * - AI, Supabase, Home Assistant, Sentry, crash upload checks
 * - Explicit policy errors over silent failure (except crash reporting)
 * - Crash reporting stays silent on policy block
 * - Host allowlisting: if allowedHosts is non-empty, only those hosts are allowed
 */

import { mainLog } from "../log";
import {
  isAiAllowed,
  isConnectedCalendarAllowed,
  isGoogleCalendarAllowed,
  isTeamSyncAllowed,
  isHomeAssistantAllowed,
  isMicrosoftCalendarAllowed,
  isCrashReportingAllowed,
  isHostAllowed
} from "./policy";

/**
 * Error thrown when an outbound integration is disabled by corporate policy.
 */
export class OutboundIntegrationBlockedError extends Error {
  constructor(integrationName: string) {
    super(`${integrationName} is disabled by corporate policy.`);
    this.name = "OutboundIntegrationBlockedError";
  }
}

/**
 * Error thrown when a host is not in the allowlist.
 */
export class HostNotAllowedError extends Error {
  constructor(hostname: string) {
    super(`Host "${hostname}" is not in the allowed hosts list.`);
    this.name = "HostNotAllowedError";
  }
}

/**
 * Check if AI integration is allowed by policy.
 * Throws OutboundIntegrationBlockedError if disabled.
 */
export function checkAiAllowed(): void {
  if (!isAiAllowed()) {
    mainLog.warn("AI integration blocked by corporate policy");
    throw new OutboundIntegrationBlockedError("AI integration");
  }
}

/**
 * Check if team sync (Supabase) integration is allowed by policy.
 * Throws OutboundIntegrationBlockedError if disabled.
 */
export function checkTeamSyncAllowed(): void {
  if (!isTeamSyncAllowed()) {
    mainLog.warn("Team sync integration blocked by corporate policy");
    throw new OutboundIntegrationBlockedError("Team sync integration");
  }
}

/**
 * Check if Home Assistant integration is allowed by policy.
 * Throws OutboundIntegrationBlockedError if disabled.
 */
export function checkHomeAssistantAllowed(): void {
  if (!isHomeAssistantAllowed()) {
    mainLog.warn("Home Assistant integration blocked by corporate policy");
    throw new OutboundIntegrationBlockedError("Home Assistant integration");
  }
}

/**
 * Check if connected calendar integration is allowed by policy.
 * Throws OutboundIntegrationBlockedError if disabled.
 */
export function checkConnectedCalendarAllowed(): void {
  if (!isConnectedCalendarAllowed()) {
    mainLog.warn("Connected calendar integration blocked by corporate policy");
    throw new OutboundIntegrationBlockedError("Connected calendar integration");
  }
}

/**
 * Check if Google Calendar integration is allowed by policy.
 * Throws OutboundIntegrationBlockedError if disabled.
 */
export function checkGoogleCalendarAllowed(): void {
  if (!isGoogleCalendarAllowed()) {
    mainLog.warn("Google Calendar integration blocked by corporate policy");
    throw new OutboundIntegrationBlockedError("Google Calendar integration");
  }
}

/**
 * Check if Microsoft Calendar integration is allowed by policy.
 * Throws OutboundIntegrationBlockedError if disabled.
 */
export function checkMicrosoftCalendarAllowed(): void {
  if (!isMicrosoftCalendarAllowed()) {
    mainLog.warn("Microsoft Calendar integration blocked by corporate policy");
    throw new OutboundIntegrationBlockedError("Microsoft Calendar integration");
  }
}

/**
 * Check if crash reporting is allowed by policy.
 * Returns false if disabled (silent failure for crash reporting).
 */
export function checkCrashReportingAllowed(): boolean {
  if (!isCrashReportingAllowed()) {
    mainLog.info("Crash reporting disabled by corporate policy");
    return false;
  }
  return true;
}

/**
 * Check if a hostname is allowed by policy.
 * Throws HostNotAllowedError if the host is not in the allowlist.
 * If the allowlist is empty, all hosts are allowed.
 */
export function checkHostAllowed(hostname: string): void {
  if (!isHostAllowed(hostname)) {
    mainLog.warn(`Host "${hostname}" blocked by corporate policy allowlist`);
    throw new HostNotAllowedError(hostname);
  }
}
