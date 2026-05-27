# Release Checklist

This checklist covers manual verification for releases. The current operating path is Windows-first manual release.

## Platform Variants

The app behaves differently across platforms depending on system tray availability:

- **Windows**: Tray always available, app hides to tray on background
- **macOS**: Tray always available, app hides to tray on background
- **Linux with tray**: Tray available, app hides to tray on background
- **Linux without tray**: Tray unavailable, app minimizes to taskbar on background

## Windows-Only Manual Release (Current Operating Path)

Use this path for Windows releases and publish other platform assets after their packaging validation passes. See [`RELEASING.md`](./RELEASING.md) for the full local manual release flow.

- [ ] Confirm the release will ship Windows-only and document this in release notes
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`
- [ ] Run `npm run build` and `npm run test:smoke`
- [ ] Run `npm run release:build -- -Version X.Y.Z -SkipVersionBump -ReplaceExisting`
- [ ] Verify `release/vX.Y.Z/` contains the Windows `.exe`, `.blockmap`, and `latest.yml`
- [ ] Skip `npm run dist:mac` and `npm run dist:linux` checks below
- [ ] Skip the macOS and Linux platform-specific testing sections below
- [ ] Tag, push, and upload only Windows assets to the GitHub Release
- [ ] Release notes explicitly state which platform assets are included

## Pre-Release Verification

### Build Verification

- [ ] Run `npm run build` successfully
- [ ] Run `npm run dist:win` (Windows) and verify `.exe` builds
- [ ] Run `npm run dist:mac` (macOS) and verify `.dmg` builds
- [ ] Run `npm run dist:linux` (Linux) and verify `.AppImage` builds
- [ ] Verify version number in `package.json` is correct
- [ ] Verify release notes are ready

### Automated Tests

- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run typecheck` - no errors
- [ ] Run `npm test` - all tests pass
- [ ] Run Electron e2e tests (if CI lacks packaging coverage)

## Platform-Specific Testing

### Windows (Tray Available)

- [ ] Install the `.exe` on a clean Windows machine
- [ ] Launch app - tray icon appears in system tray
- [ ] Close the desk window - app stays running, window hides to tray
- [ ] Click tray icon - desk window shows/focuses
- [ ] Right-click tray - menu shows (Open desk, Open Household, Quick note, About, Quit)
- [ ] Use `Ctrl+Shift+H` shortcut - window hides to tray
- [ ] Press Escape with empty command input - window hides to tray
- [ ] Quit from tray menu - app fully exits
- [ ] Verify app survives Windows sleep/resume (tray icon persists)

### macOS (Tray Available)

- [ ] Install the `.dmg` on a clean macOS machine
- [ ] Launch app - tray icon appears in menu bar
- [ ] Close the desk window - app stays running, window hides to tray
- [ ] Click tray icon - desk window always shows/focuses (no toggle)
- [ ] Right-click tray - menu shows (Open desk, Open Household, Quick note, About, Quit)
- [ ] Use `Cmd+Shift+H` shortcut - window hides to tray
- [ ] Press Escape with empty command input - window hides to tray
- [ ] Quit from tray menu - app fully exits

### Linux with Tray (e.g., GNOME/KDE with tray extension)

- [ ] Install the `.AppImage` on a Linux system with tray support
- [ ] Launch app - tray icon appears in system tray
- [ ] Close the desk window - app stays running, window hides to tray
- [ ] Click tray icon - desk window toggles visibility
- [ ] Right-click tray - menu shows (Open desk, Open Household, Quick note, About, Quit)
- [ ] Use `Ctrl+Shift+H` shortcut - window hides to tray
- [ ] Press Escape with empty command input - window hides to tray
- [ ] Quit from tray menu - app fully exits

### Linux without Tray (e.g., GNOME without tray extension)

- [ ] Install the `.AppImage` on a Linux system without tray support
- [ ] Launch app - no tray icon (expected)
- [ ] Close the desk window - app stays running, window minimizes to taskbar
- [ ] Click taskbar entry - desk window restores from taskbar
- [ ] Use `Ctrl+Shift+H` shortcut - window minimizes to taskbar
- [ ] Press Escape with empty command input - window minimizes to taskbar
- [ ] Verify window is recoverable from taskbar at all times
- [ ] Quit explicitly (right-click taskbar entry and choose Quit/Close, or use `Alt+F4` on the focused window) - app fully exits

## Cross-Platform Functional Testing

### Core Features (All Platforms)

- [ ] Create a note - note appears in list
- [ ] Create a task - task appears in list
- [ ] Create a reminder - reminder appears in list
- [ ] Search notes - search results appear
- [ ] Use command palette - commands execute correctly
- [ ] Open Household window - window opens
- [ ] Link Home Assistant - connection succeeds
- [ ] Toggle HA device - device state changes

### Background Behavior (All Platforms)

- [ ] App stays running after closing desk window
- [ ] App is recoverable (tray or taskbar) after backgrounding
- [ ] Global shortcut (`Ctrl/Cmd+Shift+H`) works
- [ ] Escape key with empty command backgrounds the window
- [ ] Multiple instances prevented (second instance focuses first)

### Error Handling

- [ ] Tray creation failure on Linux logs warning (check console/logs)
- [ ] Tray creation failure on Windows/macOS logs warning (check console/logs)
- [ ] App remains functional even if tray creation fails

## Documentation Verification

- [ ] README.md accurately describes platform behavior
- [ ] Onboarding text mentions Linux taskbar fallback
- [ ] No tray-specific assumptions in user-facing copy
- [ ] Release notes mention platform-specific behavior if relevant

## Post-Release

- [ ] Tag release in Git
- [ ] Upload assets to GitHub release
- [ ] Verify download links work
- [ ] Monitor for platform-specific issues in first 24 hours

## Corporate Security Checklist

This checklist applies to corporate mode deployments. Use this in addition to the standard release checklist above.

### Pre-Release Security Verification

- [ ] Run `npm run security:audit` - no high/critical vulnerabilities
- [ ] Run `npm run security:sbom` - generate Software Bill of Materials
- [ ] Run `npm run security:release-evidence` - generate release evidence
- [ ] Verify security policy controls are enforced (check policy.ts)
- [ ] Verify outbound guard is integrated in all external paths
- [ ] Verify CSP generation uses policy-based connect-src in corporate mode

### Policy File Verification

- [ ] Verify policy file path is correct: `%ProgramData%\PersonalAssistant\policy.json` (Windows)
- [ ] Verify policy file ACLs are set correctly (Administrators write, Users read)
- [ ] Verify policy file is not user-writable in corporate mode
- [ ] Test corporate mode with allowAi=false - AI integration blocked
- [ ] Test corporate mode with allowTeamSync=false - Team sync blocked
- [ ] Test corporate mode with allowHomeAssistant=false - HA blocked
- [ ] Test corporate mode with allowCrashReporting=false - Crash reporting disabled

### Secret Storage Verification

- [ ] Verify AI API keys are encrypted via safeStorage
- [ ] Verify Home Assistant tokens are encrypted via safeStorage
- [ ] Verify Supabase keys are encrypted via safeStorage
- [ ] Verify secure storage unavailability causes fail-closed behavior
- [ ] Test that app rejects plaintext secrets (requires reconnection)

### Backup Security Verification

- [ ] Verify backup export excludes secret settings (ha.token, ai.apiKey, etc.)
- [ ] Verify backup export is encrypted in corporate mode
- [ ] Verify backup import rejects secret settings
- [ ] Test backup import with encrypted backup
- [ ] Verify backup export/import is blocked when policy disallows

### Outbound Network Verification

- [ ] Verify AI provider checks outbound guard before API calls
- [ ] Verify Home Assistant checks outbound guard before fetch calls
- [ ] Verify Supabase client checks outbound guard before connection
- [ ] Test host allowlisting with allowedHosts set
- [ ] Test host allowlisting with empty allowedHosts (blocks all)
- [ ] Verify CSP connect-src matches policy in corporate mode

### Windows Signing Verification

- [ ] Verify Windows signing is enabled in electron-builder config
- [ ] Set CSC_LINK environment variable for signing certificate
- [ ] Set CSC_KEY_PASSWORD environment variable for certificate password
- [ ] Verify signed installer shows valid signature in Windows properties
- [ ] Verify signed installer passes SmartScreen reputation checks

### Documentation Verification

- [ ] Verify database-at-rest strategy is documented
- [ ] Verify residual risks are clearly stated in security docs
- [ ] Verify IT review packet is up to date
- [ ] Verify corporate deployment guide is complete
- [ ] Verify release notes mention security changes
