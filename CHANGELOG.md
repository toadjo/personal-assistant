# Changelog

All notable changes to Personal Assistant are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-05-15

Team Projects UX and setup release. Friendly display-name-first setup, shared task editor, task board filters, realtime IPC cleanup, and visual hardening.

### Added

- Friendly Team Projects setup: display-name-first flow with optional advanced self-hosted backend configuration.
- Hosted backend support via `TEAM_PROJECTS_SUPABASE_URL` and `TEAM_PROJECTS_SUPABASE_ANON_KEY` environment variables.
- Shared task editor with full task fields (title, notes, due date, priority, recurrence, assignee).
- Task board filters by project and status.
- Realtime IPC cleanup with debounced refresh and per-workspace channel management.
- `teamSetDisplayName` IPC method for display-name-only configuration.

### Changed

- Team Projects copy uses user-facing terms (workspace, invite code, shared tasks) instead of technical terms (Supabase, anon key, backend).
- Performance optimization: project lookup map and memoized filtered tasks to avoid repeated find calls.
- Visual hardening: added proper spacing to workspace items with dedicated CSS.
- Security verification: confirmed no Supabase credentials exposed in normal UI; all team IPC handlers validate with Zod; trusted sender checks in place.

### Fixed

- Workspace items now have proper spacing between them.

## [2.0.0] - 2026-05-13

First "stable" milestone after the rapid 1.4.x → 1.7.x iteration phase. No breaking user-facing behavior versus 1.7.1; the major bump signals the end of that exploration phase and the start of a more disciplined release cadence (see `RELEASING.md`). Skips over a stray `v2.1.8` test tag that was never publicly distributed.

### Added

- `docs/ARCHITECTURE.md` — high-level architecture reference for contributors.
- `RELEASING.md` — versioning and release discipline going forward.
- App-window IPC handler with dedicated security tests (`window.security.test.ts`, `appWindow.handlers.test.ts`).
- Custom theme editor with expanded appearance tokens, contrast guidance, and a dedicated test suite.
- About panel updates with clearer version visibility.
- Handler payload contract tests for the renderer/main IPC boundary.

### Changed

- `useAssistantWorkspace` refactored: type definitions extracted into `src/renderer/hooks/workspace/workspaceTypes.ts`; composition hooks consolidated. No behavior change.
- `release-assets` script and tests tightened.
- Backup service hardened.
- Small fixes to command palette and search engine.

### Removed

- Unused layout components: `AppHeader`, `WelcomeBar`.

### Fixed

- E2E test specs aligned with the current desk UI (web + Electron suites).

## [1.7.1] - 2026-05-13

### Added

- macOS `.zip` requirement in release validation.

### Changed

- Release pipeline publishes directly without using GitHub Actions artifacts (saves storage quota).
- UI text normalization (mojibake removal, copy consistency).
- Updated release docs covering macOS and `PUBLIC_RELEASE_TOKEN` behavior.

### Fixed

- Stabilized v1.7.1 source sync between worker tooling and tracked sources.

## [1.7.0] - 2026-05-12

### Added

- Data control and backup: export notes, tasks, reminders, automations, and settings to JSON; import with conflict handling; local backup reminder setting.

## [1.6.5] - 2026-05-12

Windows installer release rolling up 1.6.1 – 1.6.4.

## [1.6.4] - 2026-05-12

### Added

- Automation builder upgrade: trigger / action / review step layout, enable-disable toggle per rule, last-run status, duplicate rule, test-run button.

## [1.6.3] - 2026-05-12

### Added

- Agenda list view alongside the month calendar.
- Tasks with due dates rendered alongside reminders.
- Today / Tomorrow / This week filters.
- Click-to-create reminder/task from a selected day.

## [1.6.2] - 2026-05-12

### Added

- Note archive and task archive views.
- Bulk complete for selected tasks.
- Inline task priority editing.
- Pin/unpin notes from search results.
- Undo for task complete, reminder done, and note archive.

## [1.6.1] - 2026-05-12

### Added

- Global command palette across notes, tasks, reminders, automations, settings, and Home Assistant actions.
- Structured search results with keyboard navigation.

## [1.6.0] - 2026-05-12

Windows installer release rolling up 1.5.6 – 1.5.9.

## [1.5.9] - 2026-05-12

### Added

- Today strip with overdue / due-today / reminders / notes / automations counts.
- Quick filters from the strip into Tasks, Reminders, Notes, Automations.

### Changed

- Improved empty states across panels.
- Standardized panel headers, action rows, list rows, and timestamps.

### Removed

- Remaining mojibake and playful labels.

## [1.5.8] - 2026-05-12

### Added

- Density preference: Comfortable, Compact, Spacious.
- Panel radius preference: Sharp, Soft, Rounded.
- Optional shadows toggle and glass-blur toggle.
- DCC section preference (one secondary vs all secondary sections).

## [1.5.7] - 2026-05-12

### Added

- Appearance panel in the top toolbar with full custom theme editor: per-token color inputs, reset, duplicate preset, save custom theme, JSON import/export, contrast warnings.

## [1.5.6] - 2026-05-12

### Added

- Theme token foundation: typed `ThemeTokenKey`, `ThemePreset`, and `CustomTheme`. Built-in presets (Glass, Paper, Obsidian, Fog, Deep Blue) plus Corporate. Custom overrides applied via CSS variables on `documentElement`.

## [1.5.5] - 2026-05-11

Final minimal corporate pass. Version bump rolling up 1.5.2 – 1.5.4.

## [1.5.4] - 2026-05-11

### Changed

- Corporate automation polish.

## [1.5.3] - 2026-05-11

### Changed

- Friendly workflow clarity pass.

## [1.5.2] - 2026-05-11

### Changed

- Minimal corporate desk baseline.

## [1.5.0] - 2026-05-08

### Added

- Daily command center with navigation actions and visual hierarchy.
- Local task automations.
- Strengthened local-first desk experience.

### Changed

- Hardened release packaging.

### Fixed

- Improved automation retry logs.

## [1.4.3] - 2026-05-07

### Added

- Worker activity handoff log.
- Comprehensive worker handoff docs.

### Changed

- Enforced repository line endings.
- Tidied quality baseline.
- Documented Electron 42 upgrade failure (better-sqlite3 incompatibility).

### Fixed

- Hardened away-brief behavior.
- Strengthened away-brief and security test coverage.

## [1.4.2] and earlier

History prior to 1.4.3 is in git log; no curated changelog exists for those versions. See `git log v1.4.2 --no-merges` for details.

[2.0.0]: https://github.com/toadjo/personal-assistant/compare/v1.7.1...v2.0.0
[1.7.1]: https://github.com/toadjo/personal-assistant/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/toadjo/personal-assistant/compare/v1.6.5...v1.7.0
[1.6.5]: https://github.com/toadjo/personal-assistant/compare/v1.6.0...v1.6.5
[1.6.4]: https://github.com/toadjo/personal-assistant/compare/v1.6.0...v1.6.4
[1.6.3]: https://github.com/toadjo/personal-assistant/compare/v1.6.0...v1.6.3
[1.6.2]: https://github.com/toadjo/personal-assistant/compare/v1.6.0...v1.6.2
[1.6.1]: https://github.com/toadjo/personal-assistant/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/toadjo/personal-assistant/compare/v1.5.5...v1.6.0
[1.5.9]: https://github.com/toadjo/personal-assistant/compare/v1.5.5...v1.6.0
[1.5.8]: https://github.com/toadjo/personal-assistant/compare/v1.5.5...v1.6.0
[1.5.7]: https://github.com/toadjo/personal-assistant/compare/v1.5.5...v1.6.0
[1.5.6]: https://github.com/toadjo/personal-assistant/compare/v1.5.5...v1.6.0
[1.5.5]: https://github.com/toadjo/personal-assistant/compare/v1.5.0...v1.5.5
[1.5.4]: https://github.com/toadjo/personal-assistant/compare/v1.5.0...v1.5.5
[1.5.3]: https://github.com/toadjo/personal-assistant/compare/v1.5.0...v1.5.5
[1.5.2]: https://github.com/toadjo/personal-assistant/compare/v1.5.0...v1.5.5
[1.5.0]: https://github.com/toadjo/personal-assistant/compare/v1.4.3...v1.5.0
[1.4.3]: https://github.com/toadjo/personal-assistant/compare/v1.4.2...v1.4.3
