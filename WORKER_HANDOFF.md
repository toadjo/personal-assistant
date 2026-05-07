# Worker Handoff

## Repo and environment

- Working repo: `C:\Users\ITPC4\Desktop\project 430`
- On Windows PowerShell, use `npm.cmd` (not bare `npm`)

## Release workflow assumptions

- Public repo `toadjo/Personal-Assistant-R` is release-assets-only (no source sync)
- Linux target is AppImage-only for this pass
- Windows installer remains NSIS
- Public mirror requires `PUBLIC_RELEASE_TOKEN`

## Release workflow behavior

- `package-windows`: builds NSIS artifacts and uploads `installer-history/vX.Y.Z/*`
- `package-linux`: builds Linux AppImage artifacts and uploads `release/`
- `package-macos`: builds macOS DMG/zip artifacts and uploads `release/`
- `publish-releases`: downloads Windows, Linux, and macOS artifact sets, validates required assets, then publishes/mirrors

Validation and mirroring rules:

- Required before publish: at least one `.exe`, at least one `.AppImage`, and at least one `.dmg`
- Optional metadata files may be uploaded when present: `.blockmap`, `.yml`, `.AppImage.zsync`, `.zip`
- Public release mirroring fails fast if `PUBLIC_RELEASE_TOKEN` is missing
- Public mirror uses `gh release create` if release does not exist; otherwise `gh release upload --clobber`

## Current feature status (v1.5)

**Away Brief feature (new in v1.5):**

- Local-first "Since You Were Away" brief shows tasks, reminders, and notes changed since last seen
- Uses localStorage key `assistant-desk-last-seen-at` to track last seen timestamp
- Excludes completed tasks and done reminders from overdue/due items
- Defensive timestamp parsing prevents bogus items from invalid dates
- Command aliases: `catch me up`, `what changed`, `since I was away`
- Panel integrated above Focus Brief in desk view
- Tests: 16/16 passing (13 helper tests, 3 panel tests)

## Security audit summary (May 2026)

**Electron boundaries:**

- All IPC handlers use `assertTrustedIpcSender` to validate sender is a trusted window
- Navigation validation via `isTrustedNavigationTarget` only allows file:// URLs or dev server URLs
- Test-only APIs (`setTestHaFetchOverride`, `setTestAutomationActionOverride`) gated by `ELECTRON_E2E_TEST_MODE`

**IPC validation:**

- All renderer-to-main mutations have Zod schemas in `src/main/ipc/schemas.ts`
- Schema validation maps to stable `ipc_validation` errors via `invoke-handle.ts`
- Payload shapes tested in `handler-payload-contract.test.ts`

**SQL injection:**

- All SQL queries use prepared statements with parameter binding (verified in notes.ts, reminders.ts)
- No string interpolation with user input found

**Home Assistant URL policy:**

- `assertHomeAssistantBaseUrl` enforces HTTPS for public hosts
- HTTP only allowed for localhost/private LAN (RFC1918, .local, ::1, fe80:/fc/fd ranges)
- Logs warning when HTTP is used on local networks

**Secrets handling:**

- Home Assistant token stored via Electron's `safeStorage` when available
- Fallback to plaintext with warning when encryption unavailable
- Encrypted tokens prefixed with `sse1:` for identification

## Dependency Risk Register

| Package          | Current Version | Vulnerability                 | Toolchain Area  | Blocker                                   | Next Retry Condition                                                  |
| ---------------- | --------------- | ----------------------------- | --------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| electron         | 35.0.0          | 10 high vulnerabilities       | Build/runtime   | better-sqlite3 v11.8.1 incompatibility    | Test latest better-sqlite3, then retry Electron 42 in separate branch |
| electron-builder | 25.1.8          | 2 low vulnerabilities         | Build packaging | Dependent on Electron upgrade             | Retry after Electron upgrade succeeds                                 |
| tar              | 6.2.1           | Multiple high vulnerabilities | Build toolchain | Transitive dependency of electron-builder | Will resolve with Electron/electron-builder upgrade                   |

**Known vulnerabilities:**

- `npm audit --audit-level=high` reports 12 vulnerabilities in build dependencies (electron, tar, electron-builder)
- These are in the build toolchain, not in app runtime dependencies
- Electron 42 upgrade attempted but failed due to better-sqlite3 native module incompatibility
- better-sqlite3 v11.8.1 cannot be rebuilt against Electron 42 (v8 API changes)
- Reverted to electron@35.0.0 and electron-builder@25.1.8
- package-lock.json reverted to cc691de to remove failed upgrade churn

## Full audit command sequence (Windows)

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run check:preload-ipc
npm.cmd run test -- --coverage
npm.cmd run build
npm.cmd run test:smoke
npm.cmd run test:preload-electron
npm.cmd run test:e2e
npm.cmd run test:e2e:electron
npm.cmd audit --audit-level=high
```

## Stop/report rule

Stop immediately and report full diagnostics if release packaging or mirroring fails, including:

- Exact command used
- Relevant environment values (`PUBLIC_RELEASE_TOKEN` set/unset)
- Validated asset list selected for publish
- Missing required file classes (`.exe`, `.AppImage`, and/or `.dmg`)
- Electron version and embedded Node version if failure involves preload/electron launch

## macOS support status (v1.5)

**Current state:**

- Build config exists in `package.json` (DMG/zip targets, universal arch)
- CI workflow has macOS packaging job
- `dist:mac` script exists
- `build/entitlements.mac.plist` created with minimal unsigned entitlements
- `scripts/ensure-mac-icon.mjs` created for cross-platform .icns generation from `assets/app-icon.png`
- `assets/app-icon.icns` generated and committed
- macOS application menu implemented (app menu with About/Hide/Quit, Window menu with Open Desk/Open Household)
- macOS window lifecycle tightened (activate recreates desk window if destroyed)
- macOS tray click behavior adjusted (always shows/focuses desk window, no toggle)

**Remaining validation:**

- Validate `npm run dist:mac` on macOS or GitHub Actions macOS runner.
- Use the `Validate macOS package` workflow for safe validation-only runs (does not publish releases).
- Confirm release output includes at least one `.dmg` and at least one `.zip`.

**Next steps:**

1. ~~Create `build/entitlements.mac.plist` with minimal unsigned entitlements~~ (done)
2. ~~Add macOS icon preparation script or document .icns generation blocker~~ (done)
3. ~~Update `dist:mac` to run icon preparation before electron-builder~~ (done)
4. ~~Implement macOS application menu, window lifecycle, and tray behavior~~ (done)
5. ~~Generate `assets/app-icon.icns` and commit to repository~~ (done)
6. Validate `npm run dist:mac` reaches electron-builder successfully
