# Personal OS

Local-first desktop personal operating layer built with Electron + React + TypeScript.

Personal OS is an attempt to turn a desktop assistant into a calm daily operating layer for real life: capture tasks and notes quickly, plan the day, review unfinished work, keep local records for family, health, finance, car, hobbies, and calendar context, and stay useful even without cloud services.

The long-term goal is a free community app that people can run, inspect, fork, and adapt for their own workflows. The project favors local-first data, readable history, clear architecture, and practical safety controls over lock-in.

## AI-Assisted Development

This app has been coded with heavy assistance from GPT 5.5, GPT 5.4, Opus 4.7, and SWE 1.6. Human review, tests, and release checks still matter: AI help is part of the build process, not a replacement for verification.

## Personal OS Core Workflow

Personal OS provides a consolidated daily workflow for local-first productivity:

- **Capture**: Quick capture notes, tasks, and reminders via global shortcut (Ctrl+Alt+N), tray menu, or commands
- **Sort**: Use the Inbox to organize and convert captured items into tasks, reminders, or team work
- **Plan**: Plan Today panel shows overdue tasks, due today reminders, and unsorted items for daily planning
- **Act**: Complete tasks and reminders from the Today strip or individual panels
- **Review**: End-of-Day Review shows completed work, unfinished items, and captured notes with carry-over actions
- **Search**: Command palette with intelligent search, recent items, and saved searches
- **Recover**: Data Control with backup preview, restore confirmation, health checks, and database optimization

## What It Does Today

- Daily Command Center with a top "Now" queue, attention items, context, and since-you-were-away changes
- Local notes, tasks, reminders, and personal automation rules stored in SQLite
- Life-area modules for finance, family, health, hobbies, car records, and connected calendar context
- Desktop notifications for due reminders and tasks
- Optional Home Assistant settings, connectivity test, entity sync, and toggle actions
- Backup preview, restore confirmation, database health checks, and local data reset controls

## Install the app (Windows, no Git/Node)

1. Open **[Public Releases](https://github.com/toadjo/Personal-Assistant-R/releases)** and download the latest release asset:
   - Windows: `Setup` `.exe`
   - **Current releases are Windows-first**. macOS and Linux packaging paths exist but are not published for every release yet.
2. Run the installer and start **Personal OS** from the Start menu or desktop shortcut.

To **change or build** the app yourself, clone the repository and use **`dev.bat`** or **`npm run dev`** (see below); that path needs Node **22.12+** and npm.

## Working on the app

Maintainers and contributors should start with [docs/MAINTAINER_GUIDE.md](./docs/MAINTAINER_GUIDE.md) for the architecture map, change workflow, verification checklist, and release cautions. The forward-looking improvement plan is in [docs/ROADMAP.md](./docs/ROADMAP.md).

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

Native module **`better-sqlite3`** is rebuilt in `postinstall` for Electron. **`npm test`** temporarily rebuilds it for Node (Vitest), then restores the Electron build. **`npm run dev`** starts with **`npm run rebuild:electron`** (**`electron-rebuild -f -w better-sqlite3`**) so `better-sqlite3` always matches **Electron's** Node ABI (Vitest/`npm rebuild` leave a Node-target binary; `electron-builder install-app-deps` alone can skip a rebuild). **`dev.bat`** calls **`npm run dev`**, so it gets the same behavior. Home Assistant tokens are stored with Electron **`safeStorage`** when the OS supports it; if encryption is unavailable, the app refuses to store secrets and prompts the user to ensure their system supports secure storage.

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

## Project Docs

- [Architecture](./docs/ARCHITECTURE.md)
- [Roadmap](./docs/ROADMAP.md)
- [Release process](./docs/RELEASING.md)
- [Changelog](./CHANGELOG.md)
