# Worker Handoff

## Current branch status

- Branch: `release/linux-appimage-audit`
- Purpose: Linux AppImage audit and dependency security cleanup
- HEAD commit: `3d721fb` - "chore: enforce repository line endings"
- Working tree: Clean (no uncommitted changes)

## Recent commit history

```
3d721fb chore: enforce repository line endings
20371e9 chore: tidy quality baseline cleanup
3ea818f chore: clean up dependency upgrade tracking
f52535e chore: document Electron 42 upgrade failure due to better-sqlite3 incompatibility
cc691de docs: correct handoff test count and document Electron upgrade tracking
```

**Recent work summary:**

- Added `.gitattributes` to enforce LF line endings across the repository
- Cleaned up quality baseline with formatting improvements (22 files)
- Documented Electron 42 upgrade failure and reverted to Electron 35
- Corrected Away Brief feature test count (16 total: 13 helper + 3 panel)
- Strengthened away brief and security coverage

## Repo and environment

- Working repo: `C:\Users\ITPC4\Desktop\project 430`
- On Windows PowerShell, use `npm.cmd` (not bare `npm`)
- Node.js: Use `node` command directly
- Git: Use `git` command directly

## Development setup

**Initial setup:**

```bash
npm install
```

**Development mode:**

```bash
npm run dev
```

- Starts Vite dev server for renderer process
- Starts Electron main process in watch mode
- Hot reload enabled for renderer changes

**Key scripts:**

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run unit tests
- `npm run check:preload-ipc` - Check preload IPC literals are up to date
- `npm run test:smoke` - Run smoke tests
- `npm run test:preload-electron` - Run preload Electron smoke tests
- `npm run test:e2e` - Run E2E tests
- `npm run test:e2e:electron` - Run Electron E2E tests
- `npm run handoff` - Show worker handoff info

## Architecture overview

**Process architecture:**

- Main process: Electron main process (`src/main/main.ts`)
- Renderer process: React/Vite UI (`src/renderer/`)
- Preload script: Secure IPC bridge (`src/main/preload.ts`)

**Key directories:**

- `src/main/` - Electron main process code
  - `ipc/` - IPC handlers and schemas
  - `services/` - Business logic (notes, reminders, tasks, home assistant)
  - `db/` - Database migrations and access
  - `automation/` - Automation rule execution
- `src/renderer/` - React UI code
  - `components/` - React components
  - `hooks/` - Custom React hooks
  - `lib/` - Utility functions
  - `command/` - Command parsing and execution
- `tests/` - E2E tests
- `scripts/` - Build and utility scripts

**Database:**

- SQLite database stored in `%APPDATA%\PersonalAssistant\assistant.db`
- Migrations in `src/main/db/migrations/`
- Uses `better-sqlite3` for synchronous database access

**IPC architecture:**

- All renderer-to-main communication goes through `contextBridge` in preload
- IPC handlers registered in `src/main/ipc/register-handlers.ts`
- All mutations validated with Zod schemas in `src/main/ipc/schemas.ts`
- Sender validation via `assertTrustedIpcSender` in `src/main/security.ts`

## Test coverage

**Unit tests (Vitest):**

- 232 tests passing across 39 test files
- Coverage areas:
  - IPC handlers and payload validation
  - Services (notes, reminders, tasks, home assistant, automation)
  - Command parsing and execution
  - Derived data (brief, away-brief)
  - Security (navigation validation, sender validation)
  - Database migrations

**E2E tests (Playwright):**

- Electron E2E tests in `tests/e2e-electron/`
- Web E2E tests in `tests/e2e/`
- Test areas:
  - First-run onboarding
  - IPC validation
  - Automation failures (structured errors)
  - Structured retryable/non-retryable errors

**Test execution:**

- Run unit tests: `npm test`
- Run E2E tests: `npm run test:e2e` (requires built app)
- Run Electron E2E tests: `npm run test:e2e:electron` (requires built app)

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

## Line ending policy

**Repository-wide LF enforcement:**

- `.gitattributes` at repo root enforces LF line endings for all text files
- Windows batch/cmd/PowerShell scripts keep CRLF for native execution
- Binary assets (images, icons, archives, databases) marked as binary to prevent normalization
- Future Windows workers should not fight CRLF status noise manually
- Before staging, run `git status --short --branch` and `git diff --stat` to confirm real content changes only

## Next product direction

**Goal:** Make Personal Assistant feel like a local-first personal operating layer, not a Home Assistant shell with a better UI.

**Priority 1: Daily Command Center**

- Build this first.
- Replace the current top-of-desk brief stack with a new `DailyCommandCenterPanel`.
- Combine Focus Brief priorities, Away Brief changes, overdue and due-today tasks, pending reminders, pinned notes, and a small "Now" queue with the top 3 actions.
- Add a derived helper, likely `src/renderer/lib/derived/daily-command-center.ts`, that returns stable typed sections: `nowItems`, `attentionItems`, `contextItems`, `summary`, and `pressure`.
- Reuse existing Focus Brief and Away Brief derived helpers where possible instead of duplicating date logic.
- Add quick actions only for already-supported mutations: complete task, complete reminder, snooze reminder 10 minutes, mark Away Brief as seen, and open relevant panel/filter where existing state supports it.
- Keep Home Assistant optional and visually secondary. The Command Center must be useful with no Home Assistant configured.
- Fix touched mojibake user-facing strings such as `β€”`, replacing them with plain punctuation that follows repo style.

**Priority 2: Worker Sync Log**

- Add a repo-local human handoff log for cross-computer continuity, separate from the large `WORKER_HANDOFF.md`.
- Use a concise file name such as `WORKER_ACTIVITY.md`.
- Add an npm script, for example `npm run activity`, that prints branch, HEAD, dirty status, latest activity entries, and latest commits.
- Update `npm run handoff` to mention the activity log path.
- Document a simple rule: every meaningful worker slice adds one short activity entry with goal, files touched, checks run, and next action.
- Do not put secrets, local absolute machine paths, tokens, or personal data in the activity log.

**Priority 3: Personal Automations**

- Add one local-first automation capability that does not depend on Home Assistant.
- Start with the lowest-risk behavior: rules can create a reminder or task from local app state.
- Keep existing automation storage and IPC patterns. Do not add a new database subsystem unless the current automation schema cannot represent the behavior.
- Expose this in the existing automation UI with clear wording that it is local automation, not Home Assistant.
- Add validation so malformed automation configs cannot cross IPC boundaries.

**Required test coverage for the product direction:**

- Daily Command Center derived helper: empty state, overdue first, due-today before upcoming, Away Brief items included only when present, done tasks/reminders excluded, and no Home Assistant configured.
- Daily Command Center panel: renders summary and top actions, complete task calls the task handler, complete reminder calls the reminder handler, snooze reminder calls the snooze handler, and mark seen clears Away Brief state.
- Worker Sync Log: script prints branch, HEAD, dirty files, recent commits, and activity path without mutating repo state.
- Local automations: schema rejects invalid local action configs, valid local action config executes through the existing automation path, and failed local action logs a clear structured error.

**Suggested commit sequence:**

1. `feat: add daily command center`
2. `chore: add worker activity handoff log`
3. `feat: add local personal automations`

If the first slice gets large, stop after the Daily Command Center commit and update this handoff with exact remaining work.

## Known issues and blockers

**Dependency security:**

- Electron 35.0.0 has 10 high vulnerabilities (blocked by better-sqlite3 incompatibility)
- Electron 42 upgrade attempted but failed due to better-sqlite3 v11.8.1 native module incompatibility
- See Dependency Risk Register for next retry condition

**macOS validation:**

- `npm run dist:mac` not yet validated on macOS or GitHub Actions macOS runner
- Use "Validate macOS package" workflow for safe validation-only runs

**Generated files:**

- `src/main/preload-ipc-literals.generated.ts` is auto-generated
- If dirty with no content diff, restore with `git restore -- src/main/preload-ipc-literals.generated.ts`
- If dirty with real content diff, run `npm run check:preload-ipc` to regenerate

## Development workflow

**Before committing:**

1. Run `git status --short --branch` to see what's changed
2. Run `git diff --stat` to see diff summary
3. Run verification checks: `npm run check:preload-ipc`, `npm run typecheck`, `npm run lint`, `npm test`
4. If `preload-ipc-literals.generated.ts` is dirty with no content diff, restore it
5. Stage only intended changes
6. Commit with descriptive message

**Commit message format:**

- Use conventional commit format: `type: description`
- Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`
- Example: `chore: enforce repository line endings`

**Branching strategy:**

- Main development: `main` branch
- Feature branches: `feature/feature-name`
- Release branches: `release/release-name`
- Current branch: `release/linux-appimage-audit` (Linux AppImage audit and dependency security cleanup)

## Key configuration files

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `electron-builder.yml` - Electron packaging configuration
- `.editorconfig` - Editor configuration (LF line endings)
- `.gitattributes` - Git line ending policy
- `eslint.config.mjs` - ESLint configuration
- `prettier.config.mjs` - Prettier configuration

## Troubleshooting

**TypeScript errors:**

- Run `npm run typecheck` to see all TypeScript errors
- Check `tsconfig.main.json` and `tsconfig.renderer.json` for configuration

**Lint errors:**

- Run `npm run lint` to see all lint errors
- Check `eslint.config.mjs` for configuration

**Test failures:**

- Run `npm test` to see unit test failures
- Run `npm run test:e2e` to see E2E test failures (requires built app)
- Run `npm run test:e2e:electron` to see Electron E2E test failures (requires built app)

**Build failures:**

- Run `npm run build` to see build errors
- Check Vite configuration in `vite.config.ts`
- Check Electron configuration in `electron-builder.yml`

**Database issues:**

- Database location: `%APPDATA%\PersonalAssistant\assistant.db`
- To reset database, delete the database file and restart the app
- Migrations in `src/main/db/migrations/`

**Electron issues:**

- Check Electron version in `package.json`
- Check preload script in `src/main/preload.ts`
- Check main process in `src/main/main.ts`
