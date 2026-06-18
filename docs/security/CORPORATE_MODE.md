# Corporate Mode

Corporate mode is a security feature that allows administrators to control outbound data integrations for managed devices. When enabled, the app enforces policy-based restrictions on optional integrations (AI, Team sync, Home Assistant, crash reporting) to prevent data exfiltration in enterprise environments.

## Overview

Corporate mode is designed for IT administrators who need to:

- Prevent outbound data transfers from managed devices
- Enforce compliance with data residency requirements
- Control which optional integrations are available to end users
- Maintain a clear audit trail of security policy enforcement

## Policy File Location

**Windows:** `%ProgramData%\PersonalAssistant\policy.json`

The policy file is read at application startup. If the file is absent, the app operates in personal mode with all integrations enabled by default.

## Policy File Format

```json
{
  "mode": "corporate",
  "allowAi": false,
  "allowTeamSync": false,
  "allowHomeAssistant": false,
  "allowCrashReporting": false,
  "allowBackupExport": false,
  "allowBackupImport": false,
  "allowExternalUrls": false,
  "requireSecureSecretStorage": true,
  "allowedHosts": []
}
```

### Policy Fields

| Field                        | Type                          | Description                                                                                                                                                        |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mode`                       | `"personal"` or `"corporate"` | Operating mode. `"personal"` enables all integrations by default. `"corporate"` disables all integrations by default unless explicitly allowed.                    |
| `allowAi`                    | `boolean`                     | Whether AI provider configuration and AI commands are allowed.                                                                                                     |
| `allowTeamSync`              | `boolean`                     | Whether Supabase team sync (workspaces, projects, tasks) is allowed.                                                                                               |
| `allowHomeAssistant`         | `boolean`                     | Whether Home Assistant configuration, entity sync, and device toggles are allowed.                                                                                 |
| `allowCrashReporting`        | `boolean`                     | Whether Sentry and Electron crash reporting are allowed.                                                                                                           |
| `allowBackupExport`          | `boolean`                     | Whether backup export is allowed. In corporate mode, backups are encrypted by default when allowed.                                                                |
| `allowBackupImport`          | `boolean`                     | Whether backup import is allowed.                                                                                                                                  |
| `allowExternalUrls`          | `boolean`                     | Whether external URLs can be rendered in the UI.                                                                                                                   |
| `requireSecureSecretStorage` | `boolean`                     | Whether OS-level encryption is required for secrets. If true, the app fails closed when encryption is unavailable.                                                 |
| `allowedHosts`               | `string[]`                    | Array of allowed hostnames for outbound connections. If empty, all outbound connections are blocked except to `self`. Used for CSP connect-src and outbound guard. |

## Default Behavior

### Personal Mode (Default)

- All integrations are enabled by default
- Individual integrations can be disabled by setting them to `false`
- Used when no policy file exists or when `mode` is set to `"personal"`

### Corporate Mode

- All integrations are disabled by default
- Individual integrations must be explicitly set to `true` to enable them
- Used when `mode` is set to `"corporate"`

## Blocked Features in Corporate Mode

When an integration is disabled by corporate policy:

- **AI**: AI provider configuration, connection testing, and AI commands return an error: "AI integration is disabled by corporate policy."
- **Team Sync**: Supabase configuration, workspace operations, project operations, task operations, and realtime subscriptions return an error: "Team sync is disabled by corporate policy."
- **Home Assistant**: Home Assistant configuration, connection testing, entity refresh, and device toggles return an error: "Home Assistant integration is disabled by corporate policy."
- **Crash Reporting**: Sentry and Electron crash reporting are not initialized. No error is shown to the user (silent enforcement).
- **Backup Export**: Backup export returns an error: "Backup export is disabled by corporate policy."
- **Backup Import**: Backup import returns an error: "Backup import is disabled by corporate policy."
- **Host Allowlisting**: Outbound connections to non-allowlisted hosts return an error: "Host is not allowed by corporate policy."

## Enforcement Points

Policy enforcement happens in the main process IPC handlers and service layer. The renderer UI cannot bypass these restrictions:

- `src/main/ipc/handlers/ai.handlers.ts` - AI operations
- `src/main/ipc/handlers/team.handlers.ts` - Team sync operations
- `src/main/ipc/handlers/homeAssistant.handlers.ts` - Home Assistant operations
- `src/main/ipc/handlers/backup.handlers.ts` - Backup export/import operations
- `src/main/main.ts` - Crash reporting initialization
- `src/main/services/aiProvider.ts` - AI provider outbound guard checks
- `src/main/services/homeAssistant.ts` - Home Assistant outbound guard checks
- `src/main/team/supabaseClient.ts` - Supabase outbound guard checks
- `src/main/security/outboundGuard.ts` - Central outbound guard for host allowlisting
- `src/main/window.ts` - CSP generation from policy

## Policy File Security

### ACL Validation

In corporate mode, the policy file is validated for write permissions:

- If the policy file is user-writable (not admin-writable), the app logs a warning and fails closed to corporate-deny defaults
- This prevents users from modifying the policy file to bypass restrictions
- Administrators should set ACLs: Administrators (Full Control), Users (Read Only)

### Schema Validation

Policy files are validated using Zod schema with versioning:

- Invalid policy files cause the app to fail closed to corporate-deny defaults
- Schema version is tracked for future compatibility
- Policy loading errors are logged for troubleshooting

## Outbound Endpoints

When integrations are enabled, the app may connect to the following external endpoints:

### AI Providers

- OpenAI API: `https://api.openai.com`
- Anthropic API: `https://api.anthropic.com`

### Team Sync (Supabase)

- Supabase project endpoint (configured per workspace)
- Realtime WebSocket connections (configured per workspace)

### Home Assistant

- User-configured Home Assistant URL (typically local network)

### Crash Reporting

- Sentry DSN (configured via environment variable)
- Electron crash report server (configured via environment variable)

## Local Data Storage

All user data is stored locally on the device:

- **SQLite Database**: `userData/personal-assistant.db`
  - Notes, tasks, reminders, automation rules
  - Settings and preferences
  - Home Assistant entity cache
- **Encrypted Secrets**: Electron safeStorage (or OS equivalent)
  - AI API keys (if allowed)
  - Home Assistant tokens (if allowed)
  - Supabase session tokens (if allowed)
- **Application Data**: `userData/`
  - Theme preferences
  - Backup exports (JSON)
  - Log files

## Known Residual Risks

### Local Database Exposure

- **Risk**: SQLite database stored in user data directory without encryption at rest.
- **Mitigation**: Data is local-only. Device-level security (disk encryption, user account controls) is the primary protection. Corporate mode enforces OS encryption requirement for secrets.
- **Corporate Mode Impact**: Corporate mode does not encrypt the local database. Device-level policies (BitLocker, FileVault, etc.) should be used for data-at-rest protection. See [database-at-rest-strategy.md](./database-at-rest-strategy.md) for details.

### Backup Data Exposure

- **Risk**: Backup exports may contain sensitive information.
- **Mitigation**: Secrets are excluded from backup export. Backup import rejects secret settings. In corporate mode, backups are encrypted by default when export is allowed.
- **Corporate Mode Impact**: Corporate mode can block backup export/import entirely via policy. Administrators should control backup file distribution via device policies.

### Renderer UI Bypass

- **Risk**: Renderer UI could potentially be modified to hide policy restrictions.
- **Mitigation**: All enforcement happens in the main process IPC handlers and service layer. Renderer UI cannot bypass these restrictions. Policy is enforced at multiple layers (IPC, service, outbound guard).
- **Corporate Mode Impact**: Policy is enforced at the IPC and service layers, making UI bypass ineffective.

### Host Allowlisting Bypass

- **Risk**: Malicious code could attempt to connect to non-allowlisted hosts.
- **Mitigation**: Outbound guard checks are enforced in the service layer before any network requests. CSP restricts renderer connections.
- **Corporate Mode Impact**: Corporate mode enforces host allowlisting at both the service layer (outbound guard) and CSP layer.

### Policy File Tampering

- **Risk**: Local administrator could modify policy file to bypass restrictions.
- **Mitigation**: ACL validation prevents user-writable policy files in corporate mode. Fail-closed behavior on tampering detection.
- **Corporate Mode Impact**: This is expected behavior - local administrators have system-level access. For higher security, consider using configuration management tools to enforce policy file integrity.

## Example Policy Files

### Strict Corporate Mode (All Outbound Disabled)

```json
{
  "mode": "corporate",
  "allowAi": false,
  "allowTeamSync": false,
  "allowHomeAssistant": false,
  "allowCrashReporting": false,
  "allowBackupExport": false,
  "allowBackupImport": false,
  "allowExternalUrls": false,
  "requireSecureSecretStorage": true,
  "allowedHosts": []
}
```

### Corporate Mode with Home Assistant Allowed

```json
{
  "mode": "corporate",
  "allowAi": false,
  "allowTeamSync": false,
  "allowHomeAssistant": true,
  "allowCrashReporting": false,
  "allowBackupExport": true,
  "allowBackupImport": false,
  "allowExternalUrls": false,
  "requireSecureSecretStorage": true,
  "allowedHosts": ["homeassistant.local"]
}
```

### Corporate Mode with AI and Host Allowlisting

```json
{
  "mode": "corporate",
  "allowAi": true,
  "allowTeamSync": false,
  "allowHomeAssistant": false,
  "allowCrashReporting": false,
  "allowBackupExport": true,
  "allowBackupImport": false,
  "allowExternalUrls": false,
  "requireSecureSecretStorage": true,
  "allowedHosts": ["api.openai.com", "api.anthropic.com"]
}
```

### Personal Mode with AI Disabled

```json
{
  "mode": "personal",
  "allowAi": false,
  "allowTeamSync": true,
  "allowHomeAssistant": true,
  "allowCrashReporting": true,
  "allowBackupExport": true,
  "allowBackupImport": true,
  "allowExternalUrls": true,
  "requireSecureSecretStorage": false,
  "allowedHosts": []
}
```

## Deployment

### Manual Deployment

1. Create the policy directory:

   ```
   mkdir "C:\ProgramData\PersonalAssistant"
   ```

2. Create the policy file:

   ```
   notepad "C:\ProgramData\PersonalAssistant\policy.json"
   ```

3. Paste the desired policy configuration and save.

4. Set ACLs on the policy file (required for corporate mode):

   ```
   icacls "C:\ProgramData\PersonalAssistant\policy.json" /inheritance:r
   icacls "C:\ProgramData\PersonalAssistant\policy.json" /grant "Administrators:(F)"
   icacls "C:\ProgramData\PersonalAssistant\policy.json" /grant "Users:(R)"
   icacls "C:\ProgramData\PersonalAssistant" /inheritance:r
   icacls "C:\ProgramData\PersonalAssistant" /grant "Administrators:(F)"
   icacls "C:\ProgramData\PersonalAssistant" /grant "Users:(R)"
   ```

5. Restart the Personal Assistant application.

### Group Policy / SCCM Deployment

Administrators can deploy the policy file via Group Policy, SCCM, or other configuration management tools:

- **Source**: Copy `policy.json` to a network share
- **Target**: `%ProgramData%\PersonalAssistant\policy.json`
- **Permissions**: Admin write, user read-only

## Troubleshooting

### Policy Not Taking Effect

- Verify the policy file exists at `%ProgramData%\PersonalAssistant\policy.json`
- Verify the JSON is valid (no syntax errors)
- Check application logs for policy loading messages
- Restart the application after modifying the policy file

### Integration Still Works Despite Policy

- Verify the policy field is set correctly (`allowAi`, `allowTeamSync`, etc.)
- Check that the policy file is not being overridden by a user-local copy
- Verify the application is reading from the correct ProgramData path

### Invalid Policy JSON

- If the policy file contains invalid JSON, the app defaults to corporate-deny behavior and logs a warning
- Check the application logs for parsing errors
- Validate the JSON using a JSON validator before deployment

## Certification Status

This feature is designed to make the app easier and safer for IT review. It does not claim:

- ISO 27001 certification
- SOC 2 compliance
- Formal enterprise security certification

Administrators should perform their own security assessment and risk evaluation before deploying in regulated environments.
