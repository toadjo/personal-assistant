# Release Checklist

This checklist covers manual verification for all platform variants before publishing a release.

## Platform Variants

The app behaves differently across platforms depending on system tray availability:

- **Windows**: Tray always available, app hides to tray on background
- **macOS**: Tray always available, app hides to tray on background
- **Linux with tray**: Tray available, app hides to tray on background
- **Linux without tray**: Tray unavailable, app minimizes to taskbar on background

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
