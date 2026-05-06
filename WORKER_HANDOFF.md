# Worker Handoff

## Repo and environment

- Working repo: `C:\Users\FAMILY PC\Desktop\personal-assistant`
- Do not use: `C:\Users\FAMILY PC\Desktop\project430` (stale non-git copy)
- On Windows PowerShell, use `npm.cmd` (not bare `npm`)

## Release workflow assumptions

- Public repo `toadjo/Personal-Assistant-R` is release-assets-only (no source sync)
- Linux target is AppImage-only for this pass
- Windows installer remains NSIS
- Public mirror requires `PUBLIC_RELEASE_TOKEN`

## Release workflow behavior

- `package-windows`: builds NSIS artifacts and uploads `installer-history/vX.Y.Z/*`
- `package-linux`: builds Linux AppImage artifacts and uploads `release/`
- `publish-releases`: downloads both artifact sets, validates required assets, then publishes/mirrors

Validation and mirroring rules:

- Required before publish: at least one `.exe` and at least one `.AppImage`
- Optional metadata files may be uploaded when present: `.blockmap`, `.yml`, `.AppImage.zsync`
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
