# Personal Assistant

Windows-first tray personal assistant MVP built with Electron + React + TypeScript.

## Features

- System tray app with command launcher hints
- Local notes and reminders stored in SQLite
- Desktop notifications for due reminders
- Home Assistant settings, connectivity test, entity sync, and toggle actions
- Time-based automation rules with execution logs

## Run

```bash
npm install
npm run dev
```

## Release Packaging (Windows)

Versioned installer outputs now live under:

- `release/v<version>/` (full electron-builder output for that version)
- `installer-history/v<version>/` (copied installer artifacts: `.exe`, `.blockmap`, `.yml`)

These folders are ignored by git so local/repeatable installer builds stay out of normal source-control flow.

### Build a versioned installer

```powershell
npm run release:build -- -Version 1.0.0
```

Notes:

- Accepts `1.0.0` or `v1.0.0`.
- Defaults to `package.json` version if `-Version` is omitted.
- Updates `package.json` version to match (unless you pass `-SkipVersionBump`).
- Runs smoke checks by default (skip with `-SkipSmoke`).
- Refuses to overwrite an existing `release/v<version>` by default (opt in with `-ReplaceExisting`).
- Validates clean git state by default (opt out with `-AllowDirtyGit` for local-only iterations).
- Validates required commands (`npm`, `npx`) and stops immediately if any release command fails.
- Uses a staging output directory first, then moves artifacts into `release/v<version>` only after a successful build.
- Validates that installer artifacts exist and fails if no `.exe` was produced.

Usage:

```powershell
npm run release:build -- [-Version <x.y.z|vx.y.z>] [-SkipVersionBump] [-SkipSmoke] [-ReplaceExisting] [-AllowDirtyGit]
```

Examples:

```powershell
# Use package.json version automatically
npm run release:build

# Keep current package.json version, just package
npm run release:build -- -Version 1.1.0 -SkipVersionBump

# Package without smoke validation
npm run release:build -- -Version 1.1.1 -SkipSmoke

# Rebuild the same version in place (replaces existing versioned output/history)
npm run release:build -- -Version 1.1.1 -ReplaceExisting
```

### Cleanup old artifacts

```powershell
# Keep the newest 3 release/history versions (default behavior)
npm run release:clean

# Keep newest 5 versions
npm run release:clean -- -Keep 5

# Remove everything under release/ and installer-history/
npm run release:clean:all

# Full cleanup with explicit confirmation flag
npm run release:clean -- -All -ConfirmAll

# Also remove dist/ during cleanup
npm run release:clean -- -IncludeDist
```

Usage:

```powershell
npm run release:clean -- [-Keep <n>] [-IncludeDist] [-All -ConfirmAll] [-DryRun]
```

Notes:

- `-All` removes all content under `release/` and `installer-history/`, but now requires `-ConfirmAll`.
- `-Keep` must be `0` or greater.
- `-IncludeDist` can be combined with `-All` or prune mode.
- Prune mode only deletes versioned folders that match `v<semver>` naming.
- Use `-DryRun` to preview what cleanup would remove.

### Legacy one-off build

```bash
npm run dist
```

## Smoke Validation

```bash
npm run test:smoke
```
