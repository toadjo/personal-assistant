# Agent Development Guide

This document contains project-specific information for AI agents working on this codebase.

## Project Overview

Personal Assistant is a cross-platform desktop application built with Electron, React, and SQLite. It provides task management, note-taking, reminders, Home Assistant integration, and team collaboration features.

## Build Commands

### Core Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run all tests (Vitest for Node, Vitest for renderer)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:smoke` - Run smoke tests on built application

### Release Commands

- `npm run release:build -- -Version X.Y.Z -SkipVersionBump -ReplaceExisting` - Build Windows installer
- `npm run dist:win` - Build Windows distribution
- `npm run dist:mac` - Build macOS distribution
- `npm run dist:linux` - Build Linux distribution

### Security Commands

- `npm run security:audit` - Run security audit
- `npm run security:sbom` - Generate Software Bill of Materials
- `npm run security:release-evidence` - Generate release evidence

## Architecture

### Main Process

- `src/main/` - Electron main process code
- `src/main/db.ts` - SQLite database initialization with retry logic
- `src/main/services/` - Business logic services (backup, dbHealth, etc.)
- `src/main/ipc/` - IPC handlers and channel registration
- `src/main/security/` - Security policy and corporate mode enforcement

### Renderer Process

- `src/renderer/` - React frontend code
- `src/renderer/components/` - React components
- `src/renderer/hooks/` - Custom React hooks
- `src/renderer/lib/` - Utility libraries and API helpers
- `src/renderer/lib/assistantApi.ts` - Typed API wrapper for preload bridge

### Shared Code

- `src/shared/` - Types and constants shared between main and renderer
- `src/shared/ipc-channels.ts` - IPC channel definitions (auto-generates preload code)

### Database

- SQLite with better-sqlite3
- Migrations in `src/main/db/migrations/`
- WAL mode enabled for performance
- Tables: notes, reminders, tasks, automation_rules, app_settings, devices_cache, execution_logs, renderer_errors

## Key Patterns

### IPC Communication

- All IPC channels defined in `src/shared/ipc-channels.ts`
- Main process handlers in `src/main/ipc/handlers/`
- Renderer uses `requireAssistantApi()` from `src/renderer/lib/assistantApi.ts`
- Preload script auto-generated from channel definitions

### Security

- Corporate mode via policy file at `%ProgramData%\PersonalAssistant\policy.json` (Windows)
- Outbound guard enforces network restrictions
- Secret storage via Electron safeStorage
- Backup encryption in corporate mode
- CSP generation based on security policy

### Testing

- Main process tests use `createMemoryDatabase()` from `src/main/test/memoryDb.ts`
- Renderer tests use React Testing Library
- E2E tests via Electron (when CI budget available)
- Test utilities in `src/main/test/` and `src/renderer/test/`

## Release Process

1. Complete feature implementation and testing
2. Run `npm run lint`, `npm run typecheck`, `npm test`
3. Update CHANGELOG.md with version notes
4. Bump version in package.json
5. Build and test locally: `npm run build` && `npm run test:smoke`
6. Build Windows installer: `npm run release:build -- -Version X.Y.Z -SkipVersionBump -ReplaceExisting`
7. Test installed application manually
8. Tag release in Git
9. Upload assets to GitHub release
10. Post-release QA: Verify GitHub release assets include all required files (.exe, .blockmap, latest.yml) and installed About version matches release

## Current Release (v3.9.1)

### Recent Highlights

- v3.9.1: macOS CI job added (cross-platform validation now covers Windows, Linux, macOS)
- v3.9.0: Code cleanup, performance, and IPC ergonomics — deprecated OAuth re-exports removed, life-area panels lazy-loaded with React.lazy + Suspense and Vite manualChunks (main bundle reduced 38%), `registerValidated` IPC helper added
- v3.8.0: TanStack Query renderer data layer with optimistic mutations, axe E2E accessibility checks, keyboard smoke coverage, focus-stack manager, Command Palette ranking upgrades, theme `prefers-color-scheme` defaults, disk-space pre-check for backups, VACUUM/optimize suggestion prompts, encrypted backup format, Sentry breadcrumb filtering, life-area module SDK (manifest-based registration), GitHub issue templates, CONTRIBUTING.md, bundle size budgets in CI, mutation testing pilot, visual regression placeholder, Dependabot PR grouping, ProjectsPanel color contrast fix (#34)
- v3.7.0: Connected Calendar (Google + Outlook/Microsoft 365) with local OAuth loopback and secure token storage; life-area modules consolidated and shipped (Finance v3.2, Family v3.3, Health v3.4, Hobbies v3.5); reliability foundation from v2.9 (backup preview, SQLite health diagnostics, database optimize/VACUUM)

### Key Files

- `src/main/services/connectedCalendar*.ts` - Connected calendar service, sync, secrets, OAuth (Google + Microsoft)
- `src/main/services/lifeAreas/` - Manifest-based life-area module SDK
- `src/main/db/migrations/` - Schema migrations (006_finance through 011_connected_calendar and beyond)
- `src/renderer/components/panels/ConnectedAccountsPanel.tsx` - Account management UI
- `src/renderer/components/panels/AppearancePanel.tsx` - Theme editor with token overrides, accent presets, contrast checks, import/export
- `src/renderer/lib/theme/` - JSON-backed theme storage, tokens, contrast utilities
- `src/renderer/components/life-areas/` - Shared UI for all life-area panels
- `src/renderer/lib/dateFormat.ts` - Shared formatters
- `src/shared/connectedCalendar*.ts` - Shared calendar display types
- `docs/ROADMAP.md` - Forward-looking improvement plan (phases C through F; A and B completed)
- `docs/LIFE_AREAS.md` - Guide for adding new life-area modules

### Testing

- Full test suite: 1322+ tests passing (per v3.9.0 changelog)
- Test layers: Vitest unit (main + renderer), preload smoke, browser Playwright E2E (12/12 including axe), Electron Playwright E2E
- Bundle size budgets enforced in CI: index 304 kB, react 167 kB, life-areas 74 kB, vendor 89 kB

## Known Issues

- Windows-first manual releases; macOS and Linux release assets not yet published (CI now validates all three platforms, so publishing is unblocked pending release process work — see Phase D in ROADMAP.md)
- Linux tray support varies by desktop environment

## Development Notes

- Always run `npm test` after changes to verify test suite
- Use `createMemoryDatabase()` for main process service tests
- Update IPC channels in `src/shared/ipc-channels.ts` to auto-generate preload code
- Follow existing patterns for new IPC handlers
- Security policy changes require testing in corporate mode
