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
- Missing required file classes (`.exe` and/or `.AppImage`)
- Electron version and embedded Node version if failure involves preload/electron launch

## macOS support status (v1.5)

**Current state:**

- Build config exists in `package.json` (DMG/zip targets, universal arch)
- CI workflow has macOS packaging job
- `dist:mac` script exists
- `build/entitlements.mac.plist` created with minimal unsigned entitlements
- `scripts/ensure-mac-icon.mjs` created for .icns generation (macOS-only)
- macOS application menu implemented (app menu with About/Hide/Quit, Window menu with Open Desk/Open Household)
- macOS window lifecycle tightened (activate recreates desk window if destroyed)
- macOS tray click behavior adjusted (always shows/focuses desk window, no toggle)

**Remaining blocker:**

- `assets/app-icon.icns` - required icon file does not exist
  - Generate with `npm run icons:prepare:mac` on macOS
  - Commit the generated .icns to the repository
  - Validate `npm run dist:mac` on macOS or with committed .icns

**Next steps:**

1. ~~Create `build/entitlements.mac.plist` with minimal unsigned entitlements~~ (done)
2. ~~Add macOS icon preparation script or document .icns generation blocker~~ (done)
3. ~~Update `dist:mac` to run icon preparation before electron-builder~~ (done)
4. ~~Implement macOS application menu, window lifecycle, and tray behavior~~ (done)
5. Generate `assets/app-icon.icns` on macOS and commit to repository
6. Validate `npm run dist:mac` reaches electron-builder successfully
