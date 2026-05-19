# Risk Register

This document identifies key security risks for Personal Assistant and their mitigation status. The application is **not ISO 27001 certified** - this is a readiness assessment only.

## Risk Assessment

| Risk                          | Likelihood | Impact | Risk Level | Mitigation Status       | Mitigation Measures                                                                                                                                |
| ----------------------------- | ---------- | ------ | ---------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy plaintext secrets      | Low        | High   | Medium     | **Mitigated**           | Fail-closed secret storage implemented in v2.1.4. If OS encryption unavailable, secrets cannot be stored.                                          |
| Local database exposure       | Medium     | Medium | Medium     | **Partially Mitigated** | Database stored in app data directory with OS file system controls. No encryption at rest (local-only data). User responsible for device security. |
| Backup data exposure          | Low        | High   | Medium     | **Mitigated**           | Secrets excluded from backup export. Import rejects secret settings.                                                                               |
| Third-party provider risk     | Low        | Medium | Medium     | **Partially Mitigated** | AI providers (OpenAI, Anthropic) and Supabase used with encrypted credentials. No formal vendor risk management process.                           |
| Dependency vulnerability risk | Medium     | Medium | Medium     | **Mitigated**           | npm audit --audit-level=high as CI gate. Regular dependency updates. Electron 41.0.0 with better-sqlite3 12.10.0.                                  |
| AI data minimization risk     | Low        | Medium | Low        | **Mitigated**           | AI chat context limited to count-only data (notesCount, tasksCount, remindersCount, devicesCount). No note/task content sent.                      |
| Manual release integrity risk | Low        | Medium | Low        | **Mitigated**           | SHA256 checksums for installer verification. Git-based release evidence tracking. Manual upload to separate repo.                                  |
| Renderer process compromise   | Low        | High   | Medium     | **Mitigated**           | Sandbox enabled, contextBridge, hardened CSP in packaged builds. No Node.js access in renderer.                                                    |
| Secret leakage in logs        | Low        | High   | Medium     | **Mitigated**           | Secret redaction implemented in renderer error persistence.                                                                                        |
| Local database corruption     | Low        | Medium | Low        | **Not Mitigated**       | No automatic backup. User responsible for manual backup via export.                                                                                |
| Unauthorized device access    | Medium     | Medium | Medium     | **Not Mitigated**       | No app-level authentication. User responsible for OS-level access controls (Windows Hello, device encryption).                                     |
| Supply chain attack           | Low        | High   | Medium     | **Partially Mitigated** | npm audit gate, public source code, manual review of dependencies. No formal SBOM or supply chain monitoring.                                      |
| Backup file exposure          | Low        | High   | Medium     | **Mitigated**           | Secrets excluded from backup export. User responsible for backup file storage security.                                                            |

## Detailed Risk Descriptions

### 1. Legacy Plaintext Secrets

**Description:** Prior to v2.1.4, secrets (AI API keys, HA tokens, team sessions) could fall back to plaintext storage if OS encryption was unavailable.

**Mitigation:** v2.1.4 implements fail-closed secret storage. If OS encryption is unavailable, the application refuses to store secrets and prompts the user to ensure their system supports secure storage.

**Residual Risk:** Users on systems without OS encryption support cannot use AI, HA, or team features. This is an intentional security tradeoff.

### 2. Local Database Exposure

**Description:** SQLite database files are stored in the app data directory without encryption at rest.

**Mitigation:** Database is local-only (notes, tasks, reminders, automation rules). No personal data is collected or transmitted. User data never leaves the device. User responsible for OS-level file system access controls (Windows device encryption, access permissions).

**Residual Risk:** If device is compromised or stolen, local data could be accessed. This is inherent to local-first design and user responsibility.

### 3. Backup Data Exposure

**Description:** Backup export files could contain secrets if not properly handled.

**Mitigation:** v2.1.4 excludes secret settings (aiApiKey, haToken, team session tokens) from backup export. Import rejects any secret settings present in backup files.

**Residual Risk:** User responsible for secure storage of backup files. No automatic encryption of backup files.

### 4. Third-Party Provider Risk

**Description:** Use of AI providers (OpenAI, Anthropic), Supabase for team mode, and Home Assistant introduces third-party dependency risks.

**Mitigation:** Credentials encrypted with OS encryption. Minimal data sent to AI providers (count-only context). No formal vendor risk management process.

**Residual Risk:** No formal vendor assessment, SLA monitoring, or incident response coordination. Users choose to enable these optional features.

### 5. Dependency Vulnerability Risk

**Description:** npm dependencies may contain security vulnerabilities.

**Mitigation:** npm audit --audit-level=high as CI gate (fails on high/critical advisories). Regular dependency updates. Electron 41.0.0, electron-builder 26.8.1, better-sqlite3 12.10.0. Dependency overrides removed after upgrades.

**Residual Risk:** Moderate vulnerabilities may still exist if they don't meet high/critical threshold. No formal SBOM or continuous monitoring beyond npm audit.

### 6. AI Data Minimization Risk

**Description:** AI chat could inadvertently send sensitive user data to third-party AI providers.

**Mitigation:** AI chat context limited to count-only data (notesCount, tasksCount, remindersCount, devicesCount). No note/task content, no PII, no secret data sent to AI providers.

**Residual Risk:** User may include sensitive information in natural language prompts (intentional user action, not automated).

### 7. Manual Release Integrity Risk

**Description:** Manual release process could introduce errors or tampering.

**Mitigation:** SHA256 checksums for installer verification. Git-based release evidence tracking. Manual upload to separate repository (toadjo/Personal-Assistant-R). Versioned release artifacts.

**Residual Risk:** No code signing (Windows certificate unavailable). No formal release approval process. No automated release pipeline.

### 8. Renderer Process Compromise

**Description:** Malicious code in renderer process could exploit Electron APIs.

**Mitigation:** Sandbox enabled for BrowserWindow. ContextBridge for secure IPC. Hardened CSP in packaged builds (explicit sources, no eval). No Node.js access in renderer.

**Residual Risk:** Zero-day vulnerabilities in Electron or sandbox bypass could still be exploited. Regular Electron updates mitigate this.

### 9. Secret Leakage in Logs

**Description:** Error logs and crash reports could contain secrets.

**Mitigation:** v2.1.4 implements secret redaction in renderer error persistence before database storage. Main process logs avoid logging secrets.

**Residual Risk:** No automated scanning of all log outputs. Manual review required for new logging code.

### 10. Local Database Corruption

**Description:** SQLite database could become corrupted due to software bugs, disk failures, or power loss.

**Mitigation:** SQLite has built-in ACID properties and crash recovery. No automatic backup implemented.

**Residual Risk:** Data loss if database corruption occurs and no recent backup exists. User must manually export backups.

### 11. Unauthorized Device Access

**Description:** Unauthorized user could access the application if device is left unlocked or compromised.

**Mitigation:** No app-level authentication (local-first design). User responsible for OS-level access controls (Windows Hello, device encryption, screen lock).

**Residual Risk:** No app-level password or biometric authentication. Relies entirely on OS security.

### 12. Supply Chain Attack

**Description:** Malicious actor could compromise a dependency or npm package.

**Mitigation:** npm audit gate, public source code, manual review of dependencies. Lockfile pinning.

**Residual Risk:** No formal SBOM, no continuous supply chain monitoring, no signed packages. Could be vulnerable to sophisticated supply chain attacks.

### 13. Backup File Exposure

**Description:** Backup files could be intercepted, stolen, or exposed if stored insecurely.

**Mitigation:** Secrets excluded from backup export. No automatic backup upload to cloud.

**Residual Risk:** User responsible for secure storage of backup files. No automatic encryption of backup files.

## Risk Treatment Summary

**Fully Mitigated Risks:** 5

- Legacy plaintext secrets
- Backup data exposure
- AI data minimization risk
- Manual release integrity risk
- Secret leakage in logs

**Partially Mitigated Risks:** 5

- Local database exposure
- Third-party provider risk
- Dependency vulnerability risk
- Renderer process compromise
- Supply chain attack

**Not Mitigated Risks:** 3

- Local database corruption
- Unauthorized device access
- Backup file exposure (user responsibility)

**Overall Risk Assessment:** Medium
The application implements reasonable security controls for a local-first desktop application. The primary residual risks are:

1. User responsibility for device security and backup management (inherent to local-first design)
2. Lack of organizational processes (not applicable to single-user desktop app)
3. Supply chain risk (mitigated by npm audit but no formal SBOM)

The risk level is acceptable for the current scope (personal productivity tool, no organizational data, no accounts, local-first design).
