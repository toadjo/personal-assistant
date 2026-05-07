# Worker Handoff

## Repo and environment

- On Windows PowerShell, use `npm.cmd` (not bare `npm`)
- Quick state check command: `npm.cmd run handoff`

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

## Continuation instructions after cleanup slice (2026-05-07)

**Completed cleanup work:**

- Fixed mojibake strings (replaced em dashes with ASCII hyphens in UI/dialog strings across 17 source files)
- Audited and cleaned src/renderer/styles.css (removed duplicate CSS blocks, ~50 unused classes including welcome-related classes)
- Reviewed AssistantShell and global styles (no visual clutter reduction needed)
- Reviewed Electron boundary code (security hardening is well-implemented: IPC sender validation, navigation allowlist, CSP, preload exposure)
- Confirmed security tests are in place (security.test.ts, preload-channels.test.ts)
- Updated WORKER_HANDOFF.md to remove machine-specific paths
- Removed unused components (AppHeader.tsx, WelcomeBar.tsx)
- Removed unused CSS classes (.statAddOn, .statAddOnLive, .welcomeRow, .welcomeText, .welcomeNameForm, .welcomeNameInput, .welcomeSave, .welcomeClear, .welcomeHint)
- All static checks passed (lint, typecheck, check:preload-ipc, test: 215 tests passed)
- Preload IPC file is clean (check:preload-ipc passed)
- Build and smoke checks passed (build, test:smoke, test:preload-electron)
- Visual QA passed (no regressions found at 1400px, 1024px, narrow widths; toolbar does not overflow; all panels look professional)
- Cleanup baseline committed as `6826393 chore: clean up ui baseline`

**Current state:**

- Branch: `main`
- Tracking branch: `origin/main`
- HEAD: `6826393`
- Package version: `1.4.2`
- Working tree: clean

**Next actions:**

1. ~~Visual QA pass - launch app locally and inspect desktop widths (1400px, 1024px, mobile/narrow)~~ (completed - no regressions found)
2. ~~Confirm toolbar does not overflow with all status chips visible~~ (completed - no overflow)
3. ~~Confirm panels look professional after CSS deletion (notes, reminders, tasks, today dashboard, calendar, onboarding, about)~~ (completed - all panels look professional)
4. ~~Fix only visible layout regressions, spacing problems, clipping, or inconsistent button/card styling~~ (not needed - no regressions)
5. ~~Second dead-code pass - search for unused renderer components, hooks, CSS classes, constants~~ (completed - removed AppHeader.tsx, WelcomeBar.tsx, and associated CSS)
6. ~~Security confidence pass - run `npm audit --audit-level=high`~~ (completed)
7. ~~If visual or CSS changes made: run `npm.cmd run build`, `npm.cmd run test:smoke`, `npm.cmd run test:preload-electron`~~ (completed - all passed)
8. ~~Commit cleanup baseline~~ (completed - `6826393 chore: clean up ui baseline`)
9. ~~Push cleanup baseline to `origin/main`~~ (completed)
10. ~~Fix handoff documentation accuracy~~ (completed - updated HEAD, date, removed "Ready for commit")
11. ~~Reconcile release docs with workflow behavior~~ (completed - README.md now includes macOS, corrected PUBLIC_RELEASE_TOKEN behavior)

**Security audit findings (npm audit --audit-level=high):**

12 vulnerabilities (2 low, 10 high) - all in build-tool dependencies, not runtime app:

- electron@35.0.0: 16 high-severity CVEs (current version is below vulnerable threshold <=39.8.4)
- @tootallnate/once: Incorrect Control Flow Scoping (electron-builder transitive dependency)
- tar: Arbitrary File Creation/Overwrite vulnerabilities (electron-builder transitive dependency)

These are build-tool chain vulnerabilities (electron-builder, electron) that do not affect the runtime application. The app uses Electron 35.0.0 which has known CVEs but these are Electron framework issues, not application code issues. Upgrading Electron to 42.0.0 would require significant testing. Documented separately from runtime app risk.

**Local Windows checks before handing off again:**

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run check:preload-ipc
npm.cmd run test
npm.cmd run build
npm.cmd run test:smoke
npm.cmd run test:preload-electron
```

Browser and Electron E2E remain useful before shipping, but may require Playwright browsers and an Electron-capable local environment:

```powershell
npm.cmd run test:e2e
npm.cmd run test:e2e:electron
```

**Notes for the next worker:**

- Release publishing now depends on Windows, Linux, and macOS package jobs in `.github/workflows/release.yml`.
- Public release mirroring is guarded by `PUBLIC_RELEASE_TOKEN`; current workflow logic appears to skip public mirroring when it is unset rather than fail immediately. Treat `WORKER_HANDOFF.md` and the workflow file as the source to reconcile if the intended behavior is strict fail-fast.
- README release automation text may lag behind the workflow because it still describes Windows plus Linux assets in one section. Verify before editing docs.
