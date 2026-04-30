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

### Build a versioned installer

```powershell
npm run release:build -- -Version 1.0.0
```

Notes:

- Accepts `1.0.0` or `v1.0.0`.
- Updates `package.json` version to match (unless you pass `-SkipVersionBump`).
- Runs smoke checks by default (skip with `-SkipSmoke`).

Examples:

```powershell
# Keep current package.json version, just package
npm run release:build -- -Version 1.1.0 -SkipVersionBump

# Package without smoke validation
npm run release:build -- -Version 1.1.1 -SkipSmoke
```

### Cleanup old artifacts

```powershell
# Keep the newest 3 release/history versions (default behavior)
npm run release:clean

# Keep newest 5 versions
npm run release:clean -- -Keep 5

# Remove everything under release/ and installer-history/
npm run release:clean:all

# Also remove dist/ during cleanup
npm run release:clean -- -IncludeDist
```

### Legacy one-off build

```bash
npm run dist
```

## Smoke Validation

```bash
npm run test:smoke
```
