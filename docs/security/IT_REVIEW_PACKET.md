# IT Review Packet: Personal Assistant Corporate Deployment

This document provides a comprehensive security review packet for IT and security teams evaluating Personal Assistant for corporate deployment.

## Executive Summary

**Application Name:** Personal Assistant
**Version:** 2.1.6
**Architecture:** Electron (Desktop Application)
**Data Storage:** Local SQLite database + Optional cloud sync (Supabase)
**Security Posture:** Fail-closed, policy-driven, OS-level encryption for secrets

**Security Controls Implemented:**

- Corporate mode with policy file enforcement
- Outbound network guard with host allowlisting
- OS-level encryption for all secrets (safeStorage)
- Encrypted backup export in corporate mode
- Content Security Policy (CSP) enforcement
- Policy file ACL validation
- Fail-closed behavior on secure storage unavailability

## Deployment Architecture

### Application Structure

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Security Policy Layer                          │  │
│  │  - Policy loading and validation                │  │
│  │  - Outbound guard checks                        │  │
│  │  - CSP generation                               │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Data Layer                                     │  │
│  │  - SQLite database (local)                      │  │
│  │  - OS encryption for secrets (safeStorage)       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Integration Layer                              │  │
│  │  - AI providers (OpenAI, Anthropic)             │  │
│  │  - Home Assistant                               │  │
│  │  - Supabase (optional team sync)                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Renderer Process (UI)                    │
│  - React-based user interface                           │
│  - No direct database access                            │
│  - IPC communication to main process                     │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input → Renderer (React UI)
    ↓
IPC → Main Process (Electron)
    ↓
Security Policy Check → Allowed?
    ↓ YES
SQLite Database / External Service
    ↓
Response → Renderer
```

## Security Controls

### 1. Corporate Mode

**Policy File Location:** `%ProgramData%\PersonalAssistant\policy.json` (Windows)

**Policy Controls:**

- `mode`: "personal" | "corporate"
- `allowAi`: Enable/disable AI integration
- `allowTeamSync`: Enable/disable Supabase team sync
- `allowHomeAssistant`: Enable/disable Home Assistant
- `allowCrashReporting`: Enable/disable crash reporting
- `allowBackupExport`: Enable/disable backup export
- `allowBackupImport`: Enable/disable backup import
- `allowExternalUrls`: Enable/disable external URL rendering
- `requireSecureSecretStorage`: Require OS encryption for secrets
- `allowedHosts`: Array of allowed hostnames for outbound connections

**Policy Enforcement:**

- Policy file ACL validation (must be admin-writable, user-read-only in corporate mode)
- Fail-closed to corporate-deny defaults if policy file is user-writable
- Schema validation with Zod
- Policy versioning for future compatibility

### 2. Outbound Network Guard

**Centralized Checks:**

- `checkAiAllowed()`: Blocks AI provider API calls
- `checkTeamSyncAllowed()`: Blocks Supabase team sync
- `checkHomeAssistantAllowed()`: Blocks Home Assistant connections
- `checkCrashReportingAllowed()`: Blocks crash reporting (fails silently)
- `checkHostAllowed(hostname)`: Blocks connections to non-allowlisted hosts

**Integration Points:**

- AI provider adapters (OpenAI, Anthropic)
- Home Assistant fetch calls
- Supabase client initialization
- All external network paths

**Error Handling:**

- Explicit errors thrown for blocked integrations
- Structured error codes for UI display
- Crash reporting fails silently (no error thrown)

### 3. Secret Storage

**Storage Mechanism:**

- Electron `safeStorage` API
- OS-level encryption:
  - Windows: DPAPI
  - macOS: Keychain
  - Linux: libsecret

**Secrets Stored:**

- AI API keys
- Home Assistant tokens
- Supabase anon key
- Supabase session token

**Security Properties:**

- Fail-closed if OS encryption unavailable
- Legacy plaintext secrets rejected (requires reconnection)
- Secrets excluded from backup export
- Encrypted prefix validation for integrity

### 4. Content Security Policy (CSP)

**Corporate Mode CSP:**

```
default-src 'self'
script-src 'self'
style-src 'self'
img-src 'self' data: blob:
font-src 'self' data:
connect-src 'self' https://[allowedHosts]
```

**Personal Mode CSP:**

```
connect-src 'self' https://api.openai.com https://api.anthropic.com https://*.supabase.co
```

**Enforcement:**

- Applied via session.webRequest.onHeadersReceived
- Built from policy's `allowedHosts` in corporate mode
- Fallback to 'self' only if no hosts specified

### 5. Backup Security

**Backup Export:**

- Excludes secret settings (ha.token, ai.apiKey, etc.)
- Encrypted in corporate mode (using safeStorage)
- JSON format with version metadata

**Backup Import:**

- Rejects secret settings from import
- Decrypts if backup is encrypted
- Validates payload structure

**Policy Controls:**

- `allowBackupExport`: Blocks export if false
- `allowBackupImport`: Blocks import if false

### 6. Windows Signing

**Configuration:**

- Enabled via electron-builder environment variables
- `CSC_LINK`: URL to code signing certificate
- `CSC_KEY_PASSWORD`: Certificate password

**Verification:**

- Signed installer shows valid signature in Windows properties
- Passes SmartScreen reputation checks

## Residual Risks

### High Severity

**None identified.** All high-risk attack vectors are mitigated by policy controls or fail-closed behavior.

### Medium Severity

1. **Database-at-Rest Encryption**
   - **Risk:** SQLite database stored in plaintext
   - **Mitigation:** OS-level full disk encryption recommended (BitLocker/FileVault/LUKS)
   - **Future Work:** SQLCipher integration for application-level encryption
   - **Impact:** Physical access to device could expose local data

2. **Policy File Tampering (Non-Admin)**
   - **Risk:** User with admin rights could modify policy file
   - **Mitigation:** ACL validation on policy file, fail-closed on user-writable detection
   - **Impact:** Local admin could bypass corporate policy
   - **Note:** This is expected behavior - local admins have system-level access

### Low Severity

1. **Renderer Process Compromise**
   - **Risk:** If renderer is compromised, attacker could send IPC commands
   - **Mitigation:** Context isolation, sandbox, no node integration, CSP enforcement
   - **Impact:** Attacker could trigger allowed actions
   - **Note:** All sensitive operations require main-process policy checks

2. **No Security Event Logging**
   - **Risk:** No audit trail of security events (policy violations, blocked connections)
   - **Mitigation:** Future enhancement to add local security event logging
   - **Impact:** Limited visibility into security incidents
   - **Note:** This is a low-risk enhancement for corporate deployments

3. **No UI Security Status Panel**
   - **Risk:** Users cannot see current security policy status
   - **Mitigation:** Future enhancement to add security status panel
   - **Impact:** Limited user awareness of security posture
   - **Note:** This is a UX enhancement, not a security control

## Compliance Mapping

### ISO 27001 Controls

| Control                                    | Implementation                       | Status  |
| ------------------------------------------ | ------------------------------------ | ------- |
| A.8.2.1 - Information classification       | Data classification documented       | Partial |
| A.9.1.1 - Access control policy            | Policy file enforces access controls | Yes     |
| A.10.1.1 - Cryptography controls           | OS encryption for secrets            | Yes     |
| A.12.2.1 - Correct processing              | Input validation, schema validation  | Yes     |
| A.13.1.1 - Network controls                | Outbound guard, host allowlisting    | Yes     |
| A.13.2.1 - Information transfer            | CSP enforcement, HTTPS only          | Yes     |
| A.14.2.1 - Secure development policy       | Security controls integrated         | Yes     |
| A.14.2.4 - Secure development lifecycle    | Security roadmap, testing            | Partial |
| A.16.1.1 - Management of infosec incidents | Error handling, crash reporting      | Partial |

### NIST Cybersecurity Framework

| Function | Category           | Implementation                                 |
| -------- | ------------------ | ---------------------------------------------- |
| Identify | Asset Management   | Data inventory documented                      |
| Identify | Risk Assessment    | Risk register maintained                       |
| Protect  | Access Control     | Policy-based access controls                   |
| Protect  | Data Security      | OS encryption for secrets                      |
| Protect  | Platform Security  | CSP, sandbox, context isolation                |
| Detect   | Anomalous Activity | Error logging (future: security event logging) |
| Respond  | Incident Response  | Error handling, crash reporting                |
| Recover  | Recovery Planning  | Backup/restore functionality                   |

## Deployment Checklist

### Pre-Deployment

- [ ] Review and approve security policy configuration
- [ ] Set policy file ACLs (Administrators: Full Control, Users: Read)
- [ ] Configure `allowedHosts` in policy (if needed)
- [ ] Enable OS-level full disk encryption (BitLocker/FileVault/LUKS)
- [ ] Configure Windows signing certificate (if signing installers)
- [ ] Review and approve backup encryption settings

### Deployment

- [ ] Install application on test machine
- [ ] Verify policy file is loaded correctly
- [ ] Test policy enforcement (disable integrations, verify blocked)
- [ ] Test outbound guard (block host, verify connection fails)
- [ ] Test secret storage (verify encryption, test fail-closed)
- [ ] Test backup export/import (verify encryption, secret exclusion)
- [ ] Verify CSP in browser dev tools
- [ ] Test signed installer signature (if signing enabled)

### Post-Deployment

- [ ] Monitor application logs for security events
- [ ] Verify policy file ACLs remain correct
- [ ] Review backup encryption status
- [ ] Audit outbound connections (if logging enabled)
- [ ] Document any security incidents

## Security Scripts

The following npm scripts are available for security verification:

- `npm run security:audit` - Run npm audit for vulnerabilities
- `npm run security:sbom` - Generate Software Bill of Materials
- `npm run security:release-evidence` - Generate release evidence

## Documentation References

- [Security Overview](./overview.md)
- [Corporate Mode Guide](./CORPORATE_MODE.md)
- [Data and Asset Inventory](./data-and-asset-inventory.md)
- [Risk Register](./risk-register.md)
- [Control Mapping](./control-mapping.md)
- [Operational Controls](./operational-controls.md)
- [Database-at-Rest Strategy](./database-at-rest-strategy.md)
- [Release Checklist](../RELEASE_CHECKLIST.md)

## Contact

For security questions or concerns, refer to the project repository:
https://github.com/toadjo/Personal-Assistant
