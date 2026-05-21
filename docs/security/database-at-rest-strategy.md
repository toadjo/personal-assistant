# Database-at-Rest Strategy

## Current State

The Personal Assistant application uses better-sqlite3 to store local data in plaintext. The database file (`assistant.db`) is stored in the OS-specific application data directory without encryption.

**Current Encryption Status:**

- Notes, Tasks, Reminders: Plaintext
- Automation Rules: Plaintext
- Application Settings: Plaintext
- Execution Logs: Plaintext (redacted for secrets before persistence)
- Renderer Error Logs: Plaintext (redacted for secrets before persistence)

**Secret Data (Already Encrypted):**

- AI API Keys: Encrypted via Electron safeStorage (Windows DPAPI, macOS Keychain, Linux libsecret)
- Home Assistant Token: Encrypted via Electron safeStorage
- Supabase Keys: Encrypted via Electron safeStorage
- Supabase Session Token: Encrypted via Electron safeStorage

## Corporate Mode Decision

For corporate deployments, the database should be encrypted at rest to protect user data from unauthorized access if the device is compromised or stolen.

**Strategy:**

1. **Short-term (Current Phase):** Document the requirement and risk. Database remains in plaintext.
2. **Medium-term (Future Enhancement):** Implement database encryption using SQLCipher or similar.
3. **Long-term (Future Enhancement):** Consider hardware-backed encryption (Windows BitLocker, macOS FileVault) for the entire data directory.

## Implementation Options

### Option 1: SQLCipher

- **Pros:** Industry-standard SQLite encryption, transparent to application code, well-maintained
- **Cons:** Requires recompiling better-sqlite3 with SQLCipher support, increases build complexity
- **Implementation:** Replace better-sqlite3 with better-sqlite3 compiled with SQLCipher support

### Option 2: Application-Level Encryption

- **Pros:** No dependency on SQLCipher, full control over encryption key management
- **Cons:** Performance impact (encrypt/decrypt on every read/write), complex key management
- **Implementation:** Encrypt database file on app shutdown, decrypt on app startup using safeStorage-derived key

### Option 3: OS-Level Full Disk Encryption

- **Pros:** Transparent to application, no code changes required, hardware-accelerated
- **Cons:** Requires IT policy enforcement, not application-controlled, may not protect against running process access
- **Implementation:** Document requirement for Windows BitLocker / macOS FileVault / Linux LUKS

## Recommended Approach

**For Corporate Mode (Phase 3.3):**

- Document that database encryption at rest is a security requirement for corporate deployments
- Recommend IT administrators enforce OS-level full disk encryption (BitLocker/FileVault/LUKS)
- Document that application-level database encryption (SQLCipher) is a future enhancement

**Residual Risk:**
Without database encryption at rest, the following risks remain in corporate mode:

- Unauthorized access to local data if device is stolen and OS encryption is not enforced
- Data exfiltration via physical access to the device
- Malware with user-level privileges can read the database file

**Mitigation:**

- Enforce OS-level full disk encryption via IT policy
- Use Windows ACLs to restrict access to application data directory
- Implement database encryption (SQLCipher) as a future enhancement

## Future Work

- [ ] Evaluate SQLCipher integration with better-sqlite3
- [ ] Implement database encryption key derivation from user credentials or safeStorage
- [ ] Add migration path from plaintext to encrypted database
- [ ] Document database encryption in corporate deployment guide
- [ ] Add database encryption verification to security audit
