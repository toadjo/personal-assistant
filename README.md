# Personal Assistant

Local-first desktop personal assistant built with Electron + React + TypeScript.

## Install the app (Windows, no Git/Node)

1. Open **[Public Releases](https://github.com/toadjo/Personal-Assistant-R/releases)** and download the latest release asset:
   - Windows: `Setup` `.exe`
   - **Current releases are Windows-only** due to GitHub Actions budget constraints. macOS/Linux assets are omitted until budget is restored.
2. Run the installer and start **PersonalAssistant** from the Start menu or desktop shortcut.

To **change or build** the app yourself, clone the repository and use **`dev.bat`** or **`npm run dev`** (see below); that path needs Node **22.12+** and npm.

Releases are built locally and uploaded manually while GitHub Actions budget is unavailable. See [RELEASING.md](./RELEASING.md) for the full release process.

## Working on the app

### Prerequisites

- **Node.js** **22.12+** LTS (**required:** `>=22.12.0` and `<26`, matching `package.json` `engines` and CI on **22.x**). **24+** is currently outside the documented support window for this project, and `engine-strict` in `.npmrc` will block `npm install` outside the declared range.
- **npm**
- **Windows** (tray behavior and build targets are Windows-first; Linux falls back to minimize-to-taskbar when no system tray is available, macOS uses the menu bar)

### First-time setup

The Git repository root **is** the Electron app (same folder as `package.json`).

```bash
git clone https://github.com/toadjo/personal-assistant.git
cd personal-assistant
npm install
```

Native module **`better-sqlite3`** is rebuilt in `postinstall` for Electron. **`npm test`** temporarily rebuilds it for Node (Vitest), then restores the Electron build. **`npm run dev`** starts with **`npm run rebuild:electron`** (**`electron-rebuild -f -w better-sqlite3`**) so `better-sqlite3` always matches **Electron's** Node ABI (Vitest/`npm rebuild` leave a Node-target binary; `electron-builder install-app-deps` alone can skip a rebuild). **`dev.bat`** calls **`npm run dev`**, so it gets the same behavior. Home Assistant tokens are stored with Electron **`safeStorage`** when the OS supports it (otherwise a warning is logged and the token falls back to SQLite plaintext).

**Windows:** Prefer a clone path **without spaces** (e.g. not `...\project 430\...`); node-gyp can fail there. If **`npm rebuild better-sqlite3`** reports **EBUSY** / **EPERM**, quit the Electron app (and anything else using that `.node` file), then retry **`npm test`** or **`npm run rebuild:electron`**.

### Run in development

**Windows (easiest):** from the repository root (the folder that contains `package.json`), double-click **`dev.bat`**. It checks for Node/npm, runs `npm install` on first use if needed, then `npm run dev`.

**Any OS / manual:**

```bash
npm run dev
```

This runs the Vite dev server for the React UI, compiles the Electron **main** and **preload** TypeScript in watch mode, and launches Electron when outputs are ready. The window loads `http://localhost:5173` in development. Closing the window keeps the app running: in the system tray on Windows and macOS, or minimized to the taskbar on Linux when no tray is available.

### Previewing the default theme during development

The app stores the selected theme in browser localStorage under `assistant-theme`.

New users default to the Glass theme, but existing dev machines may keep an older saved theme. To preview the new-user default, open DevTools in the Electron window and run:

```js
localStorage.removeItem("assistant-theme");
location.reload();
```

Or select **Glass · frosted** from the theme picker.

### Quality checks (run before you push)

```bash
npm run lint
npm run typecheck
npm run test
```

- **lint** - ESLint for main/renderer TypeScript and React hooks
- **typecheck** - `tsc` for the main and renderer TypeScript projects
- **test** - Vitest (main + renderer). Uses a Node rebuild of **`better-sqlite3`**, then **`electron-builder install-app-deps`** so the next **`npm run dev`** / Electron launch still works. Run on **Node 22.12+** (see prerequisites).

#### E2E test layers

```bash
npm run test:e2e
npm run test:e2e:electron
```

- **test:e2e** - Browser-stub Playwright suite with stubbed assistant API. Requires Playwright browsers installed locally: `npx playwright install --with-deps`. Fast UI coverage without Electron.
- **test:e2e:electron** - Real Electron/preload/IPC Playwright suite. Runs actual Electron process with isolated user-data paths. Requires `ELECTRON_E2E_TEST_MODE=1` environment variable (set automatically in CI).

#### Verification order for debugging

When debugging failures, follow this sequence to narrow the layer:

1. **Unit tests** (`npm test`) - Main/renderer logic and service layer
2. **Preload smoke** (`npm run test:preload-electron`) - Real preload in BrowserWindow
3. **Browser E2E** (`npm run test:e2e`) - UI coverage with stubbed API
4. **Electron E2E** (`npm run test:e2e:electron`) - Full Electron/preload/IPC integration

Pull requests and pushes to `main`/`master` run the full verification sequence in GitHub Actions (see `.github/workflows/ci.yml`): lint, typecheck, unit tests with coverage, build, preload smoke, Playwright browser installation, browser E2E, and Electron E2E. The workflow also runs **`npm audit`** at high severity (report-only; does not fail the job yet).

**Release automation:** pushing a tag **`vX.Y.Z`** that matches **`package.json`** runs `.github/workflows/release.yml` with four jobs:

- `package-windows` builds NSIS artifacts and uploads versioned installer history artifacts.
- `package-linux` builds Linux AppImage artifacts and uploads `release/` outputs.
- `package-macos` builds macOS DMG/zip artifacts and uploads `release/` outputs.
- `publish-releases` downloads all platform artifact sets, validates required `.exe`, `.AppImage`, and `.dmg` assets, publishes the private release, then mirrors release assets only to **[toadjo/Personal-Assistant-R Releases](https://github.com/toadjo/Personal-Assistant-R/releases)** when public mirroring is configured.

Public mirroring requires `PUBLIC_RELEASE_TOKEN`. If the secret is missing, public mirroring is skipped and the private release still publishes. Source code is not pushed or synced to the public repo; only release assets (`.exe`, `.blockmap`, `.yml`, `.AppImage`, `.dmg`, `.zip`, optional `.AppImage.zsync`) are uploaded. Workflow artifacts use short retention so temporary package handoff files do not fill GitHub Actions storage.

**Dependabot** is enabled for npm (`.github/dependabot.yml`).

**Pre-commit:** after `npm install`, [Husky](https://typicode.github.io/husky/) runs **`npm run typecheck`** and **lint-staged** (ESLint on staged `.ts/.tsx`, Prettier check on staged `.json/.css/.html/.md/.yml`) on each commit.

Optional: `npm run test:smoke` validates build artifacts and packaging assumptions (see below).

### Where the code lives

| Area           | Path                  | Purpose                                                                                                                            |
| -------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Electron main  | `src/main/`           | Window, tray, IPC registration, security checks, schedulers. IPC handlers are split under `src/main/ipc/handlers/`.                |
| Preload bridge | `src/main/preload.ts` | Exposes `window.assistantApi` to the renderer (context isolation).                                                                 |
| React UI       | `src/renderer/`       | `App.tsx` / `components/`, `hooks/`, `command/`, `lib/`, styles. Layout is intentionally minimal-one clear "Ask" line, then tools. |
| Shared types   | `src/shared/types.ts` | Types used by main and renderer.                                                                                                   |
| Unit tests     | `src/**/*.test.ts`    | Colocated with source; run via `npm run test`.                                                                                     |

**Typical tasks**

- **UI or command behavior** - `src/renderer/` (start with `hooks/useAssistantWorkspace.ts` and `command/executeAssistantCommand.ts`).
- **New IPC or validation** - extend Zod schemas in `src/main/ipc/schemas.ts`, add handlers in `src/main/ipc/handlers/`, mirror calls in `preload.ts`.
- **SQLite / domain logic** - `src/main/services/` and `src/main/db.ts`.

### Production-like local build

```bash
npm run build
```

Outputs renderer assets to `dist/renderer/` and compiles main/preload to `dist/main/`.

---

## Features

- Daily Command Center with a top "Now" queue, attention items, context, and since-you-were-away changes
- Local notes, tasks, reminders, and personal automation rules stored in SQLite
- Desktop notifications for due reminders and tasks
- Local automations that can create reminders or tasks without Home Assistant
- Optional Home Assistant settings, connectivity test, entity sync, and toggle actions
- Time-based automation rules with readable execution logs and retry metadata

## Run

```bash
npm install
npm run dev
```

## Release Packaging (Windows + Linux AppImage)

Versioned packaging outputs now live under:

- `release/v<version>/` (full electron-builder output for that version, including Linux AppImage artifacts when built)
- `installer-history/v<version>/` (copied Windows installer artifacts: `.exe`, `.blockmap`, `.yml`)

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
- Prepares `assets/app-icon.ico` before packaging (from `assets/app-icon.png`; JPEG bytes mislabeled as `.png` are converted via **sharp** so NSIS accepts the installer icon).

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

`npm run dist` runs **`npm run clean:release`** before **electron-builder**, which deletes **`release/`** so a previous **`win-unpacked`** tree cannot lock **`app.asar`**. If deletion fails, quit **PersonalAssistant** / **Electron** (and close Explorer inside **`release/`**), then retry.

## Icon Packaging Notes (Windows)

- Project-local icon sources live in `assets/`.
- Installer/exe icon paths are explicitly set to project-local `assets/app-icon.png` so builds do not depend on global machine assets.
- `npm run dist` runs `npm run icons:prepare` (ICO from `assets/app-icon.png`) and `npm run clean:release` before packaging. `npm run release:build` runs `icons:prepare` as part of its script.
- Remaining gap: auto-generated `.ico` uses one source PNG, so quality can be weaker at very small sizes (16x16/24x24). Practical workaround: replace `assets/app-icon.ico` with a designer-exported multi-size `.ico` (16/24/32/48/64/128/256) and keep the same filename.

## Release Notes

### v1.5.0

**Local-first operating layer** - The desk now centers on Daily Command Center instead of a Home Assistant-led workflow:

- Added Daily Command Center with Summary, Now, Since You Were Away, Attention, and Context sections
- Added quick actions for completing tasks, completing reminders, snoozing reminders, marking away changes seen, and opening relevant local panels
- Added local task automations with full task fields, alongside local reminder automations
- Improved automation reliability with preserved retry metadata and clearer rule-run logs
- Refreshed onboarding, command examples, and help/status copy so notes, tasks, reminders, and local automations work as the core experience
- Kept Home Assistant optional and visually secondary
- Hardened release packaging with short artifact retention, macOS artifact validation, and package-version-driven About display

### v1.3.0

**macOS utility redesign** - Complete visual overhaul to feel like a compact, native macOS utility:

- Tightened command composer with compact square send button
- Stable toolbar heights with consistent 32px controls
- Two-column desktop layout with reduced calendar dominance (0.9:1.1 ratio)
- Tighter memo/reminder cards (220px min-width, softer shadows)
- Compact empty states with subtle Apple-like design
- Cleaner CSS with stale rules removed

**Compact responsive layout** - Optimized for 4K, 2K, 1080p, laptop, and narrow (430px) widths with capped panel widths and stable alignment.

**Electron E2E stabilization** - Updated command examples test selectors to use accessible button role checks instead of stale CSS classes.

**Dependency fixes** - Added lucide-react dependency and synchronized lockfile.

## Smoke Validation

```bash
npm run test:smoke
```
