# Personal OS — Roadmap

Forward-looking improvement plan for Personal OS. This document captures the structural debt, polish, and capability work surfaced by the full-app scan performed at v3.7.0, and groups it into actionable phases.

The roadmap is a living document. Each phase is sized to roughly one minor release. Items should be lifted into individual issues / PRs as work begins, and ticked off here when shipped.

## Health snapshot at v3.7.0

| Area                                         | Grade | Notes                                                                                                                                                  |
| -------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Architecture (main / renderer / shared, IPC) | A-    | Auto-generated preload literals, Zod-validated channels, parity test                                                                                   |
| Security posture                             | A     | `contextIsolation`, sandbox, CSP, `safeStorage`, fail-closed secret storage, outbound guard, corporate policy with ACL check, Sentry opt-in via policy |
| Database / data layer                        | A-    | WAL, integrity + health checks, backup preview, optimize / VACUUM, structured migrations registry                                                      |
| Testing                                      | A-    | 4 layers (unit, preload smoke, browser E2E, Electron E2E), handler payload contract tests, ~1000+ unit tests                                           |
| Build & release                              | B+    | electron-builder, NSIS, manual Windows releases, SBOM + audit scripts                                                                                  |
| CI / CD                                      | B-    | Strong CI gates but cross-platform builds disabled (Actions budget)                                                                                    |
| UI / UX architecture                         | B-    | Shell split complete; CSS modularized into tokens + per-area files; life-area panels still large                                                       |
| State management                             | C+    | Heavy local `useState`, only one Zustand store, no data-fetch caching layer                                                                            |
| Documentation                                | B     | Strong maintainer docs; some stale content tracked in this roadmap                                                                                     |
| Repo hygiene                                 | A-    | Root docs scoped; v2.1.x evidence archived under `docs/history/`                                                                                       |

**Overall: B+ (8.0 / 10)** — strong engineering hygiene with growing structural debt as features were added at high cadence (v3.2 through v3.7 in one week).

## Top structural risks today

1. Life-area panel monoliths — `HealthPanel.tsx`, `CalendarPanel.tsx`, `HobbiesPanel.tsx`, `FamilyPanel.tsx`, `FinancePanel.tsx`, `CarPanel.tsx` are all 18–36 KB single files mixing data fetching, mutations, forms, and dialogs.
2. No data-fetching abstraction — manual refresh + `isRefreshing` flags, no cache, no optimistic mutations.
3. `src/renderer/vite-env.d.ts` — hand-maintained `window.assistantApi` typings; method-name drift guard only (full generation deferred to Phase E).
4. Renderer error handling — one top-level boundary, no per-panel boundaries, no in-app surface for `renderer:logError`.
5. No accessibility / i18n layer — no axe checks, no string catalog, no focus-stack management for modals.
6. Cross-platform release pipeline frozen — public posture is "Windows only" indefinitely.

## Phase A — Stabilize and de-couple (v3.8)

Goal: pay down structural debt before adding more capability.

- **A1. Split `AssistantShell.tsx`** into `ShellRouter` (module switching, palette, drawer), `ShellChrome` (sidebar, theme select, status banner), and `useShellState` (reducer or 2–3 zustand slices bundling the 11 `useState`s).
- **A2. Backup plugin registry.** Introduce a `BackupModule` interface; each life-area service registers `{ export, import, preview, reset }`. New domains stop forcing edits in [`src/main/services/backup.ts`](../src/main/services/backup.ts).
- **A3. CSS modularization.** Extract theme tokens to `src/renderer/styles/tokens.css`. Migrate panel CSS next to each panel (already started for `CalendarPanel.css`, `InboxPanel.css`, `DailyCommandCenterPanel.css`); finish the migration so `styles.css` only holds shell-level rules.
- **A4. Auto-generate [`src/renderer/vite-env.d.ts`](../src/renderer/vite-env.d.ts)** from `IpcInvoke` + handler schemas, mirroring the existing [`src/main/preload-ipc-literals.generated.ts`](../src/main/preload-ipc-literals.generated.ts) pattern. Eliminates drift between channels and renderer typings.
- **A5. Repo hygiene follow-up.** Root cleanup completed (root now contains only `README.md`, `CHANGELOG.md`, `AGENTS.md`). Remaining: confirm `releases/` ignore continues to hold across machines, archive stale `docs/v2.1.*-evidence.md` files under `docs/history/` once v3.x evidence supersedes them.

### Acceptance signal for Phase A

- [x] `AssistantShell.tsx` under 500 lines (~247 lines after A1).
- [x] `styles.css` under 800 lines (import hub only; tokens in `styles/tokens.css`, rules in per-component CSS).
- [x] `backup.ts` replaced by `src/main/services/backup/` plugin registry (no monolithic god-module).
- [x] A4 (partial): `IpcInvokeMethodNames` drift guard in `check:preload-ipc`; full `vite-env.d.ts` generation deferred to Phase E1.

**Phase A complete (v3.8 prep).** Shipped across commits: shell split (A1), backup registry (A2), CSS modularization (A3), IPC method-name guard (A4), evidence doc archive (A5).

## Phase B — Renderer data layer (v3.9)

Goal: replace ad-hoc fetch / refresh code with a cached, resilient data layer.

- **B1. Adopt TanStack Query** (or a minimal in-house equivalent) for all `assistantApi` calls. Remove manual `isRefreshing` flags and isolated `useEffect(loadFoo, [])` patterns from [`src/renderer/hooks/data/useAssistantData.ts`](../src/renderer/hooks/data/useAssistantData.ts) and panel components.
- **B2. Optimistic mutations with rollback** for the highest-touch entities (tasks, reminders, notes, life-area items).
- **B3. Per-panel `ErrorBoundary`** with retry; route uncaught renderer errors to a visible toast in addition to `renderer:logError`.
- **B4. Panel-render timing.** Extend [`src/renderer/lib/performance.ts`](../src/renderer/lib/performance.ts) to log per-panel first-paint metrics; surface a tiny diagnostics view in the About panel.

### Acceptance signal for Phase B

- No `isRefreshing` boolean state in renderer.
- Tasks complete optimistically and revert visibly on IPC failure.
- A killed handler crashes only its panel, never the shell.

## Phase C — UX and accessibility (v3.10)

Goal: lift the experience to first-class polish.

- **C1. Accessibility audit.** Add axe to the browser E2E suite, ship keyboard-only smoke coverage, implement a focus-stack manager for Quick Capture, Command Palette, and the work-item drawer.
- **C2. Command palette upgrades.** Fuzzy ranking, recently-used boost, module-scoped filters, action history.
- **C3. Theme system v2.** Extract themes to JSON, support user-authored themes, respect `prefers-color-scheme` by default.
- **C4. Onboarding refactor.** Unify `OnboardingCoach` and `OnboardingPanel` into one flow with persisted progress and skip points.

### Acceptance signal for Phase C

- axe reports zero serious / critical issues on every panel in browser E2E.
- All modal stacks restore focus to their trigger.
- Theme switching does not require a reload.

## Phase D — Reliability and ops (v4.0)

Goal: production-grade trust signals for a daily-driver tool.

- **D1. Renderer breadcrumbs to Sentry** (currently main-process only), gated by `allowCrashReporting` policy.
- **D2. Automatic local backups.** Rolling daily x 7 + weekly x 4, behind a disk-space check, using the existing `previewBackup` for restore validation.
- **D3. Encrypted backup format.** Corporate mode policy already requires it (`requireSecureSecretStorage`); ship the encryptor + KDF flow.
- **D4. DB observability.** Expose [`src/main/services/dbHealth.ts`](../src/main/services/dbHealth.ts) metrics in a hidden diagnostics panel; auto-suggest VACUUM after N writes.
- **D5. Restore cross-platform builds.** Decide between self-hosted runners, scheduled-only release jobs, or `on: tag` matrix to restore macOS / Linux without burning Actions budget.

### Acceptance signal for Phase D

- A corrupt SQLite WAL is recovered automatically and surfaced to the user.
- Encrypted backup imports cleanly into a fresh install.
- v4.0 ships with at least one non-Windows asset.

## Phase E — New capabilities (v4.1+)

Goal: the leap from "personal assistant app" to "Personal OS".

- **E1. Plugin / module SDK.** Generalize the life-area pattern documented in [`docs/LIFE_AREAS.md`](./LIFE_AREAS.md) into a real plugin API: schema migration, IPC registration, panel registration, backup registration — all from one manifest. The clean path to keep adding domains (travel, study, garden, projects) without bloating the shell.
- **E2. Calendar provider parity.** Outlook / Microsoft 365 calendar adapter (schema already supports it; only provider implementation is missing). Re-check `isMicrosoftCalendarAllowed` policy paths.
- **E3. AI command router upgrade.** Move from prompt-template parsing to structured tool-calling that targets existing IPC handlers; keep the preview-then-confirm pattern from [`src/renderer/components/AiActionPreview.tsx`](../src/renderer/components/AiActionPreview.tsx).
- **E4. Encrypted optional sync.** End-to-end-encrypted sync of SQLite over the existing Supabase backend, behind explicit policy opt-in. Reuses the Team Projects infrastructure under `src/main/team/`.
- **E5. Mobile companion (read-only first).** Same Supabase project, RLS-scoped queries; capture-on-phone, sort-on-desktop.
- **E6. Local LLM option.** Route AI through Ollama / llama.cpp when policy disables outbound. Keeps the "Personal OS" promise even with AI on.

### Acceptance signal for Phase E

- A new life area can be added in a single PR that touches only its own files plus one manifest registration.
- Outlook events appear alongside Google in the unified Calendar.
- An "Ask" command can create a reminder via tool-calling without prompt regex parsing.

## Phase F — Quality bar (continuous)

Goal: enforce the quality posture, do not let it regress.

- **F1. Performance budgets** enforced in CI: renderer gzip bundle ceiling, panel-mount budget in Electron E2E.
- **F2. Mutation-testing pilot** (`stryker-mutator`) on `src/main/services/*` to confirm the existing test suite catches behavior regressions, not just coverage.
- **F3. Visual regression** (Playwright snapshots) for the two highest-density screens: Daily Command Center and Calendar.
- **F4. Dependency policy.** Group Dependabot PRs, fast-track security updates, lock Electron to LTS cadence with explicit major-version gates.

## "Do this Monday" wins (already shipped at v3.7.0 cleanup)

These three small items were executed in the same change as the introduction of this roadmap; recorded here so the rationale is preserved.

1. Repo root collapsed to three conventional files. `WORKER_HANDOFF.md`, `WORKER_ACTIVITY.md`, `APP_AUDIT_2026-05-15.md`, `MAINTAINER_GUIDE.md`, `RELEASING.md` moved under `docs/`; `scripts/handoff.mjs` and `scripts/activity.mjs` updated to the new paths.
2. [`AGENTS.md`](../AGENTS.md) "Current Release" block refreshed from v2.9.0 to v3.7.0 with up-to-date features and key files.
3. Verified [`.gitignore`](../.gitignore) `releases/` rule is in effect — earlier "untracked releases tree" report was stale snapshot noise, not a real ignore failure.

## How to use this roadmap

- Each phase letter (A through F) is one minor release worth of work; F is continuous.
- Promote items to GitHub issues / PRs as they enter active development.
- When a phase completes, summarize the outcome in [`CHANGELOG.md`](../CHANGELOG.md) and tick the acceptance signals here.
- Re-run the full-app scan after each phase and update the health snapshot table at the top.
