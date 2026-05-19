# Security Overview

## Scope

Personal Assistant is a local-first desktop application for personal productivity management. It runs entirely on the user's machine with optional cloud connections for team collaboration and AI features.

## Architecture

### Local-First Design

- **Primary storage**: SQLite database stored locally on the user's machine
- **No cloud sync**: User data (notes, tasks, reminders, automation rules) never leaves the local device
- **No accounts**: No user accounts, authentication, or centralized data storage
- **Offline-first**: Full functionality available without internet connectivity

### Electron Architecture

The application uses Electron's multi-process model:

- **Main process** (`src/main/`): Manages windows, system tray, IPC handlers, SQLite database, and security controls
- **Renderer process** (`src/renderer/`): React-based UI with no direct Node.js access
- **Preload bridge** (`src/main/preload.ts`): Securely exposes limited APIs to renderer via contextBridge

### Security Boundaries

**Main/Renderer Boundary:**

- Renderer has no Node.js access (sandbox enabled)
- All privileged operations require IPC calls to main process
- ContextBridge ensures only explicitly exposed APIs are available to renderer
- Content Security Policy (CSP) restricts script sources in packaged builds

**Local Data Boundary:**

- SQLite database files are stored in app data directory
- Database is not encrypted at rest (local-only data)
- User is responsible for OS-level file system access controls

**Optional Cloud Connections:**

- Supabase: Optional team mode (anon key + session token stored with OS encryption)
- OpenAI/Anthropic: Optional AI providers (API keys stored with OS encryption)
- Home Assistant: Optional home automation (token stored with OS encryption)

## Data Types

### Local Data (Never Leaves Device)

- Notes content and metadata
- Tasks content and metadata
- Reminders content and metadata
- Automation rules and execution logs
- Local SQLite database files
- Application settings and preferences

### Secret Data (Stored with OS Encryption)

- AI API keys (OpenAI, Anthropic)
- Home Assistant tokens
- Supabase anon key and session token
- Team session tokens

**Encryption:** Uses Electron's `safeStorage` API which leverages OS-level encryption:

- Windows: DPAPI (Data Protection API)
- macOS: Keychain
- Linux: libsecret (if available)

**Fail-closed behavior:** If OS encryption is unavailable, secret storage fails rather than falling back to plaintext. Users are prompted to ensure their system supports secure storage.

### Cloud Data (Optional)

- Supabase team workspaces (only when user explicitly enables team mode)
- AI provider API calls (only when user explicitly configures AI)
- Home Assistant connectivity (only when user explicitly configures HA)

## Security Controls

### Implemented Controls

**Application Security:**

- Sandbox enabled for BrowserWindow
- ContextBridge for secure IPC
- Hardened CSP in packaged builds
- No Node.js access in renderer
- Fail-closed secret storage
- Secret redaction in logs and error reports
- Backup export excludes secret settings
- Backup import rejects secret settings

**Dependency Security:**

- `npm audit --audit-level=high` as CI gate
- Regular dependency updates
- Electron runtime upgraded to latest stable (41.0.0)
- Native module (better-sqlite3) rebuilt for Electron

**Release Security:**

- Manual Windows-only release process
- SHA256 checksums for installer verification
- Git-based release evidence tracking
- No automatic public mirroring (manual upload to separate repo)

### Organizational Controls (Not Implemented)

These would require an organizational ISMS for ISO 27001 certification:

- Formal security policy documentation
- Security awareness training program
- Incident response procedures
- Access control policies
- Vendor risk management program
- Periodic security reviews
- Business continuity planning
- Physical security controls

## Threat Model

### Primary Threats Addressed

1. **Local data exposure**: Mitigated by OS-level file system access controls and app sandbox
2. **Secret leakage in logs**: Mitigated by redaction before persisting errors/logs
3. **Secret exposure in backups**: Mitigated by excluding secrets from export and rejecting secrets in import
4. **Renderer compromise**: Mitigated by sandbox, contextBridge, and CSP
5. **Dependency vulnerabilities**: Mitigated by CI audit gate and regular updates

### Limitations

1. **Database encryption at rest**: Not implemented (local-only data; user responsible for OS controls)
2. **Multi-user access control**: Not implemented (single-user desktop app)
3. **Remote wipe/revocation**: Not implemented (local-first design)
4. **Transport encryption for local IPC**: Not needed (local process communication)

## Compliance Status

**ISO 27001 Readiness:** The application implements many technical controls aligned with ISO 27001:2022 Annex A, but full certification requires an organizational ISMS, formal policies, training, and audit processes beyond the scope of this application.

**GDPR Considerations:** As a local-first application with no accounts and no personal data collection, GDPR is largely not applicable. Users process their own personal data locally on their own machines.

**OWASP for Desktop:** The application follows OWASP guidelines for Electron applications including sandboxing, secure IPC, and CSP hardening.
