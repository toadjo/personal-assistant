# Data and Asset Inventory

This document catalogs all data and assets managed by Personal Assistant. The application is **not ISO 27001 certified** - this is a readiness assessment only.

## Data Classification

### Classification Scheme

- **Local Data**: Never leaves the user's device, stored in SQLite database
- **Secret Data**: Sensitive credentials stored with OS encryption (safeStorage)
- **Cloud Data**: Optional data sent to third-party services when user explicitly enables features

## Local Data Assets

### Notes

| Attribute      | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Data Type      | User-created notes content and metadata                  |
| Storage        | SQLite database (local)                                  |
| Encryption     | None (local-only data)                                   |
| Retention      | Until user deletes                                       |
| Access Control | Single-user (no multi-user access)                       |
| Backup         | User can export to JSON (excluded from automated backup) |
| PII            | None (user's own personal data)                          |

### Tasks

| Attribute      | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Data Type      | User-created tasks content and metadata                  |
| Storage        | SQLite database (local)                                  |
| Encryption     | None (local-only data)                                   |
| Retention      | Until user deletes or marks complete                     |
| Access Control | Single-user (no multi-user access)                       |
| Backup         | User can export to JSON (excluded from automated backup) |
| PII            | None (user's own personal data)                          |

### Reminders

| Attribute      | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Data Type      | User-created reminders content and metadata              |
| Storage        | SQLite database (local)                                  |
| Encryption     | None (local-only data)                                   |
| Retention      | Until user deletes or marks done                         |
| Access Control | Single-user (no multi-user access)                       |
| Backup         | User can export to JSON (excluded from automated backup) |
| PII            | None (user's own personal data)                          |

### Automation Rules

| Attribute      | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Data Type      | User-created automation rules and execution logs         |
| Storage        | SQLite database (local)                                  |
| Encryption     | None (local-only data)                                   |
| Retention      | Until user deletes                                       |
| Access Control | Single-user (no multi-user access)                       |
| Backup         | User can export to JSON (excluded from automated backup) |
| PII            | None (user's own personal data)                          |

### Application Settings

| Attribute      | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Data Type      | App preferences, theme selection, UI settings            |
| Storage        | SQLite database (local)                                  |
| Encryption     | None (non-sensitive settings)                            |
| Retention      | Until user changes or uninstalls                         |
| Access Control | Single-user                                              |
| Backup         | User can export to JSON (excluded from automated backup) |
| PII            | None                                                     |

### Automation Execution Logs

| Attribute      | Value                                                     |
| -------------- | --------------------------------------------------------- |
| Data Type      | Rule execution timestamps, error messages, retry metadata |
| Storage        | SQLite database (local)                                   |
| Encryption     | None (operational logs)                                   |
| Retention      | Until user deletes the rule or app is uninstalled         |
| Access Control | Single-user                                               |
| Backup         | User can export to JSON (excluded from automated backup)  |
| PII            | None (error messages may contain user data if rule fails) |

### Renderer Error Logs

| Attribute      | Value                                            |
| -------------- | ------------------------------------------------ |
| Data Type      | Renderer process error messages and stack traces |
| Storage        | SQLite database (local)                          |
| Encryption     | None (redacted for secrets before persistence)   |
| Retention      | Until user clears errors or app is uninstalled   |
| Access Control | Single-user                                      |
| Backup         | Not included in export                           |
| PII            | None (redacted for secrets)                      |

## Secret Data Assets

### AI API Keys

| Attribute          | Value                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Data Type          | API keys for OpenAI or Anthropic                                                             |
| Storage            | OS encryption via Electron safeStorage API                                                   |
| Encryption         | OS-level encryption (Windows DPAPI, macOS Keychain, Linux libsecret)                         |
| Retention          | Until user deletes or changes key                                                            |
| Access Control     | Single-user, encrypted at rest                                                               |
| Backup             | Excluded from backup export                                                                  |
| Cloud Transmission | Sent to AI provider when user asks questions (encrypted in transit via HTTPS)                |
| PII                | None (API key is not PII)                                                                    |
| Data Minimization  | AI context limited to count-only data (notesCount, tasksCount, remindersCount, devicesCount) |

### Home Assistant Token

| Attribute          | Value                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------- |
| Data Type          | Long-lived access token for Home Assistant API                                          |
| Storage            | OS encryption via Electron safeStorage API                                              |
| Encryption         | OS-level encryption (Windows DPAPI, macOS Keychain, Linux libsecret)                    |
| Retention          | Until user deletes or changes token                                                     |
| Access Control     | Single-user, encrypted at rest                                                          |
| Backup             | Excluded from backup export                                                             |
| Cloud Transmission | Sent to Home Assistant server when user syncs entities (encrypted in transit via HTTPS) |
| PII                | None (token is not PII)                                                                 |
| Data Minimization  | Only entity IDs and states synced, not user data                                        |

### Supabase Anon Key

| Attribute          | Value                                                                          |
| ------------------ | ------------------------------------------------------------------------------ |
| Data Type          | Anonymous public key for Supabase client                                       |
| Storage            | OS encryption via Electron safeStorage API                                     |
| Encryption         | OS-level encryption (Windows DPAPI, macOS Keychain, Linux libsecret)           |
| Retention          | Until user deletes or changes key                                              |
| Access Control     | Single-user, encrypted at rest                                                 |
| Backup             | Excluded from backup export                                                    |
| Cloud Transmission | Sent to Supabase when user uses team features (encrypted in transit via HTTPS) |
| PII                | None (anon key is not PII)                                                     |
| Data Minimization  | Only team workspace data synced, not local notes/tasks/reminders               |

### Supabase Session Token

| Attribute          | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| Data Type          | Session token for authenticated Supabase user                        |
| Storage            | OS encryption via Electron safeStorage API                           |
| Encryption         | OS-level encryption (Windows DPAPI, macOS Keychain, Linux libsecret) |
| Retention          | Until user logs out or session expires                               |
| Access Control     | Single-user, encrypted at rest                                       |
| Backup             | Excluded from backup export                                          |
| Cloud Transmission | Sent to Supabase for authentication (encrypted in transit via HTTPS) |
| PII                | None (session token is not PII)                                      |
| Data Minimization  | Only team workspace data synced, not local notes/tasks/reminders     |

## Cloud Data Assets (Optional)

### Supabase Team Workspaces

| Attribute          | Value                                                |
| ------------------ | ---------------------------------------------------- |
| Data Type          | Team workspace data (shared notes, tasks, reminders) |
| Storage            | Supabase PostgreSQL (cloud)                          |
| Encryption         | Supabase manages encryption at rest                  |
| Retention          | Until user deletes data or deletes workspace         |
| Access Control     | Team members (via Supabase Row Level Security)       |
| Backup             | Supabase manages backups                             |
| Cloud Transmission | Synced to Supabase when user enables team mode       |
| PII                | User's own data (shared with team)                   |
| Data Minimization  | Only data user explicitly adds to team workspaces    |

### AI Provider API Calls

| Attribute          | Value                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Data Type          | Natural language prompts and AI responses                                                                             |
| Storage            | Not stored by app (ephemeral)                                                                                         |
| Encryption         | HTTPS in transit                                                                                                      |
| Retention          | Not stored by app (provider may retain logs)                                                                          |
| Access Control     | Single-user session                                                                                                   |
| Backup             | Not applicable                                                                                                        |
| Cloud Transmission | Sent to AI provider when user asks questions                                                                          |
| PII                | None (user's own data)                                                                                                |
| Data Minimization  | Context limited to count-only data (notesCount, tasksCount, remindersCount, devicesCount). No note/task content sent. |

### Home Assistant API Calls

| Attribute          | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| Data Type          | Entity state queries, toggle commands                   |
| Storage            | Not stored by app (ephemeral)                           |
| Encryption         | HTTPS in transit                                        |
| Retention          | Not stored by app (Home Assistant stores entity states) |
| Access Control     | Single-user session                                     |
| Backup             | Not applicable                                          |
| Cloud Transmission | Sent to Home Assistant server when user syncs entities  |
| PII                | None (entity IDs and states are not PII)                |
| Data Minimization  | Only entity IDs and states synced, not user data        |

## System Assets

### SQLite Database Files

| Attribute      | Value                                               |
| -------------- | --------------------------------------------------- |
| Asset Type     | Database files                                      |
| Location       | App data directory (OS-specific)                    |
| Windows        | `%APPDATA%\Personal Assistant\`                     |
| macOS          | `~/Library/Application Support/Personal Assistant/` |
| Linux          | `~/.config/Personal Assistant/`                     |
| File Name      | `assistant.db`                                      |
| Encryption     | None (local-only data)                              |
| Access Control | OS file system permissions                          |
| Backup         | User can export to JSON                             |

### Application Executable

| Attribute      | Value                                         |
| -------------- | --------------------------------------------- |
| Asset Type     | Windows installer                             |
| Location       | GitHub releases (toadjo/Personal-Assistant-R) |
| File Name      | `Personal Assistant Setup 2.1.4.exe`          |
| Encryption     | None (installer)                              |
| Signing        | None (no code signing certificate)            |
| Integrity      | SHA256 checksum provided for verification     |
| Access Control | Public download (no authentication required)  |

### Source Code Repository

| Attribute      | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Asset Type     | Git repository                                                     |
| Location       | https://github.com/toadjo/Personal-Assistant                       |
| Access Control | Public (read-only)                                                 |
| License        | MIT                                                                |
| PII            | None                                                               |
| Sensitive Data | No secrets in repository (all secrets stored locally or encrypted) |

## Asset Summary

| Category           | Count | Storage Location            | Encryption          |
| ------------------ | ----- | --------------------------- | ------------------- |
| Local Data Assets  | 7     | SQLite database             | None (local-only)   |
| Secret Data Assets | 4     | OS encryption (safeStorage) | OS-level encryption |
| Cloud Data Assets  | 3     | Third-party providers       | Provider encryption |
| System Assets      | 3     | Local / GitHub              | None                |

## Data Flow Diagram

```
User Input → Renderer (React UI)
    ↓
IPC → Main Process (Electron)
    ↓
SQLite Database (Local)

Optional Cloud Connections:
AI API Key → safeStorage → AI Provider (count-only context)
HA Token → safeStorage → Home Assistant Server
Supabase Keys → safeStorage → Supabase Cloud
```

## Data Retention Policy

**Local Data:** Retained until user deletes or uninstalls app. No automated deletion.

**Secret Data:** Retained until user deletes or changes. Encrypted at rest.

**Cloud Data:** Retained according to third-party provider policies (Supabase, AI providers, Home Assistant). App does not control cloud retention.

**Logs:** Retained in SQLite until user clears errors or uninstalls app. Redacted for secrets before persistence.

**Backups:** User-managed. No automatic backup or retention. User responsible for backup file lifecycle.

## Data Subject Rights

As a local-first application with no accounts and no PII collection, GDPR data subject rights are largely not applicable. Users have full control over their data:

- **Access:** Users can view all their data in the app
- **Deletion:** Users can delete notes, tasks, reminders, rules at any time
- **Export:** Users can export backup JSON (secrets excluded) at any time
- **Portability:** Backup JSON can be imported on another device (secrets must be re-entered)
- **Correction:** Users can edit any of their data at any time

No formal data subject request process is implemented (no accounts, no contact point for requests).
