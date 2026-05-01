# Personal Assistant

Windows-first tray personal assistant MVP built with Electron + React + TypeScript.

## Working on the app

### Prerequisites

- **Node.js** 20+ (LTS recommended) and **npm**
- **Windows** (tray behavior and build targets are Windows-first)

### First-time setup

The Git repository root contains the Electron app under a nested `personal-assistant/` directory (historical layout).

```bash
git clone https://github.com/toadjo/personal-assistant.git
cd personal-assistant/personal-assistant
npm install
```

Native modules (`better-sqlite3`, `keytar`) are rebuilt in `postinstall` for your platform.

### Run in development

**Windows (easiest):** from the repository root (the folder that contains this `personal-assistant` directory), double-click **`dev.bat`**. It checks for Node/npm, runs `npm install` on first use if needed, then `npm run dev`.

If you are already inside this app folder (`personal-assistant/personal-assistant` on disk), double-click the **`dev.bat`** next to `package.json` instead.

**Any OS / manual:**

```bash
npm run dev
```

This runs the Vite dev server for the React UI, compiles the Electron **main** and **preload** TypeScript in watch mode, and launches Electron when outputs are ready. The window loads `http://localhost:5173` in development; closing the window keeps the app in the system tray.

### Quality checks (run before you push)

```bash
npm run typecheck
npm run test
```

- **typecheck** — `tsc` for the main and renderer TypeScript projects
- **test** — Vitest unit tests (command parsing, calendar/reminder helpers, IPC-free `executeAssistantCommand` with mocked `window.assistantApi`)

Optional: `npm run test:smoke` validates build artifacts and packaging assumptions (see below).

### Where the code lives

| Area | Path | Purpose |
| --- | --- | --- |
| Electron main | `src/main/` | Window, tray, IPC registration, security checks, schedulers. IPC handlers are split under `src/main/ipc/handlers/`. |
| Preload bridge | `src/main/preload.ts` | Exposes `window.assistantApi` to the renderer (context isolation). |
| React UI | `src/renderer/` | `App.tsx` / `components/`, `hooks/`, `command/`, `lib/`, styles. Layout is intentionally minimal—one clear “Ask” line, then tools. |
| Shared types | `src/shared/types.ts` | Types used by main and renderer. |
| Unit tests | `src/**/*.test.ts` | Colocated with source; run via `npm run test`. |

**Typical tasks**

- **UI or command behavior** — `src/renderer/` (start with `hooks/useAssistantWorkspace.ts` and `command/executeAssistantCommand.ts`).
- **New IPC or validation** — extend Zod schemas in `src/main/ipc/schemas.ts`, add handlers in `src/main/ipc/handlers/`, mirror calls in `preload.ts`.
- **SQLite / domain logic** — `src/main/services/` and `src/main/db.ts`.

### Production-like local build

```bash
npm run build
```

Outputs renderer assets to `dist/renderer/` and compiles main/preload to `dist/main/`.

---

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
- Attempts to prepare `assets/app-icon.ico` before packaging (auto-generates from `assets/app-icon.png` when possible, otherwise continues with PNG icon paths and prints guidance).

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

## Icon Packaging Notes (Windows)

- Project-local icon sources live in `assets/`.
- Installer/exe icon paths are explicitly set to project-local `assets/app-icon.png` so builds do not depend on global machine assets.
- `npm run dist` and `npm run release:build` both run `npm run icons:prepare` to generate `.ico` from `assets/app-icon.png` when needed.
- Remaining gap: auto-generated `.ico` uses one source PNG, so quality can be weaker at very small sizes (16x16/24x24). Practical workaround: replace `assets/app-icon.ico` with a designer-exported multi-size `.ico` (16/24/32/48/64/128/256) and keep the same filename.

## Smoke Validation

```bash
npm run test:smoke
```
